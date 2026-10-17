# Facturación desde Alumnos mediante FacturaX

Implementación publicada para Escuela de Conducción Sin Fronteras S.A.S., NIT
901171550-0. La emisión utiliza el motor existente de FacturaX: firma, certificado,
numeración de producción, validación DIAN, PDF, XML y correo.

## Flujo

1. En Alumnos, abrir «Factura electrónica por contrato» y elegir el contrato.
2. ConduSoft envía nombre, identificación, tipo de documento, correo e ID del alumno.
3. FacturaX devuelve sus productos activos, precios base, tratamiento de IVA y medios de pago.
4. Seleccionar conceptos y cantidades, precio unitario para conceptos variables,
   IVA si no está configurado, pago y entrega. «Revisar factura» obtiene
   los valores definitivos calculados por FacturaX. La revisión vence en 15 minutos.
5. Confirmar los datos y pulsar «Emitir en FacturaX». ConduSoft reserva la
   asociación con el contrato antes de solicitar la emisión.
6. FacturaX firma y envía a DIAN. ConduSoft recupera número, CUFE y estado.
7. «Consultar estado» recupera el resultado de la solicitud existente.
   «Enviar al alumno» aparece cuando la factura está aceptada por DIAN y usa el
   correo y los adjuntos del documento firmado en FacturaX.

La matrícula, sus categorías, el número del contrato, el precio del curso y los
abonos **no se envían a FacturaX**. El contrato se asocia localmente mediante una
solicitud UUID opaca. Los importes fijos proceden del catálogo de FacturaX; un
concepto con precio cero permite indicar un importe variable solo para esa factura.

## Activación en producción

Activada el 11 de octubre de 2026 con autorización del responsable. Ambas
migraciones están aplicadas y las variables siguientes están configuradas
exclusivamente en servidores de producción. No repetir la aplicación de las
migraciones ni generar otra credencial para utilizar la conexión existente.

Despliegues verificados y promovidos, primero FacturaX y después ConduSoft:

- FacturaX: `dpl_BLDVQfJndTtCBB253XYGHgQZMDgE`, publicado en
  <https://www.facturax.co>.
- ConduSoft: `dpl_6C8mQ2Yn3Qg357F3PE2u6oTfcvZL`, publicado en
  <https://condusoft.co>.

Las instrucciones siguientes sirven para instalaciones futuras o una rotación
autorizada, no son tareas pendientes del despliegue actual.

Aplicar únicamente las migraciones pendientes, después de verificar el historial
de cada base. No reinstalar las migraciones históricas de FacturaX:

- ConduSoft: `supabase/migrations/20261010190934_facturax_contract_invoices.sql`.
- FacturaX: `supabase/migrations/20261010190937_condusoft_invoice_requests.sql`.
  Está incluida al final de `src/lib/fiscal-migrations.mjs`.

Crear una credencial exclusiva de emisión con 32 bytes aleatorios en Base64URL,
anteponiendo `fx_cs_`. El token final tiene 49 caracteres. Mantenerlo en el gestor
de secretos del servidor; nunca en una variable `NEXT_PUBLIC_*` o en el navegador.
La clave `cs_vsf_*` existente conserva únicamente el acceso de lectura de alumnos.

Variables de ConduSoft:

```dotenv
FACTURAX_INVOICING_ENABLED=true
FACTURAX_EMISSION_API_KEY=<token de emisión>
```

Además, debe estar habilitada la integración anterior `VS_BILLING_API_ENABLED=true`.

Variables de FacturaX:

```dotenv
VSF_CONDUSOFT_EMISSION_ENABLED=true
VSF_CONDUSOFT_EMISSION_KEY_SHA256=<SHA-256 hexadecimal del token completo>
VSF_CONDUSOFT_EMISSION_ACTOR_ID=<UUID de miembro activo de Sin Fronteras en FacturaX>
VSF_CONDUSOFT_EMISSION_ACTOR_EMAIL=<correo de ese miembro>
```

El miembro responsable debe tener permisos `read`, `emit`, `workspace` y
`delivery` para el flujo completo. El servidor verifica que siga activo en cada
petición y comprueba la empresa y su NIT. Rotar o quitar el hash revoca este canal.
La empresa, el certificado, su software DIAN, la numeración exclusiva y el correo
deben estar preparados en FacturaX. La API aplica sus controles existentes.

Desplegar primero FacturaX con la API receptora y su migración, y después
ConduSoft con su migración y credencial. Activar los indicadores cuando ambas
partes estén listas.

## API entre servidores

Destino fijo: `https://www.facturax.co/api/integrations/condusoft/v1`.
Autenticación: `Authorization: Bearer fx_cs_...`. No acepta cookies de ConduSoft
ni admite modificar la empresa mediante cookies de FacturaX.

`POST` acepta acciones JSON estrictas:

- `catalog`: `student` con `id`, `name`, `document`, `documentType`, `email`.
- `quote`: el mismo alumno, `items: [{productId, quantity, unitPrice?, taxChoice?}]`,
  `payment: {method, condition, dueDate}` y `delivery: email|physical`.
  `quantity` se expresa en milésimas: `1000` equivale a una unidad.
  `unitPrice` son centavos enteros de COP, positivos y hasta `100000000000`,
  obligatorios y permitidos únicamente si el precio del catálogo es cero.
  Es precio unitario base sin IVA. `taxChoice` es `19|5|excluded|exempt`,
  obligatorio y permitido solo cuando el concepto no tiene IVA configurado.
- `emit`: `id` de revisión, `studentId` y `confirmProduction: true`.
- `refresh`: `id`. Solo consulta el estado de DIAN.
- `email`: `id` y `confirmed: true`. No reenvía automáticamente un correo incierto.
- `cancel`: `id`, `studentId`, `confirmed: true`. Solo descarta una preparación
  sin documento firmado ni emisión iniciada.

`GET ?id=<UUID>` devuelve número y estado, y la revisión si todavía no se ha emitido.
Los importes de FacturaX son centavos enteros de COP. ConduSoft muestra pesos COP.

## Recuperación y límites

- Doble clic y peticiones concurrentes conservan una solicitud por contrato.
  FacturaX reserva un solo número y hace un único envío inicial.
- Un timeout no libera la asociación. Consultar la solicitud para recuperar el resultado.
- Si la firma falla antes de crear el documento, se revierte la transacción.
  Tras consultar, se puede descartar esa preparación y corregir los datos.
- Una factura firmada pero aún no enviada, rechazada o con resultado incierto se
  revisa en FacturaX. Este canal no aplica reintentos automáticos de emisión.
- `accepted` significa validada por DIAN. `sent` en correo significa aceptada
  por el proveedor de correo, y no garantiza recepción del alumno.
- Los registros manuales anteriores de factura en la ficha del alumno se conservan.
  Hay un aviso para comprobar que no correspondan al contrato que se va a facturar.
- Los documentos con TI, RC, PEP y PPT requieren revisión en FacturaX antes de
  usar este flujo. Los NIT requieren datos fiscales previamente configurados allí.

## Verificación

Verificación local del 11 de octubre de 2026:

- Compilación de producción y TypeScript correctos en ambas aplicaciones.
- Suite completa de ConduSoft: 260 pruebas aprobadas.
- Suite completa de FacturaX: 258 pruebas aprobadas.
- ESLint correcto en los archivos nuevos y los archivos de ConduSoft modificados
  para este flujo.
- Formulario real comprobado en navegador con API simulada: selección de contrato,
  catálogo, revisión, confirmación, recuperación del número y envío de correo.
  Revisado en 1280 x 900, 390 x 844 y variante móvil de 320 x 568, sin
  desbordamiento horizontal y con desplazamiento interno accesible.
- Concurrencia y respuesta perdida: una reserva, un número y un único envío inicial;
  aislamiento entre empresas y compatibilidad con respaldos anteriores comprobados.

Las pruebas usan PostgreSQL en memoria, certificado sintético y respuestas de
DIAN simuladas. No emiten facturas fiscales reales ni envían correos a alumnos.
Para una prueba fiscal real, usar únicamente una operación autorizada de la escuela.

### Comprobaciones del despliegue

- Ambas compilaciones remotas listas y dominios públicos apuntando a los IDs
  anteriores. Las comprobaciones se repitieron antes y después de la promoción.
- FacturaX real: acceso sin credencial rechazado (401), catálogo autorizado con
  27 productos y 9 medios de pago (200), preparación ficticia, consulta y
  cancelación correctas (200). Sin documento, numeración fiscal ni correo.
- Los 11 documentos existentes, su huella fiscal y el espacio de trabajo no
  cambiaron durante esas pruebas. La migración de ConduSoft conservó 3.165
  alumnos y 2.916 contratos. Las tablas nuevas tienen RLS y no admiten acceso
  directo de usuarios anónimos ni autenticados.
- Inicio, login, registro y privacidad responden 200. El dashboard sin sesión
  redirige al login (307); las APIs de alumnos, cartera, horas y facturación
  rechazan accesos sin sesión (401). El login no mostró errores de consola.
- No se encontraron registros de nivel error en los despliegues nuevos durante
  la ventana de comprobación de 20 minutos. Esto no sustituye seguimiento posterior.
- `npm audit --omit=dev --audit-level=high`: cero vulnerabilidades en ambas
  aplicaciones. ConduSoft usa Next.js 16.3.8. Persisten avisos de dependencias
  de desarrollo fuera del paquete de producción; no se aplicaron degradaciones
  incompatibles propuestas por `npm audit --force`.
- ConduSoft: lint completo correcto. FacturaX: cero errores y un aviso previo
  ajeno al flujo en `scripts/cloudflare-free-probe/worker.mjs`.

Evidencia sin credenciales: `output/playwright/facturax-production-verification.json`,
`output/playwright/condusoft-production-verification.json` y
`output/playwright/facturax-migration-production.png`. La copia temporal de la
clave se elimina al terminar; el token continúa almacenado como secreto de Vercel.

No había sesión administrativa de ConduSoft en el navegador de comprobación.
El formulario completo se verificó localmente con API simulada; la API receptora
se probó en producción con identidad ficticia. La primera emisión fiscal real y
su correo requieren una operación expresamente autorizada, con los requisitos
fiscales y los datos del cliente válidos en FacturaX.

### Selector de productos

Revisión del 11 de octubre de 2026 por casillas aparentemente no seleccionables:
la consulta de solo lectura confirmó 27 productos activos, de los que 23 tienen
IVA sin configurar o precio no positivo. Los cuatro disponibles son PUBLICO C1,
RECATEGORIZACION RC1, MOTOCICLETA A2 y PARTICULAR B1. No se modificaron precios,
clasificaciones fiscales ni datos del catálogo.

El formulario muestra primero los disponibles, indica el conteo y presenta el
motivo fiscal de cada bloqueo con acceso a FacturaX. Las casillas tienen nombre
accesible, tamaño estable y capturan su valor antes de actualizar el estado.
Se conservan todas las validaciones del servidor: mostrar un producto no
autoriza emitirlo sin configuración fiscal válida.

Comprobación de selección, deselección y revisión conjunta en navegador real
con catálogo ficticio equivalente (4 disponibles y 23 pendientes), además de
pantalla de 390 x 844 sin desbordamiento. La suite completa de ConduSoft pasó
262 pruebas; lint y TypeScript correctos. Evidencia:
`output/playwright/facturax-products-selection-desktop.png` y
`output/playwright/facturax-products-selection-mobile.png`.

Publicado el mismo día en `condusoft.co` mediante
`dpl_47qh7Q2ajAKRSxqvPDPoEXk1Ews1`, sustituyendo el despliegue de ConduSoft
anterior. Compilación remota de producción correcta y comprobaciones de páginas
públicas y rechazo de APIs sin sesión aprobadas antes de promover. FacturaX
permanece en su despliegue anterior, sin cambios de servidor ni migraciones nuevas.

### Correo del alumno para facturación

Implementación del 13 de octubre de 2026:

- El registro identifica el campo como correo electrónico para facturación y
  valida formato y longitud. Sigue siendo posible registrar un alumno sin
  correo y completarlo posteriormente, sin bloquear la operación de la escuela.
- Al abrir la factura se consulta el correo actual de la ficha. Si falta, aparece
  el campo y «Guardar correo» antes de habilitar una nueva preparación.
- La acción privada `contact_email` guarda solo `public.alumnos.email` en la
  escuela autorizada. No modifica Auth, perfiles, contraseñas, matrículas,
  precios ni documentos fiscales. No sobrescribe un correo real existente.
- El correo guardado se utiliza en el catálogo y en la revisión enviados a
  FacturaX; la entrega por correo queda habilitada. Una revisión anterior sin
  correo no puede emitirse: hay que descartarla y preparar una nueva.
- Correos vacíos, inválidos o de dominios internos `.local` no sirven como
  contacto de facturación. Se conservan las verificaciones de sesión, rol,
  escuela, NIT, origen, tamaño de solicitud y límite de frecuencia.

Verificado con 281 pruebas, lint y TypeScript correctos. Las pruebas SQL usan
PostgreSQL en memoria y comprueban aislamiento, conservación de correos,
normalización e invalidación de caché. El navegador con API simulada comprobó
guardado y correo en revisión, además de pantalla móvil 390 x 844 sin
desbordamiento. No se guardaron contactos de prueba en producción ni se emitió
ninguna factura fiscal. Evidencia:
`output/playwright/facturax-add-email-desktop.png`,
`output/playwright/facturax-add-email-mobile.png` y
`output/playwright/facturax-email-review-desktop.png`.

Publicado con autorización expresa el 13 de octubre de 2026 en `condusoft.co`,
despliegue `dpl_FbUkSymLyoNpkSEFhL1YqYnP3tNy`. Compilación remota lista,
TypeScript correcto y promoción de producción completada. No requiere nuevas
migraciones ni cambios en FacturaX.

### Personal y precios variables

Ampliación del 13 de octubre de 2026 autorizada por el usuario:

- Pueden emitir el personal activo de Alumnos: administración de escuela y sede,
  administrativos y recepción. Se conserva el superadministrador con escuela
  seleccionada. Alumnos e instructores no obtienen este permiso.
- La gestión de claves sigue siendo exclusiva de administradores de conexión.
  No se modifican roles de Supabase ni credenciales de FacturaX.
- Los operadores de sede solo consultan facturas y operan contratos de su sede;
  no pueden guardar contactos ni emitir para otra sede o escuela.
- Los productos con precio cero ya no están deshabilitados: FacturaX los anuncia
  con `priceEditable=true`. Se ingresa el precio en COP, con hasta dos decimales,
  y se envía el valor como centavos enteros. El catálogo permanece sin cambios.
- Un IVA pendiente no bloquea la selección. `requiresTaxChoice=true` exige elegir
  el tratamiento explícitamente antes de revisar. Nunca se asigna excluido/exento
  automáticamente. Los impuestos ya configurados se respetan.
- Precios e impuestos fijos no aceptan sobrescrituras en la API. Los productos
  archivados y los datos técnicos inválidos continúan rechazados.

ConduSoft: 289 pruebas aprobadas, lint y TypeScript correctos. Pruebas focalizadas
de FacturaX: 7 aprobadas, incluyendo ANSV variable, conservación de catálogo,
rechazo de precios inválidos y protección de valores fijos. Formulario real con
datos ficticios comprobado en escritorio y 390 x 844 sin desbordamiento.
Evidencias: `output/playwright/facturax-variable-price-desktop.png`,
`output/playwright/facturax-variable-price-mobile.png` y
`output/playwright/facturax-variable-review-desktop.png`.

Publicación coordinada autorizada el 13 de octubre de 2026: primero FacturaX
`dpl_FJVEByzaoWb12wjTi7d256rBuJjF`, confirmado por el chat responsable en
`facturax.co` y `www.facturax.co`; después ConduSoft
`dpl_618DGTdZFkrGEh9c2rKUVRhZNxUB`, promovido y comprobado en `condusoft.co`.
El chat de FacturaX confirmó suite completa de 425 pruebas aprobadas y catálogo
real con 27 productos seleccionables y 11 variables. ANSV ya está configurado
como excluido y permite precio variable; su impuesto no se modifica desde aquí.
No se emitieron facturas ni se enviaron correos reales para las pruebas de este flujo.

### Visibilidad del correo al abrir Facturar

Corrección del 13 de octubre de 2026: el campo de correo queda siempre visible
antes de elegir contrato. Si ya existe uno válido, aparece prellenado y de solo
lectura; si falta, permanece editable con «Guardar correo». Guardarlo ya no
oculta el campo. Para cambiar un correo existente se conserva la edición de la
ficha del alumno, evitando modificar destinatarios de documentos ya firmados.
La revisión también muestra el correo cuando la entrega es impresa.

Cambio únicamente de presentación, sin alterar API, permisos, precios o datos.
291 pruebas aprobadas, lint y TypeScript correctos; casos con correo guardado y
faltante comprobados en navegador real con datos ficticios.
Evidencia: `output/playwright/facturax-visible-saved-email.png`.

Publicado en `condusoft.co` el mismo día con
`dpl_9EMddtg3n2PuJHJCsqG6EGCUn1MW`: compilación y TypeScript remotos correctos,
promoción completada y dominio confirmado en Vercel. FacturaX no se redesplegó.

### Datos obligatorios al crear alumnos

Ampliación autorizada el 13 de octubre de 2026:

- Nuevos registros de Alumnos exigen correo real, teléfono de 7 a 15 dígitos,
  dirección, país Colombia, departamento y municipio del catálogo DIAN FE.
  Se guarda el código DANE de cinco dígitos, no se deduce de texto libre.
- Régimen fiscal obligatorio seleccionado según RUT, separado de la responsabilidad
  `R-99-PN` prellenada por petición del usuario. Persona natural y tributo `ZZ`.
  No se asigna automáticamente un régimen; SIMPLE no se ofrece con R-99-PN,
  porque el receptor exige O-47 para ese régimen.
- Validación compartida en cliente y API antes de crear cuentas o registros.
  Se rechazan contactos vacíos, códigos desconocidos y municipio de otro departamento.
- Migración `20261013211423_student_billing_contact.sql` añade solo
  `alumnos.datos_facturacion` nullable JSONB. Los datos anteriores permanecen intactos
  y no se completan perfiles fiscales de forma automática. La edición histórica
  sigue disponible; declarar un perfil nuevo exige contacto completo.
- `student.fiscal` opcional transmite exclusivamente documento fiscal, tipo de
  persona, dirección, municipio DANE, teléfono, responsabilidad, régimen y tributo.
  Sin perfil se conserva la llamada antigua. El pasaporte nuevo usa PP / código 41.
  No se transmiten matrículas, categorías ni valores de cursos.
- El catálogo de municipios se carga con el formulario diferido, no con la tabla
  inicial. Contiene 1.124 códigos y 33 departamentos, con la variante tipográfica
  de Antioquia normalizada sin alterar códigos.

Los borradores guardados antes de esta ampliación se combinan con los campos
nuevos sin perder sus datos; deben completar ubicación y régimen antes de crear.

314 pruebas aprobadas, lint y TypeScript correctos. Migración de producción
verificada: 3.180 alumnos y 2.929 contratos con huellas idénticas antes/después;
RLS permanece habilitado. No se crearon alumnos ni facturas reales en las pruebas.
Formulario comprobado en escritorio y móvil 390 x 844 sin desbordamiento.
Evidencias: `output/playwright/student-contact-production-migration.json`,
`output/playwright/student-required-contact-desktop.png` y
`output/playwright/student-required-contact-mobile.png`.

Publicado el 13 de octubre de 2026: primero el receptor de FacturaX
`dpl_Bx5VvSwVkXSqGFbMfZYvvB1bGDMA`, confirmado por su chat responsable en ambos
dominios; después ConduSoft `dpl_HEqgvizCgWTzi8bfeoKXLDKbUiSe`.
Compilación remota y TypeScript correctos, promoción completada y `condusoft.co`
confirmado en ese ID. Se descartaron los stages previos de esta ampliación de
la promoción; solo se activó el que contiene la compatibilidad de borradores.

### Contribuyente seleccionable y prueba de creación

El 13 de octubre el usuario pidió reemplazar R-99-PN fijo por opciones:
R-99-PN, O-13, O-15, O-23 y O-47. R-99-PN sigue como valor inicial.
La selección se guarda en `datos_facturacion` y llega a `student.fiscal` sin
enviar matrícula ni valores de curso. El régimen SIMPLE y O-47 se mantienen
coherentes en el formulario y se validan también en la API.
No se infiere responsabilidad de IVA ni se modifican perfiles antiguos.

Pruebas de creación ejecutan el handler real y su SQL en PostgreSQL aislado
(PGlite), con Auth simulado: alumno, contrato, fecha elegida y abono se guardan
para las cinco responsabilidades. Un fallo del abono revierte toda la operación
y elimina la cuenta simulada recién creada. Se comprueba que las cookies no
cambien la escuela del personal ni habiliten creación sin escuela asignada.
329 pruebas, lint y TypeScript correctos; selector revisado en móvil 390 x 844.
Evidencia: `output/playwright/student-taxpayer-options-mobile.png`.

El rechazo reportado en la sesión de producción no se reprodujo con datos
completos. No se creó un alumno real ni se probó Auth con una cuenta nueva real.
Se añade diagnóstico de etapa y código de error, sin mensajes SQL ni datos
personales, para localizar cualquier nuevo fallo de la ruta de creación.
FacturaX no necesita cambios: su contrato existente admite las cinco opciones.

Publicado en `condusoft.co` con `dpl_2hKyXuNxcgNPGRFsNTuzHfY54Fz3`:
compilación remota y TypeScript correctos; POST sin sesión devuelve HTTP 401
sin crear registros; promoción completada y dominio confirmado en Vercel.
No se aplicaron migraciones adicionales ni se redesplegó FacturaX.
