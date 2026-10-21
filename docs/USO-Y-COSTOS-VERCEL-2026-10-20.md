# Uso y costos de Vercel — ConduSoft

**Estado posterior:** las mejoras técnicas se aplicaron y publicaron el 20 de octubre de 2026. Ver [implementación, validación y despliegue](./OPTIMIZACION-VERCEL-2026-10-20.md). El contenido siguiente conserva las mediciones de la revisión previa.

Revisión del 20 de octubre de 2026, hora de Colombia. Se consultaron Usage, Observability, configuración y despliegues del proyecto `vs-gestion-escuela`, además del código de la versión publicada. No se modificaron producción, planes, credenciales ni configuración.

## Resultado

El consumo actual del proyecto es bajo. La primera prioridad técnica es evitar invalidaciones de caché demasiado amplias y peticiones repetidas. También conviene agrupar publicaciones para reducir compilaciones. No se justifica una migración de infraestructura solamente por el volumen observado.

El equipo está en **Hobby activo**, con otros proyectos que comparten las cuotas. Esto describe la configuración existente, no una recomendación de plan: [Vercel reserva Hobby para uso personal no comercial](https://vercel.com/docs/plans/hobby#hobby-billing-cycle). La elección del plan para la empresa es independiente de optimizar recursos. No se cambió el plan ni se calculó un supuesto ahorro en dólares.

## Consumo comprobado

Fuente: [Usage del proyecto](https://vercel.com/carlos-piarpusans-projects/vs-gestion-escuela/usage). Selector **Last 30 Days**, mostrado como 20 de septiembre, 19:00, a 20 de octubre, 19:00. Vercel advierte que los datos pueden demorarse hasta una hora. No corresponde a una factura de un mes calendario.

| Recurso                  |   ConduSoft | Cuota de referencia del equipo Hobby | Aporte del proyecto a esa cuota |
| ------------------------ | ----------: | -----------------------------------: | ------------------------------: |
| CPU activa de funciones  | 28 min 42 s |                                  4 h |                          12,0 % |
| Memoria aprovisionada    |    2,9 GB-h |                             360 GB-h |                          ≈0,8 % |
| Ejecuciones de funciones |      23.155 |                            1.000.000 |                          2,32 % |
| Solicitudes CDN          |      28.704 |                            1.000.000 |                          2,87 % |
| Fast Data Transfer       |   256,07 MB |                               100 GB |                          0,26 % |
| Fast Origin Transfer     |   217,95 MB |                                10 GB |                          2,18 % |

Los porcentajes anteriores **no son el uso total del equipo**. La vista del equipo muestra 36,55 % de CPU utilizada, 65.908 ejecuciones y 72.044 solicitudes CDN. Optimizar solo ConduSoft no elimina el consumo de los otros proyectos.

Otros indicadores del proyecto: 3 h 38 min de **Build CPU Minutes**, 62 ejecuciones de cron, aproximadamente 1.500 eventos de Web Analytics y 3.100 de Speed Insights. Blob, transformaciones de imágenes, Monitoring y Observability Events muestran cero. Build CPU Minutes es una medida distinta de CPU de funciones y de tiempo de reloj de una compilación; no deben sumarse ni confundirse.

[Fluid Compute contabiliza CPU durante ejecución activa y memoria mientras la instancia atiende solicitudes, también durante esperas externas](https://vercel.com/docs/functions/usage-and-pricing). Reducir consultas SQL ayuda con latencia y memoria, pero no elimina automáticamente una invocación HTTP. Bajar `maxDuration` tampoco reduce por sí mismo el tiempo efectivamente consumido.

## Evidencia de las rutas

En [Functions de Observability](https://vercel.com/carlos-piarpusans-projects/vs-gestion-escuela/observability/vercel-functions), con **Production / Last 12 hours**, la captura mostró 491 invocaciones, 0 % de errores y 0 % de timeouts. Entre las rutas con mayor CPU:

| Ruta                               | Invocaciones mostradas | CPU acumulada mostrada |
| ---------------------------------- | ---------------------: | ---------------------: |
| `/dashboard`                       |                     70 |                   10 s |
| `/api/alumnos`                     |                     96 |                    8 s |
| `/api/alumnos/factura-electronica` |                     47 |                    8 s |
| `/api/dashboard/admin-summary`     |                     26 |                    7 s |

Es una ventana corta con actividad de desarrollo y pruebas. No representa la distribución del mes ni permite asegurar un porcentaje de ahorro global. La API de factura mezcla lecturas y operaciones: 47 invocaciones no significa 47 facturas emitidas.

La muestra adicional de logs devolvió 49 entradas entre 19:55 y 20:47, todas de nivel informativo. Aunque se solicitó 24 h, la respuesta disponible cubre solamente ese intervalo; no se presenta como auditoría completa de errores del día.

## Mejoras priorizadas

### 1. Invalidar solamente la escuela y los módulos afectados

`src/lib/server-cache-tags.ts` añade etiquetas globales como `scope`, `finance` y `dashboard`, además de las de escuela/sede. Varias escrituras del servidor envían ese conjunto completo a `revalidateServerReadCache`. Por ejemplo, registrar un abono en `src/app/api/alumnos/abonos/route.ts` puede marcar para revalidación cachés de otras escuelas y módulos que también comparten esas etiquetas.

La autorización y las claves de lectura siguen separando usuarios; el problema identificado es trabajo de regeneración innecesario. El endpoint autenticado de invalidación ya restringe las etiquetas de usuarios que no son superadministradores, pero eso no evita las invalidaciones amplias ejecutadas internamente por el servidor.

Propuesta: separar las etiquetas de lectura de las etiquetas que se invalidan al escribir; usar etiquetas de dominio y escuela, por ejemplo `finance:income:school:<id>`, y actualizar también los resúmenes de escuela que correspondan cuando cambia una sede. Reservar la invalidación global para cambios globales reales. Una operación en la escuela A debe conservar la caché de B y actualizar todos los saldos y reportes afectados de A. El efecto esperado es menos regeneraciones, CPU y trabajo SQL; el porcentaje depende del tráfico de varias escuelas.

### 2. Eliminar la segunda petición de invalidación cuando el servidor ya la realiza

En `src/app/dashboard/alumnos/page.tsx`, después de guardar un abono o una matrícula se llama a `/api/cache/revalidate`. Las rutas de abonos y matrículas ya invalidan la caché en el servidor. La llamada adicional ejecuta otra función, autorización y revalidación. La caché del navegador se invalida mediante otra función local y debe conservarse.

Propuesta: completar en cada ruta de escritura todas las etiquetas necesarias y retirar la petición duplicada de esos flujos. Mantener la invalidación necesaria para las escrituras que todavía se realizan directamente mediante Supabase. La reducción verificable sería **una petición de función por guardado afectado**, sin quitar controles de acceso ni actualizar menos datos.

### 3. Entregar el resumen junto con el primer render del panel

`src/app/dashboard/page.tsx` obtiene el estado autenticado del servidor. Después, `AdminDashboardHome.tsx` hace otra petición a `/api/dashboard/admin-summary` si no hay un resumen vigente en el navegador. Ambas rutas aparecen entre las de mayor CPU de la ventana consultada.

Propuesta: extraer el cargador autorizado del resumen a un servicio compartido y pasar los datos iniciales al componente desde la página del servidor. Reutilizar el estado autenticado verificado de esa petición e hidratar la caché cliente. Conservar la API para actualizaciones posteriores. Esto evita **una petición adicional en la carga inicial sin caché**; no evita el cálculo del resumen ni autoriza a hacer público el contenido del panel.

### 4. Agrupar compilaciones y publicaciones

La API devuelve 47 despliegues conservados dentro de la ventana de Usage: 42 por CLI y 5 por Git; 46 READY y uno ERROR. También devuelve tres despliegues por CLI posteriores al corte de Usage de las 19:00 del 20 de octubre: son 50 recientes conservados en total. Había 18 de los conservados entre el 19 y el 20 de octubre, incluyendo los posteriores al corte. La retención del proyecto es de 30 días, con 10 despliegues a conservar, de modo que esta lista no garantiza incluir todos los builds históricos.

Propuesta: probar cada lote localmente y publicar una vez por lote aprobado, evitando publicar cada ajuste pequeño. La caché de build ya funciona: el último despliegue restauró la caché del anterior. Git está conectado y crea despliegues; no se encontró evidencia suficiente para afirmar que Git y CLI estén compilando exactamente el mismo cambio dos veces. Evitar ese duplicado cuando ocurra, sin desactivar despliegues de Git indiscriminadamente. El build de GitHub Actions corre fuera de Vercel y no se atribuye al consumo de Vercel.

### 5. Reducir telemetría de navegación interna, como mejora secundaria

`src/app/layout.tsx` monta Analytics y Speed Insights cuando `VERCEL === "1"`, incluyendo el panel y previews. En la ventana de 12 h, el CDN registró 101 solicitudes de ingreso de Analytics y 97 de Speed Insights. Es una fracción pequeña del tráfico; esos endpoints no equivalen necesariamente a funciones propias ni a cargos adicionales.

Propuesta: usar Analytics para la web pública en producción y, si interesa conservar medición de rendimiento del panel, tomar una muestra de Speed Insights. Conservar la observación de errores y seguridad. `PerformanceVitals.tsx` ya funciona localmente en el navegador y no envía otra copia de las métricas a un backend propio.

## Configuración que ya reduce consumo

- Fluid Compute está activo; funciones y base de datos están en la misma zona de la costa este de EE. UU. No se propone cambiar región ni habilitarlo de nuevo.
- El proxy solo cubre dashboard, login y registro. Los archivos estáticos, APIs y página pública están fuera del matcher. No se propone eliminar autenticación.
- Hay caché de lecturas, deduplicación cliente y carga diferida de formularios. El prefetch del menú ya responde a la intención de navegar. Los listados y resúmenes tienen TTL de 120 s y los catálogos de 300 s.
- Los tres crons son diarios. La importación de correo es incremental y tiene límites de tiempo/concurrencia. No se justifica reducir la revisión de facturas con el volumen actual.
- `.vercelignore` ya excluye Android, documentación, pruebas generadas, dependencias y archivos locales de entorno del envío.
- Los PDF se siguen generando cuando se necesitan; no se propone almacenar otra copia ni contratar almacenamiento externo.

## Aplicación y comprobación propuestas

Aplicar primero las invalidaciones por escuela y la eliminación de peticiones duplicadas; después la carga inicial del resumen. Agruparlas en una publicación validada. Probar aislamiento entre escuelas, roles y sedes, así como cambios de ingresos, gastos, abonos y matrículas, verificando que los saldos aparezcan actualizados.

Comparar dos ventanas equivalentes posteriores a la publicación, con cantidad de operaciones de negocio similar: CPU, memoria, invocaciones por guardado/carga y frecuencia de regeneración. Separar tráfico de pruebas y builds de tráfico diario. Las optimizaciones de base de datos publicadas esta noche aún no tienen una ventana suficiente para medir su efecto mensual en Vercel.

La consulta CLI `vercel usage` devolvió `Costs not found (404)`; las cifras de uso sí se comprobaron en el panel. No se obtuvo una factura monetaria, por lo que no se afirma un ahorro mensual en dinero ni una reducción porcentual de toda la plataforma. [La documentación distingue recursos incluidos y cobro por consumo según el plan](https://vercel.com/docs/pricing).

Evidencia agregada sin credenciales ni datos personales: `output/revision-vercel/mediciones.json`. Los archivos de código citados se compararon con el checkout exacto del despliegue publicado y coinciden en los puntos revisados.
