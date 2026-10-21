# Reducción del uso de base de datos — 20 de octubre de 2026

## Cambios aplicados

### Permisos de lectura

Migración: 20261021012459_cache_rls_identity_per_statement.sql, registrada en public.\_migraciones y aplicada a producción. Reescribe 72 políticas SELECT para resolver las funciones de identidad y ámbito mediante subconsultas escalares reutilizables dentro de cada sentencia. No añade permisos, cambia roles, elimina condiciones ni modifica funciones o sus privilegios. Todas las políticas ALL, INSERT, UPDATE y DELETE conservan sus expresiones originales.

Esta separación es deliberada: las pruebas detectaron que, al eliminar el propio perfil, las funciones de ámbito pueden cambiar durante esa misma escritura. Reutilizarlas en las políticas ALL alteraba qué otras filas se podían eliminar. Esa variante se descartó antes de aplicar cambios en producción. Las políticas de escritura originales preservan ese comportamiento; las lecturas evitan buena parte del trabajo repetido.

En la prevalidación transaccional con el rol authenticated, sobre la misma escuela:

| Lectura    |      Antes | Con la migración | Filas antes/después |
| ---------- | ---------: | ---------------: | ------------------: |
| Alumnos    | 604,663 ms |        53,568 ms |       3.191 / 3.191 |
| Matrículas | 515,209 ms |        49,075 ms |       2.942 / 2.942 |
| Gastos     | 239,040 ms |        24,997 ms |       1.512 / 1.512 |

Las mediciones varían con caché, planificación y carga: en una comprobación posterior a la confirmación se midieron 250,829, 225,321 y 125,120 ms, respectivamente. No se promete un porcentaje fijo ni equivalencia con tiempos completos de pantalla. Las políticas ALL originales siguen evaluando sus condiciones como antes.

### Resúmenes financieros

- Gastos agrupa sus 10 consultas de resumen en una sentencia SQL. El conjunto filtrado se materializa y reutiliza para totales, categorías, métodos, proveedores, tramitadores y vencimientos. Se conserva el objeto JSON de respuesta, filtros, orden y valores.
- Ingresos pasa de 5 a 2 consultas en la primera carga sin caché: una para el resumen agrupado y otra para las filas de la tabla. El resumen tiene una clave independiente de page/pageSize, con fechas resueltas y separación por rol, escuela y sede. Una página nueva requiere solo la consulta de filas mientras siga vigente ese resumen. Una página ya cacheada puede no requerir ninguna.
- Se mantienen los 120 segundos de vigencia, el acceso a datos frescos y la invalidación posterior a movimientos. El conjunto de filas del libro no se materializa innecesariamente, para conservar la optimización de sus límites y paginación.
- Se compararon seis respuestas reales de solo lectura contra la versión anterior, incluyendo filtros, cuentas pendientes, tramitadores y búsqueda por monto. Coincidieron íntegramente, excluyendo únicamente generatedAt. No se emitieron facturas ni se registraron movimientos reales.

Se revisaron también los planes con EXPLAIN ANALYZE y buffers, no solamente el número de peticiones. Por ejemplo, Gastos sin filtros pasó de 64 a 8 bloques compartidos consultados y los resúmenes/libro de Ingresos de 3.217 a 1.782 en esa captura. Las mediciones SQL y sus variaciones están en los archivos de evidencia; una menor cantidad de consultas no se presenta como el mismo porcentaje de ahorro de CPU o dinero.

### Búsqueda de alumnos bajo demanda

- Endpoint autorizado /api/alumnos/opciones: búsqueda por nombre completo, documento o contrato; 20 resultados por página y una fila adicional interna para detectar si existe otra página, sin contar el catálogo completo.
- Solo se consultan las matrículas del alumno seleccionado. Se conservan matrículas históricas y selecciones al editar o restaurar el borrador. Una matrícula única se selecciona automáticamente, como antes.
- El filtro de Ingresos usa también este buscador; ya no depende de abrir primero el formulario para disponer de alumnos.
- Peticiones tras dos caracteres, espera de 250 ms y caché existente separada por usuario, rol, escuela y sede. Se ignoran respuestas de búsquedas o ámbitos anteriores.
- Selección por teclado, Escape, paginación, indicador de carga y eliminación explícita de la selección. Guardar espera a que se resuelvan el alumno y sus matrículas; un error de lectura no permite guardar accidentalmente con información incompleta.
- Se mantienen límites y autorización en el servidor, sin confiar en el ámbito que envíe el navegador. Las respuestas HTTP de este endpoint usan no-store; la caché de recursos autorizados conserva la separación por cuenta.

### Índices

Se reconstruyeron CONCURRENTLY tres índices GIN de preguntas_examen, conservando sus nombres, definiciones y función de búsqueda:

| Índice                                | Antes, bytes | Después, bytes |
| ------------------------------------- | -----------: | -------------: |
| preguntas_examen_pregunta_trgm_idx    |    5.939.200 |        688.128 |
| preguntas_examen_explicacion_trgm_idx |    5.881.856 |        729.088 |
| preguntas_examen_fundamento_trgm_idx  |    5.054.464 |        442.368 |

Reducción conjunta: 15.015.936 bytes, aproximadamente 15 MB. Se verificó que estén listos y válidos. No se eliminaron índices únicos ni de relaciones. Los otros candidatos sin lecturas registradas se conservan: ese contador por sí solo no demuestra que no sirvan.

La base PostgreSQL pasó de aproximadamente 95,9 a 80,9 MB en las capturas. Este tamaño no representa el disco aprovisionado completo.

## Validación

- Web: 1.153 pruebas en 114 archivos correctas.
- Versión aislada de publicación: 107 pruebas pertinentes correctas.
- Android: 157 pruebas en 14 archivos y comprobación de tipos correctas.
- SQL aislado: 576 comparaciones de rol/tabla/operación antes y después, cubriendo lectura, inserción, actualización y eliminación; otras escuelas/sedes, identidades sin vinculación, perfiles inactivos, repetición de la migración y separación entre usuarios de la misma conexión. Se mantuvo el rechazo de acceso anónimo.
- Producción: 20 combinaciones reales de rol/tabla conservaron exactamente los conjuntos de identificadores visibles antes de confirmar la migración.
- Verificación posterior: migración registrada, políticas de escritura sin cambios, cero tablas públicas sin RLS y cero índices inválidos en preguntas_examen.
- Supabase Advisors de seguridad: ningún hallazgo de nivel ERROR. Esta consulta no implica ausencia de advertencias anteriores.
- TypeScript, ESLint y compilación de producción correctos.
- Navegador con respuestas sintéticas: búsqueda, selección por teclado, matrícula única, cierre/reapertura del borrador, escritorio y móvil de 390 px sin desbordamiento horizontal ni errores en consola. No había una sesión administrativa en el navegador para hacer modificaciones reales de producción.

Evidencias: output/reduccion-base-datos/. Contienen mediciones agregadas y capturas sintéticas, sin claves ni datos de facturas reales.

## Alcance económico y de datos

No se cambiaron el plan ni el tamaño de servidor contratado. Supabase cobra Compute por horas de instancia y la transferencia por uso por encima de la cuota; optimizar consultas no garantiza una rebaja proporcional del cargo fijo. El ahorro económico exacto requiere el desglose de la organización propietaria, que no está disponible en la sesión web actual.

Se conservan los documentos generados cuando se necesiten, los originales del correo y Aulapp, los movimientos, saldos, contratos utilizados y la deduplicación. No se añadió almacenamiento externo ni otra copia de PDF/XML.

Referencias: [RLS e initPlans](https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select), [REINDEX CONCURRENTLY](https://www.postgresql.org/docs/current/sql-reindex.html), [cobro de Compute](https://supabase.com/docs/guides/platform/manage-your-usage/compute).

## Publicación

Base de la aplicación: dpl_56YEZ1FkwvEKfDY5uMtKuHFid7bE. Se verificaron por SHA-1 los 477 archivos de esa fuente y se superpusieron únicamente los 12 archivos de esta implementación; las migraciones y pruebas SQL se conservan en el proyecto, excluidas del despliegue web por la configuración existente.

Aplicación publicada: `dpl_GM4WjcgH1VVPCwKw2aBMtBvNxvcp`, estado READY. Se verificó que condusoft.co y www.condusoft.co apuntan a esa versión. El nuevo endpoint de opciones rechaza solicitudes sin sesión y /dashboard/ingresos redirige al inicio de sesión.
