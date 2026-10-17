# Productos frecuentes al facturar

Implementado, verificado y publicado en condusoft.co el 14 de octubre de 2026,
tras autorizacion de Carlos: "Si, publicar en produccion".

- El catalogo y los resultados por nombre/codigo colocan primero los productos
  disponibles y, entre ellos, los mas usados. En empates mantienen el orden original.
- Se registra un uso por producto en cada revision creada correctamente por
  FacturaX, independientemente de la cantidad. No se cuentan clics de seleccion,
  selecciones retiradas, intentos fallidos ni la misma solicitud repetida.
- Una revision exitosa cuenta como uso aunque despues no se emita la factura.
  No se altera el registro fiscal ni se presenta esto como un conteo de emisiones.
- La preferencia se conserva por usuario y escuela en el navegador; no se
  sincroniza entre dispositivos y no utiliza historicos anteriores. Comienza
  a aprender desde las revisiones hechas con esta version.
- Solo se almacenan identificadores de productos/solicitudes y contadores.
  No se guardan clientes, cedulas, correos, precios, impuestos o datos de facturas.
- Se valida version, formato y limites de las preferencias. Corrupcion, bloqueo
  o falta de espacio en localStorage no impiden revisar o emitir. Sin identidad
  del usuario no se utilizan preferencias compartidas.
- El orden no modifica precios, impuestos, seleccion, cantidades, validaciones
  ni disponibilidad. Los productos no disponibles siguen deshabilitados.
- Orden memoizado: cambiar cantidades/precios no vuelve a ordenar todo el catalogo.
- Sin cambios en API, esquema, permisos, FacturaX o datos existentes.

## Verificacion

- 60 archivos / 592 pruebas correctas. Lint y build de produccion con TypeScript
  correctos; 103 paginas.
- La primera ejecucion completa junto con el build agoto el limite de tiempo
  de tres pruebas existentes. Se repitio sin el build simultaneo: todas pasaron
  sin cambiar timeouts ni pruebas existentes para ocultar fallos.
- Pruebas especificas: persistencia al reabrir, aislamiento por usuario, conteo
  unico, lectura de otra instancia, preferencias corruptas, almacenamiento
  fallido, busqueda por codigo, precios variables y productos no disponibles.
- Navegador con datos ficticios: ANSV inicialmente segundo, revision local
  exitosa, cerrar/reabrir y ANSV primero; busqueda ANSV correcta, consola limpia.
- Movil 390x844 sin desbordamiento horizontal ni controles fuera del ancho.
  No hubo llamadas externas, escrituras reales, pagos ni emisiones.

Vista aislada: http://127.0.0.1:3021/.
Capturas: output/playwright/productos-frecuentes-desktop-2026-10-14.png y
output/playwright/productos-frecuentes-mobile-2026-10-14.png.

## Publicacion

- Proyecto Vercel confirmado: vs-gestion-escuela, equipo carlos-piarpusans-projects.
- Suite completa repetida inmediatamente antes del despliegue: 60 archivos,
  592 pruebas correctas.
- Build remoto correcto, incluido TypeScript y 103 paginas.
- Despliegue READY/production: dpl_42G7BCM331K2rmpB4PiP2KoTWASh,
  creado a las 13:43:59 de Bogota.
- URL: https://vs-gestion-escuela-5bn86j8cs-carlos-piarpusans-projects.vercel.app.
- Se promovio el mismo ID. vercel inspect condusoft.co confirmo que el dominio
  apunta exactamente al nuevo despliegue.
- Consulta runtime de nivel error del despliegue, ultimos 10 minutos:
  sin registros. No se hizo una emision real para verificar la publicacion.
- Sin cambios en FacturaX, API, esquema, credenciales, alumnos o historicos fiscales.
