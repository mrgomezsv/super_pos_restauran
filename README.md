# 🛒 Super POS - Sistema de Punto de Ventas

Sistema completo de punto de ventas desarrollado en Angular para supermercados, con funcionalidades similares al POS de Odoo, incluyendo facturación con formatos de **Consumidor Final** y **Crédito Fiscal**.

## 🚀 Características Principales

### 💳 **Punto de Venta**
- Interfaz intuitiva tipo POS
- Búsqueda rápida de productos por código o nombre
- Carrito de compras en tiempo real
- Cálculo automático de impuestos
- Múltiples métodos de pago (efectivo, tarjeta, transferencia)
- Gestión de cambio automático

### 📄 **Facturación**
- **Consumidor Final**: Para ventas al por menor
- **Crédito Fiscal**: Con datos del cliente para facturación formal
- Números de factura automáticos con correlativos
- Impresión de tickets (funcionalidad preparada)
- Historial completo de ventas con persistencia real

### 🔒 **Persistencia y Datos**
- **SQLite**: Base de datos real con persistencia completa
- **Movimientos de inventario**: Actualizaciones automáticas de stock
- **Historial de ventas**: Registro completo de todas las transacciones
- **Datos seguros**: Todo persiste después de reiniciar el servidor

### 👥 **Gestión de Usuarios**
- Sistema de autenticación seguro
- Roles: Administrador, Gerente, Cajero
- Control de acceso por permisos
- Gestión de sesiones activas

### 📦 **Gestión de Ingredientes**
- CRUD completo de productos
- Categorización y marcas
- Control de stock con alertas
- Códigos de barras
- Configuración de impuestos por producto

### 📊 **Reportes y Análisis**
- Dashboard con métricas clave
- Reportes de ventas por período
- Análisis por método de pago
- Estadísticas por tipo de factura
- Exportación de datos

## 🛠️ Tecnologías Utilizadas

- **Frontend**: Angular 18, Angular Material, TypeScript
- **Estilos**: SCSS, Material Design
- **Backend**: FastAPI + Python (con SQLite)
- **Base de Datos**: SQLite con SQLAlchemy (persistencia real)
- **Autenticación**: JWT (simulado)
- **UI/UX**: Material Design, Responsive Design

## 📋 Requisitos del Sistema

- **Frontend**:
  - Node.js 18+ 
  - npm 9+
  - Angular CLI 18+

- **Backend**:
  - Python 3.9+
  - pip (gestor de paquetes Python)

## 🚀 Instalación y Configuración

### 1. Clonar el repositorio
```bash
git clone https://github.com/mrgomezsv/super_pos_restauran.git
cd super_pos_restauran
```

### 2. Configurar el Backend (FastAPI + SQLite)

```bash
# Ir al directorio del backend
cd backend

# Instalar dependencias de Python
pip install -r requirements.txt

# Inicializar la base de datos (solo la primera vez)
python init_db.py
```

### 3. Iniciar el backend
```bash
# En el directorio backend
python main.py

# El servidor iniciará en: http://localhost:3000
```

### 4. Configurar el Frontend

```bash
# En otra terminal, volver al directorio raíz
cd ..

# Instalar dependencias de Node.js
npm install
```

### 5. Iniciar el frontend
```bash
npm start
# o
ng serve
```

### 6. Acceder a la aplicación
- **Frontend**: http://localhost:4200
- **Backend API**: http://localhost:3000/api
- **Documentación API**: http://localhost:3000/docs (Swagger UI automático)

> 🔥 **¡IMPORTANTE!** Ahora todas las transacciones se guardan en `backend/superpos.db` y **persisten después de reiniciar**

## 👤 Usuarios de Prueba

| Usuario | Contraseña | Rol | Descripción |
|---------|------------|-----|-------------|
| `admin` | `admin123` | Administrador | Acceso completo al sistema |
| `cajero1` | `cajero123` | Cajero | Acceso al POS y reportes |

## 🎯 Funcionalidades por Rol

### 👑 **Administrador**
- ✅ Acceso completo al sistema
- ✅ Gestión de usuarios
- ✅ Configuración de productos
- ✅ Reportes avanzados
- ✅ Configuración del negocio y tickets
- ✅ Punto de venta

### 👨‍💼 **Gerente**
- ✅ Punto de venta
- ✅ Gestión de productos
- ✅ Reportes de ventas
- ❌ Gestión de usuarios

### 🛒 **Cajero**
- ✅ Punto de venta
- ✅ Consulta de productos
- ✅ Reportes básicos
- ❌ Gestión de usuarios/productos

## 📱 Capturas de Pantalla

### Login
- Interfaz de inicio de sesión moderna
- Validación en tiempo real
- Mensajes de error claros

### Punto de Venta
- Búsqueda de productos
- Carrito de compras dinámico
- Cálculo automático de totales
- Proceso de pago simplificado

### Dashboard
- Métricas clave en tiempo real
- Gráficos de ventas
- Acciones rápidas
- Resumen del día

## 🔧 Estructura del Proyecto

```
super_pos_restauran/
├── src/                        # 🎨 FRONTEND (Angular)
│   ├── app/
│   │   ├── core/                 # Servicios y modelos compartidos
│   │   │   ├── guards/          # Guards de autenticación
│   │   │   ├── models/          # Interfaces TypeScript
│   │   │   └── services/        # Servicios de API
│   │   ├── features/            # Módulos de funcionalidades
│   │   │   ├── auth/           # Autenticación
│   │   │   ├── pos/            # Punto de venta
│   │   │   ├── products/       # Gestión de productos
│   │   │   ├── users/          # Gestión de usuarios
│   │   │   ├── reports/        # Reportes
│   │   │   ├── configuracion/  # Configuración del negocio
│   │   │   ├── fiscal-documents/# Documentos fiscales
│   │   │   └── dashboard/      # Dashboard principal
│   │   ├── app.component.ts    # Componente principal
│   │   ├── app.routes.ts       # Rutas de la aplicación
│   │   └── app.config.ts       # Configuración global
│   └── styles.scss             # Estilos globales
├── backend/                    # 🔧 BACKEND (FastAPI + SQLite)
│   ├── main.py                 # Servidor principal FastAPI
│   ├── database.py             # Configuración SQLAlchemy + modelos
│   ├── init_db.py              # Inicialización de BD con datos semilla
│   ├── models.py               # Modelos Pydantic (requests/responses)
│   ├── schemas.py              # Esquemas de validación
│   ├── requirements.txt        # Dependencias Python
│   ├── superpos.db            # 📊 Base de datos SQLite (auto-generada)
│   └── test_*.py              # Scripts de pruebas
├── package.json               # Dependencias Node.js
└── README.md                  # Este archivo
```

## 🎨 Personalización

### Temas
El sistema utiliza Angular Material con un tema personalizado. Para modificar los colores:

```scss
// src/styles.scss
$primary: mat-palette($mat-blue, 600);    // Color primario
$accent: mat-palette($mat-green, 600);    // Color de acento
$warn: mat-palette($mat-red, 600);        // Color de advertencia
```

### Configuración de Impuestos
Los impuestos se configuran por producto en la sección de gestión de productos.

## 📊 API Endpoints

### Autenticación
- `POST /api/auth/login` - Iniciar sesión

### Productos
- `GET /api/products` - Listar productos con filtros
- `POST /api/products` - Crear producto (SKU automático)
- `PUT /api/products/:id` - Actualizar producto
- `DELETE /api/products/:id` - Eliminar producto
- `GET /api/products/categories` - Listar categorías
- `GET /api/products/next-sku` - Obtener siguiente SKU disponible
- `GET /api/products/code/:code` - Buscar por código
- `GET /api/products/barcode/:barcode` - Buscar por código de barras

### Ventas (con persistencia SQLite)
- `POST /api/sales` - Crear venta (genera pólizas automáticas)
- `GET /api/sales` - Listar ventas con filtros
- `GET /api/sales/summary` - Resumen de ventas

### Usuarios
- `GET /api/users` - Listar usuarios
- `POST /api/users` - Crear usuario
- `PUT /api/users/:id` - Actualizar usuario

### Configuración de Negocio
- `GET /api/business/config` - Obtener configuración del negocio
- `PUT /api/business/config` - Actualizar configuración del negocio
- `POST /api/business/config/logo` - Subir logo del negocio

### Documentos Fiscales
- `GET /api/fiscal-documents` - Listar documentos fiscales
- `POST /api/fiscal-documents` - Crear documento fiscal
- `PUT /api/fiscal-documents/:id` - Actualizar documento

### Utilidades
- `GET /health` - Health check del API
- `GET /docs` - Documentación automática (Swagger UI)

## 🚀 Despliegue en Producción

### 1. Build del frontend
```bash
# Construir para producción
ng build --configuration production
```

### 2. Preparar el backend
```bash
# En el directorio backend
pip install -r requirements.txt

# Inicializar la base de datos en producción
python init_db.py

# El archivo superpos.db será creado automáticamente
```

### 3. Configurar servidor web
- **Nginx**: Para servir el frontend estático
- **Gunicorn + FastAPI**: Para el backend
- **Supervisor**: Para mantener el proceso corriendo

### 4. Configuración de producción recomendada
```bash
# Instalar Gunicorn
pip install gunicorn

# Ejecutar en producción
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:3000
```

### 5. Respaldos automáticos
```bash
# Script simple para respaldo diario
cp backend/superpos.db backups/superpos_$(date +%Y%m%d).db
```

> ✅ **Ventaja**: Con SQLite no necesitas configurar servidor de BD separado
> ✅ **Portabilidad**: Un solo archivo `superpos.db` contiene todo
> ✅ **Escalabilidad**: SQLite maneja miles de transacciones concurrentes

## 🔒 Seguridad

- Autenticación JWT
- Guards de rutas
- Validación de formularios
- Sanitización de inputs
- Control de acceso por roles

## 📈 Funcionalidades Completadas y Próximas

### ✅ **Funcionalidades Implementadas**
- [x] **Persistencia real con SQLite**
- [x] **Punto de venta completo con carrito dinámico**
- [x] **Facturación consumidor final y crédito fiscal**
- [x] **Gestión de productos con control de inventario**
- [x] **Dashboard con métricas en tiempo real**
- [x] **Reportes de ventas e inventario**
- [x] **Configuración de negocio y tickets personalizables**
- [x] **Sistema multi-rol (Admin, Gerente, Cajero)**
- [x] **API con documentación automática (Swagger)**

### 🎯 **Próximas Funcionalidades**
- [ ] Integración con impresoras térmicas
- [ ] Códigos QR para productos
- [ ] Integración con sistemas de pago externos
- [ ] App móvil (React Native/Flutter)
- [ ] Reportes en PDF automáticos
- [ ] Backup automático programado
- [ ] Multi-idioma (ES/EN)
- [ ] Modo offline (PWA)
- [ ] Dashboard con gráficos en tiempo real
- [ ] Integración con balanzas electrónicas
- [ ] Sistema de descuentos avanzado
- [ ] Programa de fidelidad de clientes

## 🤝 Contribución

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abrir un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 📞 Soporte

Para soporte técnico o preguntas:
- 📧 Email: mrgomez.dev@gmail.com
- 📱 WhatsApp: +503 7756-3510
- 🌐 Website: https://superpos.com

---

**Desarrollado con ❤️ para supermercados modernos**