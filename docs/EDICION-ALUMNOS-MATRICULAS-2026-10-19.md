# Edición de alumnos y matrículas — 19/10/2026

## Guardado de alumnos

El controlador PostgreSQL convierte las columnas `date` de la ficha en objetos
Date, que la API serializa con hora. El formulario enviaba ese valor sin
normalizar y la validación exigía `YYYY-MM-DD`: un alumno con fecha de nacimiento
podía quedarse sin guardar. Los mensajes solo aparecían en una notificación.

Se normalizan las fechas al abrir el editor y se muestra cualquier error junto
al botón Guardar. Los datos antiguos sin teléfono o lugar de expedición pueden
editarse sin exigir completar el registro como si fuera un alumno nuevo. Los
requisitos de creación y de emisión de factura electrónica siguen vigentes.

Al editar se conserva la sede original. El perfil fiscal solo se envía cuando
se cambia; sus valores preseleccionados no obligan a completar datos fiscales
para una corrección personal. La ficha personal regular utiliza `solo_ficha`
para no alterar contratos, categorías, importes o estados de matrícula.

## Matrículas

Desde Editar alumno se puede abrir Editar matrícula para cada curso, incluso
cuando hay varias matrículas. También está disponible en el listado de cursos
del diálogo Nueva matrícula. Se usa `PUT /api/alumnos/matriculas` con el ID exacto.

Se pueden corregir categorías, valor, fecha, notas y estado del curso. El número
de contrato se conserva: editar o cancelar no reserva ni reutiliza consecutivos.
Los abonos se registran desde su acción propia; editar no crea un abono inicial.

La operación bloquea alumno y matrícula en una transacción y comprueba escuela
y sede. No permite bajar el valor por debajo de los abonos cobrados. Si hay
facturación asociada, permite notas y estado, conservando valor, categorías y
fecha. Un gasto de tramitador ya registrado conserva su importe y proveedor;
una asignación nueva crea el gasto una vez y no lo duplica al reenviar.

Los fallos de revalidación posteriores al commit no presentan un guardado
confirmado como fallido. Los errores de validación o escritura mantienen abierto
el editor y permiten corregir o reintentar.

## Cancelación y contratos

Se mantiene el comportamiento anterior: si el alumno tiene contrato, Eliminar
usa la cancelación, conserva las matrículas y el contrato, marca el curso como
cancelado y deja al alumno inactivo. El consecutivo permanece ocupado. Los
registros sin contrato mantienen su comportamiento anterior de eliminación.

No se añadieron reutilización de números ni borrado definitivo de contratos.
`contracts-server.ts` y la API de cancelación no se modificaron. No se ejecutaron
cancelaciones ni ediciones sobre alumnos reales durante las pruebas.

## Verificación

- 935 pruebas correctas en 98 archivos.
- Pruebas del formulario con fechas ISO, datos antiguos incompletos, mensaje de
  error visible y edición de una matrícula entre varias.
- SQL real en PostgreSQL aislado (PGlite): ficha sin cambios involuntarios en
  matrícula cancelada, secuencia reservada, transacciones, permisos, protección
  de importes cobrados y facturas, y gastos sin duplicados.
- La prueba de cancelación conserva `CAR-0001` y confirma que la siguiente
  creación obtiene `CAR-0002`.
- TypeScript, lint y compilación de producción correctos.

## Publicación

Publicado el 19/10/2026. Vercel confirmó el estado **Ready** y los alias
`condusoft.co` y `www.condusoft.co` para el despliegue
`dpl_CvyRb66GoS8EsTqEDhrGPuiCfaG7`.

Versión:
`https://vs-gestion-escuela-n0tj0bagh-carlos-piarpusans-projects.vercel.app`.
