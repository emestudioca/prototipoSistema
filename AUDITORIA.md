# Auditoría funcional del prototipo Gestionate

**Fecha:** 11 de noviembre de 2026  
**Alcance:** funcionalidades visibles del frontend, rutas API, modelos y flujos implementados en el repositorio.  
**Objetivo:** describir qué puede hacer el prototipo, quién puede hacerlo, cómo funciona cada módulo y qué partes están completas, limitadas o todavía no existen.

## 1. Resumen del producto

Gestionate es un prototipo de sistema de gestión para un comercio. Centraliza:

- Catálogo de productos.
- Control de inventario y movimientos de stock.
- Punto de venta.
- Historial y análisis básico de ventas.
- Apertura, seguimiento y cierre de caja.
- Gestión de usuarios y roles.
- Categorías de productos.
- Configuración de campos adicionales del catálogo.
- Importación y exportación de productos.
- Dashboard con indicadores comerciales.

El prototipo está organizado como monorepo: la interfaz está en `frontend/`, las rutas HTTP en `backend/` y la lógica por dominio en `packages/`.

## 2. Estado funcional general

| Área | Estado | Evaluación |
|---|---|---|
| Inicio de sesión | Implementado | Permite autenticarse y recuperar la sesión guardada. |
| Roles | Implementado | Hay `super_admin`, `encargado` y `vendedor`. |
| Dashboard | Implementado | Muestra ventas, stock, caja y rendimiento básico. |
| Productos | Implementado | CRUD, búsqueda, imagen, categorías y campos dinámicos. |
| Stock | Implementado | Entradas, salidas y alerta de stock bajo. |
| POS | Implementado | Carrito, cantidades, medios de pago y registro de venta. |
| Historial de ventas | Implementado | Listado, filtros, orden, estadísticas y detalle. |
| Caja | Implementado | Apertura, cierre, arqueo estimado e historial. |
| Usuarios | Implementado | Alta, edición, roles y desactivación. |
| Categorías | Implementado | Alta y eliminación desde Configuración. |
| Importación | Implementado | Plantilla XLSX y carga con errores por fila. |
| Exportación | Implementado | Exportación de productos a Excel y PDF. |
| Configuración de producto | Implementado | Campos personalizados, orden, tipo y activación. |
| Compras/proveedores | No implementado | No hay módulo ni modelo de compras. |
| Gastos de caja | No implementado | El modelo reserva `totalExpenses`, pero no hay flujo de gastos. |
| Clientes | No implementado | No hay CRM, ficha de cliente ni asociación de cliente a venta. |
| Devoluciones | No implementado | No existe reversión de venta ni devolución de stock. |
| Reportes avanzados | Parcial | Hay indicadores y gráficos básicos, no reportes exportables de ventas. |
| Auditoría de acciones | No implementado | No hay bitácora de quién modificó cada dato. |

## 3. Roles y permisos

### Roles disponibles

| Rol | Objetivo funcional |
|---|---|
| `super_admin` | Administración total del sistema. |
| `encargado` | Operación del comercio, catálogo, stock, ventas y caja. |
| `vendedor` | Realización de ventas y consulta de su operación. |

### Matriz de acceso del prototipo

| Funcionalidad | Super admin | Encargado | Vendedor |
|---|:---:|:---:|:---:|
| Dashboard | Sí | Sí | Sí, con datos más acotados |
| Punto de venta | Sí | Sí | Sí |
| Ver productos | Sí | Sí | A través del POS |
| Crear/editar/eliminar productos | Sí | Sí | No |
| Ajustar stock | Sí | Sí | No |
| Ver historial general de ventas | Sí | Sí | No desde el módulo general |
| Ver sus ventas | Sí | Sí | Sí |
| Abrir/cerrar caja | Sí | Sí | No |
| Ver historial de cajas | Sí | Sí | No |
| Gestionar usuarios | Sí | No | No |
| Gestionar categorías | Sí | Sí | No |
| Configurar campos de producto | Sí | No | No |
| Importar/exportar productos | Sí | Sí | No |

La interfaz también oculta módulos según rol en `frontend/src/registry.ts`, pero las reglas principales se repiten en las rutas API.

## 4. Módulo de autenticación

### Funcionalidades

- Pantalla de inicio de sesión.
- Validación de email y contraseña requerida a nivel básico.
- Creación de sesión mediante token.
- Recuperación automática de sesión al recargar la aplicación.
- Consulta del usuario actual mediante `/api/auth/me`.
- Cierre de sesión local.
- Redirección a `/login` cuando no existe una sesión.
- Redirección al inicio cuando un usuario no tiene el rol requerido.

### Archivos principales

- Pantalla: `packages/auth/src/client/LoginPage.tsx`.
- Cliente API: `packages/auth/src/client/api.ts`.
- Controlador: `packages/auth/src/server/controller.ts`.
- Sesión y autorización: `packages/auth/src/server/service.ts`.
- Contexto cliente: `packages/core/src/client/contexts/AuthContext.tsx`.

### Flujo principal

1. El usuario introduce email y contraseña.
2. El frontend llama `POST /api/auth/login`.
3. El backend busca el usuario y verifica la contraseña.
4. Se devuelve el usuario público y un token.
5. El frontend guarda la sesión y permite acceder a los módulos autorizados.

### Limitaciones funcionales

- No hay recuperación de contraseña.
- No hay cambio de contraseña desde el perfil.
- No hay perfil propio del usuario.
- No hay cierre de sesiones en otros dispositivos.
- No hay invitaciones, verificación de email ni doble factor.

## 5. Dashboard / Panel

**Ruta:** `/`  
**Pantalla:** `packages/dashboard/src/client/DashboardPage.tsx`.

### Información mostrada

- Ventas del día.
- Variación frente al día anterior.
- Total de ventas del período cargado.
- Ganancia estimada.
- Cantidad de productos con stock bajo.
- Estado de la caja actual para administradores y encargados.
- Gráfico de ingresos de los últimos 7 días.
- Rendimiento por vendedor para perfiles de gestión.
- Últimas ventas.
- Accesos rápidos a nueva venta, stock, ventas y caja.

### Comportamiento por rol

- `super_admin` y `encargado`: cargan ventas generales y datos de caja.
- `vendedor`: carga sus propias ventas para sus indicadores.

### Nivel de madurez

**Implementado como dashboard operativo básico.** No es todavía un sistema de BI: los indicadores se calculan sobre los registros descargados, sin rangos de fechas configurables, comparación mensual, filtros avanzados ni reportes guardables.

## 6. Productos y catálogo

**Ruta:** `/productos`  

### Funcionalidades

- Listado de productos activos en tarjetas.
- Búsqueda por nombre o SKU.
- Visualización de imagen, SKU, categoría, precio, coste, stock y mínimo.
- Indicador visual de stock bajo.
- Alta de producto.
- Edición de producto.
- Baja lógica de producto, marcada como inactivo.
- Selección de categoría.
- Carga, cambio y eliminación de imagen.
- Campos adicionales configurables.
- Exportación a Excel.
- Exportación a PDF.
- Importación masiva desde Excel.

### Datos principales de un producto

- Nombre.
- Descripción.
- SKU.
- Precio de venta.
- Coste.
- Categoría.
- Stock actual.
- Stock mínimo.
- Imagen.
- Atributos personalizados.
- Estado activo/inactivo.

### Flujo de alta/edición

1. El usuario abre “Nuevo producto” o edita una tarjeta.
2. Completa datos básicos y campos personalizados.
3. Puede cargar una imagen.
4. El frontend transforma los valores numéricos y atributos.
5. El backend crea o actualiza el producto.
6. La lista se recarga y muestra el resultado.

### Importación y exportación

La ventana `ImportDialog` permite:

- Descargar una plantilla generada según los campos configurados.
- Seleccionar un archivo `.xlsx`, `.xls` o `.csv`.
- Enviar el archivo al backend.
- Mostrar cantidad creada y omitida.
- Mostrar errores con fila, SKU y descripción.

La exportación se realiza desde el navegador a Excel o PDF con los productos cargados actualmente.

### Limitaciones funcionales

- La exportación depende de los productos cargados en pantalla, no de una exportación paginada del catálogo completo.
- No hay historial de cambios de precio o coste.
- No hay proveedores, marcas o unidades como entidades propias.
- No hay variantes, lotes, vencimientos ni códigos de barras operativos.
- No hay eliminación física ni restauración visible de productos inactivos.
- No hay importación de actualización masiva de productos existentes; los SKU repetidos se omiten.

## 7. Stock e inventario

**Ruta:** `/stock`  

### Funcionalidades

- Listado de productos y stock actual.
- Búsqueda de productos.
- Pestaña “Todos”.
- Pestaña “Stock bajo”.
- Conteo de productos por debajo o igual al mínimo.
- Entrada de stock.
- Salida manual de stock.
- Validación de stock suficiente para una salida.
- Recarga del catálogo luego de cada movimiento.

### Flujo de movimiento

1. El encargado selecciona un producto.
2. Elige `entrada` o `salida`.
3. Introduce una cantidad.
4. El backend calcula el nuevo stock.
5. Se muestra una notificación y se actualiza la tabla.

### Nivel de madurez

**Implementado como inventario simple.** No existe un libro de movimientos: el sistema conserva el stock actual, pero no una historia detallada de entradas, salidas, motivo, usuario o documento asociado.

### Funcionalidades pendientes sugeridas

- Historial de movimientos.
- Motivo y observación del ajuste.
- Usuario que realizó el movimiento.
- Ajuste masivo.
- Inventario físico y diferencias.
- Transferencias entre depósitos.
- Compras que incrementen stock automáticamente.
- Devoluciones que reintegren stock.

## 8. Punto de venta POS

**Ruta:** `/pos`  

### Funcionalidades

- Catálogo de productos con stock disponible.
- Búsqueda por nombre o SKU.
- Filtro por categoría.
- Vista adaptada a escritorio y móvil.
- Agregar producto al carrito.
- Aumentar y disminuir cantidades.
- Quitar líneas del carrito.
- Restricción visual de cantidad máxima según stock.
- Cálculo del total en tiempo real.
- Selección de medio de pago:
  - Efectivo.
  - Tarjeta.
  - Transferencia.
- Confirmación de cobro.
- Registro de venta.
- Descuento de stock al confirmar.
- Limpieza del carrito después de una venta exitosa.
- Acceso al historial de ventas.

### Flujo de venta

1. El vendedor abre el POS.
2. El sistema carga productos activos con stock mayor que cero.
3. Busca o filtra un producto.
4. Lo agrega al carrito.
5. Ajusta cantidades.
6. Selecciona el medio de pago.
7. Confirma “Cobrar”.
8. El backend valida los productos y registra la venta.
9. Se descuenta el stock y se actualiza la caja abierta si existe.

### Qué no incluye el POS

- No hay lector de código de barras.
- No hay cliente asociado a la venta.
- No hay descuento, promoción o cupón.
- No hay impuestos configurables.
- No hay cambio de dinero para pagos en efectivo.
- No hay ticket imprimible ni comprobante fiscal.
- No hay devolución, anulación o edición de una venta.
- No hay venta suspendida o recuperación de carrito.
- No hay múltiples cajas/sucursales operativas desde el POS.

## 9. Historial de ventas

**Ruta:** `/ventas`  

### Funcionalidades

- Listado de ventas registradas.
- Estadísticas de ventas totales.
- Ganancia estimada.
- Cantidad de ventas del día.
- Total de registros cargados.
- Búsqueda por vendedor, producto o identificador de producto.
- Filtro por vendedor.
- Filtro por medio de pago.
- Orden ascendente/descendente por fecha.
- Visualización de artículos, cantidades y subtotales.
- Modal de detalle de venta.

### Detalle de una venta

- Vendedor.
- Fecha.
- Medio de pago.
- Productos vendidos.
- Cantidad por producto.
- Precio unitario.
- Subtotal.
- Total.

### Nivel de madurez

**Implementado como consulta operativa.** La pantalla carga hasta 500 ventas y filtra parte de la información en el navegador. No hay paginación real, exportación de ventas, filtros por rango de fechas, estados de venta ni acciones de anulación/devolución.

## 10. Caja

**Ruta:** `/caja`  

### Funcionalidades

- Consulta de caja abierta.
- Apertura de caja.
- Registro de fondo inicial.
- Visualización de ventas asociadas a la caja.
- Cálculo del importe esperado.
- Cierre de caja.
- Registro del importe contado al cierre.
- Cálculo de diferencia.
- Registro de notas de cierre.
- Historial de cierres.
- Resumen de fondo inicial, ventas, esperado y diferencia.

### Flujo de caja

1. El encargado abre una caja indicando el fondo inicial.
2. Las ventas posteriores se relacionan con la caja abierta.
3. La pantalla muestra ventas acumuladas y monto esperado.
4. El encargado introduce el importe real al cerrar.
5. El backend calcula la diferencia contra fondo más ventas.
6. La caja pasa a estado `cerrada` y aparece en el historial.

### Limitaciones funcionales

- Solo se modela una caja abierta global.
- No hay gastos, retiros ni ingresos manuales.
- `totalExpenses` existe en el modelo, pero no existe una pantalla ni endpoint para usarlo.
- No hay desglose esperado por medio de pago.
- No hay arqueos parciales.
- No hay reapertura de una caja cerrada.
- No hay cierre automático ni bloqueo de ventas sin caja según configuración.
- No hay impresión de cierre.

## 11. Gestión de usuarios

**Ruta:** `/usuarios`  

### Funcionalidades

- Listado de usuarios.
- Alta de usuario.
- Edición de nombre.
- Edición de rol.
- Cambio opcional de contraseña.
- Desactivación de usuario.
- Visualización de email, rol, estado y fecha de alta.
- Indicador visual para usuarios inactivos.

### Datos administrables

- Nombre.
- Email en la creación.
- Contraseña en la creación o edición.
- Rol.
- Estado activo/inactivo.

### Limitaciones funcionales

- No hay reactivación desde la interfaz.
- No hay eliminación definitiva.
- No hay perfil ni preferencias personales.
- No hay invitación por email.
- No hay registro de actividad por usuario.
- No hay permisos configurables más allá de los tres roles fijos.

## 12. Categorías

Las categorías no tienen una pantalla independiente. Se administran desde `/configuracion`.

### Funcionalidades

- Listar categorías activas.
- Crear categoría.
- Validar nombre vacío.
- Evitar duplicados ignorando mayúsculas/minúsculas.
- Eliminar categoría.
- Reasignar productos de una categoría eliminada a `General`.
- Usar categorías en el formulario de producto.
- Filtrar productos y POS por categoría.

### Limitaciones

- No se puede editar una categoría.
- El color se almacena, pero la interfaz de gestión es mínima.
- No hay orden manual ni contador de productos por categoría.
- La categoría `General` funciona como fallback, no como entidad protegida.

## 13. Configuración del modelo de producto

**Ubicación:** sección de Configuración en `packages/settings/src/client/ConfiguracionPage.tsx`.  

### Funcionalidades

- Crear campos personalizados.
- Editar campos.
- Eliminar campos.
- Activar/desactivar campos.
- Reordenar campos hacia arriba o abajo.
- Definir etiqueta visible.
- Definir clave interna.
- Definir tipo:
  - Texto.
  - Número.
  - Selección.
  - Sí/No.
  - Fecha.
- Definir opciones para campos de selección.
- Marcar campos como requeridos.
- Definir placeholder.
- Guardado automático con pequeño retraso después de modificar la configuración.

### Integración con productos

- El formulario de producto consulta el modelo activo.
- Los campos activos aparecen dinámicamente.
- La plantilla de importación se genera con esos campos.
- Los valores se almacenan en `attributes`.
- Las tarjetas muestran hasta tres atributos configurados.

### Limitaciones

- El marcado como requerido no se aplica de forma completa al guardar el producto.
- No hay validación avanzada por tipo, rango o formato.
- Cambiar o eliminar una clave no migra atributos históricos.
- No hay versiones del modelo ni recuperación de una configuración anterior.

## 14. Navegación y experiencia de uso

### Navegación disponible

| Ruta | Nombre | Módulo |
|---|---|---|
| `/` | Panel | Dashboard |
| `/pos` | Vender | Punto de venta |
| `/productos` | Productos | Catálogo |
| `/stock` | Stock | Inventario |
| `/ventas` | Ventas | Historial |
| `/caja` | Caja | Caja |
| `/usuarios` | Usuarios | Administración |
| `/configuracion` | Configuración | Parámetros |

### Elementos de UX implementados

- Layout general con sidebar.
- Navegación móvil.
- Carga diferida de módulos.
- Skeletons de carga.
- Toasts de éxito y error.
- Diálogos de confirmación para operaciones destructivas.
- Formularios modales.
- Diseño responsive.
- Tema visual y componentes reutilizables.

### Aspectos que faltan en UX

- Estados vacíos más guiados en algunos módulos.
- Mensajes de error de validación más específicos.
- Paginación y navegación para grandes volúmenes.
- Atajos de teclado del POS.
- Feedback de conexión o modo offline.
- Accesibilidad auditada con teclado y lector de pantalla.
- Confirmación de venta con comprobante visual o imprimible.

## 15. Flujos de negocio cubiertos

### Flujo A: alta de catálogo

1. El superadministrador crea categorías o campos personalizados.
2. El encargado crea productos con precio, coste, SKU, categoría, stock e imagen.
3. El producto aparece en catálogo y POS si está activo y tiene stock.

### Flujo B: reposición de stock

1. El encargado entra en Stock.
2. Consulta productos bajo el mínimo.
3. Selecciona una entrada.
4. Indica cantidad.
5. El stock se actualiza.

### Flujo C: venta

1. El vendedor selecciona productos en POS.
2. Arma el carrito.
3. Selecciona forma de pago.
4. Confirma el cobro.
5. Se crea la venta.
6. Se descuenta stock.
7. Se asocia la venta con la caja abierta, si existe.

### Flujo D: cierre de caja

1. El encargado abre caja con un fondo.
2. Las ventas se acumulan.
3. Consulta el importe esperado.
4. Cuenta el dinero.
5. Registra el importe real y notas.
6. El sistema calcula diferencia y guarda el cierre.

### Flujo E: carga masiva

1. El usuario autorizado descarga la plantilla.
2. Completa productos en Excel.
3. Sube el archivo.
4. El backend valida filas y SKU.
5. Se crean productos válidos.
6. Se muestran omitidos y errores.

## 16. Funcionalidades no incluidas en el prototipo

Estas capacidades no aparecen implementadas en las pantallas, rutas o modelos revisados:

- Clientes y cuentas corrientes.
- Proveedores.
- Órdenes de compra.
- Recepción de mercadería con documento.
- Facturación fiscal o integración con AFIP.
- Tickets de venta imprimibles.
- Devoluciones y notas de crédito.
- Descuentos, promociones y listas de precios.
- Variantes de producto.
- Lotes y vencimientos.
- Múltiples depósitos o sucursales.
- Gastos de caja.
- Transferencias bancarias conciliadas.
- Integración con medios de pago externos.
- Notificaciones de stock bajo.
- Reportes por período exportables.
- Auditoría de cambios.
- Backups y restauración desde la aplicación.
- Configuración general del comercio.
- Monedas, impuestos y localización avanzada.
- Funcionamiento offline.

## 17. Evaluación por nivel de madurez

### Funcionalidades listas para demostración

- Inicio de sesión.
- Navegación por roles.
- Dashboard.
- Alta y edición de productos.
- Ajustes manuales de stock.
- Venta simple con tres medios de pago.
- Historial de ventas.
- Apertura y cierre de caja.
- Alta y desactivación de usuarios.
- Importación de productos.
- Exportación de productos.

### Funcionalidades válidas como MVP, pero requieren evolución

- Dashboard: necesita filtros de período y datos paginados.
- POS: necesita ticket, cambio, descuentos y devoluciones.
- Stock: necesita historial de movimientos y compras.
- Caja: necesita gastos, retiros y desglose por medio de pago.
- Usuarios: necesita recuperación/reactivación y auditoría.
- Configuración: necesita validaciones completas y versionado.

### Funcionalidades de una siguiente fase

- Compras y proveedores.
- Clientes.
- Multi-sucursal.
- Facturación.
- Reportes avanzados.
- Integraciones externas.
- Auditoría y trazabilidad completa.

## 18. Resumen final

El prototipo cubre correctamente el circuito básico de un comercio pequeño:

**configurar catálogo → cargar productos → controlar stock → vender → registrar caja → consultar resultados.**

La demostración principal está completa y conectada a backend y MongoDB. El núcleo funcional más sólido es el catálogo, POS, ventas y caja básica. El sistema todavía no cubre procesos administrativos completos como compras, proveedores, clientes, devoluciones, facturación ni trazabilidad histórica.

La siguiente prioridad funcional debería ser:

1. Completar el flujo de venta con ticket, cambio, devoluciones y control de caja.
2. Incorporar historial de movimientos de stock y compras.
3. Añadir clientes y proveedores.
4. Mejorar reportes y filtros por período.
5. Añadir auditoría de acciones y estados históricos.

## 19. Referencias principales del código

- Registro de módulos: `frontend/src/registry.ts`.
- Rutas de frontend: `frontend/src/routes/index.tsx`.
- Dashboard: `packages/dashboard/src/client/DashboardPage.tsx`.
- POS: `packages/pos/src/client/POSPage.tsx`.
- Productos: `packages/products/src/client/ProductsPage.tsx`.
- Formulario de producto: `packages/products/src/client/components/ProductForm.tsx`.
- Stock: `packages/products/src/client/StockPage.tsx`.
- Importación: `packages/products/src/client/components/ImportDialog.tsx`.
- Ventas: `packages/sales/src/client/SalesPage.tsx`.
- Caja: `packages/cash-register/src/client/CashRegisterPage.tsx`.
- Usuarios: `packages/users/src/client/UsersPage.tsx`.
- Configuración: `packages/settings/src/client/ConfiguracionPage.tsx`.
- Rutas API: `backend/src/app/api/`.
