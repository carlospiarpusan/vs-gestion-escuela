# Optimización de Vercel — implementación

20 de octubre de 2026. Implementación de las mejoras de [la revisión de consumo](./USO-Y-COSTOS-VERCEL-2026-10-20.md).

**Estado:** publicado y comprobado en [ConduSoft](https://condusoft.co).

Despliegue `dpl_6inho2Xz2EHMpyEdreHKaPuKx6nn`, estado READY, entorno production. `condusoft.co` y `www.condusoft.co` apuntan a esa misma versión. [URL del despliegue](https://vs-gestion-escuela-40dv0886i-carlos-piarpusans-projects.vercel.app).

## Cambios aplicados

- **Caché por escuela y módulo.** Se separaron las etiquetas de lectura de las de invalidación. Un ingreso actualiza ingresos, cartera, caja, reportes y los datos de alumnos/resúmenes afectados; conserva gastos y vehículos. Un gasto actualiza gastos, caja y reportes. Las cachés privadas de otra escuela se conservan. Los agregados globales tienen etiquetas propias para que sus totales sí se actualicen. Las modificaciones de configuración que afectan toda una escuela y los cambios globales mantienen su invalidación correspondiente.
- **Actualización después de guardar.** Las rutas de alumnos, matrículas, abonos y cancelación invalidan desde el servidor, después de confirmar la escritura. Se eliminaron las cuatro llamadas adicionales a `/api/cache/revalidate` de Alumnos. Se conserva el endpoint autenticado para las escrituras que todavía van directamente a Supabase; verifica escuela y dominio antes de invalidar.
- **Lectura consistente.** La invalidación usa `revalidateTag(tag, { expire: 0 })` para no servir el saldo anterior en la primera lectura posterior a un guardado. Se deduplican las etiquetas y se versiona el espacio de claves para no reutilizar entradas antiguas sin las etiquetas nuevas.
- **Resumen incluido en el inicio.** La página del servidor comparte el cargador de resumen con la API e incluye el resultado en el primer render. Se reutiliza el perfil ya autenticado. La consulta respeta usuario, rol, escuela y sede; no se precarga para una sesión que debe cambiar contraseña ni para una escuela suspendida. Alumnos y superadministradores conservan sus vistas correspondientes.
- **Caché del navegador controlada.** La instantánea inicial solo se acepta para la misma clave de usuario/rol/escuela/sede y mientras esté vigente. No se vuelve a usar después de una invalidación, incluso si Volver del navegador remonta una página RSC anterior. Se mantiene el reintento por API si falla la precarga. Los resúmenes usan HTTP `private, no-store` y conservan las cachés autenticadas del servidor y de la aplicación: el navegador no puede devolver un saldo anterior por su cuenta después de guardar.
- **Menos telemetría.** Analytics se carga únicamente en producción y en las páginas públicas definidas. Speed Insights toma una muestra del 10 % de las visitas elegibles a páginas públicas/panel. Previews, impresión, pagos y callbacks no generan esos eventos. Se eliminan parámetros de consulta y fragmentos de las URL enviadas. Se mantienen logs de errores, controles de seguridad y las métricas locales de `PerformanceVitals`.
- **Una publicación agrupada.** Los cambios se prepararon sobre la fuente exacta de producción, con 42 archivos nuevos/modificados y sin incorporar modificaciones locales ajenas a esta tarea. Un solo build de Vercel se prepara con `--prod --skip-domain`; la promoción reutiliza esa compilación y evita un segundo build.

Los documentos siguen generándose cuando se necesitan. No se modificaron contratos, permisos de datos, reglas de facturación, crons, región, credenciales ni plan. No hay migración SQL ni almacenamiento externo nuevo.

## Verificación

- Suite completa de la versión aislada: **1.159 pruebas, 118 archivos, todas aprobadas**.
- Verificación final de inicio, caché, autorización y SQL: **25 pruebas en 5 archivos, aprobadas**, incluida la protección de escuelas suspendidas añadida al final.
- TypeScript, ESLint sin advertencias, comprobación de espacios y compilación con entorno de producción: aprobados. Las páginas públicas siguen prerenderizadas como contenido estático.
- Pruebas de políticas de caché: dos escuelas, varias sedes, módulos independientes, caché de un usuario, configuración de escuela y agregados globales. Peticiones sin sesión, etiquetas de otra escuela y etiquetas globales no autorizadas son rechazadas.
- SQL real en PGlite: el resumen de la página y el de la API devuelven los mismos totales de la sede; perfiles inactivos, alumnos y perfiles de otra escuela no consultan datos administrativos. Las pruebas de pagos conservan validación de saldo, transacción e idempotencia; la invalidación ocurre después de COMMIT.
- Navegador con el componente real y backend local ficticio: **cero peticiones** de resumen en la primera carga; **una petición** después de simular una actualización. Los valores pasaron de 7 alumnos/$1.200.000 a 8 alumnos/$1.250.000 y se conservaron al salir y volver, sin otra consulta. Se revisaron escritorio, móvil de 390 px, teclado y tema oscuro. No se realizaron escrituras financieras en producción.
- Producción: página pública visible sin errores/advertencias de consola; atributo de Speed Insights `data-sample-rate="0.1"` comprobado en el DOM. La API de resumen rechaza la sesión ausente y el panel redirige al login. Los dos dominios se verificaron mediante la API de Vercel después de promover. La muestra de logs disponible del despliegue contiene 11 entradas informativas: nueve respuestas 200, una redirección 307 y un rechazo 401 esperado. Esta muestra no sustituye una auditoría de toda la actividad de producción ni una prueba financiera autenticada con registros reales.

Capturas con datos ficticios: [escritorio](../output/optimizacion-vercel/inicio-escritorio.png), [móvil](../output/optimizacion-vercel/inicio-movil.png), [móvil oscuro](../output/optimizacion-vercel/inicio-movil-oscuro.png).

## Efecto esperado y medición posterior

Se evita una petición de función en cada carga inicial del resumen administrativo sin caché cliente y una petición adicional por cada guardado afectado de Alumnos. Las invalidaciones dejan de provocar regeneraciones de otras escuelas y de módulos financieros independientes. El muestreo configura una recolección de rendimiento del 10 %; no se presenta como un ahorro del 90 % de toda la plataforma.

El ahorro mensual en CPU, memoria y dinero todavía no está medido. Comparar ventanas equivalentes posteriores a la publicación, separando pruebas, compilaciones y tráfico cotidiano. No se creó una automatización de seguimiento ni se contrató un plan adicional.

La evidencia agregada de publicación y validación se guarda en `output/optimizacion-vercel/publicado.json`. El manifiesto local de los archivos publicados y los logs están en `/tmp/condusoft-vercel-apply/`.
