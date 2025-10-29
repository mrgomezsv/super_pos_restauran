"""
Inicialización de base de datos con datos semilla para Super POS Multi-Tenant
"""

from datetime import datetime
from sqlalchemy.orm import Session
from database import engine, Base, get_db_session
from database import Company, User
from auth import get_password_hash

def create_tables():
    """Crear todas las tablas"""
    print("Creando tablas...")
    Base.metadata.create_all(bind=engine)
    print("Tablas creadas exitosamente")

def init_sudo_user(db: Session):
    """Inicializar usuario SUDO (super administrador)"""
    print("Inicializando usuario SUDO...")
    
    # Verificar si ya existe un usuario SUDO
    if db.query(User).filter(User.role == "sudo").count() > 0:
        print("Usuario SUDO ya existe, omitiendo...")
        return
    
    # Hashear contraseña
    sudo_password = get_password_hash("sudo123")
    
    sudo_user = User(
        company_id=None,  # SUDO no pertenece a ninguna compañía
        username="sudo",
        name="Super Administrador",
        email="sudo@superpos.com",
        password=sudo_password,
        role="sudo",
        isActive=True,
        createdAt=datetime.now()
    )
    
    db.add(sudo_user)
    db.commit()
    print(f"Usuario SUDO creado exitosamente (ID: {sudo_user.id})")
    print(f"  Username: sudo")
    print(f"  Password: sudo123")

def init_demo_company(db: Session):
    """Crear compañía de demostración con datos completos"""
    print("\nCreando compañía de demostración...")
    
    # Verificar si ya existe
    if db.query(Company).count() > 0:
        print("Ya existen compañías, omitiendo creación de demo...")
        return
    
    # Importar servicio de compañías
    from company_service import company_service
    
    # Datos de compañía de demostración
    demo_company_data = {
        "nombre": "Super POS Demo",
        "razonSocial": "Super POS Demostración S.A. de C.V.",
        "nit": "0614-999999-999-9",
        "dui": "99999999-9",
        "telefono": "78889999",
        "email": "demo@superpos.com",
        "direccion": "Calle Principal #123, Colonia Centro",
        "ciudad": "San Salvador",
        "pais": "El Salvador",
        "tipoEmpresa": "retail",
        "contactoPrincipal": "Administrador Demo",
        "limiteCredito": 10000.0,
        "subscriptionPlan": "premium",
        "maxUsers": 10,
        "maxProducts": 5000,
        "maxSalesPerMonth": 2000
    }
    
    # Datos del usuario administrador
    admin_user_data = {
        "username": "admin",
        "name": "Administrador Demo",
        "email": "admin@superpos.com",
        "password": "admin123"
    }
    
    # Crear compañía usando el servicio
    result = company_service.create_company(
        company_data=demo_company_data,
        admin_user_data=admin_user_data,
        db=db
    )
    
    if result["success"]:
        print(f"✅ Compañía de demostración creada exitosamente!")
        print(f"   Company ID: {result['company_id']}")
        print(f"   Admin User ID: {result['admin_user_id']}")
        print(f"   Cuentas creadas: {result['accounts_created']}")
        print(f"   Documentos fiscales: {result['fiscal_docs_created']}")
        print(f"   Categorías: {result['categories_created']}")
        print(f"   Productos de ejemplo: {result['products_created']}")
        print(f"\n   Usuario Admin:")
        print(f"   Username: admin")
        print(f"   Password: admin123")
    else:
        print(f"❌ Error creando compañía: {result['error']}")

def init_demo_company_2(db: Session):
    """Crear segunda compañía de demostración"""
    print("\nCreando segunda compañía de demostración...")
    
    # Verificar si ya existen 2 o más compañías
    if db.query(Company).count() >= 2:
        print("Ya existen múltiples compañías, omitiendo...")
        return
    
    from company_service import company_service
    
    # Datos de segunda compañía
    demo_company_2_data = {
        "nombre": "Restaurante El Buen Sabor",
        "razonSocial": "El Buen Sabor S.A. de C.V.",
        "nit": "0614-888888-888-8",
        "dui": "88888888-8",
        "telefono": "77778888",
        "email": "info@elbuensabor.com",
        "direccion": "Paseo General Escalón #456",
        "ciudad": "San Salvador",
        "pais": "El Salvador",
        "tipoEmpresa": "restaurant",
        "contactoPrincipal": "Carlos Rodríguez",
        "limiteCredito": 5000.0,
        "subscriptionPlan": "basic",
        "maxUsers": 5,
        "maxProducts": 500,
        "maxSalesPerMonth": 1000
    }
    
    admin_user_2_data = {
        "username": "carlos",
        "name": "Carlos Rodríguez",
        "email": "carlos@elbuensabor.com",
        "password": "carlos123"
    }
    
    result = company_service.create_company(
        company_data=demo_company_2_data,
        admin_user_data=admin_user_2_data,
        db=db
    )
    
    if result["success"]:
        print(f"✅ Segunda compañía creada exitosamente!")
        print(f"   Company ID: {result['company_id']}")
        print(f"   Admin User ID: {result['admin_user_id']}")
        print(f"\n   Usuario Admin:")
        print(f"   Username: carlos")
        print(f"   Password: carlos123")
    else:
        print(f"❌ Error creando segunda compañía: {result['error']}")

def init_cajero_user(db: Session):
    """Crear usuario cajero para la primera compañía"""
    print("\nCreando usuario cajero...")
    
    # Verificar si ya existe el usuario cajero1
    if db.query(User).filter(User.username == "cajero1").count() > 0:
        print("Usuario cajero1 ya existe, omitiendo...")
        return
    
    # Obtener la primera compañía
    company = db.query(Company).first()
    if not company:
        print("No hay compañías disponibles, no se puede crear el cajero")
        return
    
    # Hashear contraseña
    cajero_password = get_password_hash("cajero123")
    
    cajero_user = User(
        company_id=company.id,
        username="cajero1",
        name="Juan Pérez",
        email="juan@superpos.com",
        password=cajero_password,
        role="cashier",
        isActive=True,
        createdAt=datetime.now()
    )
    
    db.add(cajero_user)
    db.commit()
    print(f"✅ Usuario cajero creado exitosamente!")
    print(f"   Company ID: {company.id}")
    print(f"   Username: cajero1")
    print(f"   Password: cajero123")

def initialize_database():
    """Función principal para inicializar toda la base de datos"""
    print("=" * 60)
    print("=== INICIALIZANDO BASE DE DATOS SUPER POS MULTI-TENANT ===")
    print("=" * 60)
    
    # Crear tablas
    create_tables()
    
    # Obtener sesión de BD
    db = get_db_session()
    
    try:
        # 1. Crear usuario SUDO (super administrador del sistema)
        init_sudo_user(db)
        
        # 2. Crear compañía de demostración con datos completos
        init_demo_company(db)
        
        # 3. Crear segunda compañía de demostración (opcional)
        init_demo_company_2(db)
        
        # 4. Crear usuario cajero para la primera compañía
        init_cajero_user(db)
        
        print("\n" + "=" * 60)
        print("=== BASE DE DATOS INICIALIZADA EXITOSAMENTE ===")
        print("=" * 60)
        print("\n📋 USUARIOS DISPONIBLES:")
        print("\n1️⃣  Usuario SUDO (Super Administrador):")
        print("   Username: sudo")
        print("   Password: sudo123")
        print("   Rol: Acceso total al sistema y todas las compañías")
        
        print("\n2️⃣  Usuario Admin - Super POS Demo:")
        print("   Username: admin")
        print("   Password: admin123")
        print("   Rol: Administrador de la compañía Super POS Demo")
        
        print("\n3️⃣  Usuario Admin - El Buen Sabor:")
        print("   Username: carlos")
        print("   Password: carlos123")
        print("   Rol: Administrador de la compañía El Buen Sabor")
        
        print("\n4️⃣  Usuario Cajero - Super POS Demo:")
        print("   Username: cajero1")
        print("   Password: cajero123")
        print("   Rol: Cajero de la compañía Super POS Demo")
        
        print("\n" + "=" * 60)
        
    except Exception as e:
        print(f"\n❌ Error inicializando base de datos: {e}")
        db.rollback()
        raise e
    
    finally:
        db.close()

if __name__ == "__main__":
    initialize_database()
