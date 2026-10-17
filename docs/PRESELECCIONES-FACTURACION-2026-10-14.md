# Preselecciones de alumnos y facturacion

Implementado, verificado y publicado en condusoft.co el 14 de octubre de 2026,
tras la autorizacion de Carlos: "Si, publicar en produccion".

- Alta de alumnos: Colombia, Ipiales (52356), Narino, regimen ordinario,
  responsabilidad R-99-PN. El abono ya utiliza efectivo. Persona natural (2)
  y tratamiento No aplica (ZZ) se mantienen en el perfil de alumnos existente.
- Completar datos antes de facturar: el formulario sugiere esos mismos datos
  solo en campos vacios. Se requiere Guardar datos; no hay escritura automatica.
- Se conservan las ubicaciones y declaraciones existentes. Si ya hay otro
  departamento, no se impone Ipiales. Un perfil SIMPLE parcial mantiene O-47;
  los datos incompatibles existentes no se ocultan ni se dan por validos.
- Los borradores de nuevos alumnos conservan elecciones previas. Los campos
  vacios del borrador reciben las sugerencias al volver a abrir el alta.
- Medio de pago de factura: Efectivo si esta habilitado en FacturaX; si no,
  se solicita seleccion explicita. Las otras opciones siguen disponibles.
- No se cambiaron validaciones, permisos, API fiscal, precios, schema de datos
  ni historicos. Correo, telefono, direccion e identificacion siguen obligatorios.

Verificacion: 59 archivos / 578 pruebas correctas, lint sin advertencias,
build de produccion con TypeScript correcto y 103 paginas. Pruebas especificas
de creacion, borradores, cambio de municipio/regimen, perfil existente y medio
de pago alternativo o efectivo no habilitado.

Navegador movil 390x844: sin desbordamiento horizontal ni controles fuera
del ancho. Guardado ficticio desde el formulario real habilito el catalogo
y preselecciono Efectivo. No se emitieron documentos ni se usaron credenciales
o servicios de produccion en esta prueba.

Vista local aislada: http://127.0.0.1:3021/.
Captura: output/playwright/facturacion-predeterminados-mobile-2026-10-14.png.

## Publicacion

- Proyecto Vercel verificado: vs-gestion-escuela, equipo
  carlos-piarpusans-projects.
- Suite completa repetida antes de publicar: 59 archivos, 578 pruebas correctas.
- Build remoto correcto, incluido TypeScript y 103 paginas.
- Despliegue READY/production: dpl_5HfZyrQGrapCTJqfdguKzunweD3j,
  creado a las 12:56:04 de Bogota.
- URL: https://vs-gestion-escuela-czmjzupoq-carlos-piarpusans-projects.vercel.app.
- Se promovio ese mismo ID, sin reconstruir. Una inspeccion posterior de
  condusoft.co confirmo exactamente ese despliegue.
- /login cargo en el navegador sin errores ni advertencias de consola.
- Consulta runtime de nivel error del despliegue, ultimos 10 minutos:
  sin registros. No es una prueba de emision fiscal real.
- Evidencia: output/playwright/preselecciones-publicacion-2026-10-14.png.
- No se modifico FacturaX, ni se aplicaron migraciones, escrituras de alumnos,
  pagos, credenciales o emisiones de prueba en produccion.
