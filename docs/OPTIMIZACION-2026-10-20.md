# Optimización de ConduSoft — 20 de octubre de 2026

## Cambios

- **Gastos:** la página y el total exacto llegan en una misma petición de Supabase. Antes se enviaban dos peticiones con los mismos filtros; ahora una. Se mantienen columnas, filtros por escuela, RLS, fechas, búsqueda, orden, paginación y las condiciones propias de Libro, Nómina, Cuentas por pagar y Tramitadores. Esto reduce las peticiones HTTP de la tabla un 50%; no significa reducir a la mitad todo el tráfico de Gastos ni el trabajo SQL interno de PostgREST.
- **Resúmenes:** una respuesta anterior, incluso si termina con error, ya no reemplaza el resultado de los filtros actuales. Se descarta también la actualización de una tabla pendiente al salir de la sección.
- **Facturas XML:** JSZip se carga únicamente al elegir un ZIP. Los límites de lectura, selección del XML, validaciones fiscales y lectura de Gmail/Microsoft se conservan. No se instala ninguna dependencia adicional.

## Mediciones

Comparación de compilaciones de producción locales con el mismo origen publicado como base:

| JavaScript requerido por el importador XML |         Antes |      Después |
| ------------------------------------------ | ------------: | -----------: |
| Tamaño sin comprimir                       | 192.250 bytes | 96.394 bytes |
| Suma gzip de sus fragmentos                |  61.647 bytes | 33.763 bytes |

Se difiere un fragmento de JSZip de 95.888 bytes (27.911 gzip). Reducción de carga comprimida del importador: aproximadamente 45%. La tabla de Gastos pasa de 2 a 1 peticiones por lectura sin caché. No son mediciones de LCP/INP ni una estimación de milisegundos; no había sesión administrativa abierta en el navegador para medir el panel real.

## Validación

- Suite web: 1.139 pruebas / 112 archivos correctos. Se agregó después una prueba HTTP con el cliente real de Supabase: las 15 pruebas del archivo actualizado pasaron. Total de casos únicos verificados: 1.140.
- Versión aislada de publicación: 52 pruebas pertinentes correctas (tabla, paginación, resúmenes, SDK HTTP, XML/ZIP y lectura de correos).
- TypeScript, ESLint y compilación de producción correctos.
- Navegador con archivos sintéticos: XML sin petición JSZip; ZIP solicita JSZip y lee documento.xml entre varios adjuntos; sin errores en consola. Ningún gasto real creado.
- Se intentó una lectura REST sin sesión y fue rechazada por los permisos de la función de ámbito; no se cambiaron permisos para habilitar consultas anónimas. La prueba del cliente HTTP se ejecutó con respuestas sintéticas y verifica GET, count=exact, límite, escuela, pendiente y total completo.
- Evidencia visual local: output/optimizacion/importador.png.

## Alcance de publicación

Base: dpl_AbEMyaKecDcdXZVYzmyBnPK4Wj58. Se reconstruyó la fuente exacta verificando SHA-1 de 477 archivos; solo se superponen gastos/page.tsx, finance-lazy-modals.test.tsx y electronic-invoice.ts. Así se conservan los cambios publicados y no se arrastran otros cambios locales.

Documentos generados bajo demanda; no se agregaron copias de PDF/XML, almacenamiento externo ni cambios de esquema o registros.

Publicación completada: `dpl_56YEZ1FkwvEKfDY5uMtKuHFid7bE`, estado READY. Se verificó que condusoft.co y www.condusoft.co apuntan a esta versión. La ruta protegida /dashboard/gastos redirige al inicio de sesión sin sesión administrativa; el flujo con datos se verificó mediante pruebas y archivos sintéticos, sin emitir facturas ni registrar gastos reales.
