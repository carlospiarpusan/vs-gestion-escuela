# Revision de acciones - 14 de octubre de 2026

## Estado

Esta revision es posterior al despliegue descrito en
`REVISION-FUNCIONAL-2026-10-14.md`. Las correcciones de este informe fueron
verificadas y publicadas en condusoft.co con autorizacion explicita del usuario.
No se realizaron cambios de esquema ni operaciones reales de pago,
facturacion, altas de alumnos o cierre mensual en esta revision.

## Permisos

El editor guardaba excepciones en `permisos_config`, pero la navegacion,
las acciones, las API y RLS no aplicaban esas excepciones. Por tanto,
mostraba cambios como guardados sin cambiar los accesos reales.

El usuario eligio una consulta fiel de los permisos vigentes. La pantalla
ahora muestra la matriz predeterminada utilizada por las capacidades y la
navegacion, sin controles de edicion, restauracion ni guardado.
GET `/api/permisos` devuelve esa matriz y `editable: false`, con cache
privada deshabilitada. PUT requiere el rol existente de superadministrador
y responde 409; los clientes anteriores no pueden mostrar un guardado
exitoso ni borrar configuraciones. Los registros anteriores se conservan.
No se ampliaron permisos de ningun usuario ni se cambiaron politicas RLS.

## Horas

- Enfocar y salir de una celda sin cambiarla ya no escribe en la base.
  Tampoco intenta escribir un instructor de solo lectura.
- Guardados fallidos restauran la hora o tarifa anterior, muestran un error
  y liberan el control para reintentar. Una actualizacion de tarifa que no
  devuelve ninguna fila ya no se interpreta como exitosa.
- Una celda pendiente no admite otro guardado simultaneo sobre esa celda.
- Las consultas antiguas no reemplazan el mes seleccionado ni ocultan su
  estado de carga, aunque terminen o fallen despues de la consulta nueva.
  La limpieza del efecto invalida consultas pendientes al cambiar alcance
  o desmontar la pantalla.
- Mientras se guarda una hora o tarifa, se bloquean cambio de periodo,
  exportacion y cierre. Durante un cierre se bloquea tambien la edicion.
  Los controles se habilitan de nuevo al terminar la operacion.
- Los errores de exportacion se muestran y permiten reintentar. La prueba
  genera un XLSX real, abre su ZIP/XML y verifica mes, instructor y totales.
  No se simula el generador del archivo ni se modifican las reglas de cierre.

## Informes

Actualizar e Intentar de nuevo ahora ejecutan otra consulta aunque los
filtros sean identicos. El refresco manual omite la cache de lectura.
Las respuestas y errores antiguos no reemplazan un informe mas reciente,
no borran sus datos ni generan avisos de fallo de la consulta descartada.

## Verificacion

- `npm test -- --run`: 56 archivos, 516 pruebas correctas.
- `npm run lint`: exit 0, sin advertencias.
- `npx tsc --noEmit`: exit 0.
- `npm run build`: exit 0; 103 paginas generadas.
- `git diff --check`: exit 0.
- Cuatro archivos nuevos de pruebas cubren Permisos/API, Horas e Informes.
  Horas se verifica en variantes movil y escritorio para celdas sin cambios.
  Se verifican respuestas fuera de orden, errores, reintentos y bloqueos.
- La suite completa conserva pruebas de contacto fiscal obligatorio,
  creacion de alumnos, FacturaX, autenticacion, alcance por escuela/sede,
  cierres aislados y otras operaciones existentes.
- Compilacion standalone local en http://127.0.0.1:3003: login y navegacion
  a Crear cuenta comprobados en navegador, sin introducir credenciales.
  El login optimizado no mostro errores ni advertencias en la consola
  observada. El aviso de eval de React solo aparecio en modo desarrollo;
  no se debilito la politica CSP para ocultarlo.
- Diez consultas GET locales sin sesion devolvieron 401: permisos, horas,
  alumnos, ingresos, gastos, cartera, nominas, clases, vehiculos e informes.

## Publicacion

Deployment: `dpl_81sRwAugGoszYyBHabwoQUUYHSiP`.
Proyecto: `vs-gestion-escuela`, equipo `carlos-piarpusans-projects`.
Version: https://vs-gestion-escuela-6p7xeltys-carlos-piarpusans-projects.vercel.app.
Dominio principal: https://condusoft.co.

Vercel compilo correctamente la version y la marco Ready. Se preparo primero
sin asignar el dominio principal y luego se promovio con el equipo explicito.
La consulta `vercel inspect https://condusoft.co` confirmo el nuevo ID tras
promover. El primer intento de promocion sin scope fallo sin cambiar el dominio;
el intento con el equipo propietario termino correctamente.

Despues de promover se verifico el login y la navegacion a Crear cuenta y de
vuelta al login en produccion. No se introdujeron credenciales ni se crearon
usuarios. La consulta de errores del despliegue durante los ultimos diez minutos
no devolvio entradas; esta muestra corta no garantiza ausencia de fallos futuros.
La consola del login observada no mostro errores ni advertencias.

Captura: `output/playwright/revision-acciones-login-produccion-2026-10-14.png`.

El build remoto mostro avisos de npm `cache-dir` y Husky por no existir `.git`
en el paquete de despliegue; no impidieron la instalacion ni la compilacion.
No se cambiaron herramientas o dependencias para ocultar esos avisos.

## Limites

Las pruebas de paginas usan perfiles y respuestas de red controlados; las
pruebas SQL de la suite usan una base aislada. No se verifico cada pantalla
con todos los roles en una sesion real de Supabase. Las secciones visuales
de Informes estan simuladas en sus pruebas nuevas: estas verifican el flujo
de consulta/refresco, no cada grafico en un navegador.
Los resultados no garantizan ausencia de errores fuera de la cobertura.
No se cambiaron requisitos fiscales, precios, pagos, FacturaX ni Android.
