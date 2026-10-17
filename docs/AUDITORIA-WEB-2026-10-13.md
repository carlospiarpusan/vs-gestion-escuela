# Revision de ConduSoft - 13 de octubre de 2026

## Correcciones

- Nominas: consultas con sede vacia ya no amplian el alcance del personal.
  Edicion y eliminacion verifican escuela y sede. La creacion comprueba sede
  y empleado, y obtiene el nombre del empleado desde el servidor.
- Nominas: cabecera, conceptos y totales se guardan en una transaccion;
  editar solo salario recalcula totales conservando devengos y deducciones.
  Fallos de insercion o actualizacion revierten la operacion completa.
  La eliminacion bloquea la fila y vuelve a comprobar que siga en borrador.
- Abonos: lectura de saldo, bloqueo de alumno/contrato y escritura usan una
  sola conexion y transaccion. Un alumno regular necesita matricula para
  asociar el pago. Aptitud y practica conservan pagos sin matricula.
- Reintentos: GET/HEAD conservan recuperacion automatica; escrituras HTTP y
  Supabase no se repiten por defecto tras una respuesta perdida. Se permite
  optar expresamente por reintentos en operaciones idempotentes.
- Cache: un error posterior al commit no presenta como fallido un abono o
  una nomina ya guardados. Una respuesta HTTP con JSON malformado deja de
  convertirse silenciosamente en un exito vacio.
- Acceso: cedula puede autenticar cuentas con correo real mediante una ruta
  del servidor con cuotas, comprobacion de Origin, errores genericos y
  cookies de sesion no cacheables. Nunca devuelve el correo resuelto ni
  tokens en JSON. Mantiene cuentas internas antiguas y el login por correo.
  Las cuentas con correo real y contrasena inicial igual a la cedula deben
  entrar primero por correo y cambiar su contrasena antes de usar la cedula;
  no se modificaron contrasenas existentes ni se enviaron recuperaciones.
- Seguridad: `api_rate_limits` tenia lectura anonima y carecia de RLS.
  Migracion `20261014025746_protect_api_rate_limits.sql` protege la tabla
  para uso del servidor. Sus contadores se conservaron; no se tocaron alumnos
  ni registros financieros. Inicializacion puede recuperarse de fallos temporales.
- Alumnos: reutilizar una cuenta sin alumno vinculado exige pertenecer a la
  escuela seleccionada y estar dentro del alcance de sede del personal.
  Un perfil de otra escuela o sede no permite cambiar sus credenciales.
- Fechas: formularios y API rechazan dias imposibles. Filtros, fechas de alta,
  agrupaciones y vencimientos usan Bogota, incluso durante cambio de mes UTC.
  Fechas civiles se muestran sin restar un dia; actividad usa la zona explicitamente.
- Paginacion: parametros ausentes o vacios conservan sus valores predeterminados.
- Dashboard: cookie de escuela malformada se ignora sin provocar una excepcion.
- Navegacion: atributo `data-scroll-behavior` identifica el smooth scrolling
  existente para Next.js 16, eliminando su advertencia al cambiar de pagina.

## Verificacion

- Pruebas nuevas de handlers y SQL real en PostgreSQL aislado (PGlite):
  rollback, duplicados, salario, sede, empleado, abonos y permisos.
- Pruebas de acceso con Supabase Auth simulado: correo real, aliases antiguos,
  estado del perfil, identidad, cuotas, origen y confidencialidad de respuestas.
- 26 solicitudes anonimas a rutas locales de alumnos, horas, finanzas,
  nominas, personal, permisos, cumplimiento y dashboards: HTTP 401 en todas.
  Ruta publica de login rechaza otro origen con HTTP 403.
- Creacion de alumnos y FacturaX conservan las pruebas fiscales existentes:
  contacto obligatorio, RUT, catalogo, precios variables y privacidad del payload.
- Suite completa: ejecutar `npm test -- --run --maxWorkers=2` para limitar
  concurrencia de motores PostgreSQL WASM; ejecucion inicial sin limite bajo
  carga simultanea encontro un timeout de infraestructura de cinco segundos.
- TypeScript, lint sin advertencias y compilacion remota son condiciones
  previas a la promocion. No se hicieron pagos, facturas o alumnos reales de prueba.

Evidencias: `output/playwright/audit-api-guards.json`,
`output/playwright/rate-limit-production-security.json`,
`output/playwright/audit-login-mobile.png`.

## Dependencias

La auditoria de produccion (`npm audit --omit=dev`) informa cero avisos.
Se actualizaron versiones compatibles de brace-expansion, undici y lint-staged,
sin bajar Next.js 16.3.8 ni usar `npm audit fix --force`.

Queda un aviso upstream de desarrollo en braces 3.0.3, contabilizado en cinco
dependencias de la cadena ESLint/fast-glob/micromatch. El fabricante no dispone
de una version corregida: https://github.com/advisories/GHSA-vfj7-8cjw-p6xm.
No forma parte del arbol de produccion. No se considerara una auditoria completa
con cero avisos hasta que exista una solucion compatible del proveedor.

## Limites

Esta revision no garantiza ausencia de todos los errores futuros. La cobertura
combina pruebas automaticas, comprobaciones de rutas y revision de codigo;
no sustituye recorrer cada pantalla con cada rol y credenciales reales.
Auth y operaciones fiscales reales no se ejecutaron en las pruebas.
No se cambio ni publico FacturaX ni la APK Android en esta revision.

## Publicacion verificada

Publicado el 14 de octubre de 2026 en el proyecto `vs-gestion-escuela`.
Deployment: `dpl_BNm5nTCZ8AtBGfNBHCP8VicQQrLj`.
URL de version: https://vs-gestion-escuela-is41b8smr-carlos-piarpusans-projects.vercel.app.
Vercel confirma que https://condusoft.co resuelve a ese deployment Ready.

- Suite final: 48 archivos, 396 pruebas correctas; TypeScript y lint exit 0.
- Compilacion remota completa, TypeScript y 103 paginas generadas correctamente.
- `npm audit --omit=dev`: cero vulnerabilidades notificadas.
- Deployment preparado: crear alumno sin sesion HTTP 401; login con formulario
  vacio y origen propio HTTP 401; login desde otro origen HTTP 403.
- Despues de promover: `/login` HTTP 200 y `/api/public/login` con formulario
  vacio y Origin `https://condusoft.co` HTTP 401, no HTTP 403 ni fallo de servicio.
- La comprobacion visual final de produccion no pudo completarse: el navegador
  integrado quedo bloqueado por su politica de navegacion en una pestaña de
  error de conexion local. No se eludio ese control ni se usaron credenciales.
  La evidencia movil anterior corresponde a desarrollo, no a produccion.
- No se crearon alumnos, pagos ni facturas reales para probar la publicacion.
