# Borrador de declaraciones para Play Console

Este documento resume lo que ya se pudo confirmar desde el codigo y el artefacto Android de release, y separa lo que todavia debe revisarse en Play Console antes de reenviar la app a Google Play.

## Estado tecnico confirmado

- Ficha de Play Store guardada con:
  - nombre comercial `ConduSoft`
  - descripcion corta y completa
  - icono de tienda 512x512
  - feature graphic 1024x500
  - 6 capturas limpias de telefono
- Artefactos generados/verificados:
  - `android/app/build/outputs/bundle/release/app-release.aab`
- Artefacto actual generado el `2026-06-10`:
  - `versionCode 3`
  - `versionName 1.0.2`
- Paquete Android:
  - `co.condusoft.mobile`
- Target SDK:
  - `36`
- Firma confirmada en el `APK`:
  - certificado `CN=Condusoft Mobile, OU=Android, O=Condusoft, L=Bogota, ST=Cundinamarca, C=CO`
  - SHA-256 `0aa1901125bef77209951f9c0eebd25d409aaf9838619345b98924987b52442e`

## Permisos observados en el release

Permisos presentes en el release final:

- `android.permission.INTERNET`
- `android.permission.VIBRATE`
- `android.permission.ACCESS_NETWORK_STATE`
- `android.permission.ACCESS_WIFI_STATE`
- `android.permission.USE_BIOMETRIC`
- `android.permission.USE_FINGERPRINT`
- `co.condusoft.mobile.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`

Permisos sensibles que ya no llegan al release:

- `READ_EXTERNAL_STORAGE`
- `WRITE_EXTERNAL_STORAGE`
- `SYSTEM_ALERT_WINDOW`

## Declaraciones probables segun el codigo

Estas respuestas parecen consistentes con el repo, pero deben confirmarse antes de cargarlas en Play Console:

- `Anuncios`: no se observan SDKs de ads ni flujos de monetizacion por anuncios.
- `Categoria sugerida`: Educacion.
- `Acceso a la app`: la app principal requiere autenticacion.
- `Cuenta`: existe pantalla de login y tambien registro inicial de escuela.
- `App access`: Google debe recibir credenciales demo fijas y reutilizables. No guardar la contrasena en este repo; cargarla directamente en Play Console.
- `Seguridad de datos`: la app usa `Supabase`, `expo-secure-store`, `expo-sqlite` y cache offline local.
- `Sincronizacion`: la app guarda datos localmente y luego los sincroniza.
- `Datos personales visibles en el codigo`:
  - nombre
  - email
  - telefono
  - cedula/dni
  - rol
  - escuela/sede
- `Datos operativos visibles en el codigo`:
  - alumnos
  - clases
  - instructores
  - vehiculos
  - examenes
  - actividad/log
- `Datos financieros visibles en el codigo`:
  - ingresos
  - gastos
  - caja
  - monto
  - metodo de pago
  - proveedor
- `No se observan`:
  - camara
  - ubicacion
  - contactos
  - microfono
  - fotos/videos
  - ads ID

## Estado de requisitos para Play Console

Confirmado desde codigo/artefacto:

- Politica de privacidad publica: `https://condusoft.co/privacidad`
- Enlace publico para eliminar cuenta y datos: `https://condusoft.co/eliminar-cuenta`
- Ruta dentro de la app para eliminar cuenta y datos: `Mi cuenta` > `Eliminar cuenta y datos`
- Nombre visible: `ConduSoft`
- Paquete Android: `co.condusoft.mobile`
- Categoria recomendada: Educacion
- Anuncios: no se observan SDKs ni flujos publicitarios
- Gobierno: no es una aplicacion gubernamental
- Salud: no se observan funciones medicas/salud
- ID de publicidad: no se observa uso de ads ID
- Acceso de revision: existe cuenta demo `review.play@condusoft.co` con rol `admin_escuela` y perfil activo
- Compatibilidad 16 KB: las librerias nativas `arm64-v8a` y `x86_64` del release actual tienen segmentos `LOAD` alineados a `2**14`

Pendiente de confirmar dentro de Play Console:

- Que `Acceso a aplicaciones` tenga marcada la opcion de funciones restringidas por login.
- Que las credenciales demo esten cargadas y guardadas en Play Console.
- Que `Resumen de publicacion` se haya reenviado despues de actualizar credenciales.

## Datos que faltan confirmar con negocio/legal

No se deben inventar para Google Play:

- correo de soporte y, si aplica, telefono publico
- audiencia objetivo exacta
- si la app se dirige a menores
- si las funciones de ingresos/gastos/caja deben declararse como `funciones financieras`
- si alguna parte debe declararse como `salud` o `gubernamental`
- politica real de eliminacion de cuenta y borrado de datos

## Siguiente paso recomendado

Para corregir el rechazo actual por credenciales:

1. Entrar a Play Console > Contenido de la app > Acceso a aplicaciones.
2. Indicar que la app tiene funciones restringidas por login.
3. Cargar las credenciales demo validadas.
4. Guardar.
5. Ir a Resumen de publicacion y enviar los cambios a revision.
