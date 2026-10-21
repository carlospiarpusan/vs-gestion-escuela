# Uso y costos de la base de datos — ConduSoft

**Estado posterior:** las optimizaciones se aplicaron el 20 de octubre de 2026. Ver [implementación y validaciones](./REDUCCION-USO-BASE-DATOS-2026-10-20.md). El contenido siguiente conserva la revisión previa.

Revisión del 20 de octubre de 2026, hora de Colombia. Se consultó producción en transacciones de solo lectura con límites de tiempo. No se modificaron registros, índices, políticas, funciones, plan ni tamaño de servidor.

## Conclusión

La prioridad es reducir trabajo repetido de consultas y permisos. El tamaño actual de la base es pequeño: 95.915.155 bytes, aproximadamente 95,9 MB o 91,5 MiB. Borrar información de alumnos o facturas aporta poco frente a optimizar estas lecturas y no forma parte de la propuesta.

Reducir consultas no equivale a reducir en igual proporción el cobro. [Supabase factura Compute por las horas que permanece activo el servidor](https://supabase.com/docs/guides/platform/manage-your-usage/compute), con independencia de la cantidad de consultas. La optimización permite sostener una instancia pequeña y reducir transferencia y sobreconsumos futuros. No se verificó el plan, el disco aprovisionado, el consumo mensual de transferencia ni la factura actual de la organización propietaria: la sesión disponible en el navegador pertenece a otra organización y no muestra este proyecto. Por tanto no se atribuye un ahorro mensual en dólares.

## Mediciones actuales

- Base PostgreSQL: 95,9 MB. Esto no es el tamaño total del disco aprovisionado ni incluye una estimación de WAL/backups.
- En la captura había 6 conexiones de clientes: 5 inactivas y 1 activa, correspondiente a la revisión. Límite configurado: 60. Es una captura puntual, no el pico del día.
- Cero deadlocks en las estadísticas disponibles; no se detectó saturación de conexiones en esa captura.
- Tablas mayores, incluidos sus índices: preguntas_examen 21,7 MB, ingresos 20,6 MB, gastos 10,7 MB, alumnos 9,4 MB y matriculas_alumno 3,8 MB.
- De los 35 índices más grandes inspeccionados, 37,4 MB pertenecen a índices con cero lecturas registradas. Muchos son índices de búsqueda de texto. Cero lecturas no prueba que sobren: algunos pueden ser recientes, útiles para búsquedas poco frecuentes o evitar un costo futuro. No se eliminó ninguno.

Las estadísticas de consultas se acumulan desde el 11 de febrero de 2026 y las estadísticas generales desde el 8 de diciembre de 2025. Mezclan versiones anteriores de la aplicación. Sus tiempos históricos y contadores no se presentan como consumo del día ni como costo mensual. Los contadores históricos de archivos temporales tampoco representan espacio ocupado actualmente.

## Prioridad 1: calcular el ámbito del usuario una vez por consulta

Las políticas existentes repiten llamadas sin argumentos como get_my_escuela_id(), get_my_sede_id(), is_admin_escuela() e is_super_admin(). Varias consultan perfiles y se evalúan al recorrer filas. Hay además políticas SELECT y ALL con condiciones superpuestas.

Una lectura real con el rol authenticated y un administrador de la empresa tardó 658,6 ms para contar 3.191 alumnos visibles. No se devolvieron datos personales.

Se realizó después un experimento independiente de solo lectura: aplicar explícitamente los predicados SELECT/ALL existentes y compararlos con las mismas condiciones envolviendo únicamente las funciones sin argumentos en subconsultas SELECT. Las políticas de producción no fueron alteradas.

| Tabla      | Predicado original | Predicado propuesto | Filas en ambas lecturas | Diferencias entre conjuntos de IDs |
| ---------- | -----------------: | ------------------: | ----------------------: | ---------------------------------: |
| Alumnos    |         101,963 ms |            1,213 ms |                   3.191 |                                  0 |
| Matrículas |         244,089 ms |            1,077 ms |                   2.942 |                                  0 |
| Gastos     |         166,877 ms |            0,706 ms |                   1.512 |                                  0 |

Estos tiempos corresponden al experimento SQL y a ese administrador, con caché de datos y planificación variable; no son tiempos completos de pantalla ni una mejora desplegada. El experimento se ejecutó con el rol de auditoría y predicados explícitos, por lo que no sustituye la verificación integral bajo RLS.

[Supabase documenta esta técnica para reutilizar el resultado de funciones independientes de cada fila durante una sentencia](https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select). Es la primera mejora recomendada. Antes de publicarla deben verificarse todos los roles, otras escuelas y sedes, alumnos, instructores, usuarios inactivos y accesos sin sesión, así como lecturas y escrituras. No debe cambiarse ninguna condición de acceso ni revivir permisos anónimos. No conviene marcar funciones IMMUTABLE: el ámbito depende del usuario.

## Prioridad 2: agrupar resúmenes y evitar recalcularlos al paginar

- src/app/api/gastos/route.ts ejecuta 10 consultas SQL en una carga sin caché para obtener totales, categorías, métodos, proveedores, tramitadores y vencimientos. Se puede devolver el mismo objeto con una consulta que reutilice el conjunto filtrado, o cargar solo las secciones visibles. Debe compararse el plan: agrupar no garantiza menor CPU si se repiten los escaneos internamente.
- src/app/api/ingresos/route.ts ejecuta 5 consultas por carga sin caché. Cuatro producen resúmenes que no dependen de la página de la tabla. La clave actual incluye page y pageSize: avanzar de página recalcula esos resúmenes. Separar la caché de resúmenes de la página permitiría pasar de 5 consultas a 1 por página adicional durante la vigencia del resumen. Es una reducción teórica del 80% de consultas en ese caso, pendiente de implementar y medir; no es el 80% de toda la base.
- Los reportes ya tienen caché de 120 segundos y los catálogos de 300 segundos. No hace falta agregar otra infraestructura de caché para empezar. La invalidación después de registrar, modificar o anular movimientos debe mantenerse para preservar saldos.

## Prioridad 3: buscar alumnos y matrículas cuando se necesiten

Al abrir el formulario de ingresos, loadIngresoCatalogs descarga todos los alumnos y todas las matrículas de la escuela en páginas de Supabase. La carga ya está diferida y cacheada, pero el primer uso y las renovaciones siguen transfiriendo todo el catálogo.

Propuesta: buscador paginado por nombre, documento o contrato; cargar las matrículas del alumno seleccionado. Conservar los registros históricos y la selección al editar. Esto reduce la transferencia con más claridad que reducir unos cuantos campos y evita hacer crecer la descarga inicial con cada matrícula nueva.

## Prioridad 4: ajustar índices con evidencia

Revisar los índices de texto más grandes y sus planes de búsqueda. No agregar más índices por defecto: también se mantienen al insertar y modificar. Retirar o reconstruir solo candidatos probados, sin tocar índices únicos de contratos, facturas o pagos ni los de claves y relaciones.

Con una base de este tamaño, esta tarea tiene menor prioridad para ahorrar dinero que las consultas repetidas. [El disco se cobra por capacidad aprovisionada, no por eliminar algunas filas](https://supabase.com/docs/guides/platform/manage-your-usage/disk-size); en gp3 de planes pagos se incluyen 8 GB. El tamaño y tipo de disco efectivamente contratado no se confirmaron.

## Qué conservar

- Documentos generados cuando se necesiten, originales en el correo y en Aulapp; sin copias adicionales de PDF/XML.
- Importación de correo diaria e incremental: la programación revisada no hace consultas cada minuto.
- Pool de conexiones y autorización antes de devolver datos cacheados.
- Totales exactos, reglas de facturación, números de contrato utilizados, historial y deduplicación de facturas.

## Cómo verificar el ahorro

1. Confirmar en Usage/Billing de la organización propietaria el plan, Compute, disco, transferencia de Database/Shared Pooler y complementos contratados.
2. Aplicar primero la optimización de permisos y medir las mismas operaciones bajo cada rol.
3. Separar y agrupar resúmenes, y reemplazar catálogos completos por búsquedas paginadas.
4. Comparar ventanas equivalentes de tráfico: número de consultas, tiempo acumulado SQL y bytes transferidos. No reiniciar estadísticas de producción para esta revisión.

[La transferencia se cobra por GB por encima de la cuota del plan](https://supabase.com/docs/guides/platform/manage-your-usage/egress), no por un contador aislado de consultas. Un ahorro de CPU puede mejorar tiempos y evitar ampliar la instancia aunque todavía no cambie el importe mensual.

Evidencia agregada sin identificadores personales ni claves: output/revision-base-datos/mediciones.json.
