# 🗺️ ROADMAP DE IMPLEMENTACIÓN - SUPER POS MULTI-TENANT

## 📊 ESTADO ACTUAL DEL PROYECTO

### ✅ COMPLETADO EN ESTA SESIÓN

#### **Arquitectura Multi-Tenant**
- [x] Modelos backend con `company_id` en todas las tablas
- [x] Modelo `Company` con límites de suscripción
- [x] `CompanyService` - Creación automática de compañías
- [x] `CompanyContextService` - Gestión de contexto y permisos
- [x] Sistema de permisos granular por rol y compañía
- [x] Filtrado automático por compañía en queries
- [x] Interceptores HTTP (Auth + CompanyContext)
- [x] Guards de acceso multinivel
- [x] Selector de compañía en navbar (solo SUDO)
- [x] Script `init_db.py` actualizado con datos multi-tenant

#### **Modelos Backend Nuevos**
- [x] Supplier (Proveedores)
- [x] Discount (Descuentos)
- [x] CashSession (Sesiones de Caja)
- [x] AuditLog (Bitácora)

#### **Endpoints Backend**
- [x] `/api/companies` - CRUD completo
- [x] `/api/suppliers` - CRUD completo

#### **Componentes Frontend**
- [x] Categorías - Template + integración ProductService
- [x] Proveedores - Template + integración API
- [x] Caja Registradora - Template básico
- [x] Descuentos - Template básico
- [x] Alertas de Inventario - Template básico
- [x] Bitácora - Template básico

#### **Usuarios de Prueba Disponibles**
```
SUDO: sudo / sudo123
Admin Compañía 1: admin / admin123
Admin Compañía 2: carlos / carlos123
```

---

## 🎯 RUTA DE IMPLEMENTACIÓN RECOMENDADA

### **FASE 1: COMPLETAR MÓDULOS ADMINISTRATIVOS BÁSICOS** 
> Prioridad: 🔴 ALTA | Tiempo estimado: 2.5 horas

#### 1.1 Descuentos/Promociones ⏱️ 20 min
- [ ] Backend: Endpoints CRUD de `Discount`
  - `GET /api/discounts`
  - `POST /api/discounts`
  - `PUT /api/discounts/{id}`
  - `DELETE /api/discounts/{id}`
- [ ] Frontend: Integrar `AdminDiscountsComponent`
  - Listar descuentos activos
  - Crear nuevo descuento con nombre y %
  - Tabla con acciones editar/eliminar
- [ ] **Commit:** "Admin: Descuentos CRUD completo (backend + frontend)"

#### 1.2 Alertas de Inventario ⏱️ 15 min
- [ ] Backend: Endpoint `GET /api/inventory/alerts`
  - Query: `stock < minStock` por compañía
  - Ordenar por nivel crítico (menor stock primero)
- [ ] Frontend: Integrar `AdminInventoryAlertsComponent`
  - Tabla con productos bajo mínimo
  - Mostrar nivel de urgencia con colores
  - Badge con contador en sidebar
- [ ] **Commit:** "Admin: Alertas de Inventario funcional con endpoint de stock bajo"

#### 1.3 Bitácora de Auditoría ⏱️ 30 min
- [ ] Backend: Endpoints de `AuditLog`
  - `GET /api/audit-logs` (con filtros: fecha, usuario, módulo)
  - `POST /api/audit-logs` (crear evento)
  - Función auxiliar `log_event()` para registrar automáticamente
- [ ] Backend: Integrar logging automático en:
  - Login/Logout
  - Creación/edición de productos
  - Ventas completadas
  - Cambios de configuración
- [ ] Frontend: Integrar `AdminAuditLogsComponent`
  - Tabla con filtros
  - Paginación
  - Búsqueda por usuario/acción
- [ ] **Commit:** "Admin: Bitácora de auditoría completa con logging automático"

#### 1.4 Sesiones de Caja ⏱️ 45 min
- [ ] Backend: Endpoints de `CashSession`
  - `GET /api/cash-sessions` - Listar sesiones
  - `POST /api/cash-sessions/open` - Abrir caja
  - `POST /api/cash-sessions/{id}/close` - Cerrar caja
  - `GET /api/cash-sessions/current` - Obtener sesión activa
- [ ] Backend: Asientos contables automáticos:
  - Al abrir: Débito Caja / Crédito Efectivo en Tránsito
  - Al cerrar: Arqueo y diferencias
- [ ] Frontend: Integrar `AdminCashRegisterComponent`
  - Formulario de apertura con monto inicial
  - Formulario de cierre con arqueo
  - Mostrar sesión actual y totales
  - Historial de sesiones
- [ ] **Commit:** "Admin: Sesiones de Caja con contabilidad automática"

#### 1.5 Integrar Empresas Clientes ⏱️ 30 min
- [ ] Frontend: Actualizar `EmpresasClientesComponent`
  - Conectar con `GET /api/companies`
  - Crear diálogo para nueva compañía
  - Formulario completo: datos empresa + usuario admin
  - Conectar con `POST /api/companies`
  - Cambiar estado: activar/suspender compañía
  - Tabla con acciones completas
- [ ] **Commit:** "SUDO: Empresas Clientes integrado con API completa"

---

### **FASE 2: VALIDACIONES Y LÍMITES DE SUSCRIPCIÓN**
> Prioridad: 🟡 MEDIA-ALTA | Tiempo estimado: 1.5 horas

#### 2.1 Validar Límites en Productos ⏱️ 20 min
- [ ] Frontend: `ProductsComponent`
  - Verificar `canAddMoreProducts()` antes de abrir diálogo
  - Mostrar badge `X / maxProducts` en header
  - Deshabilitar botón "Nuevo" si alcanzó límite
  - Toast informativo con límite del plan
- [ ] **Commit:** "Products: validar límite maxProducts según suscripción"

#### 2.2 Validar Límites en Usuarios ⏱️ 20 min
- [ ] Frontend: `UsersComponent`
  - Verificar límite `maxUsers` antes de crear
  - Mostrar indicador en UI
  - Mensaje si alcanzó límite
- [ ] Backend: Validar en `POST /api/users`
- [ ] **Commit:** "Users: validar límite maxUsers según suscripción"

#### 2.3 Validar Límites en Ventas ⏱️ 15 min
- [ ] Backend: Contador de ventas del mes por compañía
- [ ] Frontend: Dashboard con indicador de uso mensual
- [ ] Warning (no bloqueante) si supera `maxSalesPerMonth`
- [ ] **Commit:** "Sales: tracking mensual y validación de límite maxSalesPerMonth"

#### 2.4 Filtrado de Usuarios por Compañía ⏱️ 15 min
- [ ] Backend: Ya aplicado filtro en `GET /api/users`
- [ ] Frontend: Verificar que solo muestre usuarios de compañía actual
- [ ] No mostrar usuarios SUDO en listado de compañía
- [ ] **Commit:** "Users: filtrar solo usuarios de compañía actual"

#### 2.5 Aplicar Descuentos en POS ⏱️ 40 min
- [ ] Frontend: `POSComponent`
  - Agregar selector de descuento en carrito
  - Aplicar % a total o por producto
  - Mostrar descuento en ticket
- [ ] Backend: Validar descuento activo en venta
- [ ] Contabilidad: Registrar descuento como cuenta de gastos
- [ ] **Commit:** "POS: aplicar descuentos/promociones en carrito"

---

### **FASE 3: DASHBOARD Y MÉTRICAS**
> Prioridad: 🟡 MEDIA | Tiempo estimado: 1.5 horas

#### 3.1 Dashboard por Compañía ⏱️ 50 min
- [ ] Backend: Endpoints de métricas
  - `GET /api/dashboard/sales-summary` (hoy, semana, mes)
  - `GET /api/dashboard/top-products`
  - `GET /api/dashboard/low-stock-count`
  - `GET /api/dashboard/active-users`
- [ ] Frontend: `DashboardComponent`
  - Cards con métricas principales
  - Gráficas de ventas (Chart.js o similar)
  - Indicadores de uso de suscripción
  - Productos más vendidos
- [ ] **Commit:** "Dashboard: métricas por compañía con gráficas"

#### 3.2 Reportes con Filtros ⏱️ 40 min
- [ ] Frontend: `ReportsComponent`
  - Selector de rango de fechas
  - Filtros por cajero, tipo de documento
  - Exportar a Excel/PDF
- [ ] Backend: Endpoints optimizados con filtros
- [ ] **Commit:** "Reports: filtros avanzados y exportación"

---

### **FASE 4: MÓDULOS CONTABLES (AJUSTES FISCALES)**
> Prioridad: 🟢 MEDIA-BAJA | Tiempo estimado: 2 horas

#### 4.1 Validar Contabilidad Salvadoreña ⏱️ 30 min
- [ ] Verificar que IVA sea 13% configurable por compañía
- [ ] Ajustar formatos de documentos a DTE El Salvador
- [ ] Validar estructura de Libro de Ventas IVA
- [ ] Validar estructura de Libro de Compras IVA
- [ ] **Commit:** "Contabilidad: ajustes a normativa fiscal El Salvador (IVA 13%)"

#### 4.2 Reportes Contables Exportables ⏱️ 40 min
- [ ] Exportar Libro Diario a Excel
- [ ] Exportar Libro Mayor a Excel
- [ ] Exportar Balance de Comprobación a PDF
- [ ] Formato compatible con auditoría
- [ ] **Commit:** "Contabilidad: exportación de libros contables"

#### 4.3 Módulo de Compras ⏱️ 50 min
- [ ] Backend: Modelo `Purchase` con items
- [ ] Endpoints CRUD de compras
- [ ] Asientos contables automáticos (IVA crédito fiscal)
- [ ] Frontend: Componente de registro de compras
- [ ] Integración con proveedores
- [ ] **Commit:** "Compras: módulo completo con IVA crédito fiscal"

---

### **FASE 5: OPTIMIZACIONES Y PULIDO**
> Prioridad: 🟢 BAJA | Tiempo estimado: 2 horas

#### 5.1 Performance ⏱️ 30 min
- [ ] Paginación en tablas grandes
- [ ] Lazy loading de imágenes
- [ ] Caché de consultas frecuentes
- [ ] Índices de BD optimizados
- [ ] **Commit:** "Performance: paginación y optimizaciones"

#### 5.2 UX Mejorada ⏱️ 40 min
- [ ] Diálogos de confirmación en acciones destructivas
- [ ] Tooltips informativos
- [ ] Skeleton loaders en carga
- [ ] Mensajes de error más descriptivos
- [ ] **Commit:** "UX: mejoras de usabilidad y feedback visual"

#### 5.3 Módulo de Backup ⏱️ 50 min
- [ ] Backend: Endpoint `POST /api/backup/create`
- [ ] Backend: Endpoint `POST /api/backup/restore`
- [ ] Backup por compañía individual
- [ ] Frontend: Interfaz de backup/restore
- [ ] **Commit:** "Backup: sistema de respaldo por compañía"

---

## 📈 MÉTRICAS DE PROGRESO

### Funcionalidad Implementada:
- **Backend Core:** ████████░░ 80%
- **Frontend Core:** ███████░░░ 70%
- **Multi-Tenant:** ██████████ 100% ✅
- **Módulos Admin:** █████░░░░░ 50%
- **Contabilidad:** ████████░░ 80%
- **Reportes:** ███░░░░░░░ 30%
- **UX/Pulido:** ████░░░░░░ 40%

### **Progreso Global:** ███████░░░ **70%**

---

## 🚀 EJECUCIÓN

### Marcar como completado:
- Cambiar `[ ]` a `[x]` al terminar cada tarea
- Hacer commit según lo indicado
- Actualizar este archivo con cada commit

### Orden de Ejecución Recomendado:
```
CORTO PLAZO (HOY):
1. Descuentos
2. Alertas de Inventario  
3. Bitácora
4. Sesiones de Caja
5. Empresas Clientes

MEDIANO PLAZO (PRÓXIMA SESIÓN):
6. Validaciones de límites
7. Descuentos en POS
8. Dashboard por compañía
9. Usuario SUDO

LARGO PLAZO (REFINAMIENTO):
10. Reportes fiscales
11. Módulo de Compras
12. Optimizaciones
13. Backup por compañía
```

---

## 📝 NOTAS IMPORTANTES

### Aspectos Fiscales El Salvador:
- IVA: 13% (actualmente configurado en 15% - REVISAR)
- Documentos: Consumidor Final (CF), Crédito Fiscal (CCF)
- DTE (Documentos Tributarios Electrónicos) - formato estándar
- NIT: formato 0614-XXXXXX-XXX-X
- NRC: Número de Registro de Contribuyente
- Libro de Ventas IVA: registro de facturas emitidas
- Libro de Compras IVA: registro de facturas recibidas

### Multi-Tenant:
- Cada compañía tiene datos completamente aislados
- SUDO puede gestionar todas las compañías
- Usuarios normales solo ven datos de su compañía
- Restricciones únicas por compañía (username, email, SKU, etc.)

### Planes de Suscripción:
- **Basic:** 5 usuarios, 1000 productos, 500 ventas/mes
- **Premium:** 10 usuarios, 5000 productos, 2000 ventas/mes
- **Enterprise:** 100 usuarios, 50000 productos, 100000 ventas/mes

---

## 🎯 PRÓXIMO PASO INMEDIATO

**INICIAR CON:** Descuentos (backend endpoints + frontend integración)

---

*Última actualización: Octubre 15, 2025*
*Versión del sistema: 2.0.0 Multi-Tenant*

