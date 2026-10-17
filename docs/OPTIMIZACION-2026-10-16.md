# Optimizacion verificada de web y Android

Fecha: 16 de octubre de 2026. Cambios locales, sin despliegue de produccion ni
generacion de una APK/AAB final.

## Cambios aplicados

- Navegacion: Sidebar y barra inferior usan `DashboardNavLink`. No anticipan
  todas las rutas al entrar; restauran la precarga normal de Next al pasar el
  cursor, enfocar con teclado o tocar un enlace. Conservan destinos, accesibilidad,
  cierre del menu y filtros de rol. La estrategia sigue la guia local de Next 16.
- Formatos: se reutilizan los formateadores de moneda y de fecha. La cache de
  configuraciones de fecha tiene un limite de 32 entradas, no guarda valores ni
  datos personales. Mantiene America/Bogota y el tratamiento UTC de fechas civiles.
  Se aplica a fechas compartidas, dashboard, informes, dinero y Horas; Android
  reutiliza tambien sus formateadores de pesos y horas.
- Horas web: totales por instructor y dia se calculan una vez cuando cambia la
  matriz, no repetidamente en cada celda o pulsacion del formulario. Se mantienen
  tarifas, cierres, guardado, errores y exportaciones.
- Fuentes: Geist Mono conserva su disponibilidad pero deja de precargarse en
  todas las paginas, donde normalmente no se usa. Login tiene una precarga de
  fuente, no dos; la tipografia y el formulario no se redisenaron.
- Android: reemplazo de entidades y sincronizacion de CALE escriben lotes de 100
  filas, con parametros y dentro de la misma transaccion. Un error posterior o
  cambio de cuenta antes del commit revierte todos los lotes. No se modifico el
  esquema SQLite, Supabase ni la cola de operaciones pendientes.
- Android: lecturas simultaneas del mismo modulo/periodo comparten la peticion
  solo mientras esta en curso, dentro del mismo usuario, rol y sede. No hay una
  nueva cache temporal de resultados: Actualizar vuelve a consultar y los errores
  permiten reintentar. Otro alcance nunca comparte aquella peticion.

## Comparacion local

Cinco muestras con datos sinteticos, comparando las funciones previas al cambio y
las actuales. Se verifico igualdad del contenido mediante SHA-256.

| Trabajo                      |          Antes (mediana) |      Despues (mediana) |
| ---------------------------- | -----------------------: | ---------------------: |
| 9000 operaciones de fechas   |                 275.7 ms |                25.7 ms |
| Cache de 2000 entidades      | 9.1 ms / 2001 escrituras | 3.0 ms / 21 escrituras |
| Cache de 2000 preguntas CALE | 7.7 ms / 2000 escrituras | 2.8 ms / 20 escrituras |

SQLite se midio mediante un adaptador `node:sqlite` en memoria, no en un telefono.
Los tiempos son CPU/almacenamiento local de la muestra, no tiempos de login,
latencia de Supabase o Vercel ni Web Vitals de usuarios reales. La reduccion
determinista es del numero de sentencias; no se promete esa misma proporcion de
aceleracion para toda la aplicacion.

Se probo limitar las fuentes de Tailwind al directorio web. El CSS compilado solo
se redujo 121 bytes (22 bytes gzip); se descarto ese cambio por no aportar una
mejora relevante. No se eliminaron estilos ni se altero el diseno.

Datos: `output/performance/optimization-2026-10-16.json` y
`output/performance/optimization-css-2026-10-16.json`.

## Verificacion

- Web: 754 pruebas de la suite completa, mas una prueba de integracion de Sidebar
  agregada despues (6 pruebas del archivo de navegacion, todas correctas).
- Android: 147 pruebas correctas; TypeScript sin errores.
- Limpiador local: 4 pruebas correctas.
- Lint sin errores ni advertencias y compilacion web correcta: 104 rutas/paginas.
- Pruebas nuevas: formatos equivalentes, limites de cache, precarga por mouse,
  teclado y tacto, menu real, cambio de destino; SQL real de lotes, rollback,
  cambio de sesion; peticiones concurrentes, reintentos y aislamiento de alcance.
- HTTP: paginas publicas, robots y sitemap responden 200; dashboard, Alumnos y
  Horas redirigen al login sin sesion. Nueve API protegidas responden 401.
- Version standalone final: login 200 y sus 15 recursos estaticos responden 200.
- Navegador: inicio de escritorio, acceso movil 390x844, registro y regreso al
  login. Sin desborde horizontal movil ni errores/advertencias observados.

Una primera ejecucion de Android junto a compilacion y otras suites agoto el
limite de 5 segundos de una prueba de CALE. La suite completa con dos trabajadores
paso sin ampliar limites. Las nuevas pruebas de peticiones esperan expresamente
al transporte asincrono antes de cambiar de cuenta.

## Limites y conservacion

No se inicio sesion con cuentas reales ni se recorrio cada pantalla con todos los
roles. No se hicieron pagos, emisiones de facturas, altas, cierres ni cambios de
credenciales o permisos. No hubo cambios remotos de base de datos, dependencias
o configuracion Vercel. No se midieron LCP, CLS o INP de produccion ni Android en
un telefono fisico; esos valores no se presentan como resultados de esta revision.

Se retiraron las caches de compilacion/pruebas regeneradas durante la revision,
conservando la compilacion comprobada y las dependencias. El proyecto sigue
ocupando aproximadamente 1.6 GiB. Vista previa local: http://127.0.0.1:3035.

Referencias consultadas: [Next Link](https://nextjs.org/docs/app/api-reference/components/link),
[Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/),
[Tailwind source detection](https://tailwindcss.com/docs/detecting-classes-in-source-files).
