# Publicacion Android

## Estado actual

- 2026-10-14: recursos de marca regenerados desde el vector oficial de la web.
  Icono y grafica de ficha subidos y enviados a revision. APK/AAB locales
  `1.0.8`, codigo `9`, compilados y firmados; aun no enviados a Play Console.
  La version publica continua siendo `1.0.7`. Ver
  `../output/android/BRANDING-1.0.8.md` y ejecutar
  `node scripts/generate-mobile-brand.mjs` para regenerar recursos.
- Verificacion en Play Console el 2026-10-13: `8 (1.0.7)` disponible en
  produccion desde el 2 de octubre de 2026, lanzamiento 100 %. Sin cambios
  no publicados, sin problemas de politicas y declaraciones al dia.
- Aviso para una proxima actualizacion: optimizacion DEX/ofuscacion 2 %,
  plazo febrero de 2027. No bloquea la version ya publicada. Detalle en
  `../output/android/ESTADO-GOOGLE-PLAY-2026-10-13.md`.

## Preparacion y envio de 1.0.7 (registro anterior)

- Version preparada: `1.0.7`, `versionCode 8`, paquete `co.condusoft.mobile`.
- APK y AAB release compilados con JavaScript y recursos incluidos; no requieren Metro.
- Firma comprobada, conservando la llave de subida existente.
- TypeScript, lint vital Android y validacion de bundletool correctos.
- Target SDK 36 y alineacion de 16 KB comprobados en el paquete y bibliotecas de 64 bits.
- APK instalado en el emulador Android 36. Version 1.0.7 disponible para testers
  internos y lanzamiento de produccion 3 enviado a revision de Google Play.
  Ambos incluyen solo codigo 8. Login de alumno e instructor comprobado.
- Archivos preparados en `../output/android/ConduSoft-1.0.7-8.aab` y
  `../output/android/ConduSoft-1.0.7-8.apk`. Para Play Console se entrega el AAB.
- Pruebas: 65 moviles, 131 web y 68 del manejador de altas; regresiones SQL
  verificadas con PostgreSQL/WASM. TypeScript y lint vital Android correctos.
- Cuentas demo de administrador, alumno e instructor e instrucciones en ingles
  guardadas en Play Console. Acceso de la escuela demo activo hasta 2099.
- Declaracion de datos corregida y politica de privacidad publicada en la web.
- En 1.0.7 se verificaron acceso de ambos roles, banco CALE local, guardado
  offline y sincronizacion automatica, sin reiniciar la app, en unos 10 s
  en esta prueba de emulador. Backend: tres intentos demo, sin duplicados.
- Las solicitudes tienen limite de 30 s y hasta tres reintentos automaticos
  de sincronizacion despues del inicial, con pausas de 15/30/45 s. Se cancelan
  al cerrar sesion o perder la red. Esto no garantiza tiempos en redes reales.
- `mobile-admin-users` desplegada en Supabase, estado ACTIVE, version 1,
  verify_jwt=true. Catorce comprobaciones en produccion correctas, incluyendo
  altas demo, idempotencia, permisos y limpieza de registros temporales.
- La version rechazada `2 (1.0.1)` se descarto con autorizacion. Los 11 cambios,
  con produccion `8 (1.0.7)`, figuran en Cambios en revision. La aprobacion depende
  de Google; publicacion automatica activada. No confundir canal interno con
  disponibilidad publica en produccion.
- Detalle y hashes: `../output/android/REVISION-GOOGLE-PLAY-1.0.7.md`.
- El release ahora admite firma real desde `android/keystore.properties` o variables de entorno.
- El source set `release` elimina permisos que no deberian llegar a Google Play:
  - `android.permission.READ_EXTERNAL_STORAGE`
  - `android.permission.WRITE_EXTERNAL_STORAGE`
  - `android.permission.SYSTEM_ALERT_WINDOW`

## 1. Crear llave de subida

Solo para la primera publicacion. Para actualizar ConduSoft se debe conservar
la llave existente; no ejecutar la generacion de una nueva llave.

Ejemplo:

```bash
keytool -genkeypair -v \
  -storetype PKCS12 \
  -keystore upload-keystore.jks \
  -alias upload \
  -keyalg RSA \
  -keysize 2048 \
  -validity 9125
```

Guarda el archivo fuera de Git y copia el ejemplo:

```bash
cp android/keystore.properties.example android/keystore.properties
```

Luego completa:

```properties
storeFile=../upload-keystore.jks
storePassword=...
keyAlias=upload
keyPassword=...
```

## 2. Generar binarios

Desde `mobile/`:

```bash
npm run apk:release
npm run bundle:release
```

Salidas esperadas:

- `android/app/build/outputs/apk/release/app-release.apk`
- `android/app/build/outputs/bundle/release/app-release.aab`

## 3. Checklist Play Store

- Incrementar `versionCode` en `android/app/build.gradle` y `android.versionCode`
  en `app.json` para cada subida. Debe superar todos los codigos usados en Play Console.
- Mantener la version consistente entre `versionName`, `app.json`, `package.json`
  y `package-lock.json`.
- Confirmar icono, nombre comercial y screenshots finales.
- Tener URL publica de politica de privacidad.
- Completar Data safety segun el uso real de Supabase/auth/sincronizacion.
- Subir el `AAB` a una pista interna antes de produccion.
- La app movil es independiente de la web; reconstruirla no incorpora por si solo
  cambios hechos exclusivamente en Next.js.

## 4. Verificacion rapida local

```bash
adb install -r android/app/build/outputs/apk/release/app-release.apk
adb shell monkey -p co.condusoft.mobile -c android.intent.category.LAUNCHER 1
```
