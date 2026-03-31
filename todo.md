# Impulso al 10 - TODO

## Base de Datos
- [x] Esquema: tabla clients
- [x] Esquema: tabla loans
- [x] Esquema: tabla installments
- [x] Esquema: tabla payments
- [x] Esquema: tabla penalties
- [x] Esquema: tabla documents
- [x] Esquema: tabla legal_consents
- [x] Esquema: tabla audit_logs
- [x] Esquema: tabla settings
- [x] Esquema: tabla collections
- [x] Migración aplicada en base de datos

## Backend (tRPC Routers)
- [x] Router: clients (CRUD, validar, aprobar, bloquear)
- [x] Router: loans (crear, calcular interés, generar cuotas, estados)
- [x] Router: installments (listar, actualizar estado)
- [x] Router: payments (registrar, verificar, rechazar, revertir)
- [x] Router: penalties (detectar mora, aplicar recargo manual)
- [x] Router: documents (subir, listar, eliminar)
- [x] Router: legal_consents (registrar consentimiento)
- [x] Router: audit (listar logs)
- [x] Router: dashboard (indicadores clave)
- [x] Router: settings (configurar tasa de interés)
- [x] Router: collections (registrar contacto, notas)

## Frontend - Layout y Navegación
- [x] DashboardLayout con sidebar para admin
- [x] Rutas registradas en App.tsx
- [x] Tema profesional financiero (colores, tipografía)

## Frontend - Páginas
- [x] Login / Auth page
- [x] Dashboard principal con KPIs
- [x] Clientes: listado, detalle, formulario
- [x] Préstamos: listado, detalle, formulario nuevo préstamo
- [x] Cuotas: listado por préstamo
- [x] Pagos: listado, registrar pago, validar/rechazar
- [x] Mora: listado cuotas vencidas, aplicar recargo
- [x] Documentos: subir y ver archivos por cliente
- [x] Consentimientos: registrar y ver
- [x] Auditoría: historial de acciones
- [x] Configuración: tasa de interés global
- [x] Cobranza: registro de contactos

## Migración a Vercel
- [x] Configurar Vercel Postgres
- [ ] Exportar datos de Supabase
- [ ] Importar datos a Vercel Postgres
- [ ] Actualizar variables de entorno para usar DATABASE_URL de Vercel
- [x] Desplegar en Vercel
- [x] Verificar funcionamiento

## GitHub
- [ ] Repositorio privado creado
- [ ] Código subido al repositorio

## Tests
- [x] Tests básicos de routers críticos (20 tests, todos pasan)

## Exportación PDF
- [x] Endpoint tRPC loans.statementData para obtener datos completos del préstamo
- [x] Generador de PDF en servidor (PDFKit) con cuotas, pagos y recargos
- [x] Botón "Descargar Estado de Cuenta" en LoanDetail
- [x] Ruta Express /api/pdf/loan/:id que sirve el PDF generado
