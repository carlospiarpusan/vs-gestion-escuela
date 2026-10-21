# Optimización y limpieza — 19/10/2026

## Cambios

- Se comprobaron las referencias e importaciones desde las páginas y API antes
  de eliminar cuatro módulos sin consumidores: `DashboardSchoolSwitcher`,
  `ListState`, el botón genérico de UI y el antiguo cálculo de ingresos diarios.
  El selector de escuela y los informes actuales siguen utilizando sus
  implementaciones activas.
- Se eliminaron cinco SVG de la plantilla inicial, sin referencias. Se conservan
  los logotipos y las imágenes de contratos utilizadas.
- Se retiraron 11 dependencias directas y 173 paquetes del árbol instalado:
  editores Tiptap, formularios React Hook Form, Zustand, sanitize-html y sus
  tipos, Radix, class-variance-authority y Recharts. No se cambió la versión de
  ningún paquete conservado. Las dependencias propias de Android permanecen
  independientes en `mobile/package.json`.
- El único gráfico Recharts se sustituyó por SVG, con dimensiones adaptables,
  valores COP, interacción con ratón, teclado y toque, estado vacío y soporte
  para ajustes negativos. Sigue cargándose cuando se aproxima a la vista.
  Los observadores de tamaño e intersección se liberan al desmontar.
- Inicio, Escuelas y Analíticas dejan de calcular estadísticas del módulo
  Clases retirado: se eliminan cinco lecturas de esa tabla de los resúmenes,
  agregaciones y uniones innecesarias. El ranking de escuelas utiliza alumnos
  activos e ingresos, con desempate estable. Se conservan los filtros de escuela
  y sede. También se retiran los indicadores y promesas de Clases de la interfaz
  y del sitio público.
- Escuelas y Analíticas reutilizan los formateadores monetarios y numéricos,
  sin construir un `Intl.NumberFormat` por cada celda.
- Se limpió la caché local regenerable con `npm run clean:local -- --apply`.
  El script existente conserva fuentes, credenciales, dependencias instaladas,
  claves de firma y archivos necesarios para ejecutar la compilación.

## Medición de artefactos de producción

| Medida                                     |         Antes |       Después |
| ------------------------------------------ | ------------: | ------------: |
| Dependencias directas de la web            |            29 |            18 |
| Paquetes en el lockfile                    |           905 |           732 |
| Tamaño del lockfile                        | 491.154 bytes | 376.889 bytes |
| JavaScript diferido del gráfico            | 351.783 bytes |   2.946 bytes |
| JavaScript del gráfico comprimido con gzip | 105.298 bytes |   1.457 bytes |

La reducción del gráfico es de aproximadamente 99,2 % sin comprimir y 98,6 %
con gzip. Son tamaños del código generado por la compilación local; no son una
medición de tiempos de carga o Core Web Vitals en dispositivos de clientes.
Evidencia local: `output/optimization/measurements.json`.

## Validación

- 921 pruebas correctas en 98 archivos.
- Consultas reales de los tres resúmenes ejecutadas contra PostgreSQL aislado
  (PGlite), sin crear una tabla `clases`: importes, exámenes pendientes, alumnos,
  escuelas, alcance por sede y rechazo antes de consultar sin autenticación.
- Gráfico comprobado con datos ficticios en escritorio, ancho móvil, modo
  oscuro, un solo ingreso, ausencia de ingresos y ajustes negativos. Selección
  accesible del día y valor exacto COP. Captura:
  `output/optimization/chart-verified.png`.
- TypeScript, lint sin advertencias y compilación de producción correctos.
- `npm audit --omit=dev`: cero vulnerabilidades notificadas en producción.

No se borraron registros, tablas ni migraciones. Las rutas históricas de Clases
y la compatibilidad de clientes antiguos se mantienen para no romper enlaces
ni operaciones pendientes. No se modificaron reglas de acceso, contratos
legales ni la cola offline de Android.

## Publicación

Publicado en producción el 19/10/2026, con estado **Ready** confirmado mediante
Vercel y alias `condusoft.co` y `www.condusoft.co`.

- Despliegue: `dpl_2eUJHeu1Gr7k6FEdkYY7g69gXZjS`.
- Versión: `https://vs-gestion-escuela-pq24f1bbv-carlos-piarpusans-projects.vercel.app`.
- Se comprobó en navegador la portada publicada con los textos actualizados y
  la navegación desde «Iniciar Sesión» hasta el formulario de acceso. No se
  registraron errores de consola. No se crearon cuentas ni operaciones reales
  para validar esta limpieza.
