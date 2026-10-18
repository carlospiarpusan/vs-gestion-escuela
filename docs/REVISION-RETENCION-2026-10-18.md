# Revision de documentos e informacion conservada

Fecha: 18 de octubre de 2026, America/Bogota.
Revision de codigo, archivos locales y consultas agregadas a la base configurada
de ConduSoft. Transacciones de solo lectura; no se extrajeron expedientes,
credenciales ni contenido de documentos. No se elimino ni modifico informacion.

## Hallazgos prioritarios

### 1. Borradores web sin vencimiento ni separacion por usuario

`src/hooks/useDraftForm.ts` escribe los formularios en localStorage sin fecha de
caducidad. Alumnos, matriculas, ingresos y gastos usan claves fijas como
`dashboard:alumnos:form`, sin usuario ni escuela. Los borradores pueden incluir
documento, contacto, perfil fiscal e importes; se retiran al guardar o al limpiar
explicitamente el borrador, no por antiguedad.

El cierre de sesion invalida la cache de recursos, pero no estos borradores de
localStorage. En un navegador compartido otra cuenta podria restaurar el
borrador anterior. Se recomienda separar el almacenamiento por cuenta/escuela,
definir una caducidad corta y ofrecer descarte explicito. No se inspecciono el
localStorage real del usuario ni se sabe cuantos borradores existen en cada equipo.

### 2. Android conserva historial offline sin limite temporal

`mobile/src/lib/offline.ts` conserva caches por alcance, comandos y estado de
sincronizacion en SQLite. Los comandos cambian de estado al sincronizarse, pero
no se purgan automaticamente. Se mantienen tambien tablas antiguas sin propietario
para recuperacion, expresamente sin leerlas ni reasignarlas a otras cuentas.
Salir invalida el acceso, no borra estas tablas.

La separacion por usuario impide compartirlos en la interfaz, pero no limita la
retencion en el dispositivo. La politica ya informa que SQLite no tiene cifrado
adicional. Conviene una limpieza controlada de caches obsoletas e historial
confirmado; nunca eliminar operaciones pendientes, fallidas o de resultado incierto
solo por antiguedad. No se accedio a telefonos reales ni se midio su SQLite.

### 3. Politica publicada y mecanismo de eliminacion no coinciden

`src/app/privacidad/page.tsx` anuncia conservacion de seis meses despues de cancelar
el servicio de una escuela y posterior eliminacion segura. No se encontro una
tarea de purga que aplique este plazo en el repositorio. Los dos crons de Vercel
configurados sincronizan correo y suscripciones, no purgan datos.

La base consultada no tiene `cron.job`, funciones publicas/privadas con nombres de
purga/retencion ni filas en `cumplimiento_retencion`. El esquema define 60 meses
como valor inicial, pero NO hay reglas efectivas cargadas; ese valor no constituye
una politica legal validada. No se puede descartar un procedimiento manual o un
proceso externo no representado en el proyecto.

Se recomienda acordar retencion por categoria, excepciones y responsable antes
de automatizarla o modificar la politica. Seis meses tras cancelar una escuela
no equivale a borrar todo alumno creado hace mas de seis meses.

## Inventario real de la base

Las tablas del esquema `public`, incluidos sus indices/TOAST, ocupan 72.40 MB.
No es el tamano total del servicio: excluye Auth, respaldos del proveedor y otros
esquemas. Supabase Storage contiene cero objetos en la base consultada.
No se audito el almacenamiento de FacturaX ni el de proveedores externos.

| Informacion                                 | Filas | Observacion                                               |
| ------------------------------------------- | ----: | --------------------------------------------------------- |
| Alumnos                                     |  3199 | 2793 creados hace mas de 180 dias; no implica inactividad |
| Matriculas                                  |  2948 | 2517 creadas hace mas de 180 dias                         |
| Ingresos                                    |  8209 | 7107 creados hace mas de 180 dias                         |
| Gastos                                      |  1476 | Hay movimientos fechados desde 2021                       |
| Horas de trabajo                            |  2711 | Fechas operativas desde enero de 2026                     |
| Ingresos diarios importados                 |   931 | Datos historicos; todos importados en marzo de 2026       |
| Nominas                                     |    30 | 24 creadas hace mas de 180 dias                           |
| Contratos emitidos heredados                |     2 | Creados en marzo de 2026                                  |
| Vinculos de facturas FacturaX               |    50 | Creados entre 13 y 17 de octubre de 2026                  |
| Registro de comandos moviles                |     3 | Payload/resultado persistente para evitar repeticion      |
| Actividad                                   |     2 | Creados en marzo de 2026, sin purga temporal detectada    |
| Claves / eventos de conexion FacturaX       | 2 / 3 | Hashes y trazabilidad; sin purga temporal                 |
| Importaciones / integraciones de correo     | 0 / 0 | Actualmente vacias                                        |
| Solicitudes ARCO                            |     0 | Sin solicitudes almacenadas actualmente                   |
| Matriz de retencion / registro de respaldos | 0 / 0 | No acredita ausencia de respaldos del proveedor           |

La fecha de creacion en la base no es la fecha del movimiento original.
No se clasifica como sobrante ningun registro financiero por superar 180 dias.
Eliminar registros de idempotencia sin diseno previo puede permitir que se repita
una operacion al reintentar un comando antiguo. El borrado de una conexion FacturaX
revoca y marca `deleted_at`; no destruye la fila ni su auditoria.

## Fechas historicas sospechosas

Los agregados muestran fechas de 1900 y 2223. Se contaron:

- 1 alumno y 2 matriculas con fecha de inscripcion anterior a 2000.
- 9 ingresos con fecha anterior a 2000.
- 1 ingreso diario importado con fecha posterior a manana, maxima 2223-03-02.

Es una anomalia de calidad de datos, posiblemente historica/de importacion;
el origen no quedo demostrado. Revisar contra el soporte original antes de
corregir, sin adivinar fechas ni borrar registros. Estos conteos pueden solaparse
entre alumnos, matriculas e ingresos relacionados.

## Archivos del Mac

| Grupo               |    Cantidad | Tamano logico | Antiguedad observada                  |
| ------------------- | ----------: | ------------: | ------------------------------------- |
| `output/android`    | 37 archivos |      93.68 MB | Ultima modificacion 29 sep. a 14 oct. |
| `.local-backups`    |  6 archivos |       1.74 MB | Modificados 16 oct.                   |
| `output/playwright` |  5 archivos |       0.20 MB | Modificados 16 oct.                   |
| `data`              | 12 archivos |       1.64 MB | Incluye material CALE de marzo        |

La fecha del archivo no prueba la fecha de los datos que contiene. Los respaldos
locales pueden contener configuracion privada y no deben compartirse. Los mayores
artefactos Android son un AAB anterior y bundletool; no son expedientes de alumnos.
No existe rotacion automatica de estos grupos. Su volumen no justifica eliminar
documentos contables o expedientes. Esta revision no borro archivos.

## Lo que ya tiene limite

- Cache del dashboard: vigencia habitual de 2 minutos para resumenes y 5 minutos
  para catalogos, limites de entradas y limpieza al invalidar la sesion.
  La expiracion impide reutilizar resultados viejos; no es una tarea permanente
  que borra el navegador cada minuto.
- Frecuencia de productos FacturaX: maximo 10000 identificadores y 500 solicitudes
  recordadas por usuario; sin clientes ni importes. No tiene TTL, pero su
  sensibilidad y volumen son menores que los de los borradores.
- Limites de API: limpieza oportunista de filas vencidas, con intervalo minimo
  de cinco minutos entre intentos por proceso. No garantiza purga sin trafico.

## Siguiente trabajo recomendado

Primero resolver borradores web y limpieza offline segura. Despues aprobar una
matriz de retencion que separe informacion academica, contable, laboral, fiscal,
seguridad y datos tecnicos; incorporar retenciones especiales y revision manual.
No aplicar una purga unica a contratos, nominas, pagos o facturas ni tratar
una solicitud ARCO como autorizacion automatica para destruir soportes.

No se validaron plazos legales de conservacion: requiere revision especifica de
las obligaciones aplicables. Tampoco se verificaron las politicas de backup de
Supabase, logs de Vercel, datos de Auth o archivos almacenados por FacturaX.

Evidencia agregada: `output/retention-audit-2026-10-18.json`.
Script de solo lectura: `output/retention-audit-2026-10-18.mjs`.
