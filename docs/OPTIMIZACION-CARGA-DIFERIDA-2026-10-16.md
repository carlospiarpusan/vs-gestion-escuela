# Segunda revision de rendimiento

Fecha: 16 de octubre de 2026. Cambios locales; sin publicacion ni APK/AAB final.
Complementa `OPTIMIZACION-2026-10-16.md`.

## Mejoras

- Ingresos y Gastos: siete dialogos dinamicos dejan de montarse mientras estan
  cerrados (dos en Ingresos, cinco en Gastos). Sus modulos se solicitan al abrir
  la herramienta correspondiente. Los borradores siguen en la pagina padre y
  se conservan al cancelar y reabrir. No cambian validaciones ni guardados.
- Ingresos: el selector de alumnos esta separado y memoizado; editar concepto,
  monto u otros campos ya no reconstruye todas sus opciones. El callback de
  seleccion mantiene una referencia estable. Se conservan la seleccion de
  matricula unica, las etiquetas y la actualizacion del catalogo.
- Android: entrar o actualizar un listado deja de leer los tres catalogos SQLite
  de formularios. Solo abrir el editor de ingresos consulta alumnos; no lee
  instructores ni vehiculos. Los otros listados no consultan catalogos ajenos.
- Android: la carga opcional de sugerencias tiene indicador, error y reintento
  independiente. Un error no borra el listado ni los campos escritos. Las
  respuestas de formularios cerrados o modulos anteriores no actualizan la vista.
  Tambien se invalidan cargas de listado anteriores al desmontar la pantalla.

## Verificacion

- Suite web completa: 75 archivos, 762 pruebas correctas.
- Suite Android/offline: 14 archivos, 157 pruebas correctas.
- Lint y TypeScript de Android sin errores. Compilacion web correcta, con 104
  paginas generadas y verificacion TypeScript incluida.
- Prueba de selector: 1000 etiquetas construidas al montar, y ninguna construccion
  adicional durante diez actualizaciones de campos ajenos. Las pruebas tambien
  verifican cambios reales de alumno y catalogo.
- Pruebas de paginas reales: cero montajes de dialogos dinamicos al entrar;
  apertura individual, validacion obligatoria, borradores y cancelacion sin
  escrituras. Incluyen importacion de XML, conexion de correo y busqueda historica.
- Pruebas nativas: seis tipos de listados sin lecturas de catalogos innecesarias;
  seleccion de alumno, fallo/reintento independiente y respuesta tardia tras
  cambiar de modulo. Crear alumno sigue abriendo el formulario fiscal de la web.
- Navegador: paginas y dialogos reales con dependencias de datos simuladas,
  2000 alumnos ficticios, sin credenciales y con escrituras bloqueadas. Revisados
  ingreso, gasto, importacion y conexion de correo; borradores conservados.
  A 390x844 no hubo desborde horizontal y los formularios largos tienen scroll
  interno. Sin errores ni advertencias de consola observados.
- Compilacion standalone: inicio, login y registro responden 200; los 15 recursos
  estaticos de login responden 200. Ingresos y Gastos redirigen al login sin
  sesion; sus API devuelven 401. Vista previa: http://127.0.0.1:3035.
- `git diff --check` sin errores de espacios.

Capturas de la prueba sintetica: `output/playwright/finance-lazy-mobile-2026-10-16.png`
y `output/playwright/finance-lazy-desktop-2026-10-16.png`.

## Alcance

La reduccion verificada es de trabajo innecesario: modulos ocultos, construccion
de opciones y consultas locales. No se atribuye a estas pruebas una mejora en
segundos del login, Web Vitals o latencia de produccion. No se midio Android en
un telefono fisico. La prueba de navegador usa componentes reales pero no sustituye
una prueba con todos los roles y datos de produccion.

No se modificaron precios, impuestos, pagos, datos fiscales obligatorios,
autorizaciones ni contratos API de FacturaX. No hubo emisiones, pagos, cierres,
altas reales, cambios remotos de base de datos ni actualizaciones de dependencias.
