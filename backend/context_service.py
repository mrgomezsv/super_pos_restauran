"""
Servicio de contexto de compañía multi-tenant
Maneja el contexto actual del usuario y filtrado automático por compañía
"""

from typing import Optional, Dict, Any, List
from fastapi import HTTPException, Depends, Request
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from sqlalchemy import and_

from database import get_db_session, User as DBUser, Company as DBCompany

class CompanyContextService:
    """Servicio para gestión del contexto de compañía multi-tenant"""
    
    def __init__(self):
        self.security = HTTPBearer()
        self._user_contexts = {}  # Cache de contextos por token
    
    def extract_user_from_token(self, token: str, db: Session) -> Optional[DBUser]:
        """
        Extraer usuario del token (simplificado para desarrollo)
        En producción usar JWT real con validación
        """
        try:
            # Token format: mock_token_{user_id}_{timestamp}
            if token.startswith("mock_token_"):
                parts = token.split("_")
                if len(parts) >= 3:
                    user_id = int(parts[2])
                    user = db.query(DBUser).filter(DBUser.id == user_id).first()
                    return user
            return None
        except Exception:
            return None
    
    def get_current_user_context(
        self, 
        token: str, 
        company_id: Optional[int] = None,
        db: Optional[Session] = None
    ) -> Dict[str, Any]:
        """
        Obtener contexto completo del usuario actual
        
        Args:
            token: Token de autenticación
            company_id: ID de compañía (opcional, para cambio de contexto)
            db: Sesión de base de datos
            
        Returns:
            Dict con contexto del usuario y compañía
        """
        if db is None:
            db = get_db_session()
            should_close_db = True
        else:
            should_close_db = False
        
        try:
            # Extraer usuario del token
            user = self.extract_user_from_token(token, db)
            if not user:
                raise HTTPException(status_code=401, detail="Token inválido")
            
            if not user.isActive:
                raise HTTPException(status_code=401, detail="Usuario inactivo")
            
            # Determinar compañía de contexto
            context_company_id = company_id if company_id else user.company_id
            context_company = None
            
            if context_company_id:
                # Verificar acceso a la compañía
                if user.role != "sudo" and user.company_id != context_company_id:
                    raise HTTPException(
                        status_code=403, 
                        detail="Usuario no autorizado para esta compañía"
                    )
                
                # Obtener datos de la compañía
                context_company = db.query(DBCompany).filter(
                    DBCompany.id == context_company_id,
                    DBCompany.isActive == True
                ).first()
                
                if not context_company:
                    raise HTTPException(status_code=404, detail="Compañía no encontrada o inactiva")
            
            # Construir contexto
            context = {
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "name": user.name,
                    "email": user.email,
                    "role": user.role,
                    "company_id": user.company_id,
                    "is_sudo": (user.role == "sudo")
                },
                "company": None,
                "permissions": self._get_user_permissions(user, context_company)
            }
            
            if context_company:
                context["company"] = {
                    "id": context_company.id,
                    "nombre": context_company.nombre,
                    "razonSocial": context_company.razonSocial,
                    "nit": context_company.nit,
                    "estado": context_company.estado,
                    "subscriptionPlan": context_company.subscriptionPlan,
                    "maxUsers": context_company.maxUsers,
                    "maxProducts": context_company.maxProducts,
                    "maxSalesPerMonth": context_company.maxSalesPerMonth
                }
            
            # Cache del contexto
            self._user_contexts[token] = context
            
            return context
            
        finally:
            if should_close_db:
                db.close()
    
    def _get_user_permissions(self, user: DBUser, company: Optional[DBCompany] = None) -> List[str]:
        """Obtener permisos del usuario basado en su rol y compañía"""
        permissions = []
        
        if user.role == "sudo":
            permissions = [
                "system.full_access",
                "companies.create",
                "companies.read",
                "companies.update", 
                "companies.delete",
                "users.manage_all",
                "reports.system",
                "backup.manage"
            ]
        elif user.role == "admin":
            permissions = [
                "company.manage",
                "users.create",
                "users.read",
                "users.update",
                "users.delete",
                "products.create",
                "products.read", 
                "products.update",
                "products.delete",
                "sales.create",
                "sales.read",
                "accounting.read",
                "accounting.write",
                "reports.company",
                "fiscal_docs.manage",
                "business_config.manage"
            ]
        elif user.role == "manager":
            permissions = [
                "products.create",
                "products.read",
                "products.update",
                "sales.create",
                "sales.read",
                "accounting.read",
                "reports.basic",
                "inventory.manage"
            ]
        elif user.role == "cashier":
            permissions = [
                "products.read",
                "sales.create",
                "sales.read_own"
            ]
        
        return permissions
    
    def validate_permission(self, context: Dict[str, Any], required_permission: str) -> bool:
        """Validar si el usuario tiene el permiso requerido"""
        user_permissions = context.get("permissions", [])
        
        # SUDO tiene acceso total
        if context.get("user", {}).get("is_sudo", False):
            return True
        
        # Verificar permiso específico
        return required_permission in user_permissions
    
    def get_company_filter(self, context: Dict[str, Any]) -> Optional[int]:
        """
        Obtener company_id para filtrar consultas
        Returns None para usuarios SUDO (sin filtro), company_id para otros usuarios
        """
        user = context.get("user", {})
        
        # SUDO puede ver todo
        if user.get("is_sudo", False):
            return None
        
        # Otros usuarios solo ven datos de su compañía
        company = context.get("company")
        if company:
            return company["id"]
        
        # Usuarios sin compañía no pueden ver nada
        return -1  # ID imposible para bloquear consultas
    
    def apply_company_filter(self, query, model_class, context: Dict[str, Any]):
        """
        Aplicar filtro de compañía automáticamente a una consulta SQLAlchemy
        
        Args:
            query: Consulta SQLAlchemy
            model_class: Clase del modelo que tiene company_id
            context: Contexto del usuario
            
        Returns:
            Query filtrada por compañía
        """
        company_id = self.get_company_filter(context)
        
        # SUDO sin filtro
        if company_id is None:
            return query
        
        # Aplicar filtro de compañía
        if hasattr(model_class, 'company_id'):
            return query.filter(model_class.company_id == company_id)
        
        # Si el modelo no tiene company_id, retornar query original
        return query
    
    def validate_company_access(
        self, 
        context: Dict[str, Any], 
        target_company_id: int
    ) -> bool:
        """
        Validar si el usuario puede acceder a una compañía específica
        """
        user = context.get("user", {})
        
        # SUDO puede acceder a cualquier compañía
        if user.get("is_sudo", False):
            return True
        
        # Otros usuarios solo pueden acceder a su compañía
        user_company_id = user.get("company_id")
        return user_company_id == target_company_id
    
    def ensure_company_access(
        self, 
        context: Dict[str, Any], 
        target_company_id: int
    ):
        """
        Verificar acceso a compañía, lanzar excepción si no autorizado
        """
        if not self.validate_company_access(context, target_company_id):
            raise HTTPException(
                status_code=403,
                detail="No autorizado para acceder a esta compañía"
            )
    
    def get_available_companies(
        self, 
        context: Dict[str, Any],
        db: Optional[Session] = None
    ) -> List[Dict[str, Any]]:
        """
        Obtener lista de compañías disponibles para el usuario
        """
        if db is None:
            db = get_db_session()
            should_close_db = True
        else:
            should_close_db = False
        
        try:
            user = context.get("user", {})
            
            if user.get("is_sudo", False):
                # SUDO ve todas las compañías activas
                companies = db.query(DBCompany).filter(
                    DBCompany.isActive == True
                ).all()
            else:
                # Otros usuarios solo ven su compañía
                user_company_id = user.get("company_id")
                if not user_company_id:
                    return []
                
                companies = db.query(DBCompany).filter(
                    DBCompany.id == user_company_id,
                    DBCompany.isActive == True
                ).all()
            
            return [
                {
                    "id": company.id,
                    "nombre": company.nombre,
                    "razonSocial": company.razonSocial,
                    "nit": company.nit,
                    "estado": company.estado
                }
                for company in companies
            ]
            
        finally:
            if should_close_db:
                db.close()


# Instancia global del servicio
context_service = CompanyContextService()


# Dependency para obtener contexto en endpoints
def get_current_context(
    request: Request,
    company_id: Optional[int] = None,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Dependency para obtener contexto actual del usuario en endpoints
    """
    # Extraer token del header Authorization
    authorization = request.headers.get("Authorization")
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token de autorización requerido")
    
    token = authorization.split("Bearer ")[1]
    
    return context_service.get_current_user_context(
        token=token,
        company_id=company_id,
        db=db
    )


# Decorador para validar permisos
def require_permission(permission: str):
    """
    Decorador para endpoints que requieren permisos específicos
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            # Buscar el contexto en los argumentos
            context = None
            for arg in args:
                if isinstance(arg, dict) and "user" in arg and "permissions" in arg:
                    context = arg
                    break
            
            if not context:
                # Buscar en kwargs
                context = kwargs.get("context")
            
            if not context:
                raise HTTPException(status_code=500, detail="Contexto no encontrado")
            
            if not context_service.validate_permission(context, permission):
                raise HTTPException(
                    status_code=403,
                    detail=f"Permiso requerido: {permission}"
                )
            
            return func(*args, **kwargs)
        return wrapper
    return decorator
