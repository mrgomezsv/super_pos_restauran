"""
Servicio de gestión de compañías multi-tenant
Maneja la creación automática de compañías con datos base
"""

from datetime import datetime
from typing import Optional, Dict, List
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from database import (
    get_db_session, Company as DBCompany, User as DBUser, Account as DBAccount,
    FiscalDocument as DBFiscalDocument, ProductCategory as DBProductCategory,
    Product as DBProduct
)

class CompanyService:
    """Servicio para gestión de compañías multi-tenant"""
    
    def __init__(self):
        self.default_accounts = [
            # Activos
            {"code": "1", "name": "ACTIVOS", "accountType": "activo", "nature": "deudora", "level": 1, "parentId": None},
            {"code": "11", "name": "ACTIVO CORRIENTE", "accountType": "activo", "nature": "deudora", "level": 2, "parentId": None},
            {"code": "1101", "name": "CAJA", "accountType": "activo", "nature": "deudora", "level": 3, "parentId": None},
            {"code": "1102", "name": "BANCOS", "accountType": "activo", "nature": "deudora", "level": 3, "parentId": None},
            {"code": "1103", "name": "INVENTARIOS", "accountType": "activo", "nature": "deudora", "level": 3, "parentId": None},
            {"code": "1104", "name": "CUENTAS POR COBRAR", "accountType": "activo", "nature": "deudora", "level": 3, "parentId": None},
            {"code": "12", "name": "ACTIVO NO CORRIENTE", "accountType": "activo", "nature": "deudora", "level": 2, "parentId": None},
            {"code": "1201", "name": "PROPIEDAD, PLANTA Y EQUIPO", "accountType": "activo", "nature": "deudora", "level": 3, "parentId": None},
            
            # Pasivos
            {"code": "2", "name": "PASIVOS", "accountType": "pasivo", "nature": "acreedora", "level": 1, "parentId": None},
            {"code": "21", "name": "PASIVO CORRIENTE", "accountType": "pasivo", "nature": "acreedora", "level": 2, "parentId": None},
            {"code": "2101", "name": "CUENTAS POR PAGAR", "accountType": "pasivo", "nature": "acreedora", "level": 3, "parentId": None},
            {"code": "2102", "name": "IVA DÉBITO FISCAL", "accountType": "pasivo", "nature": "acreedora", "level": 3, "parentId": None},
            {"code": "2103", "name": "IVA CRÉDITO FISCAL", "accountType": "pasivo", "nature": "deudora", "level": 3, "parentId": None},
            
            # Patrimonio
            {"code": "3", "name": "PATRIMONIO", "accountType": "patrimonio", "nature": "acreedora", "level": 1, "parentId": None},
            {"code": "3101", "name": "CAPITAL SOCIAL", "accountType": "patrimonio", "nature": "acreedora", "level": 3, "parentId": None},
            {"code": "3201", "name": "UTILIDADES RETENIDAS", "accountType": "patrimonio", "nature": "acreedora", "level": 3, "parentId": None},
            
            # Ingresos
            {"code": "4", "name": "INGRESOS", "accountType": "ingreso", "nature": "acreedora", "level": 1, "parentId": None},
            {"code": "4101", "name": "VENTAS", "accountType": "ingreso", "nature": "acreedora", "level": 3, "parentId": None},
            {"code": "4201", "name": "OTROS INGRESOS", "accountType": "ingreso", "nature": "acreedora", "level": 3, "parentId": None},
            
            # Gastos
            {"code": "5", "name": "GASTOS", "accountType": "gasto", "nature": "deudora", "level": 1, "parentId": None},
            {"code": "5101", "name": "COSTO DE VENTAS", "accountType": "gasto", "nature": "deudora", "level": 3, "parentId": None},
            {"code": "5201", "name": "GASTOS OPERATIVOS", "accountType": "gasto", "nature": "deudora", "level": 3, "parentId": None},
            {"code": "5301", "name": "GASTOS ADMINISTRATIVOS", "accountType": "gasto", "nature": "deudora", "level": 3, "parentId": None},
        ]
        
        self.default_fiscal_documents = [
            {
                "code": "consumidor_final",
                "name": "Consumidor Final",
                "description": "Documento para ventas a consumidor final",
                "prefix": "CF",
                "initialCorrelative": 1
            },
            {
                "code": "credito_fiscal", 
                "name": "Crédito Fiscal",
                "description": "Documento para ventas con crédito fiscal",
                "prefix": "CCF", 
                "initialCorrelative": 1
            },
            {
                "code": "nota_credito",
                "name": "Nota de Crédito",
                "description": "Documento para devoluciones y ajustes",
                "prefix": "NC",
                "initialCorrelative": 1
            },
            {
                "code": "nota_debito", 
                "name": "Nota de Débito",
                "description": "Documento para cargos adicionales",
                "prefix": "ND",
                "initialCorrelative": 1
            },
            {
                "code": "nota_remision",
                "name": "Nota de Remisión",
                "description": "Documento para entrega de bienes cuando el CCF no se emite simultáneamente",
                "prefix": "NR",
                "initialCorrelative": 1
            },
            {
                "code": "comprobante_retencion",
                "name": "Comprobante de Retención",
                "description": "Documento para retención de IVA",
                "prefix": "CR",
                "initialCorrelative": 1
            },
            {
                "code": "comprobante_liquidacion",
                "name": "Comprobante de Liquidación",
                "description": "Documento para ventas como mandatario en nombre de terceros",
                "prefix": "CL",
                "initialCorrelative": 1
            },
            {
                "code": "factura_exportacion",
                "name": "Factura de Exportación",
                "description": "Documento para operaciones de exportación de bienes o servicios",
                "prefix": "FE",
                "initialCorrelative": 1
            },
            {
                "code": "factura_sujeto_excluido",
                "name": "Factura de Sujeto Excluido",
                "description": "Documento para contribuyentes exentos de trasladar IVA",
                "prefix": "FSE",
                "initialCorrelative": 1
            },
            {
                "code": "comprobante_donacion",
                "name": "Comprobante de Donación",
                "description": "Documento para respaldar donaciones realizadas",
                "prefix": "CD",
                "initialCorrelative": 1
            }
        ]
        
        self.default_categories = [
            {"name": "Alimentos", "description": "Productos alimenticios"},
            {"name": "Bebidas", "description": "Bebidas y refrescos"},
            {"name": "Limpieza", "description": "Productos de limpieza y aseo"},
            {"name": "Cuidado Personal", "description": "Productos de higiene personal"},
            {"name": "Hogar", "description": "Artículos para el hogar"},
            {"name": "Electrónicos", "description": "Dispositivos electrónicos"},
            {"name": "Ropa", "description": "Vestimenta y accesorios"},
            {"name": "Otros", "description": "Productos varios"}
        ]
    
    def create_company(
        self,
        company_data: Dict,
        admin_user_data: Dict,
        db: Optional[Session] = None
    ) -> Dict:
        """
        Crear nueva compañía con configuración completa
        
        Args:
            company_data: Datos de la compañía
            admin_user_data: Datos del usuario administrador
            db: Sesión de base de datos (opcional)
            
        Returns:
            Dict con resultado de la operación
        """
        if db is None:
            db = get_db_session()
            should_close_db = True
        else:
            should_close_db = False
        
        try:
            # 1. Verificar que no exista una compañía con el mismo NIT
            existing_company = db.query(DBCompany).filter(
                DBCompany.nit == company_data["nit"]
            ).first()
            
            if existing_company:
                return {
                    "success": False,
                    "error": "Ya existe una compañía con este NIT",
                    "company_id": None
                }
            
            # 2. Crear la compañía
            new_company = DBCompany(
                nombre=company_data["nombre"],
                razonSocial=company_data["razonSocial"],
                nit=company_data["nit"],
                dui=company_data.get("dui"),
                telefono=company_data.get("telefono"),
                email=company_data["email"],
                direccion=company_data.get("direccion"),
                ciudad=company_data.get("ciudad", "San Salvador"),
                pais=company_data.get("pais", "El Salvador"),
                tipoEmpresa=company_data["tipoEmpresa"],
                contactoPrincipal=company_data.get("contactoPrincipal"),
                limiteCredito=company_data.get("limiteCredito", 0.0),
                subscriptionPlan=company_data.get("subscriptionPlan", "basic"),
                maxUsers=company_data.get("maxUsers", 5),
                maxProducts=company_data.get("maxProducts", 1000),
                maxSalesPerMonth=company_data.get("maxSalesPerMonth", 500),
                createdAt=datetime.now(),
                updatedAt=datetime.now()
            )
            
            db.add(new_company)
            db.flush()  # Para obtener el ID
            
            # 3. Crear usuario administrador
            admin_result = self._create_admin_user(
                company_id=new_company.id,
                admin_user_data=admin_user_data,
                db=db
            )
            
            if not admin_result["success"]:
                db.rollback()
                return admin_result
            
            # 4. Asignar el adminUserId a la compañía
            new_company.adminUserId = admin_result["user_id"]
            
            # 5. Crear catálogo de cuentas base
            accounts_result = self._create_default_accounts(new_company.id, db)
            if not accounts_result["success"]:
                db.rollback()
                return accounts_result
            
            # 6. Crear documentos fiscales base
            fiscal_docs_result = self._create_default_fiscal_documents(new_company.id, db)
            if not fiscal_docs_result["success"]:
                db.rollback()
                return fiscal_docs_result
            
            # 7. Crear categorías base
            categories_result = self._create_default_categories(new_company.id, db)
            if not categories_result["success"]:
                db.rollback()
                return categories_result
            
            # 8. Crear productos de ejemplo (opcional)
            products_result = self._create_sample_products(new_company.id, db)
            if not products_result["success"]:
                # Los productos de ejemplo no son críticos, solo log warning
                print(f"Warning: No se pudieron crear productos de ejemplo: {products_result['error']}")
            
            db.commit()
            
            return {
                "success": True,
                "message": "Compañía creada exitosamente",
                "company_id": new_company.id,
                "admin_user_id": admin_result["user_id"],
                "accounts_created": accounts_result.get("count", 0),
                "fiscal_docs_created": fiscal_docs_result.get("count", 0),
                "categories_created": categories_result.get("count", 0),
                "products_created": products_result.get("count", 0)
            }
            
        except IntegrityError as e:
            db.rollback()
            return {
                "success": False,
                "error": f"Error de integridad de datos: {str(e)}",
                "company_id": None
            }
        except Exception as e:
            db.rollback()
            return {
                "success": False,
                "error": f"Error inesperado: {str(e)}",
                "company_id": None
            }
        finally:
            if should_close_db:
                db.close()
    
    def _create_admin_user(
        self, 
        company_id: int, 
        admin_user_data: Dict,
        db: Session
    ) -> Dict:
        """Crear usuario administrador para la compañía"""
        try:
            # Verificar que no exista username duplicado en la misma compañía
            existing_user = db.query(DBUser).filter(
                DBUser.username == admin_user_data["username"],
                DBUser.company_id == company_id
            ).first()
            
            if existing_user:
                return {
                    "success": False,
                    "error": "Ya existe un usuario con este nombre en la compañía",
                    "user_id": None
                }
            
            # Hashear contraseña antes de guardar
            from auth import get_password_hash
            hashed_password = get_password_hash(admin_user_data["password"])
            
            new_admin = DBUser(
                company_id=company_id,
                username=admin_user_data["username"],
                name=admin_user_data["name"],
                email=admin_user_data["email"],
                password=hashed_password,
                role="admin",
                isActive=True,
                createdAt=datetime.now()
            )
            
            db.add(new_admin)
            db.flush()
            
            return {
                "success": True,
                "user_id": new_admin.id,
                "message": "Usuario administrador creado exitosamente"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Error creando usuario administrador: {str(e)}",
                "user_id": None
            }
    
    def _create_default_accounts(self, company_id: int, db: Session) -> Dict:
        """Crear catálogo de cuentas base para la compañía"""
        try:
            created_count = 0
            account_id_map = {}  # Para mapear códigos a IDs
            
            # Crear cuentas en orden de nivel para manejar dependencias
            for level in [1, 2, 3]:
                level_accounts = [acc for acc in self.default_accounts if acc["level"] == level]
                
                for account_data in level_accounts:
                    # Determinar parentId basado en el código
                    parent_id = None
                    if level > 1:
                        # Buscar cuenta padre basado en código
                        if len(account_data["code"]) == 2:  # Nivel 2
                            parent_code = account_data["code"][:1]  # Primer dígito
                        elif len(account_data["code"]) == 4:  # Nivel 3
                            parent_code = account_data["code"][:2]  # Primeros dos dígitos
                        else:
                            parent_code = None
                            
                        if parent_code and parent_code in account_id_map:
                            parent_id = account_id_map[parent_code]
                    
                    new_account = DBAccount(
                        company_id=company_id,
                        code=account_data["code"],
                        name=account_data["name"],
                        accountType=account_data["accountType"],
                        nature=account_data["nature"],
                        level=account_data["level"],
                        parentId=parent_id,
                        isActive=True,
                        createdAt=datetime.now(),
                        updatedAt=datetime.now()
                    )
                    
                    db.add(new_account)
                    db.flush()  # Para obtener ID
                    
                    # Guardar mapeo de código a ID
                    account_id_map[account_data["code"]] = new_account.id
                    created_count += 1
            
            return {
                "success": True,
                "count": created_count,
                "message": f"Catálogo de cuentas creado: {created_count} cuentas"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Error creando cuentas: {str(e)}",
                "count": 0
            }
    
    def _create_default_fiscal_documents(self, company_id: int, db: Session) -> Dict:
        """Crear documentos fiscales base"""
        try:
            created_count = 0
            
            for doc_data in self.default_fiscal_documents:
                new_doc = DBFiscalDocument(
                    company_id=company_id,
                    code=doc_data["code"],
                    name=doc_data["name"],
                    description=doc_data["description"],
                    prefix=doc_data["prefix"],
                    initialCorrelative=doc_data["initialCorrelative"],
                    currentCorrelative=doc_data["initialCorrelative"],
                    isActive=True,
                    createdAt=datetime.now(),
                    updatedAt=datetime.now()
                )
                
                db.add(new_doc)
                created_count += 1
            
            return {
                "success": True,
                "count": created_count,
                "message": f"Documentos fiscales creados: {created_count}"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Error creando documentos fiscales: {str(e)}",
                "count": 0
            }
    
    def _create_default_categories(self, company_id: int, db: Session) -> Dict:
        """Crear categorías de productos base"""
        try:
            created_count = 0
            
            for cat_data in self.default_categories:
                new_category = DBProductCategory(
                    company_id=company_id,
                    name=cat_data["name"],
                    description=cat_data["description"],
                    isActive=True
                )
                
                db.add(new_category)
                created_count += 1
            
            return {
                "success": True,
                "count": created_count,
                "message": f"Categorías creadas: {created_count}"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Error creando categorías: {str(e)}",
                "count": 0
            }
    
    def _create_sample_products(self, company_id: int, db: Session) -> Dict:
        """Crear productos de ejemplo"""
        try:
            sample_products = [
                {
                    "code": "SKU00001",
                    "name": "Producto de Ejemplo 1",
                    "description": "Primer producto de ejemplo para la compañía",
                    "price": 10.00,
                    "cost": 7.50,
                    "category": "Otros",
                    "brand": "Ejemplo",
                    "stock": 100,
                    "minStock": 10,
                    "maxStock": 500,
                    "taxRate": 13.0
                },
                {
                    "code": "SKU00002", 
                    "name": "Producto de Ejemplo 2",
                    "description": "Segundo producto de ejemplo",
                    "price": 25.00,
                    "cost": 18.75,
                    "category": "Otros",
                    "brand": "Ejemplo",
                    "stock": 50,
                    "minStock": 5,
                    "maxStock": 200,
                    "taxRate": 13.0
                }
            ]
            
            created_count = 0
            
            for product_data in sample_products:
                new_product = DBProduct(
                    company_id=company_id,
                    code=product_data["code"],
                    name=product_data["name"],
                    description=product_data["description"],
                    price=product_data["price"],
                    cost=product_data["cost"],
                    category=product_data["category"],
                    brand=product_data["brand"],
                    stock=product_data["stock"],
                    minStock=product_data["minStock"],
                    maxStock=product_data["maxStock"],
                    taxRate=product_data["taxRate"],
                    isActive=True,
                    createdAt=datetime.now(),
                    updatedAt=datetime.now()
                )
                
                db.add(new_product)
                created_count += 1
            
            return {
                "success": True,
                "count": created_count,
                "message": f"Productos de ejemplo creados: {created_count}"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Error creando productos de ejemplo: {str(e)}",
                "count": 0
            }
    
    def get_company_by_id(self, company_id: int, db: Optional[Session] = None) -> Optional[DBCompany]:
        """Obtener compañía por ID"""
        if db is None:
            db = get_db_session()
            should_close_db = True
        else:
            should_close_db = False
            
        try:
            company = db.query(DBCompany).filter(DBCompany.id == company_id).first()
            return company
        finally:
            if should_close_db:
                db.close()
    
    def get_companies_list(self, active_only: bool = True, db: Optional[Session] = None) -> List[DBCompany]:
        """Obtener lista de compañías"""
        if db is None:
            db = get_db_session()
            should_close_db = True
        else:
            should_close_db = False
            
        try:
            query = db.query(DBCompany)
            if active_only:
                query = query.filter(DBCompany.isActive == True)
            
            return query.all()
        finally:
            if should_close_db:
                db.close()
    
    def update_company_status(
        self, 
        company_id: int, 
        new_status: str,
        db: Optional[Session] = None
    ) -> Dict:
        """Actualizar estado de compañía"""
        if db is None:
            db = get_db_session()
            should_close_db = True
        else:
            should_close_db = False
            
        try:
            company = db.query(DBCompany).filter(DBCompany.id == company_id).first()
            if not company:
                return {
                    "success": False,
                    "error": "Compañía no encontrada"
                }
            
            old_status = company.estado
            company.estado = new_status
            company.updatedAt = datetime.now()
            
            db.commit()
            
            return {
                "success": True,
                "message": f"Estado actualizado de '{old_status}' a '{new_status}'",
                "company_id": company_id
            }
            
        except Exception as e:
            db.rollback()
            return {
                "success": False,
                "error": f"Error actualizando estado: {str(e)}"
            }
        finally:
            if should_close_db:
                db.close()


# Instancia global del servicio
company_service = CompanyService()
