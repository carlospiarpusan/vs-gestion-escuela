# Correcciones de la revisión integral

20 de octubre de 2026. ConduSoft mantiene los originales en el correo y los documentos exigidos por el Ministerio en Aulapp. No se creó un archivo documental ni almacenamiento en R2/B2.

## Publicado y aplicado

- **Contratos:** las tablas de configuración, plantillas, representaciones históricas y migraciones tienen RLS y acceso reservado al servidor. Las cuatro solicitudes anónimas HEAD devolvieron 401; se conservaron los registros.
- **Facturas recibidas:** las nuevas importaciones se registran como obligaciones pendientes, con el vencimiento del XML o su fecha de emisión. Se valida el NIT del adquirente frente al campo fiscal `escuelas.cif`. Las notas crédito, monedas distintas de COP y documentos sin identificación suficiente se muestran en el historial como «Requiere revisión» y no generan gastos automáticos.
- **Duplicados:** identidad de factura por NIT del proveedor y número normalizado, índice único por escuela y recuperación ante una inserción concurrente. Los registros antiguos se reconocen también por el NIT conservado en sus notas. No se modificaron sus valores ni su estado de pago.
- **Correo:** dos buzones pueden avanzar simultáneamente, con un presupuesto por conexión y un límite global del cron. Se priorizan conexiones con sincronización más antigua y se conservan los pendientes. IMAP mantiene el cursor anterior a un adjunto cuyo guardado falló, para reintentarlo.
- **Borradores:** aislamiento por usuario, escuela, sede y formulario; las matrículas incluyen al alumno. Vencen a los siete días y no se recuperan los borradores antiguos sin propietario. Abrir un formulario ya no sobrescribe un borrador válido ni muestra el de otro contexto.
- **Contraseña temporal:** la obligación se conserva en `app_metadata`. Un trigger mantiene la compatibilidad con clientes anteriores y evita levantarla editando únicamente `user_metadata`. El cambio real de contraseña la elimina. Web, RPC móviles y Edge Function consultan el estado autorizado. Las cuentas y sus contraseñas existentes se conservaron.
- **Abonos:** cada intento web conserva un identificador de operación durante sus reintentos. El servidor devuelve el ingreso anterior y rechaza reutilizarlo con otro usuario o contenido. La consulta de saldo y el ingreso siguen en una misma transacción. Un fallo posterior de actualización visual informa que el pago ya quedó guardado.
- **Recibos:** en Alumnos → Abonos → Historial aparece «Recibo» para pagos cobrados. Se genera una vista imprimible desde el ingreso existente, con permisos de escuela y sede. No se guarda un PDF ni se reserva otro consecutivo contractual.
- **Altas móviles anteriores:** los comandos de creación pendientes de versiones antiguas producen una preinscripción regular. No crean una matrícula ni inventan nacimiento, sexo o ANSV. Al crear la matrícula válida desde la web, la preinscripción se activa. La base impide activar una preinscripción sin matrícula. Los comandos ya completados mantienen su resultado.
- **Funciones internas:** se retiró el acceso anónimo a funciones de identidad y se cerraron las consultas arbitrarias de suscripción. El cliente conserva el RPC que obtiene únicamente su propia escuela. Los triggers siguen funcionando sin estar disponibles como RPC del cliente. Se fijó el `search_path` de tres funciones propias.

## Android y comprobaciones de entrega

Se alinearon Expo 54, Constants, Linking, Router y Babel con el SDK instalado y se aplicaron actualizaciones compatibles. `expo install --check` finaliza correctamente. npm señala 42 paquetes afectados (26 altos, 16 moderados), frente a 53 al inicio; no quedan paquetes críticos en esta auditoría. La actualización mayor de SDK/React Native continúa pendiente: no se usó `npm audit fix --force` ni se retrocedió Expo.

El CI incluye pruebas y tipos Android, pruebas reales de los RPC sobre PostgreSQL/WASM y de la Edge Function. Se usa Node 24 para las comprobaciones móviles que necesitan SQLite nativo. Las pruebas web limitan su concurrencia a dos trabajadores y la compilación de CI utiliza configuración pública ficticia, sin necesitar secretos de producción.

Los cambios del cliente Android están en el código. **No se generó ni distribuyó una APK nueva en esta entrega.** El enlace de cambio de contraseña requiere incluirse en la siguiente APK; las protecciones del servidor y las preinscripciones ya están activas para versiones anteriores.

## Validación y publicación

- Versión web aislada sobre la producción previa: **1.107 pruebas correctas en 110 archivos**, tipos, ESLint y compilación de producción correctos.
- Pruebas adicionales posteriores de seguridad móvil y funciones internas: **2 correctas**; sin cambios posteriores en el código web desplegado.
- Android: **157 pruebas correctas**, tipos y compatibilidad Expo correctos.
- Edge Function real con transporte HTTP simulado: **69 pruebas correctas**, sin conexiones ni escrituras de prueba en producción.
- RPC y permisos con PostgreSQL/WASM: comprobaciones correctas, incluyendo conservación de firmas y funcionamiento de triggers.
- Recibo revisado con datos ficticios a 1.280 y 390 px; acceso al botón con teclado.
- npm web, omitiendo desarrollo: **0 avisos**.
- Base real: **50 tablas públicas, todas con RLS**. Migraciones verificadas con consultas de permisos y conservación de registros/contraseñas.
- Vercel: `dpl_FSTZWF3pUUioFbRZ5m7y8ehEFrb6`, estado Ready y promovido a `condusoft.co` y `www.condusoft.co`.
- Supabase: `mobile-admin-users` versión 2, ACTIVE, verificación JWT conservada.

## Pendientes diferenciados de esta corrección

Los 42 gastos históricos importados que estaban marcados como pagados necesitan contrastarse con sus soportes antes de cambiar su estado. No se puede concluir que estén mal pagados solo por haber sido importados.

La revisión del proveedor aún requiere comprobar respaldos y realizar una restauración aislada. La pantalla de evidencias de Cumplimiento no constituye una restauración comprobada.

La auditoría de Supabase también señala la ubicación de `pg_trgm`, dos funciones del esquema separado `vs_facturacion` y protección de contraseñas comprometidas. Las RPC autenticadas con `SECURITY DEFINER` conservan avisos de revisión: su ejecución es necesaria para los flujos existentes y no se revocó indiscriminadamente. Estos avisos no equivalen a las tablas expuestas ya corregidas.

Cierre de caja con arqueo, conciliación bancaria asistida, pendientes operativos e historial general continúan como propuestas de producto del informe original. Esta entrega incorpora el recibo bajo demanda y las correcciones verificadas anteriores.
