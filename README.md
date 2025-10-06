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
- Números de factura automáticos
- Impresión de tickets (funcionalidad preparada)
- Historial completo de ventas

### 👥 **Gestión de Usuarios**
- Sistema de autenticación seguro
- Roles: Administrador, Gerente, Cajero
- Control de acceso por permisos
- Gestión de sesiones activas

### 📦 **Gestión de Productos**
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
- **Backend**: Node.js + Express (Mock para desarrollo)
- **Base de Datos**: JSON (simulada, fácil migración a DB real)
- **Autenticación**: JWT (simulado)
- **UI/UX**: Material Design, Responsive Design

## 📋 Requisitos del Sistema

- Node.js 18+ 
- npm 9+
- Angular CLI 18+

## 🚀 Instalación y Configuración

### 1. Clonar el repositorio
```bash
git clone <url-del-repositorio>
cd super-pos
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Iniciar el backend simulado
```bash
# En una terminal separada
node mock-backend.js
```

### 4. Iniciar el frontend
```bash
# En otra terminal
npm start
# o
ng serve
```

### 5. Acceder a la aplicación
- **Frontend**: http://localhost:4200
- **Backend API**: http://localhost:3000/api

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
super-pos/
├── src/
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
│   │   │   └── dashboard/      # Dashboard principal
│   │   ├── app.component.ts    # Componente principal
│   │   ├── app.routes.ts       # Rutas de la aplicación
│   │   └── app.config.ts       # Configuración global
│   └── styles.scss             # Estilos globales
├── mock-backend.js             # Backend simulado
└── package.json               # Dependencias
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
- `GET /api/products` - Listar productos
- `POST /api/products` - Crear producto
- `PUT /api/products/:id` - Actualizar producto
- `DELETE /api/products/:id` - Eliminar producto
- `GET /api/products/categories` - Listar categorías

### Ventas
- `POST /api/sales` - Crear venta
- `GET /api/sales` - Listar ventas
- `GET /api/sales/summary` - Resumen de ventas

### Usuarios
- `GET /api/users` - Listar usuarios
- `POST /api/users` - Crear usuario
- `PUT /api/users/:id` - Actualizar usuario

## 🚀 Despliegue en Producción

### 1. Build del proyecto
```bash
ng build --configuration production
```

### 2. Configurar backend real
Reemplazar `mock-backend.js` con un backend real (Node.js + Express, Python + Django, etc.)

### 3. Configurar base de datos
Migrar de JSON a base de datos real (PostgreSQL, MySQL, MongoDB)

### 4. Configurar autenticación JWT
Implementar JWT real en lugar del mock

## 🔒 Seguridad

- Autenticación JWT
- Guards de rutas
- Validación de formularios
- Sanitización de inputs
- Control de acceso por roles

## 📈 Próximas Funcionalidades

- [ ] Integración con impresoras térmicas
- [ ] Códigos QR para productos
- [ ] Inventario en tiempo real
- [ ] Integración con sistemas de pago
- [ ] App móvil (React Native/Flutter)
- [ ] Reportes en PDF
- [ ] Backup automático
- [ ] Multi-idioma
- [ ] Modo offline

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
- 📧 Email: soporte@superpos.com
- 📱 WhatsApp: +1234567890
- 🌐 Website: https://superpos.com

---

**Desarrollado con ❤️ para supermercados modernos**