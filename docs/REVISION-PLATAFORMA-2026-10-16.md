# Revisión de plataforma — 16 de octubre de 2026

## CALE: examen completo de 40 preguntas

- Web y móvil preparan 40 preguntas. Se elimina la selección web de exámenes de 10 o 20 preguntas.
- El alumno puede recorrer y revisar sus respuestas antes de finalizar. La calificación y las explicaciones aparecen después de completar las 40 respuestas y pulsar finalizar.
- El botón de finalizar permanece deshabilitado mientras faltan respuestas. La API web y el servicio móvil también rechazan intentos incompletos o con preguntas duplicadas.
- Si el banco no contiene 40 preguntas disponibles, se informa el problema y no se inicia un examen recortado.
- Durante el guardado se bloquean cambios de respuesta y envíos duplicados. Un fallo permite reintentar conservando las respuestas.
- La falta de actualización del historial después de guardar no se presenta como un fallo del examen ya guardado.
- El guardado web del intento y sus detalles usa una transacción: si falla una inserción, se revierte todo. Fecha y hora usan America/Bogota.
- El móvil conserva su funcionamiento sin conexión; la pantalla solo presenta resultados completos de 40 preguntas. Los intentos antiguos que ya estaban en la cola conservan su mecanismo de sincronización.

## Otros errores corregidos en esta revisión

- Sesión: las respuestas antiguas de carga del perfil no restauran una sesión cerrada o reemplazada. El cambio de cuenta limpia perfil y cachés anteriores. El cierre por inactividad funciona aunque el almacenamiento del navegador esté bloqueado. Se comprueba el error devuelto por el cierre de sesión.
- Caché: una lectura forzada reemplaza una petición normal pendiente; respuestas antiguas no sobrescriben el estado nuevo. Las peticiones forzadas simultáneas comparten la misma carga.
- Formularios: limpiar un borrador no convierte un guardado correcto en un error cuando localStorage falla. La confirmación de borrado no se cierra durante una operación pendiente.
- Planes: validación estricta de tipos, precios, límites enteros, características y estado activo antes de modificar datos.
- Apariencia: el tema sigue funcionando si el almacenamiento local está bloqueado.
- Cuenta: la ayuda de contraseña muestra el mínimo real de ocho caracteres.

## Verificación

- Web: 746 pruebas correctas en 72 archivos.
- Móvil: 138 pruebas correctas en 13 archivos.
- ESLint sin advertencias; TypeScript web y móvil correctos.
- Compilación de producción correcta con `npx next build --webpack`.
- Las pruebas web recorren las 40 preguntas, vuelven a preguntas anteriores, corrigen respuestas, comprueban resultados solo al finalizar, fallos y reintentos, bloqueo durante guardado y banco insuficiente.
- Las pruebas móviles cubren las 40 respuestas, guardado en línea y sin conexión, reintentos, bloqueo después de guardar y cambios del banco.
- Pruebas de 74 métodos de rutas protegidas verifican rechazo sin sesión antes de consultar la base de datos.
- Las pruebas transaccionales de CALE ejecutan SQL en PostgreSQL aislado (PGlite), incluyendo reversión por fallo en preguntas o respuestas.

## Estado

Web publicada el 16 de octubre de 2026 por petición del usuario. Vercel completó la compilación de producción y confirmó el despliegue `dpl_8RhTbQ2AridhHBAtMpzX1Eo4Q3nK` en estado Ready, con los dominios https://condusoft.co y https://www.condusoft.co asociados. URL de versión: https://vs-gestion-escuela-1j0jm1q4c-carlos-piarpusans-projects.vercel.app.

La actualización móvil sigue pendiente de una nueva compilación/distribución; Vercel publica la web. No se aplicaron migraciones a producción en esta revisión. Las pruebas usan perfiles simulados y bases aisladas; no certifican todos los recorridos con cada rol en producción.
