# Banco CALE

Este directorio contiene el banco editorial del simulador CALE dividido en lotes de 100 preguntas.

## Estructura oficial tomada como referencia

- 40 preguntas por examen.
- 12 preguntas actitudinales.
- 28 preguntas de conocimiento.
- Distribucion de conocimiento:
  - Movilidad segura y sostenible: 10
  - Normas de transito: 6
  - Senalizacion vial e infraestructura: 6
  - El vehiculo: 6
- Tiempo maximo: 70 minutos.
- Aprobacion independiente:
  - 80% en conocimiento
  - 80% en actitudes

Fuente principal:
- Resolucion 20253040037125 de 2025 y Anexo 60.
- Manual de referencia para la conduccion de vehiculos de la ANSV.

## Distribucion editorial por lote de 100

- 30 actitudinales
- 25 de movilidad segura y sostenible
- 15 de normas de transito
- 15 de senalizacion vial e infraestructura
- 15 de vehiculo

## Regla de calidad

- Sin placeholders.
- Sin preguntas repetidas dentro del lote.
- Sin repetir el mismo `hecho_canonico_id` dentro del lote.
- Cada pregunta debe tener explicacion, fundamento y fuente.
- Cada pregunta de conocimiento debe guardar la letra correcta y el texto de la respuesta correcta.
- Cada pregunta actitudinal debe guardar una respuesta recomendada para entrenamiento.
- Las actitudinales pueden usar:
  - formato Likert oficial (`Muy en desacuerdo` a `Muy de acuerdo`)
  - formato de pregunta con opciones personalizadas y respuesta recomendada para entrenamiento
- **Evitar la doble negación**: Las preguntas actitudinales o de valoración de conductas NO deben formularse pidiendo evaluar afirmaciones negativas ("evalúe esta conducta: no debo iniciar un adelantamiento..."). Deben emplear descripciones directas o pedir la evaluación de escenarios positivos/neutrales para reducir la carga cognitiva (ej. "Evalúe la siguiente afirmación: '...'").

## Flujo de trabajo

1. Redactar un lote de 100.
2. Validarlo con `npm run validate:cale -- data/cale/lotes/lote-01.js`.
3. Ajustar ambiguedades y duplicados.
4. Continuar con el siguiente lote.
