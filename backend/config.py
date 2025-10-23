"""
Configuración del sistema Super POS
"""

from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Configuración de la aplicación
    app_name: str = "Super POS API"
    app_version: str = "1.0.0"
    debug: bool = True
    
    # Configuración del servidor
    host: str = "0.0.0.0"
    port: int = 3000
    
    # Configuración de CORS
    cors_origins: List[str] = ["http://localhost:4200"]
    
    # Configuración de JWT (para futura implementación)
    secret_key: str = "your-super-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # Configuración de base de datos (para futura implementación)
    database_url: str = "sqlite:///./superpos.db"
    
    # Configuración de la empresa
    company_name: str = "Super POS"
    company_address: str = "Calle Principal 123, Ciudad"
    company_phone: str = "+1234567890"
    company_email: str = "info@superpos.com"
    company_tax_id: str = "12345678-9"
    
    # Configuración de impuestos
    default_tax_rate: float = 15.0
    
    class Config:
        env_file = ".env"
        case_sensitive = False

# Instancia global de configuración
settings = Settings()
