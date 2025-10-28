"""
Configuración del sistema Super POS
Soporta configuración por entornos (desarrollo/producción)
"""

import os
from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Configuración del entorno
    environment: str = os.getenv("ENVIRONMENT", "development")  # development, staging, production
    app_name: str = "Super POS API"
    app_version: str = "1.0.0"
    debug: bool = os.getenv("DEBUG", "true").lower() == "true"
    
    # Configuración del servidor
    host: str = os.getenv("HOST", "0.0.0.0")
    port: int = int(os.getenv("PORT", "3000"))
    
    # Configuración de CORS
    cors_origins: str = os.getenv("CORS_ORIGINS", "http://localhost:4200")
    
    # Configuración de JWT
    secret_key: str = os.getenv("SECRET_KEY", "your-super-secret-key-change-in-production")
    algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    access_token_expire_minutes: int = int(os.getenv("JWT_EXPIRATION_MINUTES", "30"))
    refresh_token_expire_days: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
    
    # Configuración de base de datos
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./superpos.db")
    database_pool_size: int = int(os.getenv("DATABASE_POOL_SIZE", "5"))
    database_max_overflow: int = int(os.getenv("DATABASE_MAX_OVERFLOW", "10"))
    
    # Configuración de la empresa
    company_name: str = os.getenv("COMPANY_NAME", "Super POS")
    company_address: str = os.getenv("COMPANY_ADDRESS", "Calle Principal 123, Ciudad")
    company_phone: str = os.getenv("COMPANY_PHONE", "+1234567890")
    company_email: str = os.getenv("COMPANY_EMAIL", "info@superpos.com")
    company_tax_id: str = os.getenv("COMPANY_TAX_ID", "12345678-9")
    
    # Configuración de impuestos
    default_tax_rate: float = float(os.getenv("DEFAULT_TAX_RATE", "15.0"))
    
    @property
    def is_production(self) -> bool:
        """Verificar si estamos en producción"""
        return self.environment.lower() == "production"
    
    @property
    def is_development(self) -> bool:
        """Verificar si estamos en desarrollo"""
        return self.environment.lower() == "development"
    
    def get_cors_origins(self) -> List[str]:
        """Obtener lista de orígenes CORS permitidos"""
        if self.cors_origins:
            return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]
        return ["http://localhost:4200"]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False

# Instancia global de configuración
settings = Settings()
