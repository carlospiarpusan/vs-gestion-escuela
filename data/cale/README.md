# Banco Oficial de Entrenamiento CALE — ANSV (500 Preguntas)

Este directorio contiene el banco editorial del simulador teórico **CALE (Centro de Apoyo Logístico de Evaluación)** de Colombia, estructurado en **5 lotes de 100 preguntas** (total: **500 preguntas**) bajo los lineamientos técnicos y normativos de la **Agencia Nacional de Seguridad Vial (ANSV)** y el **Ministerio de Transporte**.

## Estructura oficial del examen teórico CALE en Colombia

- **Total de preguntas por examen:** 40 preguntas de selección múltiple con única respuesta.
- **Tiempo máximo de presentación:** 70 minutos.
- **Criterio de aprobación independiente:**
  - **80 %** de acierto mínimo en el **Componente Actitudinal** (mínimo 10 de 12).
  - **80 %** de acierto mínimo en el **Componente de Conocimientos / Núcleos Temáticos** (mínimo 23 de 28).
- **Distribución oficial por examen de 40 preguntas (y su proporción en el banco de 500 preguntas):**
  1. **Actitudes:** 12 preguntas por examen (30 %) → **30 por lote / 150 en el banco**.
  2. **Movilidad segura y sostenible:** 10 preguntas por examen (25 %) → **25 por lote / 125 en el banco**.
  3. **Normas de tránsito:** 6 preguntas por examen (15 %) → **15 por lote / 75 en el banco**.
  4. **Señalización vial e infraestructura:** 6 preguntas por examen (15 %) → **15 por lote / 75 en el banco**.
  5. **El vehículo:** 6 preguntas por examen (15 %) → **15 por lote / 75 en el banco**.

## Marco normativo y técnico de referencia

- **Resolución 20253040037125 de 2025 y Anexo 60** del Ministerio de Transporte (Lineamientos operativos y técnicos de las pruebas teóricas y prácticas en los CALE).
- **Manual de Referencia para la Conducción de Vehículos** de la Agencia Nacional de Seguridad Vial (ANSV).
- **Ley 769 de 2002** (Código Nacional de Tránsito Terrestre) y sus reformas vigentes:
  - **Ley 2251 de 2022 ("Ley Julián Esteban"):** Límites de velocidad bajo enfoque de Sistema Seguro (50 km/h urbano, 30 km/h zonas escolares y residenciales, 90 km/h carreteras nacionales y departamentales, 120 km/h doble calzada sin pasos peatonales señalizada).
  - **Ley 1696 de 2013:** Grados de alcoholemia (Grado 0, 1, 2 y 3), sanciones administrativas, multas, suspensión/cancelación de licencia e inmovilización.
  - **Ley 1811 de 2016 ("Ley Pro-Bici"):** Distancia lateral mínima de 1,5 metros al adelantar ciclistas y uso de carril completo.
- **Manual de Señalización Vial de Colombia** (Resolución 20243040045005 de 2024 del Ministerio de Transporte).

## Reglas de calidad editorial

- Ortografía completa en español (tildes, eñes y signos de apertura `¿` y cierre `?`).
- Sin plantillas robóticas ni conjuntos de opciones genéricas repetidas.
- Cuatro opciones distintas, plausibles y específicas para el caso planteado en cada pregunta.
- Sin preguntas ni `hecho_canonico_id` repetidos dentro de un lote ni entre lotes.
- Cada pregunta cuenta con explicación pedagógica, fundamento legal específico y fuente trazable.

## Flujo de validación, exportación e importación

1. Validar un lote individual: `npm run validate:cale -- data/cale/lotes/lote-01.js`
2. Validar el banco completo (500 preguntas): `npm run validate:cale-bank`
3. Exportar el archivo JSON consolidado: `npm run export:cale`
4. Importar a Supabase / PostgreSQL: `npm run import:cale`
