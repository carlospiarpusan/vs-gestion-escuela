# Android: roles, horas y limpieza visual

Estado: cambios locales en revision. No publicados en ConduSoft ni enviados a Play Store.
No se ha generado otra APK/AAB despues de la indicacion de esperar. Los binarios
preliminares 1.0.9 (codigo 10) existentes son anteriores a esta revision y no deben
subirse como entrega final.

## Correccion de Horas

- La version anterior consultaba `clases`, no `horas_trabajo`. Esa era una causa
  concreta de ver cero aunque existieran horas registradas por la escuela.
- Consulta el instructor vinculado a la cuenta mediante `instructores.user_id`.
  Filtra por escuela e instructor y conserva la seguridad RLS vigente.
- Mes actual por defecto en America/Bogota; filtros de dia, mes y ano, con flechas
  y validacion de fechas. Horas numericas y dias trabajados, no cantidad de clases.
- Paginacion de toda la consulta, sin el antiguo limite de 50 registros.
- Cache por cuenta, escuela, sede y periodo. No reutiliza el antiguo cache de clases.
- Un fallo de consulta o una cuenta sin instructor vinculado muestra un error,
  no un total cero inventado. No se modifican ni cierran horas desde el instructor.
- La pantalla inicial del instructor es Horas. No pide un segundo resumen oculto.

## Funciones por rol

| Rol                      | Funciones nativas visibles                                                        |
| ------------------------ | --------------------------------------------------------------------------------- |
| Alumno                   | Practica CALE, resumen propio, cuenta                                             |
| Instructor               | Horas propias, vehiculos, bitacora propia, cuenta                                 |
| Recepcion                | Alumnos, ingresos, caja diaria, cuenta                                            |
| Administrativo           | Alumnos, instructores, vehiculos, horas, bitacora, ingresos, caja, gastos, cuenta |
| Administrador de sede    | Operacion y finanzas permitidas, personal y sedes, cuenta                         |
| Administrador de escuela | Operacion y finanzas permitidas, personal y sedes, cuenta                         |
| Superadministrador       | Escuelas, personal y sedes autorizados, cuenta                                    |

Una politica central filtra menus, accesos secundarios y rutas directas. Bloquea
nuevas acciones locales no asignadas, sin sustituir la autorizacion del servidor.
Los modulos que solo tenian una pantalla de presentacion, incluido Cartera sin
consulta nativa implementada, quedan fuera de la navegacion Android. Permanecen
disponibles en la web conforme a sus permisos. CALE nativo solo se muestra al alumno.

## Actualizaciones de la plataforma

La creacion de alumnos desde Android abre el formulario actual de ConduSoft web,
para conservar los datos obligatorios de facturacion, catalogos y preselecciones.
Requiere sesion web; no se copian credenciales entre navegadores.
FacturaX, impuestos, productos, precios variables y emision siguen en la web.
Esta revision no implementa una emision nativa ni amplia accesos fiscales.
La cola historica de sincronizacion se conserva; no se borran registros pendientes.
El backend de aplicaciones antiguas no se ha modificado en esta revision.

## Clases y prioridades

Clases se retira de navegacion, accesos rapidos y resumen operativo en Android y
web. `/dashboard/clases` redirige al inicio. La pantalla historica queda conservada
en `LegacyClassesScreen.tsx`, fuera de la ruta activa. Las tablas, relaciones,
API e historial no se borran ni se alteran.

Los accesos de inicio web se seleccionan por rol y se filtran contra sus permisos:
alumno -> Examenes; instructor -> Vehiculos/bitacora si esta visible; recepcion ->
Alumnos y cobros; administracion -> operacion y finanzas; superadmin -> escuelas.
Contratos no es un acceso prioritario de inicio. Sigue en su menu autorizado.
No se ha implementado personalizacion manual por usuario; la prioridad es por rol.

## Limpieza visual

- Se elimina la presentacion inicial de fases de la APK; abre directamente login.
- Se mantienen Iniciar sesion, Crear cuenta, recuperacion de errores y enlaces legales.
- Se eliminan explicaciones internas de Supabase, etiquetas promocionales,
  descripciones repetidas de modulos y duplicados de encabezados.
- Se retiran En foco hoy, Notas de esta version, Formulario abierto/cerrado,
  etiquetas Solo online/Con offline repetidas y el estado Listo sin accion.
- Se conservan avisos relevantes: falta de conexion, datos guardados, sincronizacion,
  cambios pendientes, modo solo lectura y errores de carga/guardado.
- Cuenta usa un icono con nombre accesible; los enlaces legales son compactos.
- Colores claros y azul ConduSoft, encabezados compactos, tarjetas de radio 8.
- Controles principales de 48 o mas; sin desbordamiento horizontal en 320 px.
- No se muestra Sin registros durante la carga ni un resumen de Caja cero al fallar.

## Verificacion

- Web: 62 archivos, 596 pruebas aprobadas.
- Android: 10 archivos, 118 pruebas aprobadas.
- Lint sin advertencias; TypeScript Android aprobado; Next build aprobado, 103 paginas.
- Prueba SQL local con PGlite y la politica real de Horas: el instructor lee solo
  sus horas y no puede modificarlas. No hubo cambios en la base de produccion.
- Vista con componentes nativos reales sobre React Native Web y datos ficticios:
  filtros del instructor dia/mes/ano, roles alumno/recepcion/administracion,
  Crear cuenta y login, tamanos 320x740, 390x844 y 1280x720.
- Capturas en `output/playwright/android-*-2026-10-14.png`.

La vista local no es un emulador Android ni una prueba con cuentas reales. Falta
una prueba en dispositivo y generar la APK/AAB final cuando el usuario lo solicite.
No se hicieron cobros, facturas, altas reales, cierres ni despliegues en esta revision.

Vista de revision local: http://localhost:3022 (datos ficticios, sin escrituras).
