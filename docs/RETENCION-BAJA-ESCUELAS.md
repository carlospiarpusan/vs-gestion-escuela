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

## Activacion en produccion (pendiente)

1. Revisar y aprobar el nuevo texto de privacidad y el criterio de baja definitiva.
2. Aplicar `supabase/migrations/20261018213152_school_cancellation_retention.sql`
   en la base de ConduSoft con el procedimiento de migracion habitual.
3. Verificar que `CRON_SECRET` este configurado en Vercel y desplegar el codigo.
4. Comprobar el registro del cron `/api/cron/retencion`: `0 12 * * *`,
   equivalente a las 07:00 de Bogota, y su siguiente ejecucion correcta.
5. Confirmar en Cumplimiento el ultimo control y las reglas por escuela.

No se asignan bajas retroactivas a escuelas existentes ni se deducen fechas
desde pagos. Registrar las bajas reales requiere soporte. El despliegue no
debe considerarse completo hasta aplicar la migracion y verificar el cron.

## Verificacion

Las pruebas ejecutan la migracion y el servicio con PostgreSQL local (PGlite),
incluyendo meses de distinta duracion, fechas de Bogota, duplicados,
reactivacion, conservacion justificada, transacciones y acceso denegado a los
roles cliente. Las pruebas de API verifican permisos, aislamiento por escuela
y autenticacion del cron. Las pruebas del formulario cubren confirmacion,
fechas nativas y conservacion de datos ante un fallo.

La comprobacion visual usa una escuela ficticia en un servidor temporal
sin conexion a produccion. No se crean bajas ni se eliminan datos reales.

Resultado local del 18 de octubre de 2026: 824 pruebas en 85 archivos,
lint sin advertencias y compilacion de produccion correcta (106 paginas).
Panel verificado en escritorio y a 390 x 844, sin desbordamiento horizontal.
