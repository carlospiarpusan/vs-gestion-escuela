# Datos completos de alumno para FacturaX - 14 de octubre de 2026

## Estado

Implementado, verificado y publicado en condusoft.co. Carlos autorizo
la publicacion coordinada de ConduSoft y FacturaX: "si despliega todo".
No se hicieron cambios de esquema ni se emitieron facturas reales de prueba.

## Flujo

- Al abrir Facturar se obtiene la ficha vigente del servidor, no solo el
  correo o la copia antigua del listado de Alumnos.
- Se identifican los campos ausentes o invalidos antes de consultar productos,
  preparar la revision o emitir. La API vuelve a validar aunque se omita la UI.
- Se conservan los requisitos de ficha pedidos para los alumnos: nombre y
  apellidos, tipo/numero de documento, correo, telefono, direccion, pais,
  departamento, municipio valido, tipo de persona y perfil tributario.
- El contacto y perfil se pueden completar y guardar dentro del modal. Si
  falta identificacion, la opcion abre el editor real de Alumnos, que mantiene
  las comprobaciones existentes de identificacion y cuentas.
- No se modifica una cedula, nombre, credencial, matricula, precio o curso al
  guardar el contacto desde el modal. La factura conserva su asociacion por contrato.
- Una version de ficha y una condicion SQL atomica evitan sobrescribir cambios
  simultaneos de contacto, identificacion o sede. Un conflicto exige recargar.
- El resumen de campos faltantes es compacto; los errores detallados siguen
  disponibles y el formulario permite corregirlos antes de continuar.

## Contrato Acordado

Coordinacion autorizada por Carlos con el chat de vs-facturacion
`Crear inicio y registro empresarial`.

ConduSoft envia `student` con `id`, `name`, `document`, `documentType`, `email`
y `fiscal`: `documentType`, `personType`, `countryCode`, `departmentCode`,
`cityCode`, `address`, `phone`, `responsibilities`, `taxRegime`, `taxScheme`.
Pais y departamento proceden del perfil y municipio DIVIPOLA validado.
No se envian matricula, categoria, numero de contrato ni valor de curso.
Los importes siguen procediendo exclusivamente de los productos seleccionados.

Los faltantes se devuelven como HTTP 422, `INVOICE_DATA_INCOMPLETE`,
`issues: [{field, message}]` y `missingFields`, con rutas estables `student.*`
y `student.fiscal.*`. El wrapper conserva esos datos para abrir la correccion.

Quote y status.quote incluyen `sourceStudent`, con el origen recibido de
ConduSoft, y `customer`, con el cliente fiscal efectivo revisado en FacturaX.
Se comparan los datos originales con la ficha vigente antes de emitir;
no se confunde un regimen valido conservado por FacturaX con una modificacion
posterior del alumno. Los datos efectivos se muestran antes de confirmar.

Una quoted antigua sin ficha completa u origen debe regenerarse antes de emitir.
Los historicos aceptados siguen consultables y no ofrecen emitir de nuevo ni
descartar una preparacion inexistente. No se modifican documentos aceptados.

## Verificacion

- Suite completa: 57 archivos, 565 pruebas correctas.
- Suite completa repetida inmediatamente antes del despliegue: 565 correctas.
- Lint, TypeScript de compilacion y build de produccion correctos; 103 paginas.
- Pruebas API: validacion antes de red, autenticacion, CSRF y alcance vigente
  por escuela/sede. Se mantienen las pruebas de alta de alumnos y FacturaX.
- Pruebas SQL reales en PGlite: guardado de contacto, version antigua,
  intercalacion de cambio de contacto, traslado de sede e identificacion.
- Pruebas de emision con red simulada: no hay reserva ni envio para datos
  incompletos o revision antigua; se conserva numero/contrato e idempotencia.
- Regresion: origen ordinario/R-99-PN y cliente efectivo SIMPLE/O-47/01
  no producen un bloqueo permanente cuando no hubo cambios posteriores.
- Comprobacion cruzada adicional contra los modulos reales de ambos proyectos,
  sin red: ConduSoft produce alumnos CC/CE/TI/PAS aceptados por FacturaX;
  su catalogo ANSV de precio variable y seleccion se interpretan correctamente,
  la revision/status vuelve a ConduSoft conservando origen y cliente efectivo,
  y cambiar el correo invalida la revision anterior. Script aislado:
  `output/invoice-contact-preview/contract-check.mjs`.
- Prueba visual en navegador, 390x844 y 1280x720: completar y guardar la ficha
  habilita productos. Sin desbordamiento horizontal ni controles fuera del ancho.
  Se usaron respuestas y datos ficticios, sin acceso a Supabase ni emision.

Capturas: `output/playwright/invoice-contact-mobile-2026-10-14.png` y
`output/playwright/invoice-contact-desktop-2026-10-14.png`.
Vista aislada: http://127.0.0.1:3021 (sin emisiones).

## Publicacion Coordinada

ConduSoft se construyo en Vercel con TypeScript correcto y 103 paginas,
se inspecciono como READY/production y se promovio el mismo despliegue:
`dpl_55YyfNYENUQ9QTo1G5TjpXfZmnJw`, construido a las 12:19:53 de Bogota.
URL: https://vs-gestion-escuela-o8wn3ji10-carlos-piarpusans-projects.vercel.app.
`vercel inspect condusoft.co` confirmo exactamente ese ID tras la promocion.
La pagina /login cargo en el navegador sin errores ni advertencias de consola.
Consulta runtime de errores del despliegue, ultimos 10 minutos: sin registros;
esto no sustituye una prueba de emision fiscal real.

Tras confirmar el caller publicado, el chat de FacturaX promovio su version
compatible con `sourceStudent`: `dpl_HXdVkUxbpb5pqeM5bCFFtzLnPoB2`.
Confirmo `vercel inspect www.facturax.co` con ese ID READY/production y
consulta runtime de errores de los ultimos 15 minutos sin registros.
URL: https://vs-facturacion-mmjfffhq1-carlos-piarpusans-projects.vercel.app.
Su version anterior `dpl_EksSrhsHJmBPdKkDcsnnRsnCyxTj` quedo obsoleta.

Se respeto el orden: caller ConduSoft primero, backend FacturaX despues.
No se aplicaron migraciones, ni se hicieron pruebas de emision o cambios
en alumnos, historicos, catalogos fiscales o credenciales de produccion.
Evidencia visual: `output/playwright/condusoft-production-login-2026-10-14.png`.

## Limites

No se probo una factura real contra DIAN ni cada rol en una sesion real de
produccion. Las pruebas del formulario usan un servidor aislado con respuestas
ficticias; las pruebas de persistencia y seguridad usan PostgreSQL aislado.
No se reemplazan los controles DIAN ni la configuracion fiscal del emisor.

Los campos completos de la ficha administrativa no deben presentarse como
informacion adicional universalmente exigible al comprador por la DIAN. La
[Resolucion 202 de 2025, articulo 3](https://normograma.dian.gov.co/dian/compilacion/docs/resolucion_dian_0202_2025.htm)
distingue los datos exigibles para identificar y entregar la factura; estos
requisitos internos mantienen el flujo de alumnos solicitado por Carlos.
