# Formato de contratos de Sin Fronteras

## Fuente y alcance

Fuente aportada: `A2 Contrato en formacion motos.docx`.
SHA-256: `e3987a427bfe972ecd40dd6a9b54433e4997e74417de233853a12d28aeefa367`.

El usuario autorizo usarlo como base para moto, vehiculo y combo de la escuela
`a5320c4a-3bf6-4da5-b365-da17d7001d4f`, NIT 901171550. Posteriormente indico
reemplazar las plantillas actuales **sin conservar versiones anteriores**.
No se modifica el Word original ni se crean tablas de historial o respaldos
de las plantillas anteriores. Otras escuelas conservan sus formatos.

## Adaptacion

- Se conservan las trece clausulas del documento, incluidos porcentajes,
  multa y referencias normativas. Esto es una incorporacion del documento,
  no una validacion juridica de su contenido.
- Los datos del alumno de ejemplo se sustituyen por variables; no se
  incorporan al codigo ni se reutilizan para otros estudiantes.
- Nombre, documento, tipo y lugar de expedicion, direccion, telefono,
  categoria, numero de contrato, ciudad y fecha se completan al imprimir.
- La denominacion del curso cambia segun moto, vehiculo o combo. La edad
  reproduce la distincion de la plataforma: 18 para servicio publico y 16
  para las otras categorias. No cambia reglas de matricula ni validaciones
  de admision del alumno.
- Se conserva el logotipo y el encabezado SF-GC-FORM - 01, emision
  08-06-2022, version 1. La fecha de firma usa America/Bogota.
- Dos paginas carta, texto de 9 puntos para conservar todas las clausulas,
  firmas de estudiante y escuela y espacio de acudiente para documento TI.
  No se insertan firmas digitales ni se firma o emite un contrato de prueba.

## Correcciones funcionales

Contratos identifica las plantillas por su tipo en lugar de cargar la primera
y guardarla siempre como vehiculo. El selector conserva los borradores de
cada tipo. Los titulos se mantienen al editar, y la segunda pagina no recibe
contenido de otro formato cuando la plantilla tiene una sola pagina.

La API valida los tres tipos, rechaza duplicados y guarda encabezado y textos
en una transaccion. Mantiene los permisos existentes y el aislamiento por
escuela. Los valores se renderizan como texto de React, sin interpretar HTML
aportado por un alumno ni sustituir variables dentro de sus datos.

## Comprobaciones

22 pruebas nuevas para texto fuente, variables, tres formatos, fecha de Bogota,
permisos, editor por tipo, aislamiento y reversion ante error de guardado.
El paquete aislado contiene solo los archivos de Contratos sobre la base
`1839e4b264c748c7b8a1cbd3dbcdcaa273598744`; deja fuera los cambios de correo en curso.

Los tres formatos se revisaron visualmente con datos ficticios. A ancho de
impresion carta, el texto y las firmas caben en dos paginas; el logotipo carga.
No se generaron documentos con datos reales de alumnos.

## Publicacion del 19 de octubre de 2026

- Autorizada expresamente por el usuario para reemplazar los tres formatos.
- 856 pruebas pasaron en 91 archivos del paquete aislado; lint correcto.
  La ultima mejora de la barra responsive paso ademas las cinco pruebas de
  impresion y eslint. Vercel compilo la version final con TypeScript y 107 paginas.
- Deployment principal: `dpl_D3xXAXA7bW1gqAkPQtPSFGrvpdD3`, estado READY,
  proyecto `vs-gestion-escuela`. La API de Vercel confirma que condusoft.co
  apunta a esta version. No se publicaron los cambios de correo en curso.
- Las tres plantillas SF-GC-FORM-01 quedaron guardadas con MD5
  `277c0027ffd34c30a0beba94d4748de0`, confirmado por una lectura independiente
  posterior al COMMIT. Comparten texto base; curso, categorias y edad se
  resuelven segun cada matricula al imprimir.
- Se comprobaron sin cambios los alumnos, matriculas, ingresos, plantillas
  de otras escuelas y configuracion de numeracion. No se firmaron ni
  emitieron contratos reales y no se creo tabla de versiones.
- El navegador quedo desactivado en la configuracion de Work antes de la
  publicacion. La verificacion visual fue local; la verificacion posterior
  a la publicacion se realizo mediante Vercel y la base de datos, sin abrir
  ni imprimir contratos de alumnos reales.
