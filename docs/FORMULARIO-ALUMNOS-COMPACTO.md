# Registro compacto de alumnos

El formulario conserva estilos ConduSoft, variables de tema y acento azul. No modifica precios, impuestos, abonos ni la integracion con FacturaX. El criterio permanente de diseno queda en AGENTS.md para todas las funciones y subfunciones.

## Distribucion

- Sin panel lateral de resumen, tarjetas anidadas, descripciones de cada seccion ni estados duplicados.
- Datos personales en tres columnas de escritorio y dos en movil; correo y direccion aprovechan el ancho necesario.
- Direccion y perfil fiscal en una sola seccion; valores predeterminados editables conservados.
- Notas y registro manual de facturas en desplegables. Tramitador usa un checkbox real accesible y revela sus datos sin perder valores.
- Acciones al pie con resumen de saldo solo al crear, adaptables al ancho y con proteccion de guardado. Enter envia el formulario por el mismo proceso validado.
- No se reducen los objetivos tactiles ni se ocultan campos obligatorios.

## Requisitos actuales

Para crear: nombre, apellidos, tipo y numero de documento, lugar de expedicion, telefono, correo para facturacion, direccion, pais, departamento, municipio y perfil fiscal consistente. Las sugerencias existentes de Colombia, Ipiales, regimen ordinario, R-99-PN, persona natural y tratamiento ZZ no se han cambiado.

Para alumnos regulares con contrato ANSV tambien se exigen nacimiento, sexo, fecha de inscripcion y categorias; si es combo, la categoria principal ANSV debe elegirse. El servidor sigue validando y calculando estos datos. Los servicios de aptitud o practica adicional no exigen nacimiento y sexo para liquidar ANSV CEA, pues no crean ese contrato.

La autorizacion de tratamiento de datos sigue siendo necesaria antes de habilitar crear. Precio de curso, abono, notas, tramitador, calificaciones y numero de factura externa no se vuelven obligatorios. El nombre del tramitador es obligatorio solamente al activar esa opcion.

Editar fichas historicas no impone retroactivamente todos los requisitos de un alumno nuevo. La validacion de la factura sigue exigiendo completar la informacion faltante antes de emitir. Las matriculas se siguen editando por separado.

## Verificacion

Pruebas del formulario: campos requeridos visibles, predeterminados, compatibilidad historica, servicios especiales, teclado, categorias sin envios accidentales, notas, factura manual y tramitador. Se conservan las pruebas de creacion de alumnos y facturacion ANSV.

La comprobacion visual mediante navegador local no pudo realizarse porque su uso esta desactivado en Work. No se han guardado registros reales ni emitido facturas para probar el diseno.

## Refuerzo de requisitos: 2026-10-20

- El alta valida tanto en cliente como en API los datos de identidad y expedicion, contacto y perfil fiscal completo. Se conservan los predeterminados editables de facturacion.
- Fecha de inscripcion, proceso o servicio obligatoria y no futura. En registros regulares se exigen nacimiento, sexo y categorias; en combos, categoria principal ANSV.
- Para nuevos contratos, la fecha de nacimiento debe dar al menos 16 anos al inscribirse. No basta con escribir una fecha existente en el calendario. Se usa la edad en fechas civiles de Bogota. Anos sin UVB verificada y casos de tarifa ambigua conservan revision manual, sin inventar precios.
- La API exige consentimiento_datos=true antes de crear cuentas o registros; ya no da por aceptada una autorizacion que el cliente omita o niegue.
- No se borran nacimiento ni sexo ya completos en fichas regulares. Una fecha modificada tambien se valida. Fichas historicas incompletas o con un dato incorrecto sin modificar pueden recibir cambios ajenos a ANSV; una nueva matricula exige corregir los datos antes de guardar su calculo.
- No se recalculan contratos previos ni se corrigen fechas de nacimiento sin confirmacion del titular. Este cambio no requiere migracion.

Publicado en produccion el 20/10/2026: `dpl_DHXiR6C5pkLTNjxnHCPxn6ZmsuDR`.
La version aislada preserva los 462 archivos de la produccion anterior como base y
modifica solo 13 archivos de Alumnos, ANSV y sus pruebas. Pasaron 1.027 pruebas en
102 archivos, lint y compilacion de produccion con TypeScript y 108 rutas. Las
huellas de los 13 archivos enviados coinciden con los probados. El despliegue
termino READY y fue promovido al proyecto `vs-gestion-escuela`.
No se emitieron facturas ni se crearon alumnos reales de prueba. No se realizo
una prueba visual autenticada en el navegador; la asignacion de dominios se
verifico mediante la API de gestion de Vercel.
