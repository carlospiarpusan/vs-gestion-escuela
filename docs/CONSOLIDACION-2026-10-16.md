# Consolidacion y limpieza local

## Ubicacion unica

`/Users/carlos/Desktop/vs-gestion-escuela`

La web permanece en `src/` y Android en `mobile/`. Se eliminaron la copia
`/Users/carlos/Desktop/condusoft` y las dos copias antiguas de `.claude/worktrees`.
No se cambiaron el dominio, la conexion Vercel ni los servicios de produccion.

## Espacio

Medicion de las carpetas con `du -sk`, antes y despues:

- Antes: 16.40 GB decimales (15.27 GiB), sumando ambas carpetas.
- Despues: aproximadamente 1.74 GB decimales (1.62 GiB).
- Reduccion: aproximadamente 14.66 GB decimales (13.66 GiB).

APFS puede compartir bloques o conservar instantaneas; la variacion del espacio
libre del volumen no tiene por que coincidir exactamente con esta medicion.

## Retirado

- Carpetas duplicadas y sus dependencias/compilaciones antiguas.
- Caches Next, Vercel, pruebas y sesiones de automatizacion.
- Compilaciones Gradle/CMake del proyecto y de las dependencias nativas.
- APK antiguos y AAB preliminares que ya no corresponden al codigo actual.
- Capturas generadas de pruebas.
- Tres blobs huerfanos de Git (5.34 GiB), comprobados como no referenciados por
  ramas, reflogs ni indices. No se eliminaron commits.

Ademas se compacto Git sin caducar ni purgar los objetos restantes. Su integridad
se verifico antes y despues, y todas las referencias se conservaron.

## Conservado

- Codigo actual, pruebas, migraciones y datos de origen.
- Dependencias web y Android, listas para seguir desarrollando.
- Configuraciones privadas, claves y firma Android: hashes sin cambios.
- AAB 1.0.7-8 publicado anteriormente: SHA-256 sin cambios respecto al informe
  de septiembre (`cd04af488bfee95a6c2302de8f733b25996e13c400db00faa5326d65f218c0f4`).
- Cambios exclusivos de las copias antiguas, en respaldos privados comprimidos.
  `.local-backups/` ocupa aproximadamente 1.7 MiB y esta excluido de Git y Vercel.
- Historial, ramas, stash y referencias Git. Los 2191 objetos del repositorio
  antiguo ya existian en el principal antes de retirar aquella carpeta.

Se compararon 604 archivos originales de codigo/configuracion/firmas y no se
encontraron cambios tras la limpieza. Los respaldos solo contienen las versiones
distintas; no son proyectos activos ni deben usarse como otra carpeta de trabajo.

## Verificacion

- Web: 746 pruebas.
- Android: 138 pruebas y TypeScript.
- Limpieza: 4 pruebas, incluidas preservacion de fuentes/claves y rechazo de
  enlaces simbolicos hacia rutas externas.
- Lint sin errores ni advertencias.
- Compilacion web: correcta, 104 paginas/rutas generadas.
- Comprobacion HTTP local: inicio, login, registro y privacidad responden 200;
  14 recursos estaticos cargan y el dashboard redirige al login sin sesion.
- Git: comprobacion de conectividad correcta despues de la limpieza/compactacion.

No se genero una nueva APK/AAB, no se emitieron facturas ni se hicieron cambios
en bases de datos o despliegues de produccion.

## Mantenimiento

Despues de detener los servidores y compilaciones locales:

```sh
# Solo muestra que se eliminaria
npm run clean:local

# Retira unicamente salidas de compilacion y caches locales conocidos
npm run clean:local -- --apply

# Prueba el limpiador en carpetas temporales aisladas
node --test scripts/clean-local.test.mjs
```

El limpiador no elimina dependencias, fuentes, instaladores publicados, claves,
respaldos, datos ni historial. La siguiente compilacion reconstruira sus caches.
Se mantuvo la compilacion web verificada para que `npm run start` siga disponible.
