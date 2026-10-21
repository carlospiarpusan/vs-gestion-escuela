# Revisión integral y mejoras operativas

Fecha: 20 de octubre de 2026, zona America/Bogota.

## Decisión confirmada por el usuario

La prioridad inmediata es cerrar la exposición de tablas de contratos en Supabase y corregir la exactitud de la importación de facturas. Por decisión expresa del usuario del 20 de octubre de 2026, ConduSoft mantiene la generación de documentos cuando se necesiten y el almacenamiento de información y referencias de facturas. Los soportes documentales ya se conservan en Aulapp y los originales recibidos permanecen en el correo. Se retira la propuesta de duplicarlos en Cloudflare R2 o Backblaze B2 y de agregar un archivo documental propio. Si se incorpora una descarga desde ConduSoft, debe obtenerse del origen autorizado cuando se solicite, sin crear otra copia persistente.

Este documento conserva el diagnóstico inicial y las propuestas. Posteriormente se implementaron y publicaron las correcciones descritas en [Correcciones de la revisión](CORRECCIONES-REVISION-2026-10-20.md). Los conteos y resultados de las siguientes secciones corresponden al momento del diagnóstico; el documento de correcciones distingue lo resuelto de los pendientes.

## Alcance y resultados

Se revisaron las rutas web, los módulos principales del dashboard, autenticación y autorización, estructura de la base de datos, contratos, pagos, importación de facturas, tareas programadas, cliente Android, persistencia local, dependencias y proceso de integración continua. Se contrastaron las propuestas de infraestructura con documentación oficial vigente.

| Comprobación                            | Resultado                                                                 |
| --------------------------------------- | ------------------------------------------------------------------------- |
| Pruebas web                             | 1.086 correctas en 105 archivos                                           |
| Pruebas Android                         | 157 correctas en 14 archivos                                              |
| Reproducciones adicionales de auditoría | 3 correctas: borrador compartido, nota crédito y moneda extranjera        |
| ESLint                                  | Correcto                                                                  |
| TypeScript web y Android                | Correctos                                                                 |
| Compilación web de producción           | Correcta                                                                  |
| Auditoría npm web, omitiendo dev        | 0 avisos                                                                  |
| Auditoría npm Android, omitiendo dev    | 53 paquetes señalados: 2 críticos, 35 altos, 15 moderados, 1 bajo         |
| Compatibilidad Expo                     | 5 dependencias desalineadas con el SDK instalado                          |
| Tablas públicas con RLS                 | 45 de 49                                                                  |
| Inicio de sesión público                | Renderiza, sin errores de consola observados ni desbordamiento a 1.280 px |

Las pruebas correctas no cubren por sí solas toda la configuración de producción: la exposición de tablas se detectó consultando los permisos reales. No se recorrió cada operación autenticada con todos los roles ni se compiló una APK. No se midieron Lighthouse, INP real, LCP de campo, P95 de API ni latencia desde teléfonos; las recomendaciones de rendimiento son de estructura y verificabilidad, sin prometer una mejora de velocidad no medida.

## Hallazgos que conviene corregir

### 1. Urgente: tablas de contratos accesibles con el rol anónimo

En producción, estas tablas de `public` tienen RLS desactivado y privilegios SELECT, INSERT, UPDATE y DELETE para `anon`:

- `configuracion_contratos_escuela`.
- `plantillas_contrato_escuela`.
- `contratos_emitidos_alumno`.
- `_migraciones`.

Las cuatro respondieron HTTP 200 a solicitudes HEAD con la clave pública y sin sesión de usuario. Se solicitó un límite de cero filas; no se descargaron contratos ni se realizaron escrituras para demostrar el problema. La autorización de las páginas de Next.js no protege una tabla que sigue siendo accesible directamente mediante la Data API.

Las tablas de contratos contienen configuración de consecutivos, datos del representante y representaciones históricas de contratos. La consecuencia posible es lectura o modificación fuera del flujo autorizado. Esta revisión confirma exposición y permisos; no demuestra que otra persona los haya utilizado.

**Acción:** revocar permisos innecesarios, activar RLS y definir acceso por escuela, sede y rol donde corresponda. La tabla de migraciones debe quedar reservada al proceso administrativo. Revisar además funciones/RPC y privilegios heredados relacionados. Probar acceso anónimo, alumno, instructor, administrativos de dos escuelas y servidor antes de publicar la corrección.

Evidencia: `output/revision-2026-10-20/seguridad-tablas.json`. Definiciones: `supabase/schema.sql:288` y `scripts/migrate.js:46`. Referencia: [RLS en Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security).

### 2. Alta: la recepción de una factura implica estado pagado por defecto

`insertExpenseFromPreview`, en `src/lib/email-invoice-sync.ts:947`, inserta el gasto sin `estado_pago` ni `fecha_vencimiento`. La base real tiene valores predeterminados `pagado` y `CURRENT_DATE`, aunque el parser ya obtiene el vencimiento del XML.

En la escuela revisada, los 42 gastos vinculados a importaciones exitosas figuran como pagados. Esto no prueba que esos 42 pagos sean incorrectos; muestra que el sistema no distingue recibir una factura de confirmar su pago.

**Acción:** registrar explícitamente la obligación y el vencimiento del documento; confirmar el pago con evidencia o una acción autorizada. Preservar los movimientos históricos hasta revisar su soporte. El envío automático de facturas nuevas no debería inventar salidas de dinero.

### 3. Alta: notas crédito y moneda extranjera comparten el flujo de gasto positivo

Una prueba con XML ficticio confirmó que `parseElectronicInvoiceXml` acepta un `CreditNote`, devuelve un importe positivo y no incluye un tipo de documento en el resultado. El importador consume ese mismo resultado como gasto. Una segunda prueba confirmó que USD 100 llega como importe 100; `insertExpenseFromPreview` no recibe la moneda ni realiza conversión, mientras los informes presentan COP.

Además, el parser conserva el nombre del adquirente, pero no su NIT para contrastarlo con la empresa receptora. La deduplicación actual utiliza número de factura y nombre del proveedor; conviene fortalecerla con NIT y CUFE/CUDE cuando estén disponibles.

**Acción:** diferenciar factura y nota, comprobar moneda y receptor, y separar las excepciones para revisión. Las facturas normales y válidas pueden seguir entrando automáticamente. Relacionar las notas con el documento original, sin convertirlas en otro gasto positivo. Referencias: [documentación técnica DIAN](https://micrositios.dian.gov.co/sistema-de-facturacion-electronica/documentacion-tecnica/) y [modelo de documentos y ajustes](https://factura-electronica.dian.gov.co/modelo-operacion-19.html).

### 4. Alta: borradores de formularios compartidos entre cuentas

Los formularios usan claves fijas como `dashboard:alumnos:form`, `dashboard:gastos:form` y `dashboard:ingresos:form`. `useDraftForm` guarda en localStorage sin propietario ni vencimiento. El cierre de sesión limpia las cachés de recursos, pero no estos borradores.

Una prueba local con datos ficticios reprodujo que un segundo contexto puede restaurar el borrador anterior usando la misma clave. También puede ocurrir al cambiar de escuela con un mismo usuario.

**Acción:** incluir usuario, escuela y contexto del formulario en la clave; validar propietario y antigüedad al restaurar. Tratar de forma explícita los borradores antiguos sin dueño. La restauración de una matrícula debe pertenecer también al alumno correcto.

### 5. Alta: el cambio obligatorio de contraseña depende de datos editables por el usuario

`src/lib/api-auth.ts:146` y el layout consultan `user_metadata.debe_cambiar_password`. Las cuentas nuevas guardan allí la marca. Supabase permite que el usuario cambie sus propios metadatos, por lo que esta bandera puede dejar de exigir el cambio sin que la contraseña realmente se haya renovado. Esto afecta esa obligación; los roles principales sí se consultan desde el perfil de la base de datos.

**Acción:** mantener la obligación en una fuente que solo pueda actualizar el servidor, y retirarla tras completar el cambio de contraseña. Verificar también los accesos directos a datos y los flujos móviles. [Supabase explica la diferencia entre user_metadata y app_metadata](https://supabase.com/docs/guides/database/postgres/row-level-security#authjwt).

### 6. Alta: registro de alumnos distinto entre Android y web

La web valida nacimiento, sexo, fecha y categorías para calcular ANSV. `supabase/functions/mobile-admin-users/index.ts:526` crea directamente un alumno con un conjunto básico de campos; no guarda nacimiento, sexo, matrícula ni snapshot ANSV. El formulario Android tampoco los solicita.

**Acción:** decidir si ese flujo es una preinscripción o una matrícula completa. Si es preinscripción, identificarla como tal y completarla antes de emitir contrato; si es matrícula, compartir validación y operación transaccional con la web. Probar también comandos offline anteriores a la actualización.

En los datos históricos de la escuela revisada hay 2.856 alumnos regulares: 2.848 sin nacimiento y 2.855 sin sexo. Las 2.939 matrículas consultadas no tienen snapshot ANSV. Estos son datos históricos incompletos, no una razón para inferir sexo, inventar tarifas o reescribir contratos. Conviene una lista de pendientes y completarlos cuando se necesiten.

### 7. Alta: actualizar y alinear el entorno Android

Expo instalado es 54.0.33. `expo install --check` recomienda alinear:

- Expo a `~54.0.37`.
- expo-constants a `~18.0.14`.
- expo-linking a `~8.0.12`.
- expo-router a `~6.0.24`.
- babel-preset-expo a `~54.0.10`, frente al 55.0.15 instalado.

Los 53 avisos de npm corresponden a paquetes afectados, no a 53 vulnerabilidades independientes demostradas en la APK. Los críticos observados incluyen `tar` en Expo CLI y `shell-quote` en react-devtools; deben distinguirse herramientas de compilación y código ejecutado por el usuario final.

**Acción:** corregir primero la compatibilidad del SDK, revisar dependencias transitivas y planificar la actualización por versiones, con pruebas y APK nueva. Evitar `npm audit fix --force`, que aquí propone cambios incompatibles, incluso una versión antigua de Expo. [Proceso oficial de actualización](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/).

### 8. Media: proteger abonos web frente a repetición después de una respuesta perdida

El endpoint de abonos usa transacción y bloqueo de saldo, lo cual protege la consistencia. Sin embargo, su entrada no tiene identificador idempotente y cada POST válido inserta un ingreso nuevo. Si se pierde la respuesta de un abono ya confirmado y el usuario lo registra otra vez, puede duplicarse mientras exista saldo suficiente.

**Acción:** identificador de operación reutilizado durante el reintento, restricción única en el servidor y devolución del resultado previo. Android ya utiliza identificadores de comandos; conviene aplicar la misma garantía al flujo web. Esta observación describe una ruta posible por el código, no duplicados reales confirmados.

### 9. Media: historial de cambios y diagnóstico operativo incompletos

Hay columnas `updated_at`/`updated_by` y registros específicos de CALE, pero no se encontró un historial uniforme de antes/después para alumnos, matrículas y finanzas. `/dashboard/bitacora` redirige a la bitácora de vehículos: no es una auditoría general.

Ya existen Vercel Analytics, Speed Insights, tiempos de servidor y presupuestos de rendimiento. Conviene complementarlos con errores de aplicación correlacionados, estado de tareas y alertas, cuidando que los logs no contengan claves ni documentos completos.

**Acción:** historial consultable dentro de cada ficha y movimiento, más registro de operaciones fallidas con identificador y responsable. Priorizar cancelaciones, cambios de valor, anulaciones y cambios de permisos.

### 10. Media: ampliar las comprobaciones de cada entrega

El workflow de GitHub ejecuta pruebas, lint, TypeScript y build web. No ejecuta las pruebas ni la comprobación de tipos de Android y no contiene recorridos de navegador con roles. Las pruebas de permisos del código tampoco detectaron las cuatro tablas abiertas de producción.

**Acción:** agregar Android al CI, limitar los motores PostgreSQL de pruebas a una concurrencia estable y probar en un entorno aislado los recorridos de alumno, matrícula, abono, cancelación, 40 preguntas CALE e importación de factura. Incluir pruebas de permisos reales del esquema después de migrar. No depender solo de mocks.

### 11. Media: correo y respaldos necesitan comprobación operativa

El correo se programa una vez al día. Cada buzón se procesa secuencialmente y el cron tiene un máximo de 300 segundos; una empresa con mucho correo o varias empresas pueden consumir ese tiempo antes de terminar todas. La conexión de la escuela consultada está activa, tiene sincronización automática y no registraba error en la consulta.

**Acción:** trabajo independiente por buzón, continuación y reintento controlado, y aviso si deja de sincronizar. Para Gmail se puede evaluar `watch` + Pub/Sub, conservando recuperación periódica: las notificaciones pueden perderse y la suscripción requiere renovación. [Guía oficial de Gmail](https://developers.google.com/workspace/gmail/api/guides/push).

El módulo de Cumplimiento documenta evidencias de respaldos; esa pantalla no demuestra que exista una copia restaurable. Falta verificar la configuración real del proveedor y hacer una restauración de ensayo. Los backups de PostgreSQL en Supabase no incluyen los objetos de Storage. [Alcance oficial de los respaldos](https://supabase.com/docs/guides/platform/backups).

## Qué archivos guardamos hoy

Se contrastaron el código, las columnas de archivos potenciales y el inventario de Supabase Storage del proyecto conectado. La consulta fue agregada: no se descargó contenido de documentos.

| Elemento                                | Situación comprobada                                                                                           |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Supabase Storage                        | Un bucket `school-logos`, público, con 0 objetos y 0 bytes                                                     |
| PDF de facturas recibidas               | El parser detecta su nombre dentro del ZIP; no lo archiva ni devuelve sus bytes para guardarlos                |
| XML/ZIP de facturas recibidas           | Se leen para extraer datos y crear gastos; no se encontró una copia persistente de los originales en ConduSoft |
| Gastos importados                       | Se guardan datos del gasto, notas y referencias del mensaje/adjunto                                            |
| Contratos                               | El flujo actual genera HTML para imprimir; el usuario puede guardar el PDF desde el navegador                  |
| Representaciones históricas de contrato | Dos registros en la tabla antigua, con 25.379 bytes de HTML y 1.926 bytes de snapshots; no son PDF             |
| Facturas emitidas por FacturaX          | ConduSoft guarda solicitud, identificadores, estado y número; no conserva sus PDF/XML en este proyecto         |
| Imágenes estáticas de marca/contrato    | Archivos pequeños del código desplegado, no un archivo documental de clientes                                  |
| CALE                                    | Referencias de imagen por URL, sin un flujo de subida de archivos encontrado en este código                    |
| Archivos de Android                     | SQLite local con datos/cache/cola; no un depósito central de PDF                                               |

No hay actualmente una colección de PDF en Supabase que requiera migración. El usuario confirmó que los soportes se conservan en Aulapp y que los originales recibidos están en el correo. ConduSoft mantendrá los datos y referencias necesarios y la generación bajo demanda. Esta revisión no inventarió el contenido de Aulapp, de FacturaX ni los PDF guardados en computadores de los usuarios.

Evidencia: `output/revision-2026-10-20/archivos-almacenamiento.json`, `src/lib/electronic-invoice.ts:536`, `src/lib/email-invoice-sync.ts:1206` y `src/lib/vs-billing/contract-invoices.ts:209`.

## Comparación investigada: almacenamiento documental descartado

Precios consultados el 20 de octubre de 2026, en USD. Son tarifas de almacenamiento; el coste final depende del uso, operaciones, entrega, impuestos y servicios adicionales.

| Aspecto                          | Cloudflare R2 Standard                         | Backblaze B2 habitual, pay as you go                                                           |
| -------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Almacenamiento base              | USD 0,015 por GB/mes                           | USD 6,95 por TB/mes                                                                            |
| Tramo gratuito de almacenamiento | 10 GB/mes                                      | Primeros 10 GB                                                                                 |
| Descarga por Internet            | Sin cargo de egreso de R2                      | Gratis hasta 3 veces el almacenamiento medio; después USD 0,01/GB, con excepciones para socios |
| Operaciones                      | Cuotas gratuitas; después cobro por clases A/B | Clases A/B/C gratuitas en pay as you go; clase D con tarifa específica                         |
| Uso recomendado aquí             | Documentos consultados desde la plataforma     | Archivo de mayor volumen o copia de respaldo independiente                                     |

Fuentes: [precios de R2](https://developers.cloudflare.com/r2/pricing/) y [precios de B2](https://www.backblaze.com/cloud-storage/pricing). Ambos permiten acceso mediante interfaces compatibles con S3; se debe comprobar la compatibilidad de las operaciones utilizadas, sin asumir que implementan todo S3.

**Decisión vigente:** esta comparación queda como referencia de la investigación. El volumen actual no requiere migración y el usuario ha descartado almacenar otra copia de los documentos en ConduSoft. No se crearán buckets ni flujos de archivo documental para este alcance. Los respaldos recuperables de la base de datos son una necesidad distinta y siguen sujetos a verificación.

## Funciones nuevas con utilidad operativa

| Prioridad | Función                                 | Ubicación y beneficio                           | Primer alcance verificable                                                                                                                            |
| --------- | --------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1         | Pendientes del día                      | Inicio actual, con enlaces a la acción concreta | Datos ANSV/fiscales incompletos, obligaciones por pagar, vencimientos de vehículo y fallos de sincronización                                          |
| 2         | Arqueo y cierre real de caja            | Ampliación de Caja diaria                       | Apertura, entradas/salidas en efectivo, conteo físico, diferencia, responsable y reapertura autorizada. Hoy la pantalla muestra agregados de ingresos |
| 3         | Recibo de abono imprimible bajo demanda | Dentro del alumno y del ingreso existente       | Generar el comprobante desde el abono guardado y su estado, sin archivar otro PDF ni confundirlo con una factura electrónica                          |
| 4         | Conciliación bancaria asistida          | Dentro de Ingresos/Gastos                       | Importar extracto, proponer coincidencias, confirmar o dejar excepciones; nunca crear pagos dobles automáticamente                                    |
| 5         | Historial por registro                  | En alumno, matrícula y movimiento               | Ver responsable, fecha y cambio; filtrar cancelaciones, modificaciones de valor y anulaciones                                                         |

El centro de pendientes debe aprovechar el dashboard actual. El módulo Clases permanece retirado. La generación de documentos y comprobantes continúa bajo demanda, sin incorporar un repositorio documental paralelo a Aulapp y al correo.

## Orden sugerido de ejecución

1. **Seguridad y exactitud:** cerrar las cuatro tablas abiertas, aislar borradores, proteger la obligación de cambio de contraseña y separar pago/recepción, notas y monedas en el importador.
2. **Coherencia y entrega:** alinear Android con web, actualizar dependencias y ampliar CI. Agregar idempotencia a los abonos y verificación de permisos de las migraciones.
3. **Operación diaria:** pendientes, arqueo, recibos bajo demanda, historial y conciliación; medir tiempo ahorrado y errores evitados antes de añadir más funciones.

Los contratos cancelados conservan su número y su historial; la generación bajo demanda no cambia las reglas de emisión ni permite reutilizar consecutivos.

## Evidencias y límites del diagnóstico

Los JSON y reproducciones de auditoría están en `output/revision-2026-10-20/`, carpeta excluida de Git y del despliegue. Contienen permisos, conteos agregados, avisos de dependencias y ejemplos ficticios, sin claves ni contratos reales descargados.

Las deficiencias de código se observaron en la copia de trabajo, que ya contiene cambios pendientes. Las tablas, permisos, inventario y conteos indicados se comprobaron en la base conectada de producción. Las pruebas de Android verifican su código actual, no el estado de cada APK instalada. La política y el calendario de retención documental deben definirse antes de programar eliminaciones o bloqueos irreversibles.
