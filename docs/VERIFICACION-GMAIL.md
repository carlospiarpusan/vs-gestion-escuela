# Solicitud de verificación de Gmail — pendiente de video

La aplicación **ConduSoft - Facturas recibidas** ya figura **En producción** y
su marca está verificada y publicada. Falta la aprobación de `gmail.readonly`.
El límite actual de Google es de 100 usuarios sin verificación.

## Datos autorizados para enviar a Google

- Destino: Google Auth Platform, proyecto `condusoft-facturas`.
- Categoría: Productividad del correo electrónico.
- Permiso: `https://www.googleapis.com/auth/gmail.readonly`.
- Justificación técnica: el texto siguiente. No contiene correos reales,
  facturas reales, credenciales ni información de alumnos.

> ConduSoft helps driving schools manage accounting. After the mailbox owner connects Gmail, the app searches inbox messages with attachments, optionally filtered by sender, subject and date. It reads MIME messages to extract electronic invoice XML/ZIP attachments and records invoice supplier, number, date, taxes, currency and totals as expenses for the selected school and branch, with an import history and duplicate checks. gmail.metadata cannot read message content or attachments, so gmail.readonly is the minimum scope needed. The app does not send, change or delete messages. Encrypted refresh tokens support scheduled imports and are removed when the user disconnects. Email data is not sold, used for advertising or used to train AI models. Access is limited to authorized school staff.

El propietario autorizó expresamente enviar esta justificación a Google. El
texto se introdujo en el formulario (795/1000 caracteres), con la categoría
Productividad del correo electrónico. **Guardar permanece deshabilitado**
porque falta el enlace del video. No está guardado en Google ni se ha enviado
la solicitud final; el texto queda conservado también en este documento.

## Material pendiente

Google exige una URL de **YouTube** de un video real que muestre el flujo de
consentimiento del cliente web de este proyecto y cómo se usan los datos.
Debe mostrar la conexión, los permisos solicitados y la importación de una
factura de prueba en Gastos. Usar una cuenta y una factura de prueba, ocultando
secretos, información de alumnos y datos de terceros. No sustituirlo por una
URL inventada o una demostración que no corresponda al flujo real.

El formulario de envío permanece deshabilitado hasta completar justificación,
uso de datos previsto y video. No se ha enviado una solicitud de revisión ni se
ha contratado una evaluación de seguridad. La aprobación del permiso y cualquier
evaluación adicional dependen de Google.

## Guion breve para grabar la demostración real

Duración orientativa: 2 a 3 minutos. Usar una cuenta Gmail controlada por el
propietario y un entorno, escuela y sede de pruebas; la importación crea un gasto.
El archivo `fixtures/factura-demo-gmail.xml` es ficticio, no está firmado por
la DIAN y no tiene validez fiscal. El titular puede enviarlo como adjunto a su
buzón de prueba antes de grabar. No se ha enviado ningún correo desde esta tarea.

1. Mostrar ConduSoft y la dirección visible de la aplicación. Explicar:
   «Esta función importa facturas electrónicas de Gmail a los gastos de una escuela».
2. Abrir **Gastos → Facturas → Conectar correo**, seleccionar una sede de pruebas
   y mostrar el botón **Google** y los filtros de remitente/asunto. Mantener
   desactivada la sincronización automática para controlar la demostración.
3. Iniciar la conexión con la cuenta de prueba. Mostrar el nombre de la marca,
   la pantalla real de consentimiento y el permiso de lectura solicitado.
   El cliente de este proyecto es
   `570803849872-kobq4gc07jhe5da1q39ruumesies86d5.apps.googleusercontent.com`.
   No grabar contraseñas, claves, códigos de autorización ni tokens. El titular
   completa personalmente la autenticación y el consentimiento.
4. Volver a ConduSoft y mostrar que el correo está conectado a la sede elegida.
   Pulsar **Sincronizar** con el adjunto ficticio ya disponible en la bandeja.
5. Mostrar la importación y el gasto ficticio **DEMO-GMAIL-20261019**, proveedor
   «Proveedor ficticio DEMO - sin validez fiscal», total **119.000 COP**.
   Explicar que se leen adjuntos XML/ZIP; no se envían ni modifican correos.
6. Mostrar dónde se desconecta la cuenta y el vínculo a la política de privacidad.
   Explicar que desconectar elimina las credenciales y detiene las sincronizaciones;
   los gastos ya importados permanecen en la escuela de pruebas.
7. Subir la grabación a YouTube como **No listado** y conservar una URL accesible
   para el equipo revisor de Google. No enviar una grabación con datos de terceros.

Al tener la URL, completar el campo de YouTube, guardar, revisar el resumen y
enviar la solicitud de verificación. La publicación de la aplicación y de su
marca ya está completada y no necesita repetirse.
