# Validación general de ConduSoft

20 de octubre de 2026, America/Bogota. Revisión posterior al cambio del valor predefinido de Recaudo.

## Resultado

Se reprodujeron y corrigieron dos fallos en la lectura de facturas recibidas:

1. Un `AttachedDocument` con la factura dentro de `Description` se rechazaba si el elemento usaba prefijo, por ejemplo `inv:Invoice`. Se reconocen también prefijos con guion o punto, tanto directamente como dentro del adjunto. El prefijo no sustituye la validación del documento, el proveedor, el adquirente o la moneda.
2. En un ZIP con varios XML, el nombre podía hacer que se eligiera una respuesta del proveedor en lugar de la factura. Ahora se prueban los candidatos por contenido y solo se descartan documentos incompatibles. Un error real de una factura, como una fecha inválida, se conserva para revisión y no se oculta seleccionando otro documento.

La extracción XML del ZIP se realiza por fragmentos. Se detiene al superar el límite de 5 MiB por XML y se limita la lectura acumulada a 12 MiB. No se extrae ni guarda el PDF; el comportamiento documental continúa bajo demanda.

Se mantuvo «Recibido completo» como valor predefinido autorizado en facturas de contado, con la confirmación y las restricciones de crédito y permisos existentes.

## Evidencia de comprobaciones

| Comprobación                                                    | Resultado                                                                                                                                       |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Batería web final                                               | 1.133 pruebas correctas en 112 archivos                                                                                                         |
| Android                                                         | 157 pruebas correctas en 14 archivos; tipos correctos                                                                                           |
| Edge Function móvil                                             | 69 pruebas correctas                                                                                                                            |
| RPC y permisos PostgreSQL/WASM                                  | Correctos; conservación de firmas, reintentos y restricciones                                                                                   |
| ESLint y TypeScript web                                         | Correctos                                                                                                                                       |
| Pruebas de importación de la versión preparada para publicación | 42 correctas; incluyendo MIME de Gmail y Microsoft simulados                                                                                    |
| Compilación de producción                                       | Correcta; TypeScript y generación de páginas de producción terminados                                                                           |
| Auditoría npm web, sin desarrollo                               | 0 avisos                                                                                                                                        |
| Base de producción                                              | Accesible; 50 tablas públicas con RLS, ninguna sin RLS                                                                                          |
| Tablas internas sensibles                                       | Ninguna de las cinco comprobadas accesible mediante los privilegios anónimos revisados                                                          |
| Asesor de seguridad Supabase, nivel ERROR                       | Sin hallazgos; no implica que no existan advertencias de otros niveles                                                                          |
| Correo automático                                               | Una conexión activa, sin error registrado ni retraso superior a 48 horas                                                                        |
| Logs Vercel, seis horas anteriores a la revisión                | Las consultas limitadas a 100 resultados no devolvieron errores de nivel error ni respuestas 5xx; una muestra de nueve solicitudes devolvió 200 |
| Navegador público                                               | Alumnos redirige al inicio de sesión sin sesión; sin errores de consola observados                                                              |
| Importación en navegador                                        | XML y ZIP ficticios cargados con el parser y el modal reales; datos, importe y vencimiento correctos, estado pendiente                          |
| Escritorio y teléfono                                           | Revisado a 1.280 y 390 px; navegación por teclado entre los controles                                                                           |

Una prueba aislada del índice de facturas excedió una vez los cinco segundos de inicialización de PostgreSQL/WASM. Se amplió a 15 segundos únicamente el límite de esa prueba; se mantuvieron sus mismas aserciones y pasó de nuevo. Esto no cambia los tiempos de espera de la aplicación.

## Alcance y límites

Se usaron datos ficticios para los formularios y los adjuntos. Las pruebas de servidor cubren validación, consultas, transacciones y permisos en el entorno aislado. Las consultas a producción fueron de solo lectura.

No se emitieron facturas reales, no se registraron gastos o abonos de prueba y no se cancelaron ni eliminaron alumnos. No había una sesión administrativa disponible en el navegador de pruebas: los recorridos autenticados de creación y edición se verificaron mediante la batería aislada, no mediante escrituras manuales en producción.

La prueba con MIME simula las llamadas a Gmail/Microsoft y conserva la lectura real del adjunto y la creación esperada del gasto; no constituye una emisión fiscal ni una nueva importación sobre el buzón real. No se generó una APK.

Los pendientes de una actualización mayor de Android, respaldo/restauración del proveedor y revisión de gastos históricos siguen descritos en [el informe de correcciones](CORRECCIONES-REVISION-2026-10-20.md).

Referencias de implementación: [espacios de nombres XML de W3C](https://www.w3.org/TR/xml-names/), [lectura por fragmentos de JSZip](https://stuk.github.io/jszip/documentation/api_zipobject/internal_stream.html).

## Publicación

Publicación verificada: `dpl_AbEMyaKecDcdXZVYzmyBnPK4Wj58`, estado READY, promovida a `condusoft.co` y `www.condusoft.co`. La versión parte de `dpl_BVk2EshgY1zq12DjuwoUGvsUWpF7`, conservando sus demás archivos y superponiendo únicamente el parser y las pruebas de esta corrección.
