# Conectar Google y Microsoft para recibir facturas en Gastos

La función se abre en **Gastos → Facturas → Conectar**. El administrador conecta
una sola vez el **buzón de facturas de la empresa**, donde los proveedores envían
las facturas emitidas a esa empresa. No requiere conectar correos de alumnos ni
pedirles autorización. La dirección de acceso del administrador no se utiliza
como valor inicial del buzón contable. Se elige la sede
contable y, opcionalmente, remitente, asunto y solo mensajes no leídos. Los botones
Google y Microsoft/Hotmail utilizan autorización OAuth con permisos de lectura.
La cuenta conectada se identifica desde el proveedor; no se utiliza el correo
escrito en un formulario para decidir qué buzón leer.

Cada empresa/escuela mantiene una conexión de correo, igual que el módulo anterior. El
personal de sede solo ve y opera la conexión de su sede; el administrador de la
escuela puede gestionar la conexión de la escuela. Los gastos se registran con
la escuela y sede elegidas al conectar.

## Configuración de servidor

Variables privadas, sin prefijo `NEXT_PUBLIC_`:

```
EMAIL_INVOICE_GOOGLE_CLIENT_ID
EMAIL_INVOICE_GOOGLE_CLIENT_SECRET
EMAIL_INVOICE_MICROSOFT_CLIENT_ID
EMAIL_INVOICE_MICROSOFT_CLIENT_SECRET
EMAIL_INVOICE_ENCRYPTION_KEY
```

`EMAIL_INVOICE_ENCRYPTION_KEY` debe conservar la clave dedicada que ya protege las
conexiones IMAP. No reemplazarla para activar OAuth. Las nuevas credenciales se
introducen en el gestor de variables del servidor, nunca en el chat ni en Git.

Registrar exactamente estas URL de retorno de tipo **Web** en ambos proveedores:

```
https://condusoft.co/api/gastos/facturas-correo/oauth
https://www.condusoft.co/api/gastos/facturas-correo/oauth
```

Para desarrollo se puede registrar además
`http://localhost:3000/api/gastos/facturas-correo/oauth`.
La URL utilizada debe coincidir con el dominio donde se abre la aplicación.

## Google Cloud

1. Crear un proyecto específico para ConduSoft o seleccionar el proyecto que el
   propietario haya designado. Activar **Gmail API**.
2. En **Google Auth Platform**, configurar marca **ConduSoft — Facturas recibidas**,
   correo de soporte/contacto, dominio `condusoft.co`, página principal
   `https://condusoft.co` y privacidad `https://condusoft.co/privacidad`.
3. Configurar público externo cuando se conecten cuentas de diferentes escuelas.
   Durante las pruebas, agregar expresamente las cuentas de prueba.
4. Añadir únicamente `https://www.googleapis.com/auth/gmail.readonly`.
5. Crear un cliente OAuth de tipo **Aplicación web**, con las URL de retorno
   indicadas. Guardar su ID y secreto en las variables privadas correspondientes.

Google clasifica `gmail.readonly` como restringido. Para ofrecer la función a
usuarios externos se debe completar la verificación que corresponda y, al
procesar estos datos en servidor, la evaluación de seguridad exigida por Google.
En modo Testing, los permisos de actualización de esta integración expiran a
los siete días; no se debe considerar ese modo una activación definitiva.

Fuentes: [permisos Gmail](https://developers.google.com/workspace/gmail/api/auth/scopes),
[verificación de permisos restringidos](https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification),
[duración de autorizaciones de prueba](https://developers.google.com/identity/protocols/oauth2).

## Microsoft Entra

1. Crear un registro específico **ConduSoft — Facturas recibidas**.
2. Elegir **Cuentas de cualquier directorio organizativo y cuentas personales de
   Microsoft**, para admitir Microsoft 365, Outlook, Hotmail y Live.
3. En Autenticación, agregar la plataforma **Web** y las URL de retorno indicadas.
   El flujo es de servidor con PKCE; no activar flujos implícitos ni cliente público.
4. Añadir permisos **delegados** Microsoft Graph `Mail.Read` y `User.Read`.
   Se solicita también `offline_access` durante la autorización, para renovar el
   acceso cuando el usuario no tiene la plataforma abierta.
5. Registrar el ID de aplicación y crear un secreto de cliente; guardar el
   **valor** del secreto, no su identificador, en las variables del servidor.
   Anotar su fecha de vencimiento para renovarlo antes de que caduque.

Los permisos no son de aplicación ni de envío. Cada titular autoriza su buzón;
una organización puede exigir consentimiento de su administrador.

Fuentes: [registro de aplicaciones](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app),
[retorno web](https://learn.microsoft.com/en-us/entra/identity-platform/how-to-add-redirect-uri),
[permisos Microsoft Graph](https://learn.microsoft.com/en-us/graph/permissions-reference).

## Base de datos y publicación

Aplicar únicamente la migración revisada
`supabase/migrations/20261019183852_email_invoice_microsoft_oauth.sql`.
Amplía los proveedores permitidos, agrega puntos de continuación para búsquedas
OAuth y una reserva temporal de sincronización. Conserva los datos, índices,
credenciales cifradas y políticas existentes. No requiere volver a crear tablas.
No ejecutar todas las migraciones pendientes sin revisar el estado remoto.

Después de configurar las variables y aplicar la migración, publicar la web y
conectar una cuenta desde Gastos. Los botones permanecen deshabilitados mientras
falte la configuración del proveedor. No se inicia una conexión ficticia.

## Lectura y registro

- Se revisa la bandeja de entrada, incluyendo correos leídos salvo que se marque
  **Solo no leídos**. La lectura normal busca el último mes. La búsqueda histórica
  permite ampliar el período hasta los límites del módulo.
- Se descargan adjuntos XML o ZIP de factura electrónica compatibles con el
  importador existente. Un PDF sin XML no se interpreta automáticamente.
- La sincronización crea los gastos y deja su historial de importación para
  revisar proveedor, número, total y resultado. No requiere un correo de envío.
- Se comprueban mensajes/adjuntos ya importados y facturas existentes por número
  y proveedor. Los errores temporales permiten volver a intentar la importación.
- Cada buzón admite una sola sincronización a la vez. Una reserva abandonada se
  recupera después de seis minutos. Los puntos de continuación permiten seguir
  con otra tanda sin repetir siempre la primera página del proveedor.
- La sincronización programada conserva el horario existente de Vercel. Su ruta
  exige `CRON_SECRET`; también se puede usar **Sincronizar** manualmente.
- Al desconectar se elimina la conexión y sus tokens; los gastos contables ya
  importados permanecen. La revocación en el proveedor se puede hacer desde la
  cuenta de Google o Microsoft.

## Estado de entrega

Verificación del 19 de octubre de 2026: 910 pruebas en 96 archivos, TypeScript,
lint y compilación de producción correctos. Las pruebas incluyen proveedores
simulados, MIME/XML de prueba, PostgreSQL aislado y regresión de importación IMAP.

La migración específica se aplicó a producción y conservó los 1.476 gastos
existentes. No había conexiones ni importaciones de correo previas. Se configuró
`EMAIL_INVOICE_ENCRYPTION_KEY` como secreto de producción en Vercel, sin guardar
su valor en Git. La conexión y la lectura reales se validan en el estado operativo indicado al final.

Google Cloud: proyecto **ConduSoft Facturas**, ID `condusoft-facturas`, sin cuenta
de facturación asociada. Gmail API está habilitada. La marca y el dominio
`condusoft.co` están guardados, con página principal y privacidad públicas.
Se creó el cliente web **ConduSoft Producción - Facturas recibidas**, con ambos
retornos HTTPS de producción. ID:
`570803849872-kobq4gc07jhe5da1q39ruumesies86d5.apps.googleusercontent.com`.
Su ID y secreto están guardados como secretos de Vercel producción; la copia
JSON temporal de Descargas fue eliminada. El único permiso de correo declarado
es `gmail.readonly`.

La aplicación OAuth de Google fue publicada el **19/10/2026**, con autorización
expresa del propietario. Se verificó en la consola **Estado de publicación:
En producción**, tipo de usuario externo. El límite actual es **100 usuarios**
(0 conectados) mientras los permisos sensibles/restringidos no estén aprobados.
La marca también se verificó mediante la comprobación automática de Google y se
publicó; la consola confirma que ya se muestra a los usuarios. Sigue pendiente
la verificación del acceso a datos para `gmail.readonly`: publicar el
consentimiento y verificar la marca no equivale a aprobar ese permiso. Las
cuentas pueden encontrar el aviso de aplicación sin verificar y las restricciones que aplique Google. No se leyeron buzones durante la publicación de la marca; posteriormente se autorizó el buzón empresarial, según el estado operativo indicado al final.

El formulario de verificación exige uso previsto, justificación y una URL de
YouTube de demostración. Se preparó el borrador en `docs/VERIFICACION-GMAIL.md`.
El propietario autorizó enviar la justificación y se introdujo el texto en el
formulario, con uso previsto Productividad del correo electrónico. **Guardar**
permanece deshabilitado hasta proporcionar el video; no se guardó ni envió la
solicitud. Se prepararon un guion y un XML ficticio para facilitar la grabación;
no se ha grabado ni publicado un video.

Microsoft Entra: registro **ConduSoft - Facturas recibidas**, ID
`e7d5e894-5f96-491e-999d-8a0b77fa379e`, para cuentas organizativas y personales.
Están guardados ambos retornos Web, y únicamente los permisos delegados
`Mail.Read` y `User.Read`. `offline_access` se solicita durante el consentimiento.
El secreto **ConduSoft correo producción - 2026-10** vence el **17/04/2027**.
ID y secreto están guardados como secretos de Vercel producción. La nota del
secreto en Vercel también indica la fecha de renovación. No se concedió acceso
como aplicación ni consentimiento de administrador para todo el directorio.
Las organizaciones pueden exigir aprobación de su administrador o verificación
del editor. La aplicación FacturaX preexistente no se modificó para este trabajo.

La web quedó publicada el 19 de octubre de 2026 en **https://condusoft.co** y
**https://www.condusoft.co**, con estado **Ready** verificado por Vercel.
Despliegue: `dpl_54h3cEre2bHC2NYAv4fJi6YgGLqb`.
URL de la versión: `https://vs-gestion-escuela-cxtwhmdq2-carlos-piarpusans-projects.vercel.app`.
La segunda publicación se completó con las cuatro variables OAuth nuevas y
estado **Ready** verificado en el dominio de producción. Ambos botones tienen
configuración de servidor. Microsoft permite iniciar la conexión y solicitar
consentimiento de cada cuenta. La pantalla de consentimiento Google también
está publicada en producción, con verificación pendiente y el límite indicado.
Posteriormente se autorizó el buzón empresarial y se comprobó su lectura, según el estado operativo indicado al final.

## Alcance empresarial y autorización de Google

El número de usuarios OAuth se refiere a las cuentas de correo empresarial que
autorizan la lectura, no a alumnos ni al número de usuarios de ConduSoft. La
empresa autoriza su propio buzón. El cron existente lo revisa diariamente y crea
gastos a partir de adjuntos XML/ZIP; la función no es una notificación en tiempo
real de cada correo recibido.

El proyecto actual de Google pertenece a una cuenta sin organización, por lo
que «Externo» no significa que se soliciten correos a alumnos: describe qué
cuentas de Google pueden consentir. Google solo permite «Interno» si el proyecto
pertenece a la organización Workspace/Cloud Identity correspondiente. Usar un
solo buzón empresarial no convierte automáticamente el proyecto actual en una
app interna ni demuestra la excepción de uso personal.

Fuentes oficiales: [excepciones de verificación](https://support.google.com/cloud/answer/13464323?hl=en),
[público y límites OAuth](https://support.google.com/cloud/answer/15549945?hl=en).

El ajuste de alcance empresarial se publicó en producción el 19/10/2026: el
formulario identifica el buzón de la empresa y ya no propone el correo personal
del administrador. Se verificaron 37 pruebas del flujo y regresiones, incluidas
las comprobaciones de conexión y de formulario sin correo personal precargado;
TypeScript, lint y compilación de producción correctos. El titular inició sesión en ConduSoft como administrador y abrió la conexión
Google. El titular revisó el aviso de aplicación no verificada y completó personalmente
el consentimiento. La conexión está confirmada para la empresa y sede indicadas
en el estado operativo; ya se registraron importaciones reales.

## Estado operativo de la conexión empresarial

El titular completó personalmente el consentimiento de Google. La conexión
Gmail está activa, con renovación autorizada y `auto_sync=true`, asociada a
**Escuela de Conduccion Sin Fronteras**, **Sede 1**. La comprobación de solo lectura
del 19/10/2026 confirmó 15 registros de facturas importadas antes de aplicar
la última corrección de tamaño. No se muestran ni exportan tokens.

Se detectó en la primera lectura real que un correo grande abortaba toda la
tanda. Se corrigió para registrar el correo omitido y continuar con los demás,
sin descargarlo otra vez en revisiones posteriores. El límite sigue siendo
30 MB de MIME; en Gmail se distingue del tamaño mayor de su envoltura JSON
con base64url. Las omisiones permanecen visibles en el historial para importar
manual y puntualmente los adjuntos compatibles. No se considera una omisión
como una factura importada.

La regresión comprueba mensajes válidos de Gmail cuyo contenido MIME no excede
el límite, mensajes realmente grandes, cancelación de descargas y continuación
con las facturas siguientes en ambos proveedores, sin duplicar gastos ni
registros de omisión. Pasaron las 910 pruebas generales, más 49 verificaciones
del módulo y formulario tras ajustar el resumen de tandas parciales. Lint y
TypeScript correctos.

## Selección y cambio del buzón de Google

El botón de Google abre siempre el selector de cuentas (`select_account`), sin
fijar una dirección ni restringir el dominio. El administrador puede autorizar
cualquier buzón Gmail o Google Workspace que reciba las facturas, distinto a su
correo de acceso a ConduSoft. Con una conexión Google existente, el botón se
llama «Cambiar cuenta de Google». Solo después del consentimiento correcto se
reemplaza la conexión por la identidad que devuelve Gmail; los gastos previos
se conservan. Se mantiene una conexión por empresa. Otros proveedores usan
Microsoft/Hotmail o IMAP.

Pasaron las 55 pruebas dirigidas de autorización, identidad de Gmail, cambio de
cuenta desde el formulario y sincronización OAuth, además de lint y TypeScript.
Publicado el 19/10/2026 en `condusoft.co` y `www.condusoft.co`, con estado
**Ready** comprobado mediante Vercel. Despliegue:
`dpl_4jy44TVAq7QxyE1fJihfZGYoDoep`.
URL de versión:
`https://vs-gestion-escuela-5rdtik7sz-carlos-piarpusans-projects.vercel.app`.

La revisión incremental real se ejecutó el 19/10/2026 a las 15:34 (Colombia)
mediante el proceso automático existente, tras confirmar en solo lectura que
su única conexión activa era el buzón empresarial autorizado. Terminó sin
errores ni nuevas importaciones. La comprobación posterior confirmó conexión
activa, revisión automática habilitada, fecha de sincronización actualizada y
`last_error=null`; permanecen 15 registros importados. Esta revisión no equivale
a completar la búsqueda histórica de 24 meses ni reproduce un mensaje grande
del histórico: esa regresión está cubierta por las pruebas dirigidas.
