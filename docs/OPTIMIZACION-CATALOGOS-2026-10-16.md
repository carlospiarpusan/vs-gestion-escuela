# Tercera revision: catalogos de Alumnos

Fecha: 16 de octubre de 2026. Cambios locales, sin despliegue ni APK/AAB final.

## Cambios

- Los formularios de creacion de alumno y de datos fiscales reutilizan el listado
  de municipios mientras no cambie el departamento. Conservan sus respectivos
  ordenes originales, los valores predeterminados y el reinicio del municipio al
  cambiar departamento. No se modificaron las validaciones fiscales.
- FacturaX: el catalogo se normaliza y ordena una vez cuando llega o cambia la
  frecuencia de uso. Escribir en el buscador filtra ese indice, sin ordenar ni
  normalizar de nuevo todos los productos. El indice vive en el componente, no
  se comparte entre cuentas y se reconstruye si cambia el catalogo o el uso.
- La disponibilidad sigue teniendo prioridad sobre la frecuencia; los empates,
  nombres, codigos, acentos y espacios mantienen los resultados anteriores.
- El formato monetario del modal reutiliza una instancia de Intl con las mismas
  opciones y dos decimales. No cambia centavos, precios, cantidades ni impuestos.

## Medicion reproducible

Catalogo sintetico de 10000 productos, 16 consultas y cinco muestras con Node.
Se incluyo el costo de preparar el indice en cada muestra. SHA-256 confirma la
igualdad de todos los identificadores devueltos y su orden.

| Mediana      |    Antes | Despues |
| ------------ | -------: | ------: |
| Preparacion  | <0.01 ms | 3.28 ms |
| 16 busquedas | 46.90 ms | 3.76 ms |
| Total        | 46.90 ms | 7.03 ms |

Script: `node output/performance/billing-search-2026-10-16.mjs`.
Resultados: `output/performance/billing-search-2026-10-16.json`.
Estos valores miden solo CPU local del algoritmo, no renderizado, login, red,
Vercel, FacturaX ni Core Web Vitals. No representan el tiempo total de la pagina.

## Pruebas

- Web: 768 pruebas completas en 76 archivos.
- Android/offline: 157 pruebas completas en 14 archivos, sin cambios nativos.
- Lint sin errores; TypeScript de Android y compilacion web correctos.
- Standalone local: inicio, login y registro responden 200; los 15 recursos de
  login cargan sin fallos. Alumnos redirige al login y sus API de alumnos y de
  factura electronica devuelven 401 sin sesion. Vista previa en
  http://127.0.0.1:3035. `git diff --check` sin errores.
- Selector de municipios: diez ediciones de campos ajenos producen un solo
  recorrido; cambiar departamento produce el segundo. Se verifica que no se
  pueda guardar un municipio vacio y que el nuevo municipio corresponda.
- Busqueda: equivalencia con el algoritmo anterior en 2000 productos y varias
  consultas, incluidos empates, acentos, no disponibles y precios cero.
- Indice: 1000 nombres se leen una sola vez; buscar varias veces no vuelve a
  leerlos. Las pruebas cubren uso nuevo, catalogo nuevo y aislamiento de usuarios.
- Modal real: buscar y cambiar cantidades no reconstruye el indice. Conserva
  precios con centavos, precios variables, seleccion y protocolo de la API.
- Navegador con 1000 productos ficticios y escrituras bloqueadas: busqueda por
  codigo, ANSV con precio variable, cantidades conservadas al filtrar y edicion
  del perfil fiscal. Crear alumno conserva Ipiales/Narino y los campos obligatorios;
  cambiar departamento limpia el municipio. Sin desborde horizontal a 390x844
  ni errores/advertencias de consola observados.

Evidencia: `output/playwright/billing-search-2026-10-16.png` y
`output/playwright/student-catalog-mobile-2026-10-16.png`.

No hubo escrituras reales, emisiones, pagos, cambios de permisos, dependencias,
base de datos o API remotas. No se midio produccion ni un telefono fisico.
