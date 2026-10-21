# ANSV por contrato

Verificado el 19 de octubre de 2026.

## Fuentes

- Resolucion Unica de Transito 20223040045295/2022, arts. 3.8.1.1 a 3.8.1.3, modificada por art. 5 de Resolucion 20243040003125/2024:
  https://cancilleria.gov.co/normograma/compilacion/docs/resolucion_mintransporte_45295_2022.htm
- UVB 2026 COP 12.110 y antecedente UVB 2025 COP 11.552, Resolucion 3488/2025 de Hacienda:
  https://www.minhacienda.gov.co/documents/d/portal/resolucion_3488_diciembre_31_2025?download=true

## Comportamiento

Los nuevos alumnos regulares requieren nacimiento, sexo M/F, fecha de inscripcion y categorias. La API valida antes de crear la cuenta. Alumnos de practica adicional o aptitud no generan este aporte CEA.

La edad se determina al matricularse con fechas civiles, no por la edad al facturar. Se aplica la UVB del ano de inscripcion y se redondea hacia arriba a COP 100 con aritmetica entera. RC1 usa la columna C1 (recategorizacion hacia C1).

Segun indicacion expresa del usuario, ANSV corresponde a una categoria principal elegida al registrar el contrato. ANSV2 corresponde a la otra categoria cuando el contrato contiene exactamente dos; se conserva el importe individual de cada una. No se suman los importes unitarios. En contratos de una sola categoria, historicos sin desglose y contratos de mas de dos categorias, ANSV2 no tiene un valor automatico inferido. Hacer dos cursos el mismo dia no implica que los coeficientes de ambas categorias sean iguales. No se ha verificado una exencion general por combo.

Al elegir contrato para un alumno regular se precargan los productos por CODIGO exacto (no por nombre): curso sencillo SICOV x1, RECAUDO x1 y ANSV x1; combo de dos categorias SICOV x2, RECAUDO x2, ANSV x1 y ANSV2 x1. El codigo correcto confirmado por el usuario es RECAUDO. Las cantidades siguen editables y la factura requiere revision y confirmacion de emision. Los precios de SICOV y RECAUDO siguen siendo los del catalogo FacturaX. Un codigo duplicado, ausente, deshabilitado o un precio fijo ANSV que difiere del contrato genera aviso; no se escoge arbitrariamente otro producto. La inicializacion ocurre una vez por contrato para no restaurar selecciones retiradas manualmente.

Cada contrato guarda en `matriculas_alumno.ansv` nacimiento, sexo, edad, fecha, categoria elegida, ano, UVB, coeficiente, importe y referencias de otras categorias. La actualizacion de la ficha no modifica contratos previos. Editar fecha/categorias desde Editar matricula recalcula explicitamente; las matriculas con facturacion conservan sus datos. Las escrituras forman parte de la misma transaccion que el registro, contrato y abonos.

Se muestran para revision manual los anos no verificados, categorias desconocidas, menores de 16 y la edad exacta de 81: la tabla oficial publica 66-80 y >81, sin definir claramente 81. No se inventa una tarifa ni se reutiliza una de otro ano.

Al seleccionar contrato en Factura electronica, el catalogo incluye el calculo guardado. Los productos con codigo normalizado exactamente ANSV y ANSV2 que admitan precio variable reciben sus importes en COP; FacturaX recibe centavos. Se conserva la edicion manual, el IVA y el catalogo original. No se envian nacimiento ni sexo a FacturaX y no se transfieren fondos ANSV al facturar.

## Activacion

Aplicar primero `supabase/migrations/20261020005811_ansv_contract_snapshot.sql`, verificar las dos columnas y luego publicar la web. La migracion es aditiva, no cambia RLS y no rellena alumnos/contratos anteriores. Los contratos anteriores sin calculo mantienen el precio manual. El usuario creara en FacturaX el producto ANSV2 con precio variable; el producto ANSV tambien debe admitir precio variable.

No se ha emitido ninguna factura real de prueba ni generado APK.

## Publicacion de produccion: 2026-10-19

- Proyecto Vercel: `vs-gestion-escuela`; dominio `condusoft.co`.
- Despliegue: `dpl_64FpayEEhz89QiyWgFdhm9cGrNj3`, promovido tras finalizar en estado READY.
- Se preservo como base la version de produccion `dpl_CvyRb66GoS8EsTqEDhrGPuiCfaG7`, incorporando solo Alumnos, ANSV y precarga de productos.
- La version aislada paso 989 pruebas en 101 archivos, lint y compilacion de produccion con TypeScript y 108 rutas. Las huellas de los 26 archivos modificados coinciden con los enviados a Vercel.
- Migracion ANSV aplicada y verificada en `oyptexglggazvqaofqaj`: `alumnos.sexo` y `matriculas_alumno.ansv`; RLS sigue activo en ambas tablas. Se conservaron 3.203 alumnos, 2.952 contratos y 8.220 ingresos durante la migracion.
- Incluye el formulario compacto y el codigo exacto RECAUDO. ANSV2 requiere que el producto exista y permita precio variable en FacturaX; si falta, se muestra un aviso.
- No se realizo una prueba visual o autenticada en navegador ni se emitieron facturas reales. La verificacion del despliegue se hizo mediante la API de gestion de Vercel, sin solicitar paginas publicas.

## Corrección de precarga histórica: 2026-10-20

La factura también calcula ANSV cuando la matrícula anterior no tiene snapshot. Usa nacimiento y sexo de la ficha, y fecha y categorías del contrato elegido. Si faltan datos o el combo no tiene categoría principal, permite completarlos en «Datos ANSV para esta factura». Es una preparación local: no modifica la ficha ni los contratos históricos. Los snapshots guardados siguen siendo la fuente preferida.

El combo precarga ANSV x1 y ANSV2 x1 y calcula cada valor individual. Cambiar la categoría principal intercambia la asignación de ambos importes. Si falta ANSV2 en el catálogo, se conserva el aviso para configurarlo en FacturaX. Los precios editados manualmente se conservan; al invalidar datos de cálculo se retiran únicamente los precios automáticos anteriores. Nacimiento y sexo no se envían a FacturaX.

Corrección publicada y promovida: `dpl_ADoqTx8m1aXFaEkQFxhvaoqTTRka`, sobre la base de producción `dpl_DHXiR6C5pkLTNjxnHCPxn6ZmsuDR`. La versión aislada pasó 1.037 pruebas en 103 archivos, ESLint, TypeScript y compilación de producción. Se verificó el formulario real con datos ficticios en escritorio y móvil de 390 px, sin desbordamiento y con controles de 46 px. No se modificaron registros reales ni se emitieron facturas. En el catálogo consultado existe ANSV variable; ANSV2 aún requiere creación en FacturaX.
