# Acceso de instructores

## Diagnostico comprobado

- Consulta de solo lectura: 12 cuentas de instructor, todas activas, confirmadas,
  vinculadas a instructor/perfil/escuela y sin bloqueos de Auth.
- Las 12 cuentas usan correo real, no el correo interno `@instructor.local`.
- La cuenta concreta indicada por el usuario coincide en instructor, perfil y Auth;
  tiene contrasena configurada e identidad de correo. No se leyen ni se cambiaron
  contrasenas. No se incluyen identificadores personales en este documento.
- El login publicado apunta al proyecto de ConduSoft. La clave publica coincide
  con la configuracion local y el endpoint publico de ajustes Auth responde 200.
- Prueba en produccion con cuenta ficticia inexistente: la entrada con correo
  muestra Correo o contrasena incorrectos. No se intento adivinar contrasenas reales.
- Todavia no se ha validado un acceso real de la cuenta afectada. El usuario debe
  introducir su contrasena en el formulario, nunca en el chat. El fallo por correo
  no se considera resuelto ni se atribuye definitivamente a una contrasena errada.

## Correccion local

Android antes inventaba tres correos internos al recibir una cedula; no podia
autenticar por cedula a quienes tenian un correo real. Se reemplaza por una
consulta al endpoint de ConduSoft `/api/public/mobile-login`, que autentica las
credenciales y valida el perfil antes de devolver una sesion al dispositivo.

La logica de cedula se comparte con el login web. Se conservan los limites de
intentos, rechazo de perfiles inactivos/ambiguos, correspondencia entre usuario
y perfil, y bloqueo de contrasenas iniciales predecibles en cuentas con correo real.
No se devuelven correos asociados antes de autenticar. La web conserva cookies,
sin exponer tokens como JSON; solo el endpoint nativo devuelve access/refresh token
despues de validar las credenciales. Usa cliente anonimo sin persistencia en servidor,
no utiliza service role, no habilita CORS ni acepta origen de otro sitio.

El acceso por correo continua usando Supabase Auth directamente. No se recorta,
convierte a minusculas ni altera la contrasena. Se agrega regresion para asegurar
que un correo de instructor nunca se interprete como cedula.

La solicitud nativa de cedula tiene limite de 15 segundos, no sigue redirecciones,
rechaza respuestas incompletas y no acepta una respuesta tardia tras fallar.

## Verificacion y pendientes

- Web: 607 pruebas aprobadas, 63 archivos.
- Android: 133 pruebas aprobadas, 13 archivos.
- Lint, TypeScript Android y compilacion Next aprobados; 104 paginas.
- No se cambiaron datos, contrasenas, RLS ni configuracion de Auth.
- No se publico en produccion ni se genero APK/AAB nueva.
- Pendiente: prueba real por parte del titular; resolver recuperacion si procede.
- Para aplicar la correccion nativa se requiere publicar el endpoint y luego
  actualizar la aplicacion cuando el usuario autorice generar su version final.
  La APK ya instalada no recibe cambios locales automaticamente.
