# Revision funcional - 14 de octubre de 2026

## Errores encontrados y corregidos localmente

- Filtros numericos ausentes o vacios se convertian en cero. Esto reducia
  algunos listados a una fila y llevaba Horas a enero de 2023 al omitir periodo.
  Ahora se respetan los valores predeterminados; cero explicito sigue siendo
  valido para el indice del mes de enero.
- Varias consultas privilegiadas no respetaban la sede del personal. Se
  alinearon alumnos, clases, instructores, vehiculos, bitacora, administrativos,
  horas y catalogos con el alcance de sede de admin_sede, administrativo y
  recepcion, cuando el rol tiene acceso al modulo. Admin_escuela conserva la
  lectura de toda su escuela; instructor conserva sus restricciones existentes.
- Ingresos, gastos, cartera, caja diaria e informes rechazan usuarios de sede
  sin sede asignada antes de consultar datos. Administrativo ya no cambia de
  sede mediante filtros URL; admin_escuela mantiene sus filtros de sede.
- Filtros de fecha imposibles, periodos de ano cero y meses invalidos de caja
  se rechazan antes de enviarlos a SQL. Caja admite mes sin cero inicial.
- Se versionaron las claves de cache afectadas para no reutilizar respuestas
  anteriores a la correccion de alcance. Se conservan prefijos de invalidacion.

## Cierre mensual de Horas

La consulta de solo lectura a la base de ConduSoft confirmo que la funcion
`generar_gastos_horas_mes` publicada no tenia filtro de sede y utilizaba
`current_date`, que depende de la zona del servidor. La politica interna de
`cierres_horas_instructores` tampoco limitaba por sede.

Migracion aplicada: `20261014053354_scope_monthly_hours_closure.sql`.

- Verifica el rol y el estado activo desde perfiles, usando auth.uid().
- Admin_sede y administrativo necesitan sede y solo procesan esa sede.
- Admin_escuela procesa su escuela; alumnos, instructores y recepcion no cierran.
- La fecha de cierre usa America/Bogota; los periodos nulos son invalidos.
- Un bloqueo transaccional por escuela y periodo coordina cierres concurrentes.
- La repeticion actualiza el gasto existente y no crea otro; los fallos revierten
  toda la sentencia. Limpieza y actualizacion respetan escuela y sede del gasto.
- Un cierre existente en otra sede no se sobrescribe por un traslado de instructor.
- RLS limita el acceso directo del personal a cierres de su sede. Se revoca
  ejecucion anonima y PUBLIC; permanece disponible para authenticated con
  comprobacion interna de identidad y rol.

La migracion se aplico a produccion el 14 de octubre de 2026, con autorizacion
del usuario. Se compararon huellas antes/despues en una transaccion: permanecen
sin cambios los 1476 gastos, 2671 registros de horas y 57 cierres existentes.
Se guardo una copia de la funcion y politicas anteriores. Una conexion separada
de solo lectura confirmo la funcion con Bogota y filtro de sede instalados.
No se ejecuto ningun cierre real.

## Verificacion

- Resultado final: 52 archivos, 486 pruebas correctas; TypeScript y lint exit 0.
  `npm run build` compilo correctamente y genero 103 paginas sin errores.
- Pruebas de rutas con SQL real en PGlite y Auth simulado: listados, catalogos,
  paginacion, filtros, escuela/sede, cuenta de instructor y rechazo sin sede.
- Pruebas de migracion real: roles permitidos/denegados, RLS, cierre repetido,
  gastos, limpieza por sede, fallo atomico y cierre de otra sede.
- El bloqueo asesor se ejecuta en las pruebas; PGlite no reproduce dos sesiones
  Postgres concurrentes, por lo que esa intercalacion no se considera probada.
- Las pruebas existentes de contacto obligatorio, creacion de alumnos y FacturaX
  se conservan. No se alteraron productos, precios ni datos fiscales obligatorios.
- Produccion: login visible en movil, enlace Crear cuenta, formulario de registro
  sin desbordamiento horizontal y menu movil con acceso a login y registro.
  No se registraron usuarios ni se introdujeron contrasenas reales.
- Login de produccion y compilacion local sin errores/advertencias de consola
  en las vistas observadas. El navegador funciona ahora; la limitacion visual
  del informe anterior no se repitio en esta revision.
- 30 solicitudes sin sesion a produccion y 30 a compilacion local: HTTP 401
  en todas. No consultaron datos privados ni generaron movimientos.
- La consulta de logs de Vercel con nivel error durante la ultima hora no
  devolvio entradas. Esto no garantiza ausencia de errores fuera de esa ventana.
- Auditoria de dependencias de produccion: cero vulnerabilidades reportadas.
  Sigue vigente el aviso upstream de desarrollo documentado en la auditoria anterior.

## Estado y limites

El usuario autorizo publicar la web y aplicar la migracion de Horas. Se repitieron
las 486 pruebas, lint y TypeScript correctamente antes de publicar; npm audit
de produccion informo cero vulnerabilidades. La migracion ya quedo aplicada;
la web fue compilada por Vercel y promovida al dominio principal correctamente.

Deployment publicado: `dpl_2GtKpPpGx3n5Pe8VwNwmyojqTN9M`.
URL de version: https://vs-gestion-escuela-ht20m19iw-carlos-piarpusans-projects.vercel.app.
Vercel confirma que https://condusoft.co apunta a esa version Ready en el
proyecto `vs-gestion-escuela`. Despues de promover se comprobo la pantalla
de login y la navegacion a Crear cuenta sin introducir credenciales ni
registrar usuarios. La consola de login no mostro errores ni advertencias.

No se verifico cada pantalla con cada rol y una sesion real de Supabase.
Las pruebas de permisos usan perfiles simulados y PostgreSQL aislado. No se
hicieron pagos, facturas, altas ni cierres reales. FacturaX y Android no se modificaron.

Evidencias:

- `output/playwright/revision-api-produccion-2026-10-14.json`
- `output/playwright/revision-api-local-2026-10-14.json`
- `output/playwright/revision-horas-db-metadata.json`
- `output/playwright/revision-login-produccion-mobile.png`
- `output/playwright/hours-scope-production-migration.json`
- `output/playwright/hours-scope-after-migration.json`
- `output/playwright/release-login-2026-10-14.png`
