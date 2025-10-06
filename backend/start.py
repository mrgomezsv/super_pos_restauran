"""
Script de inicio para el servidor Super POS
"""

import uvicorn
from config import settings

if __name__ == "__main__":
    print("Iniciando Super POS API...")
    print(f"Documentacion disponible en: http://localhost:{settings.port}/docs")
    print(f"Redoc disponible en: http://localhost:{settings.port}/redoc")
    print(f"Usuarios de prueba:")
    print(f"   Admin: admin / admin123")
    print(f"   Cajero: cajero1 / cajero123")
    print("=" * 50)
    
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level="info"
    )
