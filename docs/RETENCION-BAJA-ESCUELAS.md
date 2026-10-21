# Retencion tras la baja de una escuela

## Alcance

La ventana de seis meses comienza con una **baja definitiva documentada**,
no con una suspension por falta de pago, la inactividad de un alumno ni la
antiguedad de sus registros. Se usan meses calendario y la fecha de Bogota.

Esta implementacion programa una revision de eliminacion. **No implementa
una purga automatica** ni autoriza destruir indiscriminadamente contratos,
facturas, pagos, nominas, evidencias academicas o datos sujetos a una reclamacion.
La politica web se ajusta para describir ese alcance, sin prometer un borrado
automatico inexistente. La eliminacion final y los plazos legales por categoria
requieren una decision documentada del responsable; siguen pendientes de definicion.

## Funcionamiento

- En Cumplimiento > Retencion, el superadministrador registra fecha, soporte y
  confirmacion de baja, solo si la escuela esta inactiva.
- Los administradores de escuela pueden consultar exclusivamente su escuela.
- El cron diario abre la revision al vencer los seis meses. No borra datos.
- Toda conservacion adicional exige motivo y proxima revision, como maximo
  dentro de un ano. No elimina el vencimiento original de seis meses.
- Al expirar una conservacion, se vuelve a revision pendiente o al plazo
  original si todavia no ha vencido. Reactivar la escuela retira la baja abierta.
- El historial registra las decisiones y transiciones. Repetir el cron no
  duplica los casos ni los eventos de vencimiento.

La migracion carga las siete categorias de reglas que faltaban. Conserva las
reglas existentes. Las categorias sujetas a revision legal tienen plazo nulo,
no cero meses ni un numero de anos inventado. Las nuevas escuelas reciben las
reglas que falten durante el siguiente control diario.

## Activacion en produccion

Activado el 18 de octubre de 2026, con autorizacion expresa del responsable:

- Migracion `20261018213152_school_cancellation_retention.sql` aplicada en
  ConduSoft y registrada en `public._migraciones`.
- 154 reglas cargadas para 22 escuelas, respetando las categorias enumeradas
  reales: alumnos, instructores, administrativos, contratos, examenes, finanzas
  y solicitudes ARCO. La migracion tambien admite las categorias de texto de
  instalaciones antiguas, sin alterar sus tipos ni sobreescribir reglas existentes.
- Tablas nuevas con RLS, sin acceso directo de `anon` ni `authenticated`.
  La funcion interna tampoco permite ejecucion de esos roles.
- Entorno de produccion con `CRON_SECRET` y deployment principal
  `dpl_66DgG8e6zmXApqAqJXGb7z95w7Qe` en estado `READY`, asociado a condusoft.co.
- API de Vercel confirma habilitado `/api/cron/retencion`: `0 12 * * *`,
  equivalente a las 07:00 de Bogota, para ese deployment.
- Primer control del servicio ejecutado manualmente y persistido:
  `2026-10-19T03:33:18.744Z` (18 de octubre, 22:33 de Bogota), con cero
  bajas pendientes y cero eliminaciones. La primera ejecucion programada
  de Vercel todavia no se ha observado.
- Politica de privacidad publicada y comprobada en el navegador.

No se asignan bajas retroactivas a escuelas existentes ni se deducen fechas
desde pagos. Registrar las bajas reales requiere soporte. No se crearon
bajas de prueba ni se modificaron los datos operativos existentes.

## Verificacion

Las pruebas ejecutan la migracion y el servicio con PostgreSQL local (PGlite),
incluyendo meses de distinta duracion, fechas de Bogota, duplicados,
reactivacion, conservacion justificada, transacciones y acceso denegado a los
roles cliente. Las pruebas de API verifican permisos, aislamiento por escuela
y autenticacion del cron. Las pruebas del formulario cubren confirmacion,
fechas nativas y conservacion de datos ante un fallo.

La comprobacion visual usa una escuela ficticia en un servidor temporal
sin conexion a produccion. No se crean bajas ni se eliminan datos reales.

Resultado final: 834 pruebas en 87 archivos con dos procesos simultaneos,
sin ampliar los tiempos de espera ni cambiar las aserciones. La ejecucion
con mayor concurrencia tuvo cuatro fallos por timeout; al repetir con
concurrencia acotada pasaron todas las pruebas. Lint correcto y compilacion
de produccion en Vercel correcta (107 paginas).
Panel verificado en escritorio y a 390 x 844, sin desbordamiento horizontal.

Se verificaron sin cambios los conteos de 3199 alumnos, 2948 matriculas,
8209 ingresos, 1476 gastos y 30 nominas antes y despues de la migracion.
