"""
Módulo de autenticación con JWT
Provee funciones para crear y validar tokens JWT con refresh tokens
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from fastapi import HTTPException, status
from passlib.context import CryptContext

from config import settings

# Contexto para hashing de contraseñas
# Inicializar con configuración explícita para evitar errores
try:
    pwd_context = CryptContext(
        schemes=["bcrypt"],
        bcrypt__rounds=12,
        deprecated="auto"
    )
except Exception:
    # Fallback si hay problemas con la inicialización
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verificar contraseña contra hash"""
    try:
        # Intentar con passlib primero
        result = pwd_context.verify(plain_password, hashed_password)
        return result
    except Exception:
        # Fallback: usar bcrypt directamente
        try:
            import bcrypt
            # Si el hash parece ser bcrypt (empieza con $2a$ o $2b$)
            if hashed_password.startswith('$2a$') or hashed_password.startswith('$2b$') or hashed_password.startswith('$2y$'):
                return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
        except Exception:
            pass
        # Último fallback: comparación directa solo para migración (texto plano)
        return False

def get_password_hash(password: str) -> str:
    """Hashear contraseña"""
    # Truncar si es muy larga (bcrypt tiene límite de 72 bytes)
    if len(password.encode('utf-8')) > 72:
        password = password[:72]
    try:
        return pwd_context.hash(password)
    except Exception as e:
        # Si falla, usar hash simple como último recurso
        import hashlib
        return hashlib.sha256(password.encode()).hexdigest()

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Crear token JWT de acceso
    
    Args:
        data: Datos a incluir en el token (user_id, company_id, role, etc.)
        expires_delta: Tiempo de expiración personalizado
        
    Returns:
        Token JWT codificado
    """
    to_encode = data.copy()
    
    # Calcular expiración
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),  # Issued at
        "type": "access"  # Tipo de token
    })
    
    encoded_jwt = jwt.encode(
        to_encode, 
        settings.secret_key, 
        algorithm=settings.algorithm
    )
    return encoded_jwt

def create_refresh_token(data: Dict[str, Any]) -> str:
    """
    Crear token JWT de refresco
    
    Args:
        data: Datos a incluir en el token (user_id, company_id, etc.)
        
    Returns:
        Token JWT de refresco codificado
    """
    to_encode = data.copy()
    
    # Refresh tokens duran más tiempo
    expire = datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days)
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "refresh"  # Tipo de token
    })
    
    encoded_jwt = jwt.encode(
        to_encode,
        settings.secret_key,
        algorithm=settings.algorithm
    )
    return encoded_jwt

def decode_token(token: str, token_type: str = "access") -> Dict[str, Any]:
    """
    Decodificar y validar token JWT
    
    Args:
        token: Token JWT a decodificar
        token_type: Tipo esperado del token ("access" o "refresh")
        
    Returns:
        Payload del token decodificado
        
    Raises:
        HTTPException: Si el token es inválido o ha expirado
    """
    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.algorithm]
        )
        
        # Verificar tipo de token
        if payload.get("type") != token_type:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Tipo de token inválido. Se esperaba {token_type}"
            )
        
        # Verificar expiración (jwt.decode ya lo hace, pero verificamos explícitamente)
        exp = payload.get("exp")
        if exp and datetime.fromtimestamp(exp) < datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token expirado"
            )
        
        return payload
        
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token inválido: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Error al validar token: {str(e)}"
        )

def extract_user_from_token(token: str) -> Dict[str, Any]:
    """
    Extraer información del usuario desde un token de acceso
    
    Args:
        token: Token JWT de acceso
        
    Returns:
        Diccionario con información del usuario (user_id, company_id, role, etc.)
    """
    # Intentar decodificar como token JWT primero
    try:
        payload = decode_token(token, token_type="access")
        
        # Si es un token JWT válido, retornar sus datos
        return {
            "user_id": payload.get("sub"),  # Subject (user_id)
            "company_id": payload.get("company_id"),
            "role": payload.get("role"),
            "username": payload.get("username")
        }
    except HTTPException:
        # Si falla, intentar con formato mock_token (compatibilidad temporal)
        if token.startswith("mock_token_"):
            parts = token.split("_")
            if len(parts) >= 3:
                try:
                    user_id = int(parts[2])
                    return {
                        "user_id": user_id,
                        "company_id": None,
                        "role": None,
                        "username": None
                    }
                except ValueError:
                    pass
    
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido o formato no soportado"
    )

def verify_token(token: str) -> Dict[str, Any]:
    """
    Verificar token (alias para decode_token para compatibilidad)
    
    Args:
        token: Token JWT a verificar
        
    Returns:
        Payload del token decodificado
    """
    return decode_token(token, token_type="access")

