/* eslint-disable @typescript-eslint/no-require-imports */

const {
  createAttitudeQuestion: att,
  createKnowledgeQuestion: know,
  SOURCES,
} = require("../schema");

const LOTE = "lote-01";

module.exports = {
  lote: LOTE,
  version: 2,
  descripcion:
    "Primer lote oficial CALE - ANSV con 100 preguntas rigurosas sobre Sistema Seguro, Límites Ley 2251, Alcoholemia Ley 1696, Señales Reglamentarias y Frenos/Neumáticos.",
  items: [
    // Actitudes (30)
    att({
      id: "cale-l01-001",
      lote: LOTE,
      subtema: "sistema seguro y vision cero",
      hecho_canonico_id: "l01-att-01",
      pregunta:
        "¿Qué actitud debe asumir un conductor comprometido con el enfoque de Visión Cero frente a los errores de los demás actores viales?",
      sentido_clave: "seleccion",
      opcion_a:
        "Anticipar posibles equivocaciones ajenas y reducir la velocidad para evitar que un error humano termine en una tragedia",
      opcion_b: "Hacer valer su derecho de vía acelerando para que el infractor aprenda la lección",
      opcion_c:
        "Confiar plenamente en que los demás respetarán las normas porque cada quien responde por sus actos",
      opcion_d:
        "Utilizar la bocina de forma continua para reprender públicamente a quien comete una imprudencia",
      respuesta_recomendada: "a",
      explicacion:
        "Bajo el enfoque de Sistema Seguro y Visión Cero adoptado en Colombia, el sistema de tránsito debe perdonar el error humano; los conductores deben conducir a la defensiva para evitar siniestros graves aun ante fallas ajenas.",
      fundamento_legal:
        "Plan Nacional de Seguridad Vial (Decreto 1430 de 2022); Manual de Referencia ANSV.",
      source: SOURCES.RESOLUCION_CALE,
      dificultad: "media",
    }),
    att({
      id: "cale-l01-002",
      lote: LOTE,
      subtema: "paso peatonal no semaforizado",
      hecho_canonico_id: "l01-att-02",
      pregunta:
        "¿Cuál es la conducta adecuada al aproximarse a un paso de cebra donde un peatón está esperando para cruzar?",
      sentido_clave: "seleccion",
      opcion_a: "Acelerar para cruzar antes de que el peatón baje a la calzada",
      opcion_b:
        "Reducir la velocidad gradualmente y detenerse antes de la línea para cederle el paso seguro",
      opcion_c: "Pasar tocando la bocina para indicarle que espere el turno",
      opcion_d: "Hacer cambio de luces para obligar al peatón a correr hacia la acera de enfrente",
      respuesta_recomendada: "b",
      explicacion:
        "Los peatones son los usuarios más vulnerables de la vía y tienen prelación en los pasos peatonales demarcados. Detenerse con suavidad garantiza su cruce seguro sin riesgo de colisión por alcance.",
      fundamento_legal: "Ley 769 de 2002, Art. 63 y Art. 105; Manual de Referencia ANSV.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    att({
      id: "cale-l01-003",
      lote: LOTE,
      subtema: "mitos sobre el alcohol",
      hecho_canonico_id: "l01-att-03",
      pregunta:
        "¿Qué valoración debe hacer un conductor responsable frente a la creencia de que un café cargado o una ducha fría eliminan los efectos del alcohol?",
      sentido_clave: "seleccion",
      opcion_a:
        "Aceptar que una ducha fría restablece de inmediato la agudeza visual y la coordinación motriz",
      opcion_b:
        "Confiar en que el café acelera la eliminación del alcohol en la sangre a la mitad del tiempo normal",
      opcion_c:
        "Reconocer que son mitos falsos, ya que únicamente el paso del tiempo y el metabolismo hepático eliminan el alcohol del organismo",
      opcion_d:
        "Asumir que mientras la persona no se sienta ebria, puede conducir con seguridad tras tomar agua",
      respuesta_recomendada: "c",
      explicacion:
        "El café, los baños fríos o el ejercicio no disminuyen la alcoholemia ni restablecen los reflejos; solo el metabolismo del hígado elimina el alcohol a un ritmo biológico constante.",
      fundamento_legal:
        "Ley 1696 de 2013; Manual de Referencia ANSV sobre factores de riesgo humano.",
      source: SOURCES.LEY_1696,
      dificultad: "facil",
    }),
    att({
      id: "cale-l01-004",
      lote: LOTE,
      subtema: "tolerancia cero al alcohol",
      hecho_canonico_id: "l01-att-04",
      pregunta:
        "Si asiste a una reunión social y consume una cerveza o copa de vino, ¿cuál es la decisión más segura respecto al vehículo?",
      sentido_clave: "seleccion",
      opcion_a: "Conducir despacio por rutas secundarias para evitar operativos de tránsito",
      opcion_b:
        "Esperar media hora después del último trago para que el cuerpo absorba la bebida y luego manejar",
      opcion_c: "Conducir acompañado de alguien que vigile si se desvía del carril",
      opcion_d:
        "No conducir bajo ninguna circunstancia y utilizar transporte público, taxi o conductor elegido",
      respuesta_recomendada: "d",
      explicacion:
        "En Colombia rige la política de tolerancia cero frente al alcohol al volante. Incluso concentraciones mínimas alteran el juicio y el tiempo de reacción, además de generar severas sanciones legales.",
      fundamento_legal: "Ley 1696 de 2013; Ley 769 de 2002, Art. 152.",
      source: SOURCES.LEY_1696,
      dificultad: "facil",
    }),
    att({
      id: "cale-l01-005",
      lote: LOTE,
      subtema: "gestion del tiempo y afan",
      hecho_canonico_id: "l01-att-05",
      pregunta:
        "Si sale con retraso a una cita médica o compromiso laboral, ¿qué actitud debe guiar su conducción?",
      sentido_clave: "seleccion",
      opcion_a:
        "Asumir el retraso con calma, priorizando la seguridad y respetando en todo momento los límites de velocidad y señales",
      opcion_b: "Aumentar la velocidad en avenidas principales para recuperar los minutos perdidos",
      opcion_c: "Aprovechar los semáforos en amarillo para cruzar antes de que pasen a rojo",
      opcion_d:
        "Cambiar de carril de manera constante buscando los espacios más despejados del tráfico",
      respuesta_recomendada: "a",
      explicacion:
        "La prisa es uno de los mayores factores de riesgo vial, pues genera estrés, reduce la atención y empuja a maniobras temerarias. Salvar unos minutos jamás justifica arriesgar la vida.",
      fundamento_legal:
        "Manual de Referencia ANSV sobre autorregulación y gestión de la velocidad.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    att({
      id: "cale-l01-006",
      lote: LOTE,
      subtema: "zona escolar despejada",
      hecho_canonico_id: "l01-att-06",
      pregunta:
        "Al transitar por una zona escolar un día hábil donde no se ven estudiantes en la acera, ¿qué debe hacer?",
      sentido_clave: "seleccion",
      opcion_a:
        "Mantener la velocidad urbana habitual de 50 km/h porque la vía se observa despejada",
      opcion_b:
        "Respetar estrictamente el límite de 30 km/h, anticipando que un niño puede salir corriendo de forma imprevista",
      opcion_c: "Acelerar para superar el tramo escolar lo más rápido posible",
      opcion_d: "Tocar la bocina en cada esquina para advertir que transita a velocidad libre",
      respuesta_recomendada: "b",
      explicacion:
        "En zonas escolares y residenciales la velocidad máxima legal es de 30 km/h debido a que los menores tienen menor percepción del peligro y pueden irrumpir sorpresivamente en la calzada.",
      fundamento_legal: "Ley 769 de 2002, Art. 106 (modificado por Ley 2251 de 2022).",
      source: SOURCES.LEY_769,
      dificultad: "media",
    }),
    att({
      id: "cale-l01-007",
      lote: LOTE,
      subtema: "ciclista en carril completo",
      hecho_canonico_id: "l01-att-07",
      pregunta:
        "En una vía urbana estrecha, un ciclista ocupa el centro del carril impidiéndole adelantar de inmediato. ¿Cómo debe reaccionar?",
      sentido_clave: "seleccion",
      opcion_a:
        "Acosar al ciclista con el pito y pegarse a su rueda trasera para obligarlo a subir a la acera",
      opcion_b: "Intentar rebasarlo raspando el lateral derecho para no perder tiempo",
      opcion_c:
        "Mantener la distancia de seguridad detrás de él con paciencia hasta encontrar un tramo ancho con visibilidad donde rebasarlo dejando 1,5 metros",
      opcion_d: "Gritarle al ciclista que la calzada es exclusiva para vehículos automotores",
      respuesta_recomendada: "c",
      explicacion:
        "La ley faculta al ciclista a ocupar un carril completo por su propia seguridad, para evitar que abran puertas de autos estacionados o lo cierren. El adelantamiento debe esperar a un tramo seguro con 1,5 m de separación.",
      fundamento_legal: "Ley 1811 de 2016, Art. 10; Ley 769 de 2002, Art. 60.",
      source: SOURCES.LEY_769,
      dificultad: "media",
    }),
    att({
      id: "cale-l01-008",
      lote: LOTE,
      subtema: "manejo de la ira y agresividad",
      hecho_canonico_id: "l01-att-08",
      pregunta:
        "Si otro conductor le pita con insistencia de forma grosera y le hace gestos ofensivos, ¿cuál es la conducta más madura y segura?",
      sentido_clave: "seleccion",
      opcion_a: "Frenar en seco delante de él para darle un susto",
      opcion_b: "Cerrarle el paso en la siguiente esquina para confrontarlo",
      opcion_c: "Bajar el vidrio y devolver los insultos para no dejarse intimidar",
      opcion_d:
        "Ignorar la provocación, mantener la calma, respirar hondo y continuar concentrado en su propio manejo seguro",
      respuesta_recomendada: "d",
      explicacion:
        "La violencia vial multiplica exponencialmente el riesgo de siniestros y enfrentamientos físicos. La autorregulación emocional y el desescalamiento son habilidades indispensables de un conductor seguro.",
      fundamento_legal: "Manual de Referencia ANSV sobre factores humanos y convivencia ciudadana.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    att({
      id: "cale-l01-009",
      lote: LOTE,
      subtema: "celular en semaforo rojo",
      hecho_canonico_id: "l01-att-09",
      pregunta:
        "¿Qué valoración merece revisar mensajes en el teléfono celular mientras se espera el cambio de luz en un semáforo en rojo?",
      sentido_clave: "seleccion",
      opcion_a:
        "Es una conducta incorrecta y riesgosa, pues distrae la atención mental y desconecta al conductor de lo que sucede en el entorno",
      opcion_b: "Es seguro porque el vehículo está inmóvil y no hay riesgo de choque frontal",
      opcion_c: "Es totalmente recomendable para aprovechar los tiempos muertos del tráfico",
      opcion_d: "Solo es indebido si el semáforo tiene cámara de fotomulta visible",
      respuesta_recomendada: "a",
      explicacion:
        "El uso del teléfono celular genera distracción cognitiva y visual que persiste varios segundos después de soltarlo, impidiendo advertir peatones, motos o cambios de fase semafórica.",
      fundamento_legal: "Ley 769 de 2002, Art. 131, infracción C.38; Manual ANSV.",
      source: SOURCES.LEY_769,
      dificultad: "media",
    }),
    att({
      id: "cale-l01-010",
      lote: LOTE,
      subtema: "sintomas iniciales de fatiga",
      hecho_canonico_id: "l01-att-10",
      pregunta:
        "Si en carretera siente pesadez en los párpados, bosteza con frecuencia y tiene dificultad para mantener la trayectoria recta, ¿qué debe hacer?",
      sentido_clave: "seleccion",
      opcion_a:
        "Encender la radio a alto volumen y abrir la ventana para que el aire frío lo despierte",
      opcion_b:
        "Detenerse en un lugar seguro y autorizado para descansar o dormir una siesta de al menos 20 minutos",
      opcion_c:
        "Tomar una bebida con cafeína y aumentar la velocidad para llegar antes de dormirse",
      opcion_d:
        "Seguir conduciendo fijando la mirada fijamente en las luces traseras del carro de adelante",
      respuesta_recomendada: "b",
      explicacion:
        "El bostezo frecuente y la dificultad para conservar el carril son alertas críticas de fatiga y microsueño inminente. El único remedio eficaz contra el sueño es detener la marcha y dormir.",
      fundamento_legal: "Manual de Referencia ANSV sobre fatiga y conducción preventiva.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    att({
      id: "cale-l01-011",
      lote: LOTE,
      subtema: "cinturon en asiento trasero",
      hecho_canonico_id: "l01-att-11",
      pregunta:
        "En un recorrido urbano corto de solo cinco cuadras, un pasajero del asiento trasero no desea colocarse el cinturón. ¿Cuál debe ser su postura?",
      sentido_clave: "seleccion",
      opcion_a:
        "Permitírselo, ya que la corta distancia y la baja velocidad hacen imposible una lesión grave",
      opcion_b: "Aceptar su decisión si es un familiar mayor que se siente incómodo",
      opcion_c:
        "Exigirle amablemente que se lo abroche antes de iniciar la marcha, recordando que protege su vida y la de quienes van adelante",
      opcion_d: "Pedirle que solo se sostenga firmemente de la manija del techo",
      respuesta_recomendada: "c",
      explicacion:
        "El uso del cinturón es obligatorio en todos los asientos. En una colisión a 40 km/h, un pasajero trasero sin cinturón es proyectado hacia adelante con una fuerza equivalente a varias toneladas, aplastando a los ocupantes delanteros.",
      fundamento_legal:
        "Ley 769 de 2002, Art. 82; Manual de Referencia ANSV sobre seguridad pasiva.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    att({
      id: "cale-l01-012",
      lote: LOTE,
      subtema: "actor vial con discapacidad visual",
      hecho_canonico_id: "l01-att-12",
      pregunta:
        "¿Qué actitud debe adoptar al observar a una persona con bastón blanco intentando cruzar la calle?",
      sentido_clave: "seleccion",
      opcion_a: "Acelerar para desocupar la vía y dejarle toda la calzada libre después",
      opcion_b: "Tocar dos pitazos cortos para hacerle saber que un vehículo se acerca",
      opcion_c: "Pasar despacio por su espalda para no interrumpir su desplazamiento",
      opcion_d:
        "Detener completamente el vehículo a una distancia prudente, darle prelación absoluta y evitar tocar la bocina para no desorientarlo",
      respuesta_recomendada: "d",
      explicacion:
        "Las personas con discapacidad visual se guían por el sonido del entorno. Tocar la bocina las desorienta y asusta; se debe detener el vehículo totalmente brindando prelación absoluta con paciencia y respeto.",
      fundamento_legal: "Ley 769 de 2002, Art. 58 y Art. 105; Manual de Referencia ANSV.",
      source: SOURCES.LEY_769,
      dificultad: "media",
    }),
    att({
      id: "cale-l01-013",
      lote: LOTE,
      subtema: "adelantamiento por la berma",
      hecho_canonico_id: "l01-att-13",
      pregunta:
        "Ante una congestión vehicular severa en carretera, ¿qué conducta refleja un compromiso real con la seguridad vial?",
      sentido_clave: "seleccion",
      opcion_a:
        "Permanecer en su carril correspondiente sin invadir la berma, dejando ese espacio libre para peatones o vehículos de emergencia",
      opcion_b: "Usar la berma para avanzar si el vehículo tiene tracción en las cuatro ruedas",
      opcion_c:
        "Seguir a una ambulancia que transita por la berma para salir más rápido del trancón",
      opcion_d: "Ocupar la berma y la mitad del carril para impedir que otros carros pasen",
      respuesta_recomendada: "a",
      explicacion:
        "La berma es una zona de seguridad exclusiva para detenciones de emergencia y peatones. Transitar por ella es una infracción grave (D.06) que genera siniestros mortales y bloquea a las ambulancias.",
      fundamento_legal: "Ley 769 de 2002, Art. 73 y Art. 131, infracción D.06.",
      source: SOURCES.LEY_769,
      dificultad: "media",
    }),
    att({
      id: "cale-l01-014",
      lote: LOTE,
      subtema: "empatia con conductor novato",
      hecho_canonico_id: "l01-att-14",
      pregunta:
        "Si en una pendiente se le apaga el motor al vehículo de enseñanza que va adelante suyo, ¿cómo debe actuar?",
      sentido_clave: "seleccion",
      opcion_a: "Presionarlo inmediatamente con la bocina para exigirle que arranque rápido",
      opcion_b:
        "Mantener una distancia generosa hacia atrás, tener paciencia y permitirle reiniciar la marcha con calma",
      opcion_c: "Adelantarlo de inmediato por la derecha invadiendo el andén",
      opcion_d:
        "Pegar la trompa de su carro a la defensa trasera del vehículo de enseñanza para sostenerlo",
      respuesta_recomendada: "b",
      explicacion:
        "La empatía con los aprendices es fundamental para la convivencia vial. Mantener distancia generosa previene un choque si el carro rueda hacia atrás al reiniciar la marcha y reduce el estrés del estudiante.",
      fundamento_legal:
        "Manual de Referencia ANSV sobre convivencia ciudadana y distancia de seguridad.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    att({
      id: "cale-l01-015",
      lote: LOTE,
      subtema: "menores en el regazo",
      hecho_canonico_id: "l01-att-15",
      pregunta:
        "Un familiar sugiere llevar a un bebé de dos años en los brazos de un adulto en el asiento delantero. ¿Cuál debe ser su respuesta?",
      sentido_clave: "seleccion",
      opcion_a: "Aceptar solo si el adulto abraza al menor con mucha fuerza",
      opcion_b: "Permitirlo siempre que ambos compartan el mismo cinturón de seguridad",
      opcion_c:
        "Negarse rotundamente y exigir que el menor viaje en un Sistema de Retención Infantil homologado y asegurado en el asiento trasero",
      opcion_d: "Aceptar si el viaje se realiza por calles de barrio a baja velocidad",
      respuesta_recomendada: "c",
      explicacion:
        "En caso de colisión frontal, la fuerza del impacto arranca al bebé de los brazos del adulto sin posibilidad humana de sostenerlo, o el adulto lo aplasta con su propio peso contra el tablero o el airbag.",
      fundamento_legal: "Ley 769 de 2002, Art. 82; Resolución 20253040037125; Manual ANSV.",
      source: SOURCES.RESOLUCION_CALE,
      dificultad: "facil",
    }),
    att({
      id: "cale-l01-016",
      lote: LOTE,
      subtema: "convivencia con motocicletas",
      hecho_canonico_id: "l01-att-16",
      pregunta:
        "Antes de realizar un giro a la derecha en una calle concurrida, ¿qué precaución actitudinal es prioritaria?",
      sentido_clave: "seleccion",
      opcion_a: "Poner la direccional y girar al instante confiando en que nadie se interpondrá",
      opcion_b: "Asumir que si la moto viene detrás, tiene la obligación absoluta de detenerse",
      opcion_c: "Tocar la bocina y girar cerrando el espacio a la acera",
      opcion_d:
        "Señalizar con suficiente antelación y verificar minuciosamente el espejo retrovisor derecho y el punto ciego para no cerrarle el paso a una moto o bicicleta",
      respuesta_recomendada: "d",
      explicacion:
        "Los motociclistas y ciclistas son más difíciles de detectar por su volumen reducido y circulan frecuentemente por los costados. Verificar el punto ciego previene colisiones por corte de trayectoria.",
      fundamento_legal: "Ley 769 de 2002, Art. 67 y Art. 68; Manual de Referencia ANSV.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    att({
      id: "cale-l01-017",
      lote: LOTE,
      subtema: "medicamentos con advertencia",
      hecho_canonico_id: "l01-att-17",
      pregunta:
        "Si el médico le formula un antihistamínico o relajante muscular con un pictograma de un automóvil en triángulo rojo, ¿qué actitud debe tomar?",
      sentido_clave: "seleccion",
      opcion_a:
        "Abstenerse de conducir mientras dure el tratamiento, utilizando otros medios de transporte",
      opcion_b: "Tomar una taza de café después de la pastilla para neutralizar la somnolencia",
      opcion_c: "Conducir solo distancias cortas a menos de 40 km/h",
      opcion_d: "Manejar normalmente si considera que su organismo es fuerte",
      respuesta_recomendada: "a",
      explicacion:
        "El pictograma de conducción en medicamentos advierte que el fármaco altera la capacidad psicomotriz, disminuye los reflejos o produce sedación, lo que incrementa notablemente el riesgo de siniestros.",
      fundamento_legal: "Manual de Referencia ANSV sobre aptitud psicofísica y medicamentos.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    att({
      id: "cale-l01-018",
      lote: LOTE,
      subtema: "esquina sin cebra demarcada",
      hecho_canonico_id: "l01-att-18",
      pregunta:
        "En una intersección urbana donde no existe cebra pintada, un peatón inicia el cruce por la prolongación de la acera. ¿Qué debe hacer usted como conductor?",
      sentido_clave: "seleccion",
      opcion_a: "Acelerar porque la ausencia de pintura le quita todo derecho al peatón",
      opcion_b:
        "Cederle el paso deteniendo el vehículo, ya que la prelación peatonal en esquinas existe aunque no esté demarcada",
      opcion_c: "Tocar la bocina para obligarlo a regresar al andén",
      opcion_d: "Esquivarlo pasando muy cerca de él",
      respuesta_recomendada: "b",
      explicacion:
        "La prolongación imaginaria de las aceras en las esquinas constituye una zona de cruce peatonal por ministerio de la ley, donde el peatón conserva la prelación sobre los vehículos que giran o cruzan.",
      fundamento_legal: "Ley 769 de 2002, Art. 105; Manual de Referencia ANSV.",
      source: SOURCES.LEY_769,
      dificultad: "media",
    }),
    att({
      id: "cale-l01-019",
      lote: LOTE,
      subtema: "respeto ambiental en la via",
      hecho_canonico_id: "l01-att-19",
      pregunta:
        "¿Cuál es la conducta correcta respecto a los desechos generados durante un viaje en el automóvil?",
      sentido_clave: "seleccion",
      opcion_a: "Arrojarlos por la ventana solo en carreteras rurales donde hay vegetación",
      opcion_b: "Tirar únicamente papeles o cáscaras biodegradables a la calzada",
      opcion_c:
        "Almacenarlos en una bolsa dentro del vehículo y depositarlos en un basurero al llegar a destino",
      opcion_d: "Lanzar botellas vacías a la cuneta para evitar que rueden bajo los pedales",
      respuesta_recomendada: "c",
      explicacion:
        "Arrojar basuras a la vía es una infracción de tránsito, contamina el medio ambiente y puede golpear a motociclistas o ciclistas, o provocar incendios forestales en el caso de colillas.",
      fundamento_legal: "Ley 769 de 2002, Art. 131, infracción B.07; Manual ANSV.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    att({
      id: "cale-l01-020",
      lote: LOTE,
      subtema: "contaminacion auditiva por bocina",
      hecho_canonico_id: "l01-att-20",
      pregunta:
        "En medio de una retención vehicular paralizada, un conductor toca la bocina repetidamente. ¿Qué debe considerar sobre esta conducta?",
      sentido_clave: "seleccion",
      opcion_a: "Que es un derecho consagrado en el Código de Tránsito",
      opcion_b: "Que es una medida eficaz para exigir a los agentes que agilicen el flujo",
      opcion_c: "Que está plenamente justificado para desahogar la frustración colectiva",
      opcion_d:
        "Que es un comportamiento inútil que solo genera estrés, irritación y contaminación auditiva sin abrir paso",
      respuesta_recomendada: "d",
      explicacion:
        "La bocina está diseñada exclusivamente para advertir situaciones de peligro inminente en la vía, jamás como mecanismo de queja, desahogo o intimidación en trancones.",
      fundamento_legal: "Ley 769 de 2002, Art. 104 y Art. 131, infracción B.09.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    att({
      id: "cale-l01-021",
      lote: LOTE,
      subtema: "incorporacion segura a via principal",
      hecho_canonico_id: "l01-att-21",
      pregunta:
        "Al salir de un parqueadero o estación de servicio para incorporarse a una avenida rápida, ¿cuál es la conducta prudente?",
      sentido_clave: "seleccion",
      opcion_a:
        "Detenerse, observar a ambos lados, ceder el paso a peatones y vehículos, e incorporarse solo cuando haya un hueco holgado en el tráfico",
      opcion_b: "Ingresar de inmediato obligando a los que vienen a frenar o cambiarse de carril",
      opcion_c: "Tocar la bocina y meter la trompa del auto para abrirse espacio",
      opcion_d: "Entrar a toda velocidad acelerando al máximo en primera marcha",
      respuesta_recomendada: "a",
      explicacion:
        "Quien se incorpora desde un predio privado o vía secundaria pierde toda prelación; debe ceder el paso y entrar sin perturbar la velocidad ni la trayectoria de quienes ya circulan.",
      fundamento_legal: "Ley 769 de 2002, Art. 66 y Art. 70; Manual ANSV.",
      source: SOURCES.LEY_769,
      dificultad: "media",
    }),
    att({
      id: "cale-l01-022",
      lote: LOTE,
      subtema: "entorno de parques infantiles",
      hecho_canonico_id: "l01-att-22",
      pregunta:
        "Al circular junto a un parque infantil donde hay niños jugando a la pelota cerca del andén, ¿qué medida de precaución debe tomar?",
      sentido_clave: "seleccion",
      opcion_a: "Continuar a la velocidad reglamentaria sin variar el rumbo",
      opcion_b:
        "Reducir notablemente la velocidad y colocar el pie sobre el pedal de freno en posición de alerta preventiva",
      opcion_c: "Tocar la bocina insistentemente para que los niños se alejen del borde",
      opcion_d: "Mirar fijamente a los niños desatendiendo el resto de la calle",
      respuesta_recomendada: "b",
      explicacion:
        "Los balones suelen rebotar a la calzada y los niños corren tras ellos sin mirar el tráfico. Reducir la velocidad y cubrir el freno elimina el tiempo de reacción ante un atropello.",
      fundamento_legal: "Manual de Referencia ANSV sobre percepción del riesgo y zonas infantiles.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    att({
      id: "cale-l01-023",
      lote: LOTE,
      subtema: "rechazo a piques y carreras",
      hecho_canonico_id: "l01-att-23",
      pregunta:
        "En una avenida despejada, otro automóvil se empareja a su lado en el semáforo y acelera el motor insinuando una carrera. ¿Cuál es la decisión correcta?",
      sentido_clave: "seleccion",
      opcion_a: "Aceptar el reto para demostrar la potencia de su automotor",
      opcion_b: "Acelerar fuerte los primeros metros y luego frenar de repente",
      opcion_c:
        "Arrancar con total normalidad a velocidad moderada, ignorando por completo la incitación competitiva",
      opcion_d: "Cerrarle el carril de inmediato para impedir que despegue",
      respuesta_recomendada: "c",
      explicacion:
        "Las carreras callejeras o piques ilegales son una conducta de altísimo riesgo que suele desencadenar siniestros fatales y está catalogada como delito o infracción grave en la ley colombiana.",
      fundamento_legal: "Ley 769 de 2002, Art. 131, infracción D.07; Manual ANSV.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    att({
      id: "cale-l01-024",
      lote: LOTE,
      subtema: "uso de exploradoras no autorizadas",
      hecho_canonico_id: "l01-att-24",
      pregunta:
        "¿Por qué un conductor empático debe evitar instalar barras LED de alta potencia o luces estroboscópicas frontales en su vehículo?",
      sentido_clave: "seleccion",
      opcion_a: "Porque descargan la batería en menos de una semana",
      opcion_b: "Porque solo están permitidas para vehículos de tracción animal",
      opcion_c: "Porque hacen que el vehículo se desplace más pesado",
      opcion_d:
        "Porque provocan ceguera temporal y deslumbramiento severo a quienes circulan en sentido contrario, generando riesgo de choque frontal",
      respuesta_recomendada: "d",
      explicacion:
        "Los dispositivos lumínicos no homologados o desalineados encandilan a los demás conductores, anulando su visión nocturna durante valiosos segundos en los que pueden colisionar o arrollar peatones.",
      fundamento_legal: "Resolución 20243040045005 de 2024; Ley 769 de 2002, Art. 86.",
      source: SOURCES.MANUAL_SENALIZACION,
      dificultad: "media",
    }),
    att({
      id: "cale-l01-025",
      lote: LOTE,
      subtema: "distancia de seguimiento en lluvia",
      hecho_canonico_id: "l01-att-25",
      pregunta:
        "Cuando empieza a llover y transita detrás de una motocicleta, ¿qué ajuste debe hacer en su distancia de seguimiento?",
      sentido_clave: "seleccion",
      opcion_a:
        "Aumentarla considerablemente, teniendo en cuenta que la moto puede derrapar o frenar intempestivamente por alcantarillas o pintura resbaladiza",
      opcion_b: "Reducirla para mantener a la motocicleta bien iluminada con sus farolas",
      opcion_c: "Conservar exactamente la misma distancia que en piso seco",
      opcion_d: "Adelantar a la motocicleta de inmediato rozando su manubrio",
      respuesta_recomendada: "a",
      explicacion:
        "Las motocicletas pierden estabilidad fácilmente sobre asfalto mojado, tapas de alcantarilla o líneas de pintura. Aumentar el margen evita arrollar al motociclista si este sufre una caída.",
      fundamento_legal:
        "Manual de Referencia ANSV sobre usuarios vulnerables y condiciones adversas.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    att({
      id: "cale-l01-026",
      lote: LOTE,
      subtema: "respeto a auxiliares de transito",
      hecho_canonico_id: "l01-att-26",
      pregunta:
        "Un auxiliar de tránsito con paleta de PARE le ordena detenerse en un tramo de obra vial. ¿Cómo debe proceder?",
      sentido_clave: "seleccion",
      opcion_a: "Ignorarlo si observa que la vía parece despejada y no hay policías de uniforme",
      opcion_b:
        "Detener la marcha por completo en el punto indicado con amabilidad, acatando sus instrucciones para proteger la vida de los trabajadores",
      opcion_c: "Acelerar antes de que la paleta termine de girar",
      opcion_d: "Reclamarle al auxiliar por demorar su tiempo de llegada",
      respuesta_recomendada: "b",
      explicacion:
        "Los auxiliares de tránsito y bandereros regulan puntos críticos de riesgo en obras viales. Desobedecerlos pone en riesgo inminente la vida de los trabajadores y constituye una violación de la prelación de tránsito.",
      fundamento_legal: "Manual de Señalización Vial 2024; Ley 769 de 2002, Art. 111.",
      source: SOURCES.MANUAL_SENALIZACION,
      dificultad: "facil",
    }),
    att({
      id: "cale-l01-027",
      lote: LOTE,
      subtema: "seguro de ninos en puertas",
      hecho_canonico_id: "l01-att-27",
      pregunta:
        "Antes de transportar a dos niños pequeños en el asiento trasero, ¿qué comprobación de seguridad es indispensable?",
      sentido_clave: "seleccion",
      opcion_a: "Bajar totalmente las ventanillas para que tengan ventilación",
      opcion_b: "Colocarles un solo cinturón a ambos niños para que no peleen",
      opcion_c:
        "Activar el seguro de bloqueo para niños en las puertas traseras y el bloqueo de ventanillas desde la consola del conductor",
      opcion_d: "Dejar las puertas sin seguro para facilitar una salida rápida",
      respuesta_recomendada: "c",
      explicacion:
        "El seguro infantil impide que los niños abran las puertas desde el interior de forma accidental o curiosa mientras el vehículo está en marcha, evitando caídas fatales a la calzada.",
      fundamento_legal: "Manual de Referencia ANSV sobre seguridad del menor a bordo.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    att({
      id: "cale-l01-028",
      lote: LOTE,
      subtema: "semaforos descoordinados",
      hecho_canonico_id: "l01-att-28",
      pregunta:
        "Si en una avenida los semáforos están descoordinados y le toca detenerse en varios rojos sucesivos, ¿cuál es la actitud preventiva?",
      sentido_clave: "seleccion",
      opcion_a:
        "Acelerar a fondo al ver el verde para ganarle al siguiente semáforo antes de que cambie",
      opcion_b: "Pitar fuertemente en cada detención para presionar el cambio",
      opcion_c:
        "Pasarse el semáforo en rojo si verifica que no cruzan vehículos por la vía transversal",
      opcion_d:
        "Mantener una velocidad moderada y constante, aceptando el ritmo del tráfico con paciencia y sin forzar aceleraciones inútiles",
      respuesta_recomendada: "d",
      explicacion:
        "Intentar 'ganarle' a los semáforos provoca aceleraciones bruscas, exceso de velocidad y frenadas de pánico que causan colisiones por alcance. La conducción fluida ahorra combustible y evita choques.",
      fundamento_legal: "Manual de Referencia ANSV sobre ecoconducción y anticipación del riesgo.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    att({
      id: "cale-l01-029",
      lote: LOTE,
      subtema: "posponer viaje por sueno",
      hecho_canonico_id: "l01-att-29",
      pregunta:
        "Tenía planeado salir de viaje a las 3:00 a.m. pero la noche anterior no pudo dormir por una emergencia familiar. ¿Qué decisión demuestra mayor responsabilidad?",
      sentido_clave: "seleccion",
      opcion_a:
        "Aplazar la hora de salida para dormir al menos 7 horas continuas antes de emprender el viaje por carretera",
      opcion_b:
        "Salir puntualmente a las 3:00 a.m. tomando tres tazas de café y bebidas energizantes",
      opcion_c: "Salir a la ruta y detenerse solo cuando comience a cabecear sobre el timón",
      opcion_d: "Conducir con las ventanas abiertas y masticando hielo para mantenerse despierto",
      respuesta_recomendada: "a",
      explicacion:
        "Iniciar un viaje en carretera con privación de sueño acumulada en la madrugada garantiza la aparición de microsueños incontrolables. La única decisión segura es descansar adecuadamente antes de partir.",
      fundamento_legal:
        "Manual de Referencia ANSV sobre somnolencia y planeación de viajes seguros.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    att({
      id: "cale-l01-030",
      lote: LOTE,
      subtema: "solidaridad vial reglamentaria",
      hecho_canonico_id: "l01-att-30",
      pregunta:
        "Si observa un derrumbe o un obstáculo peligroso en una curva de la carretera, ¿cuál es el comportamiento solidario y correcto?",
      sentido_clave: "seleccion",
      opcion_a: "Acelerar y olvidarse del asunto ya que logró esquivarlo",
      opcion_b:
        "Detenerse en un lugar seguro fuera de la curva, activar luces de emergencia y avisar a las autoridades viales (#767) para proteger a los demás",
      opcion_c: "Tomar fotos con el celular mientras conduce para subirlas a redes sociales",
      opcion_d: "Quedarse atravesado en medio carril tocando la bocina",
      respuesta_recomendada: "b",
      explicacion:
        "La corresponsabilidad vial exige proteger a los demás usuarios reportando los peligros oportunamente a las autoridades viales (como el #767 de Policía de Tránsito e INVIAS) sin ponerse en riesgo.",
      fundamento_legal: "Ley 769 de 2002, Art. 55; Manual de Referencia ANSV.",
      source: SOURCES.LEY_769,
      dificultad: "media",
    }),
    // Movilidad segura y sostenible (25)
    know({
      id: "cale-l01-031",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "tiempo de reaccion",
      hecho_canonico_id: "l01-mov-01",
      pregunta:
        "¿Qué es el tiempo de reacción de un conductor en el contexto de la seguridad vial?",
      opcion_a:
        "El tiempo total que tarda el vehículo en detenerse por completo desde que se pisa el freno",
      opcion_b:
        "El intervalo que demora el sistema hidráulico en enviar presión a las pastillas de freno",
      opcion_c:
        "El lapso que transcurre desde que el conductor percibe un peligro hasta que su pie presiona el pedal de freno",
      opcion_d: "El tiempo que toma el cerebro en olvidar una distracción previa",
      respuesta_correcta: "c",
      explicacion:
        "El tiempo de reacción abarca la percepción y la decisión humana; en condiciones normales oscila entre 0,75 y 1 segundo, tiempo durante el cual el vehículo sigue avanzando a la misma velocidad sin frenar.",
      fundamento_legal: "Manual de Referencia ANSV sobre conceptos psicofísicos de la conducción.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l01-032",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "distancia de reaccion",
      hecho_canonico_id: "l01-mov-02",
      pregunta:
        "¿Cómo se define la distancia de reacción y de qué factor depende fundamentalmente?",
      opcion_a: "La distancia recorrida con el motor apagado en una bajada pronunciada",
      opcion_b:
        "Los metros que patina el neumático sobre el asfalto mojado, y depende del labrado de la llanta",
      opcion_c: "El espacio libre que queda entre los dos parachoques en un semáforo",
      opcion_d:
        "Los metros que recorre el automotor mientras el conductor reacciona, y depende de la velocidad y del estado psicofísico del conductor",
      respuesta_correcta: "d",
      explicacion:
        "La distancia de reacción es el producto de la velocidad por el tiempo de reacción. Si el conductor está fatigado, alcoholizado o distraído, su tiempo de reacción aumenta y la distancia se alarga peligrosamente.",
      fundamento_legal:
        "Manual de Referencia ANSV sobre distancia de detención y factores humanos.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l01-033",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "distancia de frenado",
      hecho_canonico_id: "l01-mov-03",
      pregunta:
        "¿Qué factores físicos determinan principalmente la distancia de frenado de un automóvil?",
      opcion_a:
        "La velocidad a la que circula, el estado de los frenos, la adherencia de las llantas y las condiciones de la calzada",
      opcion_b: "Únicamente la potencia del motor y el tipo de combustible que consume",
      opcion_c: "La altura sobre el nivel del mar y la marca de la batería del carro",
      opcion_d: "El color de la pintura exterior y la posición del apoyacabezas",
      respuesta_correcta: "a",
      explicacion:
        "La distancia de frenado comienza cuando el pedal actúa y termina al detenerse el vehículo. Depende de la velocidad al cuadrado, la fricción entre llanta y pavimento, y el estado mecánico de suspensión y frenos.",
      fundamento_legal: "Manual de Referencia ANSV sobre física aplicada a la conducción.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l01-034",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "distancia total de detencion",
      hecho_canonico_id: "l01-mov-04",
      pregunta: "¿Cómo se obtiene la distancia total de detención o parada de un automotor?",
      opcion_a: "Multiplicando la distancia de reacción por la distancia de frenado",
      opcion_b: "Sumando la distancia de reacción más la distancia de frenado",
      opcion_c: "Restando la distancia de reacción a la distancia de frenado",
      opcion_d: "Dividiendo la velocidad máxima entre el número de ocupantes",
      respuesta_correcta: "b",
      explicacion:
        "La distancia total de detención representa todos los metros que recorre el auto desde que el ojo percibe el obstáculo hasta que el carro queda completamente inmóvil: Detención = Reacción + Frenado.",
      fundamento_legal: "Manual de Referencia ANSV sobre conceptos básicos de seguridad vial.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    know({
      id: "cale-l01-035",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "regla de los dos segundos",
      hecho_canonico_id: "l01-mov-05",
      pregunta:
        "¿En qué consiste la regla de los dos segundos para mantener la distancia de seguridad con el vehículo de adelante en piso seco?",
      opcion_a: "En tardar dos segundos en encender las luces direccionales antes de frenar",
      opcion_b: "En frenar en seco cada dos segundos para verificar la presión del pedal",
      opcion_c:
        "En elegir un punto de referencia fijo y asegurarse de pasar por él al menos dos segundos después que el auto precedente",
      opcion_d: "En no mirar por los retrovisores durante más de dos segundos seguidos",
      respuesta_correcta: "c",
      explicacion:
        "La regla de los dos segundos permite verificar una distancia de seguimiento proporcional a cualquier velocidad: se cuenta 'mil ciento uno, mil ciento dos' cuando el auto de adelante cruza un árbol o poste.",
      fundamento_legal: "Manual de Referencia ANSV; Ley 769 de 2002, Art. 108.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l01-036",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "distancia en calzada humeda",
      hecho_canonico_id: "l01-mov-06",
      pregunta:
        "Si la calzada se encuentra mojada por lluvia, ¿a cuánto debe aumentarse la distancia de seguimiento temporal?",
      opcion_a: "Debe reducirse a un segundo para no perder de vista las luces del auto delantero",
      opcion_b: "Debe aumentarse a treinta segundos",
      opcion_c: "Debe mantenerse exactamente en dos segundos sin importar el clima",
      opcion_d: "Debe aumentarse a un mínimo de tres a cuatro segundos",
      respuesta_correcta: "d",
      explicacion:
        "En lluvia la adherencia del neumático se reduce hasta un 50% y la distancia de frenado se duplica. Por ende, la distancia de seguimiento debe aumentarse al menos a 3 o 4 segundos.",
      fundamento_legal:
        "Manual de Referencia ANSV sobre conducción en condiciones climatológicas adversas.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    know({
      id: "cale-l01-037",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "energia cinetica y velocidad",
      hecho_canonico_id: "l01-mov-07",
      pregunta:
        "Físicamente, ¿qué ocurre con la energía cinética de un vehículo cuando se duplica la velocidad de marcha?",
      opcion_a:
        "Se cuadruplica, ya que la energía cinética es proporcional al cuadrado de la velocidad",
      opcion_b: "Se duplica en forma lineal",
      opcion_c: "Se mantiene constante porque la masa del vehículo no cambia",
      opcion_d: "Se reduce a la mitad por la resistencia del aire",
      respuesta_correcta: "a",
      explicacion:
        "La fórmula de energía cinética es Ec = 1/2 * masa * velocidad^2. Al duplicar la velocidad de 40 a 80 km/h, la energía del impacto y la distancia teórica de frenado aumentan cuatro veces.",
      fundamento_legal: "Manual de Referencia ANSV sobre velocidad y energía de impacto.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "dificil",
    }),
    know({
      id: "cale-l01-038",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "probabilidad de supervivencia del peaton",
      hecho_canonico_id: "l01-mov-08",
      pregunta:
        "¿Cuál es la probabilidad aproximada de supervivencia de un peatón atropellado a una velocidad de 30 km/h en comparación con un impacto a 50 km/h?",
      opcion_a:
        "La probabilidad es idéntica porque el cuerpo humano no resiste ningún impacto automotor",
      opcion_b:
        "A 30 km/h sobrevive cerca del 90%, mientras que a 50 km/h la probabilidad de fallecer o quedar con secuelas graves supera el 50%",
      opcion_c: "A 50 km/h sobrevive el 90% debido a los paragolpes plásticos modernos",
      opcion_d: "A 30 km/h el riesgo de muerte es del 80%",
      respuesta_correcta: "b",
      explicacion:
        "Por encima de 30 km/h la letalidad hacia los peatones se dispara exponencialmente. A 30 km/h 9 de cada 10 peatones sobreviven; a 50 km/h la mayoría sufre lesiones mortales o incapacidad permanente.",
      fundamento_legal: "Ley 2251 de 2022 (Exposición de motivos Ley Julián Esteban); OMS y ANSV.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l01-039",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "vision en tunel por alcohol",
      hecho_canonico_id: "l01-mov-09",
      pregunta:
        "¿Qué alteración visual produce el consumo de alcohol en el conductor conocido como 'visión en túnel'?",
      opcion_a: "Un aumento del campo visual hasta los 180 grados sin mover la cabeza",
      opcion_b: "La capacidad de ver con nitidez en la oscuridad dentro de los túneles viales",
      opcion_c:
        "La pérdida progresiva de la visión periférica o lateral, impidiendo detectar peligros a los costados de la vía",
      opcion_d: "La imposibilidad de distinguir los colores rojo y verde del semáforo",
      respuesta_correcta: "c",
      explicacion:
        "El alcohol deprime el sistema nervioso central provocando visión en túnel: el campo visual se estrecha hacia el centro y el conductor no advierte peatones, señales ni autos aproximándose lateralmente.",
      fundamento_legal: "Ley 1696 de 2013; Manual de Referencia ANSV sobre alcoholimetría.",
      source: SOURCES.LEY_1696,
      dificultad: "media",
    }),
    know({
      id: "cale-l01-040",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "falsa seguridad del alcohol",
      hecho_canonico_id: "l01-mov-10",
      pregunta: "¿Por qué el alcohol induce a comportamientos temerarios y exceso de velocidad?",
      opcion_a: "Porque incrementa físicamente los reflejos musculares y la destreza",
      opcion_b: "Porque agudiza el sentido del oído permitiendo anticipar el tráfico",
      opcion_c: "Porque enfría la temperatura corporal obligando a acelerar",
      opcion_d:
        "Porque desinhibe el cerebro, genera una sensación falsa de seguridad y reduce la percepción del riesgo",
      respuesta_correcta: "d",
      explicacion:
        "El efecto euforizante inicial del alcohol deteriora el lóbulo frontal, responsable del juicio y la prudencia; el conductor subestima los peligros reales y sobrestima sus propias capacidades.",
      fundamento_legal: "Manual de Referencia ANSV sobre consumo de sustancias y riesgo vial.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    know({
      id: "cale-l01-041",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "peligro de los microsuenos",
      hecho_canonico_id: "l01-mov-11",
      pregunta:
        "A una velocidad de 80 km/h en carretera, ¿cuántos metros recorre un automóvil a ciegas durante un microsueño típico de 3 segundos?",
      opcion_a: "Cerca de 67 metros sin control del conductor",
      opcion_b: "Aproximadamente 15 metros",
      opcion_c: "Menos de 5 metros porque el vehículo frena solo",
      opcion_d: "Exactamente 120 metros",
      respuesta_correcta: "a",
      explicacion:
        "A 80 km/h el vehículo avanza unos 22,2 metros cada segundo. En un microsueño de 3 segundos, recorre más de 66 metros sin que nadie gobierne la dirección ni los frenos.",
      fundamento_legal: "Manual de Referencia ANSV sobre fatiga y microsueños.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "dificil",
    }),
    know({
      id: "cale-l01-042",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "horarios criticos de fatiga",
      hecho_canonico_id: "l01-mov-12",
      pregunta:
        "¿Cuáles son las franjas horarias con mayor propensión biológica a siniestros por fatiga y sueño debido al ritmo circadiano?",
      opcion_a: "Entre las 08:00 y las 11:00 de la mañana",
      opcion_b:
        "Entre las 02:00 y las 06:00 de la madrugada y en las primeras horas de la tarde (14:00 a 16:00)",
      opcion_c: "Únicamente a las 12:00 del mediodía",
      opcion_d: "Entre las 18:00 y las 20:00 del anochecer",
      respuesta_correcta: "b",
      explicacion:
        "El reloj biológico humano genera descensos naturales de alerta en la madrugada (2:00 a 6:00 a.m.) y tras el almuerzo (2:00 a 4:00 p.m.), incrementando significativamente la probabilidad de quedarse dormido.",
      fundamento_legal: "Manual de Referencia ANSV sobre factores de riesgo de la fatiga.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l01-043",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "distraccion cognitiva por manos libres",
      hecho_canonico_id: "l01-mov-13",
      pregunta:
        "¿Por qué utilizar el sistema de manos libres mientras se conduce sigue representando un riesgo para la seguridad vial?",
      opcion_a: "Porque interfiere con las frecuencias de radio del vehículo",
      opcion_b: "Porque obliga al conductor a retirar ambas manos del volante todo el tiempo",
      opcion_c:
        "Porque provoca distracción cognitiva, absorbiendo recursos mentales de atención que deberían estar concentrados en leer la vía",
      opcion_d: "Porque bloquea automáticamente el pedal del acelerador",
      respuesta_correcta: "c",
      explicacion:
        "Aunque las manos estén en el volante, la mente se enfoca en la conversación telefónica compleja, generando 'ceguera por falta de atención': el ojo mira pero el cerebro no procesa las señales ni los peatones.",
      fundamento_legal: "Manual de Referencia ANSV sobre distracciones al volante.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l01-044",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "distraccion visual y manual",
      hecho_canonico_id: "l01-mov-14",
      pregunta:
        "¿Qué tipo de distracción ocurre cuando un conductor retira los ojos de la carretera para leer un mensaje de texto en su teléfono?",
      opcion_a: "Únicamente una distracción auditiva",
      opcion_b: "Una distracción ambiental producida por el entorno",
      opcion_c: "Ninguna, si la mirada se aparta por menos de tres segundos",
      opcion_d:
        "Una distracción combinada: visual (ojos fuera de la vía), manual (manos fuera del volante) y cognitiva (mente fuera del manejo)",
      respuesta_correcta: "d",
      explicacion:
        "Teclear o leer mensajes en el móvil reúne las cuatro formas de distracción simultáneas (visual, manual, mental y auditiva), multiplicando hasta por 23 veces el riesgo de verse involucrado en un choque.",
      fundamento_legal: "Manual de Referencia ANSV sobre factores distractores.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    know({
      id: "cale-l01-045",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "piramide de la movilidad",
      hecho_canonico_id: "l01-mov-15",
      pregunta:
        "De acuerdo con la pirámide de la movilidad urbana sostenible, ¿quién se ubica en la cúspide de máxima prioridad?",
      opcion_a: "Los peatones, con especial atención a personas con discapacidad y niños",
      opcion_b: "El transporte de carga pesada e industrial",
      opcion_c: "Los vehículos particulares de alta gama",
      opcion_d: "Las motocicletas de servicio a domicilio",
      respuesta_correcta: "a",
      explicacion:
        "La pirámide de la movilidad prioriza a los usuarios en función de su vulnerabilidad y eficiencia energética: 1° Peatones, 2° Ciclistas, 3° Transporte público, 4° Transporte de carga y 5° Vehículo particular.",
      fundamento_legal: "Manual de Referencia ANSV; Ley 1083 de 2006 sobre movilidad sostenible.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    know({
      id: "cale-l01-046",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "principio de conduccion defensiva",
      hecho_canonico_id: "l01-mov-16",
      pregunta: "¿Cuál es el postulado central que define a un conductor defensivo?",
      opcion_a: "Manejar rápido para defender su carril e impedir que otros se le adelanten",
      opcion_b:
        "Conducir de manera preventiva para evitar siniestros a pesar de las acciones incorrectas de los demás y de las condiciones adversas",
      opcion_c:
        "Confiar ciegamente en que las señales de tránsito garantizan que nadie violará la prelación",
      opcion_d: "Frenar en seco ante cualquier duda para obligar a los demás a detenerse",
      respuesta_correcta: "b",
      explicacion:
        "Conducir a la defensiva implica no dar nada por sentado, anticiparse a los errores probables de los otros conductores o peatones y mantener siempre un colchón de espacio y tiempo de seguridad.",
      fundamento_legal: "Manual de Referencia ANSV sobre conducción defensiva.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    know({
      id: "cale-l01-047",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "puntos ciegos laterales",
      hecho_canonico_id: "l01-mov-17",
      pregunta:
        "¿Qué técnica debe emplear un conductor para compensar los puntos ciegos laterales antes de cambiar de carril?",
      opcion_a: "Aumentar la velocidad y hacer sonar la bocina antes de cruzar la línea",
      opcion_b: "Confiar exclusivamente en el espejo retrovisor interior central",
      opcion_c:
        "Mirar por los espejos retrovisores y realizar un giro rápido de cabeza de reojo hacia la ventanilla correspondiente sin soltar el volante",
      opcion_d: "Bajar la ventanilla y sacar el brazo para sentir el viento",
      respuesta_correcta: "c",
      explicacion:
        "Los espejos retrovisores no cubren las áreas diagonales adyacentes al pilar central (puntos ciegos). Un vistazo rápido de reojo por encima del hombro confirma que no haya una moto o bicicleta oculta.",
      fundamento_legal: "Manual de Referencia ANSV sobre visión periférica y retrovisores.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l01-048",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "aproximacion a glorieta",
      hecho_canonico_id: "l01-mov-18",
      pregunta:
        "Al aproximarse a una glorieta o rotonda de varios carriles, ¿cuál es la técnica de conducción segura?",
      opcion_a:
        "Entrar a la máxima velocidad posible para ganar la prelación frente a quienes ya giran",
      opcion_b: "Transitar siempre por el carril más interno y cruzar en diagonal hacia la salida",
      opcion_c: "Detenerse en seco dentro de la glorieta para buscar la señal de salida",
      opcion_d:
        "Reducir la velocidad antes de entrar, ceder el paso a los vehículos que ya circulan en ella y elegir el carril adecuado según la salida",
      respuesta_correcta: "d",
      explicacion:
        "La aproximación exige reducir velocidad y ceder el paso a quienes ya están en el anillo. Se debe seleccionar el carril exterior si se saldrá en la primera o segunda salida, o el interior para retornos y giros a la izquierda.",
      fundamento_legal: "Ley 769 de 2002, Art. 70; Manual de Referencia ANSV.",
      source: SOURCES.LEY_769,
      dificultad: "media",
    }),
    know({
      id: "cale-l01-049",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "fase de preparacion del adelantamiento",
      hecho_canonico_id: "l01-mov-19",
      pregunta:
        "¿Cuál es el primer paso indispensable antes de intentar un adelantamiento en una carretera bidireccional?",
      opcion_a:
        "Verificar que la señalización lo permita, que exista visibilidad longitudinal suficiente y que ningún vehículo venga en sentido opuesto ni haya iniciado el rebase detrás",
      opcion_b: "Pegarse a menos de dos metros de la defensa trasera del vehículo de adelante",
      opcion_c:
        "Poner luces altas y hacer sonar el pito para intimidar al conductor que va adelante",
      opcion_d: "Cambiar a quinta marcha para ahorrar combustible",
      respuesta_correcta: "a",
      explicacion:
        "El adelantamiento exige comprobar la legalidad de la demarcación (línea segmentada), visibilidad total sin curvas ni cimas, ausencia de tráfico en contra y espacio libre antes de salir del carril.",
      fundamento_legal: "Ley 769 de 2002, Art. 73; Manual de Referencia ANSV.",
      source: SOURCES.LEY_769,
      dificultad: "media",
    }),
    know({
      id: "cale-l01-050",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "retorno al carril tras adelantar",
      hecho_canonico_id: "l01-mov-20",
      pregunta:
        "¿En qué momento exacto es seguro reincorporarse al carril derecho después de culminar un adelantamiento?",
      opcion_a:
        "Inmediatamente después de que la trompa de su carro supere la del carro adelantado",
      opcion_b:
        "Cuando por el espejo retrovisor interior central se observe la totalidad del frente del vehículo rebasado con holgura",
      opcion_c: "Cuando el conductor adelantado le pite para avisarle",
      opcion_d: "Frenando suavemente para acomodarse delante del otro carro",
      respuesta_correcta: "b",
      explicacion:
        "Reincorporarse prematuramente 'corta' el camino del vehículo rebasado obligándolo a frenar. Ver su frente completo en el retrovisor interior garantiza una separación mínima segura antes de volver al carril.",
      fundamento_legal: "Manual de Referencia ANSV sobre maniobras seguras de sobrepaso.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l01-051",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "fuerza centrifuga en curvas",
      hecho_canonico_id: "l01-mov-21",
      pregunta:
        "¿Qué efecto físico experimenta un automóvil al ingresar a una curva pronunciada a velocidad excesiva?",
      opcion_a: "Las ruedas traseras se bloquean automáticamente por el sistema de seguridad",
      opcion_b: "El vehículo se adhiere con mayor firmeza al asfalto gracias a la velocidad",
      opcion_c:
        "La fuerza centrífuga tiende a empujar el vehículo hacia el exterior de la curva, provocando derrape o salida de la calzada",
      opcion_d: "El peso del vehículo se concentra en las ruedas interiores",
      respuesta_correcta: "c",
      explicacion:
        "La inercia empuja el automóvil en línea recta hacia el exterior de la trayectoria circular (fuerza centrífuga). Si la velocidad sobrepasa el límite de agarre de las llantas, el carro derrapa ineludiblemente.",
      fundamento_legal: "Manual de Referencia ANSV sobre física y trazado de curvas.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l01-052",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "tecnica de frenado en curvas",
      hecho_canonico_id: "l01-mov-22",
      pregunta:
        "¿Cuál es la técnica de frenado y cambio de marcha recomendada para negociar una curva con seguridad?",
      opcion_a:
        "Entrar rápido, clavar los frenos a mitad de la curva y girar con fuerza el volante",
      opcion_b: "Conducir con el freno de mano ligeramente tensionado",
      opcion_c: "Pisar el pedal del embrague durante todo el giro para que el carro ruede libre",
      opcion_d:
        "Reducir la velocidad y seleccionar la marcha adecuada antes de entrar a la curva, manteniendo aceleración suave y constante al recorrerla",
      respuesta_correcta: "d",
      explicacion:
        "Frenar bruscamente con las ruedas giradas desestabiliza la masa del vehículo y provoca pérdida de control. Toda desaceleración y reducción de cambio debe realizarse con las ruedas rectas antes de la curva.",
      fundamento_legal: "Manual de Referencia ANSV sobre conducción técnica en curvas.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l01-053",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "desempanado de vidrios",
      hecho_canonico_id: "l01-mov-23",
      pregunta:
        "Cuando en días fríos o lluviosos los vidrios del vehículo se empañan por dentro, ¿cuál es la acción más rápida y eficaz para recuperar la visibilidad?",
      opcion_a:
        "Activar el aire acondicionado orientando las rejillas hacia el parabrisas y desactivar la recirculación de aire interior",
      opcion_b: "Limpiar el parabrisas con la mano mientras se conduce",
      opcion_c: "Apagar el motor de inmediato en medio del carril",
      opcion_d: "Cerrar herméticamente todas las entradas de aire y no hacer nada",
      respuesta_correcta: "a",
      explicacion:
        "El aire acondicionado deshumidifica el aire de la cabina. Apagar la recirculación permite que entre aire fresco del exterior con menor humedad relativa, desempañando el cristal en pocos segundos sin dejar marcas de grasa.",
      fundamento_legal: "Manual de Referencia ANSV sobre visibilidad e inspección del vehículo.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l01-054",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "comportamiento infantil en la via",
      hecho_canonico_id: "l01-mov-24",
      pregunta:
        "¿Por qué los menores de edad representan un riesgo peatonal especial que exige extrema prudencia del conductor?",
      opcion_a: "Porque la ley los autoriza a jugar en las calzadas vehiculares",
      opcion_b:
        "Porque tienen menor estatura, campo visual más estrecho y dificultad para calcular con precisión la velocidad y distancia de los vehículos",
      opcion_c: "Porque sus reflejos son más rápidos que los de un adulto",
      opcion_d: "Porque siempre cruzan las vías en grupos organizados",
      respuesta_correcta: "b",
      explicacion:
        "El desarrollo psicofísico de los niños no les permite anticipar el peligro como un adulto: su visión periférica es un tercio menor y suelen concentrarse solo en su objetivo (un juguete o un amigo) cruzando intempestivamente.",
      fundamento_legal: "Manual de Referencia ANSV sobre usuarios infantiles y vulnerables.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    know({
      id: "cale-l01-055",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "movilidad activa y convivencia",
      hecho_canonico_id: "l01-mov-25",
      pregunta:
        "¿Cómo contribuye la movilidad activa (caminar y usar la bicicleta) a la sostenibilidad urbana y la seguridad vial?",
      opcion_a: "Aumentando el número de vehículos automotores en las vías",
      opcion_b:
        "Haciendo obligatoria la construcción de autopistas elevadas en los centros urbanos",
      opcion_c:
        "Reduciendo la congestión, disminuyendo emisiones contaminantes y humanizando las ciudades mediante espacios viales pacificados",
      opcion_d: "Eliminando la necesidad de señales de tránsito",
      respuesta_correcta: "c",
      explicacion:
        "La movilidad activa y los modos no motorizados son los más limpios y saludables, pero requieren que los conductores de vehículos a motor respeten su espacio y reduzcan la velocidad para coexistir pacíficamente.",
      fundamento_legal: "Manual de Referencia ANSV; Ley 1811 de 2016.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    // Normas de transito (15)
    know({
      id: "cale-l01-056",
      lote: LOTE,
      nucleo_nombre: "Normas de transito",
      subtema: "principios rectores del codigo",
      hecho_canonico_id: "l01-nor-01",
      pregunta:
        "De acuerdo con el artículo 1° del Código Nacional de Tránsito (Ley 769 de 2002), ¿cuál es el primer principio rector del tránsito en Colombia?",
      opcion_a: "La rapidez en el desplazamiento de mercancías",
      opcion_b: "El cobro oportuno de peajes e impuestos",
      opcion_c: "La rentabilidad de las empresas de transporte",
      opcion_d: "La seguridad de los usuarios",
      respuesta_correcta: "d",
      explicacion:
        "El artículo 1° de la Ley 769 establece expresamente que los principios rectores del tránsito son: seguridad de los usuarios, movilidad, calidad, oportunidad, cubrimiento, libertad de acceso, plena identificación, libre circulación, educación y descentralización.",
      fundamento_legal: "Ley 769 de 2002, Art. 1°.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    know({
      id: "cale-l01-057",
      lote: LOTE,
      nucleo_nombre: "Normas de transito",
      subtema: "comportamiento general de los usuarios",
      hecho_canonico_id: "l01-nor-02",
      pregunta:
        "¿A qué obliga el artículo 55 de la Ley 769 a toda persona que tome parte en el tránsito como conductor, pasajero o peatón?",
      opcion_a:
        "A comportarse de forma que no obstaculice, perjudique ni ponga en riesgo a las demás personas, conociendo y cumpliendo las normas",
      opcion_b: "A ceder el paso únicamente a los vehículos oficiales del gobierno",
      opcion_c: "A transitar siempre a la velocidad máxima permitida por la vía",
      opcion_d: "A portar dinero en efectivo para pagar comparendos inmediatos",
      respuesta_correcta: "a",
      explicacion:
        "El artículo 55 consagra el deber de diligencia y cuidado: nadie puede poner en peligro a otros, perturbar el tránsito o dañar bienes públicos o privados, debiendo conocer y respetar las normas viales.",
      fundamento_legal: "Ley 769 de 2002, Art. 55.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    know({
      id: "cale-l01-058",
      lote: LOTE,
      nucleo_nombre: "Normas de transito",
      subtema: "limite de velocidad urbano ley 2251",
      hecho_canonico_id: "l01-nor-03",
      pregunta:
        "Conforme a la Ley 2251 de 2022 (Ley Julián Esteban) que modificó el artículo 106 de la Ley 769, ¿cuál es el límite máximo general de velocidad en vías urbanas?",
      opcion_a: "60 kilómetros por hora",
      opcion_b: "50 kilómetros por hora",
      opcion_c: "80 kilómetros por hora",
      opcion_d: "45 kilómetros por hora",
      respuesta_correcta: "b",
      explicacion:
        "El artículo 106 de la Ley 769 de 2002 fue modificado por la Ley 2251 de 2022, estableciendo que en vías urbanas y carreteras municipales en ningún caso la velocidad podrá superar los 50 km/h.",
      fundamento_legal: "Ley 769 de 2002, Art. 106 (modificado por Ley 2251 de 2022).",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    know({
      id: "cale-l01-059",
      lote: LOTE,
      nucleo_nombre: "Normas de transito",
      subtema: "limite en zonas escolares y residenciales",
      hecho_canonico_id: "l01-nor-04",
      pregunta:
        "¿Cuál es el límite máximo de velocidad permitido en zonas escolares y residenciales según la legislación colombiana vigente?",
      opcion_a: "Hasta 40 kilómetros por hora",
      opcion_b: "Hasta 20 kilómetros por hora",
      opcion_c: "Hasta 30 kilómetros por hora",
      opcion_d: "Hasta 50 kilómetros por hora",
      respuesta_correcta: "c",
      explicacion:
        "El artículo 106 de la Ley 769 (modificado por Ley 2251 de 2022) dispone taxativamente que en zonas escolares y residenciales la velocidad máxima permitida será de hasta treinta kilómetros por hora (30 km/h).",
      fundamento_legal: "Ley 769 de 2002, Art. 106 (modificado por Ley 2251 de 2022).",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    know({
      id: "cale-l01-060",
      lote: LOTE,
      nucleo_nombre: "Normas de transito",
      subtema: "velocidad de micromovilidad",
      hecho_canonico_id: "l01-nor-05",
      pregunta:
        "Según el parágrafo del artículo 106 de la Ley 769 modificado por la Ley 2251 de 2022, ¿cuál es el límite de velocidad para patinetas y bicicletas eléctricas o a gasolina?",
      opcion_a: "No podrán sobrepasar los 25 km/h",
      opcion_b: "No tienen límite si circulan por la calzada",
      opcion_c: "No podrán sobrepasar los 50 km/h",
      opcion_d: "No podrán sobrepasar los 40 km/h",
      respuesta_correcta: "d",
      explicacion:
        "La Ley 2251 de 2022 introdujo expresamente que las patinetas y bicicletas eléctricas o a gasolina no podrán sobrepasar los 40 km/h en el territorio nacional.",
      fundamento_legal: "Ley 769 de 2002, Art. 106, Parágrafo (modificado por Ley 2251 de 2022).",
      source: SOURCES.LEY_769,
      dificultad: "media",
    }),
    know({
      id: "cale-l01-061",
      lote: LOTE,
      nucleo_nombre: "Normas de transito",
      subtema: "limite en carreteras nacionales",
      hecho_canonico_id: "l01-nor-06",
      pregunta:
        "Bajo la Ley 2251 de 2022, ¿cuál es el límite general máximo de velocidad para carreteras nacionales y departamentales rurales?",
      opcion_a: "90 kilómetros por hora",
      opcion_b: "100 kilómetros por hora",
      opcion_c: "120 kilómetros por hora en toda carretera",
      opcion_d: "80 kilómetros por hora",
      respuesta_correcta: "a",
      explicacion:
        "El artículo 107 modificado por la Ley 2251 de 2022 estipula que en carreteras nacionales y departamentales rurales la velocidad en ningún caso podrá sobrepasar los 90 km/h como regla estándar.",
      fundamento_legal: "Ley 769 de 2002, Art. 107 (modificado por Ley 2251 de 2022).",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    know({
      id: "cale-l01-062",
      lote: LOTE,
      nucleo_nombre: "Normas de transito",
      subtema: "velocidad en doble calzada",
      hecho_canonico_id: "l01-nor-07",
      pregunta:
        "¿Bajo qué condiciones específicas una carretera nacional puede permitir una velocidad de hasta 120 km/h según la ley colombiana?",
      opcion_a: "En cualquier carretera recta de más de tres carriles durante el día",
      opcion_b:
        "Únicamente si es una vía de doble calzada que no contenga pasos peatonales dentro de su diseño y esté expresamente señalizada",
      opcion_c: "Siempre que el vehículo sea de transporte público intermunicipal",
      opcion_d: "En tramos donde no haya cámaras de fotomulta instaladas",
      respuesta_correcta: "b",
      explicacion:
        "La excepción del Art. 107 permite hasta 120 km/h exclusivamente para vías de doble calzada sin pasos peatonales en su diseño, con estudios técnicos aprobados y señalización reglamentaria visible.",
      fundamento_legal: "Ley 769 de 2002, Art. 107 (modificado por Ley 2251 de 2022).",
      source: SOURCES.LEY_769,
      dificultad: "media",
    }),
    know({
      id: "cale-l01-063",
      lote: LOTE,
      nucleo_nombre: "Normas de transito",
      subtema: "grado cero de alcoholemia",
      hecho_canonico_id: "l01-nor-08",
      pregunta:
        "De acuerdo con la Ley 1696 de 2013, ¿cuál es el rango de concentración para el Grado Cero (0) de alcoholemia en sangre?",
      opcion_a: "Entre 10 y 19 miligramos de etanol por cada 100 mililitros de sangre total",
      opcion_b: "Entre 40 y 99 miligramos de etanol por cada 100 mililitros de sangre total",
      opcion_c: "Entre 20 y 39 miligramos de etanol por cada 100 mililitros de sangre total",
      opcion_d: "Cualquier valor menor a 50 miligramos",
      respuesta_correcta: "c",
      explicacion:
        "El Grado Cero de alcoholemia abarca entre 20 y 39 mg de etanol / 100 ml de sangre. Por primera vez acarrea suspensión de licencia de 6 meses a 1 año, multa de 90 SMDLV, inmovilización y trabajo comunitario.",
      fundamento_legal: "Ley 1696 de 2013, Art. 5° que modificó el Art. 152 de la Ley 769 de 2002.",
      source: SOURCES.LEY_1696,
      dificultad: "media",
    }),
    know({
      id: "cale-l01-064",
      lote: LOTE,
      nucleo_nombre: "Normas de transito",
      subtema: "primer grado de alcoholemia",
      hecho_canonico_id: "l01-nor-09",
      pregunta:
        "¿Qué rango de etanol en sangre define el Primer Grado (1) de embriaguez según la Ley 1696 de 2013?",
      opcion_a: "Más de 150 miligramos de etanol",
      opcion_b: "Entre 20 y 39 miligramos de etanol por cada 100 mililitros de sangre total",
      opcion_c: "Entre 100 y 149 miligramos de etanol por cada 100 mililitros de sangre total",
      opcion_d: "Entre 40 y 99 miligramos de etanol por cada 100 mililitros de sangre total",
      respuesta_correcta: "d",
      explicacion:
        "El Primer Grado de alcoholemia va de 40 a 99 mg de etanol/100 ml de sangre. Por primera vez acarrea suspensión de licencia de 1 a 3 años, multa de 180 SMDLV, inmovilización por 3 días y trabajo comunitario.",
      fundamento_legal: "Ley 1696 de 2013, Art. 5°.",
      source: SOURCES.LEY_1696,
      dificultad: "media",
    }),
    know({
      id: "cale-l01-065",
      lote: LOTE,
      nucleo_nombre: "Normas de transito",
      subtema: "segundo y tercer grado alcoholemia",
      hecho_canonico_id: "l01-nor-10",
      pregunta:
        "En la legislación colombiana, ¿a partir de qué concentración se considera Tercer Grado (3) de alcoholemia?",
      opcion_a:
        "A partir de 150 miligramos de etanol por cada 100 mililitros de sangre total en adelante",
      opcion_b: "Desde 100 miligramos de etanol en sangre",
      opcion_c: "Desde 80 miligramos de etanol",
      opcion_d: "Únicamente si la persona no puede sostenerse de pie",
      respuesta_correcta: "a",
      explicacion:
        "El Tercer Grado de alcoholemia corresponde a 150 mg de etanol o más por cada 100 ml de sangre. Por primera vez acarrea suspensión de licencia por 10 años, multa de 720 SMDLV, inmovilización por 10 días y trabajo comunitario.",
      fundamento_legal: "Ley 1696 de 2013, Art. 5°.",
      source: SOURCES.LEY_1696,
      dificultad: "media",
    }),
    know({
      id: "cale-l01-066",
      lote: LOTE,
      nucleo_nombre: "Normas de transito",
      subtema: "renuencia a prueba de alcoholemia",
      hecho_canonico_id: "l01-nor-11",
      pregunta:
        "Si un conductor requerido en un retén se niega u obstaculiza la realización de la prueba de alcoholemia, ¿qué sanción legal se le aplica?",
      opcion_a: "Una simple amonestación verbal y orden de irse a pie",
      opcion_b:
        "Se le aplica la sanción más gravosa: cancelación definitiva de la licencia de conducción, multa máxima de 1.440 SMDLV e inmovilización por 20 días",
      opcion_c: "Solo una multa económica leve sin afectar su licencia",
      opcion_d: "El agente debe dejarlo continuar porque la prueba es obligatoriamente voluntaria",
      respuesta_correcta: "b",
      explicacion:
        "El parágrafo 3° del artículo 152 (Ley 1696 de 2013) castiga la renuencia o fuga del conductor con la máxima sanción legal: cancelación de la licencia, inmovilización del carro por 20 días y multa de 1.440 SMDLV.",
      fundamento_legal: "Ley 1696 de 2013, Art. 5°, Parágrafo 3°.",
      source: SOURCES.LEY_1696,
      dificultad: "dificil",
    }),
    know({
      id: "cale-l01-067",
      lote: LOTE,
      nucleo_nombre: "Normas de transito",
      subtema: "cinturon obligatorio modelo vehicular",
      hecho_canonico_id: "l01-nor-12",
      pregunta:
        "Según el artículo 82 de la Ley 769, ¿a partir de qué modelo de vehículo es obligatorio el uso del cinturón de seguridad en los asientos traseros?",
      opcion_a: "Solo en camionetas blindadas de cualquier año",
      opcion_b: "Únicamente en vehículos modelo 2020 en adelante",
      opcion_c: "A partir de los vehículos modelo 2004 en adelante",
      opcion_d: "No es obligatorio en los asientos traseros en ninguna circunstancia",
      respuesta_correcta: "c",
      explicacion:
        "El artículo 82 establece el uso obligatorio del cinturón para conductor y copiloto en todo vehículo, y de manera obligatoria en los asientos traseros para vehículos modelo 2004 en adelante.",
      fundamento_legal: "Ley 769 de 2002, Art. 82.",
      source: SOURCES.LEY_769,
      dificultad: "media",
    }),
    know({
      id: "cale-l01-068",
      lote: LOTE,
      nucleo_nombre: "Normas de transito",
      subtema: "menores de 10 anos asiento trasero",
      hecho_canonico_id: "l01-nor-13",
      pregunta:
        "¿Qué disposición legal rige el transporte de menores de diez (10) años en vehículos automotores particulares?",
      opcion_a: "Pueden viajar en el asiento delantero si llevan el cinturón abrochado",
      opcion_b: "Pueden viajar en la bodega o platón del vehículo en zonas rurales",
      opcion_c:
        "Pueden viajar en el asiento delantero siempre que vayan acompañados de su padre o madre",
      opcion_d: "Deben viajar obligatoriamente en el asiento trasero del vehículo",
      respuesta_correcta: "d",
      explicacion:
        "El artículo 82 de la Ley 769 prohíbe taxativamente que menores de 10 años viajen en el asiento delantero; su transgresión acarrea comparendo e inmovilización preventiva por seguridad del menor.",
      fundamento_legal: "Ley 769 de 2002, Art. 82.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    know({
      id: "cale-l01-069",
      lote: LOTE,
      nucleo_nombre: "Normas de transito",
      subtema: "prelacion de senales articulo 111",
      hecho_canonico_id: "l01-nor-14",
      pregunta:
        "Si en una intersección semaforizada en verde un agente de tránsito le hace señal manual de PARE, ¿qué orden debe obedecer?",
      opcion_a:
        "La orden del agente de tránsito, ya que las indicaciones de la autoridad prevalecen sobre cualquier señal o semáforo",
      opcion_b:
        "La luz verde del semáforo, porque los dispositivos tecnológicos prevalecen sobre las personas",
      opcion_c: "Avanzar despacio tocando la bocina para que el agente se aparte",
      opcion_d: "Esperar a que el semáforo cambie a rojo para obedecer al agente",
      respuesta_correcta: "a",
      explicacion:
        "El artículo 111 de la Ley 769 fija la jerarquía estricta: 1° Señales de los agentes de tránsito, 2° Señales transitorias de obra, 3° Semáforos, 4° Señales verticales y 5° Señales horizontales o demarcadas.",
      fundamento_legal: "Ley 769 de 2002, Art. 111.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    know({
      id: "cale-l01-070",
      lote: LOTE,
      nucleo_nombre: "Normas de transito",
      subtema: "licencia de conduccion documento publico",
      hecho_canonico_id: "l01-nor-15",
      pregunta:
        "¿Qué naturaleza jurídica y alcance tiene la licencia de conducción en Colombia según el artículo 17 del Código de Tránsito?",
      opcion_a: "Un título de propiedad intransferible sobre un vehículo automotor",
      opcion_b:
        "Un documento público de carácter personal e intransferible que autoriza a una persona para conducir vehículos en el territorio nacional",
      opcion_c: "Un permiso temporal expedido por las escuelas de conducción con validez de un mes",
      opcion_d: "Una póliza de seguro contra todo riesgo",
      respuesta_correcta: "b",
      explicacion:
        "La licencia de conducción es un documento público emitido por el Ministerio de Transporte a través de los organismos de tránsito, de carácter personal e intransferible, que acredita la idoneidad para conducir.",
      fundamento_legal: "Ley 769 de 2002, Art. 17.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    // Senalizacion vial e infraestructura (15)
    know({
      id: "cale-l01-071",
      lote: LOTE,
      nucleo_nombre: "Senalizacion vial e infraestructura",
      subtema: "caracteristicas de senales reglamentarias",
      hecho_canonico_id: "l01-sen-01",
      pregunta:
        "¿Cuál es la forma, color y función principal de las señales reglamentarias (SR) según el Manual de Señalización Vial?",
      opcion_a: "Forma de rombo con fondo amarillo y función preventiva de peligros",
      opcion_b: "Forma rectangular con fondo azul y función de guía turística",
      opcion_c:
        "Forma circular con orla roja, fondo blanco y símbolo negro (salvo excepciones como PARE y Ceda el Paso), con función de notificar prohibiciones, restricciones u obligaciones",
      opcion_d: "Forma triangular con fondo naranja y función de canalización en obras",
      respuesta_correcta: "c",
      explicacion:
        "Las señales reglamentarias notifican limitaciones, prohibiciones o restricciones de la vía. Su violación constituye una infracción directa de tránsito.",
      fundamento_legal:
        "Manual de Señalización Vial de Colombia (Resolución 20243040045005 de 2024).",
      source: SOURCES.MANUAL_SENALIZACION,
      dificultad: "facil",
    }),
    know({
      id: "cale-l01-072",
      lote: LOTE,
      nucleo_nombre: "Senalizacion vial e infraestructura",
      subtema: "senal pare sr-01",
      hecho_canonico_id: "l01-sen-02",
      pregunta:
        "Ante la señal reglamentaria SR-01 (PARE), ¿cuál es la obligación estricta del conductor?",
      opcion_a: "Disminuir un poco la velocidad y continuar si no divisa peligro",
      opcion_b: "Detenerse únicamente si viene un vehículo de transporte público",
      opcion_c: "Tocar la bocina y acelerar para cruzar rápidamente la intersección",
      opcion_d:
        "Detener completamente el vehículo antes de la línea de detención, comprobar la ausencia de tráfico y reanudar la marcha solo al tener paso seguro",
      respuesta_correcta: "d",
      explicacion:
        "La señal SR-01 (octogonal roja) exige la inmovilización completa y total del automotor (0 km/h) antes de la línea de parada, nunca una simple reducción de marcha.",
      fundamento_legal:
        "Manual de Señalización Vial 2024; Ley 769 de 2002, Art. 111 y Art. 131 D.04.",
      source: SOURCES.MANUAL_SENALIZACION,
      dificultad: "facil",
    }),
    know({
      id: "cale-l01-073",
      lote: LOTE,
      nucleo_nombre: "Senalizacion vial e infraestructura",
      subtema: "senal ceda el paso sr-02",
      hecho_canonico_id: "l01-sen-03",
      pregunta:
        "¿Qué diferencia existe entre la señal de PARE (SR-01) y la señal de CEDA EL PASO (SR-02)?",
      opcion_a:
        "En Ceda el Paso se reduce la marcha y se cede la prelación a los vehículos de la vía principal, deteniéndose solo si es estrictamente necesario para no obstaculizar",
      opcion_b: "No existe ninguna diferencia, ambas exigen detenerse con el motor apagado",
      opcion_c: "Ceda el Paso solo rige para motocicletas y bicicletas",
      opcion_d: "Ceda el Paso autoriza a acelerar para ingresar antes de que lleguen otros autos",
      respuesta_correcta: "a",
      explicacion:
        "La señal SR-02 (triángulo invertido con borde rojo) no exige detención obligatoria si la vía prioritaria está completamente despejada, pero sí impone ceder el paso sin perturbar el flujo prioritario.",
      fundamento_legal: "Manual de Señalización Vial de Colombia 2024.",
      source: SOURCES.MANUAL_SENALIZACION,
      dificultad: "media",
    }),
    know({
      id: "cale-l01-074",
      lote: LOTE,
      nucleo_nombre: "Senalizacion vial e infraestructura",
      subtema: "senal siga de frente sr-03",
      hecho_canonico_id: "l01-sen-04",
      pregunta: "¿Qué indica la señal reglamentaria SR-03 (SIGA DE FRENTE)?",
      opcion_a: "Que está prohibido continuar hacia adelante",
      opcion_b:
        "Que el único sentido de circulación autorizado en esa intersección es continuar de frente, quedando prohibidos los giros",
      opcion_c: "Que la vía tiene doble calzada adelante",
      opcion_d: "Que hay una estación de servicio próxima",
      respuesta_correcta: "b",
      explicacion:
        "La señal SR-03 muestra una flecha vertical negra dentro del círculo reglamentario y notifica la obligatoriedad de continuar recto, impidiendo virajes a izquierda o derecha.",
      fundamento_legal: "Manual de Señalización Vial de Colombia 2024.",
      source: SOURCES.MANUAL_SENALIZACION,
      dificultad: "facil",
    }),
    know({
      id: "cale-l01-075",
      lote: LOTE,
      nucleo_nombre: "Senalizacion vial e infraestructura",
      subtema: "senal no pase sr-04",
      hecho_canonico_id: "l01-sen-05",
      pregunta:
        "¿Qué prohibición establece la señal reglamentaria SR-04 (NO PASE / SENTIDO PROHIBIDO)?",
      opcion_a: "Prohíbe el adelantamiento de camiones pesados",
      opcion_b: "Prohíbe circular a más de 20 km/h",
      opcion_c:
        "Prohíbe la entrada de vehículos a una calzada en esa dirección porque el sentido de circulación es opuesto",
      opcion_d: "Prohíbe usar la berma",
      respuesta_correcta: "c",
      explicacion:
        "La señal SR-04 (círculo rojo con franja horizontal blanca) advierte que no se puede ingresar por esa vía debido a que el tránsito circula en sentido contrario, previniendo choques frontales letales.",
      fundamento_legal: "Manual de Señalización Vial de Colombia 2024.",
      source: SOURCES.MANUAL_SENALIZACION,
      dificultad: "facil",
    }),
    know({
      id: "cale-l01-076",
      lote: LOTE,
      nucleo_nombre: "Senalizacion vial e infraestructura",
      subtema: "giro prohibido a la izquierda",
      hecho_canonico_id: "l01-sen-06",
      pregunta:
        "¿Qué maniobras veda la señal reglamentaria SR-06 (PROHIBIDO GIRAR A LA IZQUIERDA)?",
      opcion_a: "Únicamente prohíbe adelantar por la izquierda",
      opcion_b: "Solo aplica en horarios nocturnos",
      opcion_c: "Autoriza girar en U si no hay semáforo en la esquina",
      opcion_d: "Prohíbe virar hacia la izquierda y prohíbe también la maniobra de giro en U",
      respuesta_correcta: "d",
      explicacion:
        "La señal SR-06 prohíbe el giro a la izquierda; por extensión técnica y legal, también prohíbe realizar el giro en U en ese punto, ya que esta última maniobra involucra un viraje inicial hacia la izquierda.",
      fundamento_legal: "Manual de Señalización Vial de Colombia 2024.",
      source: SOURCES.MANUAL_SENALIZACION,
      dificultad: "media",
    }),
    know({
      id: "cale-l01-077",
      lote: LOTE,
      nucleo_nombre: "Senalizacion vial e infraestructura",
      subtema: "senal prohibido girar en u",
      hecho_canonico_id: "l01-sen-07",
      pregunta: "¿Dónde suele instalarse la señal reglamentaria SR-10 (PROHIBIDO GIRAR EN U)?",
      opcion_a:
        "En vías donde el radio de giro, la visibilidad reducida o el flujo continuo convierten el retorno en una maniobra de alto peligro de colisión",
      opcion_b: "En todas las entradas de parqueaderos privados",
      opcion_c: "Exclusivamente en calles peatonales",
      opcion_d: "Solo en puentes internacionales",
      respuesta_correcta: "a",
      explicacion:
        "El retorno en U bloquea varios carriles simultáneamente. La señal SR-10 se ubica en sitios donde dicha maniobra crearía conflictos críticos con los flujos vehiculares y peatonales.",
      fundamento_legal: "Manual de Señalización Vial de Colombia 2024.",
      source: SOURCES.MANUAL_SENALIZACION,
      dificultad: "facil",
    }),
    know({
      id: "cale-l01-078",
      lote: LOTE,
      nucleo_nombre: "Senalizacion vial e infraestructura",
      subtema: "prohibido cambio de calzada sr-14",
      hecho_canonico_id: "l01-sen-08",
      pregunta:
        "¿Qué restricción impone la señal reglamentaria SR-14 (PROHIBIDO EL CAMBIO DE CALZADA)?",
      opcion_a: "Prohíbe circular en reversa",
      opcion_b:
        "Impide pasar de la calzada rápida o central a la calzada lateral o lenta en ese sector de la vía",
      opcion_c: "Exige el cambio inmediato de neumáticos",
      opcion_d: "Indica fin de la doble calzada",
      respuesta_correcta: "b",
      explicacion:
        "La señal SR-14 prohíbe el traspaso entre calzadas adyacentes del mismo sentido (por ejemplo, entre calzadas centrales y laterales) para evitar entrecruzamientos peligrosos en tramos de alta velocidad.",
      fundamento_legal: "Manual de Señalización Vial de Colombia 2024.",
      source: SOURCES.MANUAL_SENALIZACION,
      dificultad: "media",
    }),
    know({
      id: "cale-l01-079",
      lote: LOTE,
      nucleo_nombre: "Senalizacion vial e infraestructura",
      subtema: "senal prohibido adelantar sr-16",
      hecho_canonico_id: "l01-sen-09",
      pregunta:
        "Al observar la señal reglamentaria SR-16 (PROHIBIDO ADELANTAR), ¿a qué vehículos se prohíbe sobrepasar?",
      opcion_a: "Solo se prohíbe sobrepasar a camiones y tractomulas",
      opcion_b: "Se puede adelantar si el vehículo delantero va a menos de 20 km/h",
      opcion_c:
        "Se prohíbe adelantar a cualquier vehículo automotor, debiendo conservar la posición en la fila hasta que termine la restricción",
      opcion_d: "Solo prohíbe adelantar a motocicletas",
      respuesta_correcta: "c",
      explicacion:
        "La señal SR-16 muestra dos automóviles en paralelo dentro del círculo reglamentario y prohíbe terminantemente a todo conductor de vehículo automotor adelantar a otro en ese tramo de vía.",
      fundamento_legal: "Manual de Señalización Vial de Colombia 2024; Ley 769 de 2002, Art. 73.",
      source: SOURCES.MANUAL_SENALIZACION,
      dificultad: "facil",
    }),
    know({
      id: "cale-l01-080",
      lote: LOTE,
      nucleo_nombre: "Senalizacion vial e infraestructura",
      subtema: "senal no bloquear cruce sr-26",
      hecho_canonico_id: "l01-sen-10",
      pregunta: "¿Qué conducta prohíbe expresamente la señal SR-26 (NO BLOQUEAR CRUCE)?",
      opcion_a: "Prohíbe cruzar con luz verde si no hay agentes",
      opcion_b: "Prohíbe el uso de luces exploradoras",
      opcion_c: "Prohíbe parquear a más de cinco cuadras del lugar de residencia",
      opcion_d:
        "Prohíbe ingresar a la intersección si no se dispone de espacio libre adelante para salir de ella, evitando obstruir el paso transversal",
      respuesta_correcta: "d",
      explicacion:
        "La señal SR-26 se complementa con la demarcación de cuadrícula amarilla en el piso y prohíbe quedar detenido dentro del cruce, pues paraliza el tráfico transversal y bloquea pasos peatonales.",
      fundamento_legal:
        "Manual de Señalización Vial 2024; Ley 769 de 2002, Art. 131, infracción C.03.",
      source: SOURCES.MANUAL_SENALIZACION,
      dificultad: "facil",
    }),
    know({
      id: "cale-l01-081",
      lote: LOTE,
      nucleo_nombre: "Senalizacion vial e infraestructura",
      subtema: "diferencia entre sr-28 y sr-28a",
      hecho_canonico_id: "l01-sen-11",
      pregunta:
        "¿Cuál es la diferencia entre la señal SR-28 (una franja diagonal) y la señal SR-28A (dos franjas diagonales en cruz)?",
      opcion_a:
        "SR-28 prohíbe parquear pero permite la detención momentánea para dejar/recoger pasajeros; SR-28A prohíbe tanto parquear como detener el vehículo por cualquier motivo",
      opcion_b: "SR-28 aplica para carros particulares y SR-28A aplica exclusivamente a motos",
      opcion_c: "SR-28 prohíbe estacionar de noche y SR-28A prohíbe estacionar de día",
      opcion_d: "No existe diferencia reglamentaria entre ambas señales",
      respuesta_correcta: "a",
      explicacion:
        "La señal SR-28 (Prohibido parquear) permite una parada momentánea de segundos para subir o bajar pasajeros sin apagar el motor. La señal SR-28A (Prohibido parquear y detenerse) veda incluso la detención momentánea.",
      fundamento_legal: "Manual de Señalización Vial de Colombia 2024.",
      source: SOURCES.MANUAL_SENALIZACION,
      dificultad: "media",
    }),
    know({
      id: "cale-l01-082",
      lote: LOTE,
      nucleo_nombre: "Senalizacion vial e infraestructura",
      subtema: "senal velocidad maxima sr-30",
      hecho_canonico_id: "l01-sen-12",
      pregunta: "¿Cómo debe interpretarse el número inscrito en la señal reglamentaria SR-30?",
      opcion_a: "Como la velocidad mínima a la que está obligado a circular el conductor",
      opcion_b:
        "Como la velocidad máxima permitida en kilómetros por hora para ese tramo en condiciones óptimas",
      opcion_c: "Como el kilometraje exacto que falta para llegar al siguiente peaje",
      opcion_d: "Como el número de la ruta departamental",
      respuesta_correcta: "b",
      explicacion:
        "La señal SR-30 notifica la velocidad límite superior autorizada en km/h. Conducir por encima de dicho guarismo constituye exceso de velocidad sancionado con comparendo C.29.",
      fundamento_legal:
        "Manual de Señalización Vial de Colombia 2024; Ley 769 de 2002, Art. 106 y 107.",
      source: SOURCES.MANUAL_SENALIZACION,
      dificultad: "facil",
    }),
    know({
      id: "cale-l01-083",
      lote: LOTE,
      nucleo_nombre: "Senalizacion vial e infraestructura",
      subtema: "senal prohibido pitar sr-38",
      hecho_canonico_id: "l01-sen-13",
      pregunta:
        "¿Dónde es mandatoria la instalación de la señal reglamentaria SR-38 (PROHIBIDO EL USO DE SEÑALES ACÚSTICAS)?",
      opcion_a: "En curvas cerradas de alta siniestralidad",
      opcion_b: "Únicamente en vías de trocha o rurales",
      opcion_c:
        "En la aproximación a hospitales, sanatorios, centros de salud y zonas residenciales o educativas tranquilas",
      opcion_d: "En túneles vehiculares de más de un kilómetro",
      respuesta_correcta: "c",
      explicacion:
        "La señal SR-38 prohíbe el uso de la bocina cerca de centros hospitalarios y educativos para preservar la recuperación de pacientes y la concentración estudiantil frente al ruido nocivo.",
      fundamento_legal: "Manual de Señalización Vial 2024; Ley 769 de 2002, Art. 104.",
      source: SOURCES.MANUAL_SENALIZACION,
      dificultad: "facil",
    }),
    know({
      id: "cale-l01-084",
      lote: LOTE,
      nucleo_nombre: "Senalizacion vial e infraestructura",
      subtema: "senal circulacion prohibida peatones sr-39",
      hecho_canonico_id: "l01-sen-14",
      pregunta: "¿Qué advierte la señal reglamentaria SR-39 (PROHIBIDO EL PASO DE PEATONES)?",
      opcion_a: "Que los peatones tienen prelación sobre la calzada",
      opcion_b: "Que hay una pasarela peatonal dañada adelante",
      opcion_c: "Que los peatones deben correr al cruzar la vía",
      opcion_d:
        "Que por razones de diseño y alta velocidad (autopistas, viaductos o túneles) está prohibido el tránsito peatonal a nivel de calzada",
      respuesta_correcta: "d",
      explicacion:
        "La señal SR-39 resguarda la vida de los transeúntes vedando su circulación en corredores donde la alta velocidad de los automotores hace inviable la coexistencia segura a pie.",
      fundamento_legal: "Manual de Señalización Vial de Colombia 2024.",
      source: SOURCES.MANUAL_SENALIZACION,
      dificultad: "facil",
    }),
    know({
      id: "cale-l01-085",
      lote: LOTE,
      nucleo_nombre: "Senalizacion vial e infraestructura",
      subtema: "senal vehiculos de traccion animal sr-40",
      hecho_canonico_id: "l01-sen-15",
      pregunta:
        "¿Qué restringe la señal reglamentaria SR-40 (CIRCULACIÓN PROHIBIDA DE VEHÍCULOS DE TRACCIÓN ANIMAL)?",
      opcion_a:
        "El tránsito de carretas, zorras o carruajes halados por caballos o bueyes en vías urbanas o autopistas de flujo rápido",
      opcion_b: "El transporte de mascotas dentro de vehículos particulares",
      opcion_c: "El paso de camiones ganaderos cerrados",
      opcion_d: "La presencia de perros guía en el andén",
      respuesta_correcta: "a",
      explicacion:
        "La señal SR-40 veda la circulación de vehículos halados por animales en arterias urbanas y autopistas para proteger tanto a los animales como a los usuarios de la vía frente a colisiones por alcance.",
      fundamento_legal: "Manual de Señalización Vial de Colombia 2024; Ley 769 de 2002, Art. 98.",
      source: SOURCES.MANUAL_SENALIZACION,
      dificultad: "facil",
    }),
    // El vehiculo (15)
    know({
      id: "cale-l01-086",
      lote: LOTE,
      nucleo_nombre: "El vehiculo",
      subtema: "freno de servicio",
      hecho_canonico_id: "l01-veh-01",
      pregunta:
        "¿Sobre qué componentes del vehículo actúa el freno de servicio accionado mediante el pedal de freno?",
      opcion_a: "Únicamente sobre las dos ruedas directrices delanteras",
      opcion_b:
        "Sobre las cuatro ruedas del vehículo de manera simultánea e hidráulica o neumática",
      opcion_c: "Exclusivamente sobre el eje de transmisión y la caja de velocidades",
      opcion_d: "Solo sobre la rueda de repuesto",
      respuesta_correcta: "b",
      explicacion:
        "El freno de servicio es el sistema principal de desaceleración y actúa sobre todas las ruedas del automóvil para asegurar una frenada equilibrada que evite trompos o desviaciones de trayectoria.",
      fundamento_legal: "Manual de Referencia ANSV sobre sistemas mecánicos de seguridad activa.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    know({
      id: "cale-l01-087",
      lote: LOTE,
      nucleo_nombre: "El vehiculo",
      subtema: "freno de estacionamiento",
      hecho_canonico_id: "l01-veh-02",
      pregunta:
        "¿Cuál es la función principal y el mecanismo de acción del freno de estacionamiento (freno de mano)?",
      opcion_a: "Aumentar la presión de aceite en el motor al arrancar en frío",
      opcion_b: "Ayudar a tomar curvas a alta velocidad derrapando la cola del carro",
      opcion_c:
        "Inmovilizar mecánicamente las ruedas traseras del vehículo cuando está detenido o parqueado, impidiendo que ruede involuntariamente",
      opcion_d: "Sustituir al freno de servicio en todas las frenadas cotidianas de ciudad",
      respuesta_correcta: "c",
      explicacion:
        "El freno de mano opera mediante guayas mecánicas independientes del circuito hidráulico, bloqueando las ruedas traseras para mantener inmóvil el vehículo estacionado, sobre todo en pendientes.",
      fundamento_legal: "Manual de Referencia ANSV sobre sistemas de frenado.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    know({
      id: "cale-l01-088",
      lote: LOTE,
      nucleo_nombre: "El vehiculo",
      subtema: "frenos de disco vs tambor",
      hecho_canonico_id: "l01-veh-03",
      pregunta:
        "¿Qué ventaja técnica ofrecen los frenos de disco en comparación con los frenos de tambor tradicionales?",
      opcion_a: "Son completamente inmunes a cualquier tipo de desgaste mecánico",
      opcion_b: "No requieren el uso de líquido de frenos",
      opcion_c: "Hacen que el vehículo consuma un 30% menos de gasolina",
      opcion_d:
        "Disipan el calor con mayor rapidez al estar expuestos al aire, reduciendo el riesgo de fatiga térmica y evacuando mejor el agua",
      respuesta_correcta: "d",
      explicacion:
        "Los frenos de disco tienen una mejor refrigeración natural por su diseño abierto, lo que evita que las pastillas se sobrecalienten con facilidad y conserven su coeficiente de fricción.",
      fundamento_legal: "Manual de Referencia ANSV sobre seguridad activa del automotor.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l01-089",
      lote: LOTE,
      nucleo_nombre: "El vehiculo",
      subtema: "liquido de frenos higroscopico",
      hecho_canonico_id: "l01-veh-04",
      pregunta:
        "¿Por qué el líquido de frenos debe cambiarse periódicamente según la pauta del fabricante?",
      opcion_a:
        "Porque es un fluido higroscópico que absorbe humedad del aire ambiental, lo cual reduce drásticamente su punto de ebullición y oxida el circuito",
      opcion_b: "Porque se evapora completamente cada seis meses por el calor del motor",
      opcion_c: "Porque se vuelve combustible e incrementa la velocidad",
      opcion_d: "Porque cambia de color para decorar el depósito transparente",
      respuesta_correcta: "a",
      explicacion:
        "Al absorber agua con el paso de los años, el líquido de frenos hierve a menor temperatura. En frenadas intensas, el agua absorbida se transforma en vapor de agua comprimible ('vapor lock') y el pedal se va al fondo sin frenar.",
      fundamento_legal:
        "Manual de Referencia ANSV sobre mantenimiento preventivo del sistema de frenos.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "dificil",
    }),
    know({
      id: "cale-l01-090",
      lote: LOTE,
      nucleo_nombre: "El vehiculo",
      subtema: "inspeccion nivel liquido frenos",
      hecho_canonico_id: "l01-veh-05",
      pregunta:
        "Durante la inspección preoperacional, ¿dónde y cómo debe verificarse el nivel del líquido de frenos?",
      opcion_a: "En el depósito del radiador con el motor caliente",
      opcion_b:
        "En el depósito translúcido situado sobre la bomba principal de frenos, comprobando visualmente que el nivel esté entre las marcas MIN y MAX",
      opcion_c: "Destapando el tubo de escape con una varilla metálica",
      opcion_d: "Midiendo el líquido que gotea por debajo de las llantas",
      respuesta_correcta: "b",
      explicacion:
        "El depósito del líquido de frenos permite verificar el nivel a través de su material plástico sin destaparlo, evitando contaminar el fluido con la humedad del ambiente.",
      fundamento_legal: "Manual de Referencia ANSV sobre inspección preoperacional diaria.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    know({
      id: "cale-l01-091",
      lote: LOTE,
      nucleo_nombre: "El vehiculo",
      subtema: "fading o fatiga termica de frenos",
      hecho_canonico_id: "l01-veh-06",
      pregunta:
        "¿Qué es el fenómeno de 'fading' o cristalización de los frenos y cuándo suele producirse?",
      opcion_a: "Una congelación del pedal de freno durante noches de helada",
      opcion_b: "El desgaste parejo y saludable de las bandas de freno",
      opcion_c:
        "La pérdida transitoria o total de la capacidad de frenado ocasionada por el sobrecalentamiento excesivo de pastillas y discos en descensos prolongados",
      opcion_d: "Un sistema automático que limpia el polvo de las ruedas",
      respuesta_correcta: "c",
      explicacion:
        "Al bajar una pendiente abusando del pedal de freno sin usar freno motor, el calor extremo cristaliza el material de fricción de las pastillas, perdiendo adherencia contra el disco y dejando al vehículo sin frenos.",
      fundamento_legal: "Manual de Referencia ANSV sobre técnicas de descenso y cuidado de frenos.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l01-092",
      lote: LOTE,
      nucleo_nombre: "El vehiculo",
      subtema: "principio de funcionamiento abs",
      hecho_canonico_id: "l01-veh-07",
      pregunta:
        "¿Cuál es el beneficio primordial del sistema de frenos antibloqueo (ABS) en una frenada de emergencia?",
      opcion_a:
        "Hacer que el carro frene siempre en la mitad de la distancia sin importar el pavimento",
      opcion_b: "Eliminar el desgaste de las pastillas de freno",
      opcion_c: "Acelerar el vehículo automáticamente para salir de una colisión",
      opcion_d:
        "Evitar que las ruedas se bloqueen o patinen, permitiendo al conductor mantener el control de la dirección para esquivar obstáculos mientras frena",
      respuesta_correcta: "d",
      explicacion:
        "Cuando una rueda se bloquea y patina, pierde por completo la capacidad directriz (el carro va recto aunque se gire el timón). El ABS modula la presión milisegundo a milisegundo para conservar el control del volante.",
      fundamento_legal: "Manual de Referencia ANSV sobre sistemas de seguridad activa.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l01-093",
      lote: LOTE,
      nucleo_nombre: "El vehiculo",
      subtema: "tecnica de frenado con abs",
      hecho_canonico_id: "l01-veh-08",
      pregunta:
        "¿Cómo debe actuar el conductor al ejecutar una frenada de pánico en un vehículo dotado de sistema ABS?",
      opcion_a:
        "Pisar con fuerza y de forma continua el pedal de freno hasta el fondo sin soltarlo, ignorando la vibración o pulsación en el pedal",
      opcion_b: "Bombear el pedal de freno soltándolo y pisándolo repetidamente",
      opcion_c: "Jalar de inmediato la palanca del freno de mano para ayudar a frenar",
      opcion_d: "Apagar el switch de encendido para que el motor se detenga de golpe",
      respuesta_correcta: "a",
      explicacion:
        "Con ABS jamás se debe bombear el freno; el sistema electrónico realiza el bombeo cientos de veces por segundo. La vibración en el pedal es el síntoma normal de que el sistema está trabajando eficientemente.",
      fundamento_legal:
        "Manual de Referencia ANSV sobre técnicas de conducción y sistemas de freno.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l01-094",
      lote: LOTE,
      nucleo_nombre: "El vehiculo",
      subtema: "profundidad minima labrado livianos",
      hecho_canonico_id: "l01-veh-09",
      pregunta:
        "En Colombia, ¿cuál es la profundidad mínima legal permitida en el labrado de las llantas para automóviles y camperos?",
      opcion_a: "0,5 milímetros",
      opcion_b: "1,6 milímetros",
      opcion_c: "3,0 milímetros",
      opcion_d: "5,0 milímetros",
      respuesta_correcta: "b",
      explicacion:
        "La norma técnica y el Código de Tránsito exigen una profundidad mínima de 1,6 mm en vehículos livianos. Por debajo de este límite la llanta se considera lisa, no evacúa agua y es causal de inmovilización.",
      fundamento_legal:
        "Resolución 20253040037125; Norma Técnica Colombiana NTC 5375; Ley 769 de 2002.",
      source: SOURCES.RESOLUCION_CALE,
      dificultad: "facil",
    }),
    know({
      id: "cale-l01-095",
      lote: LOTE,
      nucleo_nombre: "El vehiculo",
      subtema: "profundidad minima labrado pesados y motos",
      hecho_canonico_id: "l01-veh-10",
      pregunta:
        "¿Cuál es la profundidad mínima legal del dibujo de la llanta para vehículos de servicio pesado y para motocicletas en Colombia?",
      opcion_a: "1,6 mm para motocicletas y 0,8 mm para camiones",
      opcion_b: "4,0 mm para ambos tipos de vehículos",
      opcion_c: "2,0 mm para vehículos pesados y 1,0 mm para motocicletas",
      opcion_d: "3,0 mm para motocicletas y 5,0 mm para camiones",
      respuesta_correcta: "c",
      explicacion:
        "De acuerdo con los criterios de revisión técnico-mecánica en Colombia, los camiones y buses de servicio pesado requieren mínimo 2,0 mm de profundidad, y las motocicletas mínimo 1,0 mm.",
      fundamento_legal: "Norma Técnica Colombiana NTC 5375; Manual CALE ANSV.",
      source: SOURCES.RESOLUCION_CALE,
      dificultad: "media",
    }),
    know({
      id: "cale-l01-096",
      lote: LOTE,
      nucleo_nombre: "El vehiculo",
      subtema: "testigos twi de la llanta",
      hecho_canonico_id: "l01-veh-11",
      pregunta:
        "¿Qué indican los resaltes o tacos pequeños situados en el fondo de las ranuras de la llanta marcados con las letras TWI?",
      opcion_a: "El punto exacto donde se debe colocar la cadena para nieve o lodo",
      opcion_b: "La dirección obligatoria de giro del neumático",
      opcion_c: "El lugar por donde se inyecta el nitrógeno en la fábrica",
      opcion_d:
        "El indicador de desgaste de la banda de rodadura; cuando el dibujo se desgasta al nivel del testigo (1,6 mm), la llanta debe sustituirse de inmediato",
      respuesta_correcta: "d",
      explicacion:
        "TWI significa Tread Wear Indicator. Cuando el caucho de la banda de rodadura se desgasta hasta quedar al ras con estos resaltes de 1,6 mm, la llanta ha llegado al límite legal de su vida útil.",
      fundamento_legal: "Manual de Referencia ANSV sobre inspección de neumáticos.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l01-097",
      lote: LOTE,
      nucleo_nombre: "El vehiculo",
      subtema: "presion de inflado insuficiente",
      hecho_canonico_id: "l01-veh-12",
      pregunta:
        "¿Cuáles son las consecuencias de circular habitualmente con una presión de inflado inferior a la indicada por el fabricante?",
      opcion_a:
        "Desgaste excesivo en los bordes u hombros de la llanta, calentamiento peligroso del neumático y mayor consumo de combustible",
      opcion_b: "Mayor desgaste en el centro de la llanta y ahorro sustancial de combustible",
      opcion_c: "Aumento de la velocidad final del automóvil",
      opcion_d: "Inmunidad total frente a los pinchazos por clavos",
      respuesta_correcta: "a",
      explicacion:
        "La baja presión flexiona en exceso los flancos de la llanta generando sobrecalentamiento que puede desintegrarla en carretera, además de desgastar prematuramente los hombros y exigir más esfuerzo al motor.",
      fundamento_legal: "Manual de Referencia ANSV sobre mantenimiento de neumáticos y seguridad.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l01-098",
      lote: LOTE,
      nucleo_nombre: "El vehiculo",
      subtema: "presion de inflado excesiva",
      hecho_canonico_id: "l01-veh-13",
      pregunta:
        "¿Qué efecto negativo provoca inflar los neumáticos con una presión sensiblemente superior a la recomendada?",
      opcion_a: "Desgaste prematuro de los hombros laterales de la llanta",
      opcion_b:
        "Desgaste acelerado en el centro de la banda de rodadura, menor superficie de contacto con la calzada y marcha más dura e inestable",
      opcion_c: "Aparición de humo azul en el tubo de escape",
      opcion_d: "Bloqueo constante del alternador",
      respuesta_correcta: "b",
      explicacion:
        "El exceso de aire hace que la llanta se redondee; el área de contacto disminuye, reduciendo el agarre en curvas y frenadas, además de castigar severamente los amortiguadores y desgastar el centro de la banda.",
      fundamento_legal: "Manual de Referencia ANSV sobre física y adherencia vehicular.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l01-099",
      lote: LOTE,
      nucleo_nombre: "El vehiculo",
      subtema: "lectura del codigo dot en llantas",
      hecho_canonico_id: "l01-veh-14",
      pregunta:
        "¿Cómo se interpreta la fecha de fabricación en el código DOT de una llanta que finaliza con los cuatro dígitos '2423'?",
      opcion_a: "Fabricada el día 24 del mes 23 del calendario",
      opcion_b: "Vencimiento programado para el año 2423",
      opcion_c: "Fabricada en la semana 24 del año 2023",
      opcion_d: "Presión máxima de inflado de 24 libras y 23 pulgadas de diámetro",
      respuesta_correcta: "c",
      explicacion:
        "Los últimos cuatro números del código DOT indican la semana (dos primeros dígitos) y el año de fabricación (dos últimos dígitos). 2423 significa semana 24 del año 2023; llantas con más de 5 años envejecen y pierden elasticidad.",
      fundamento_legal: "Manual de Referencia ANSV sobre inspección técnica de neumáticos.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l01-100",
      lote: LOTE,
      nucleo_nombre: "El vehiculo",
      subtema: "rotacion de llantas",
      hecho_canonico_id: "l01-veh-15",
      pregunta:
        "¿Cuál es el objetivo principal de realizar la rotación periódica de las llantas cada 10.000 kilómetros?",
      opcion_a: "Cambiar el sentido de giro del motor para equilibrar el aceite",
      opcion_b: "Reducir la necesidad de usar líquido de frenos",
      opcion_c: "Verificar que los rines no tengan pintura rayada",
      opcion_d:
        "Homogeneizar el desgaste natural entre las llantas del eje directriz/motriz y las del eje libre, prolongando la vida útil con máxima seguridad",
      respuesta_correcta: "d",
      explicacion:
        "Las llantas delanteras soportan mayor peso (motor) y sufren el desgaste de la dirección y la tracción en la mayoría de autos. Rotarlas periódicamente logra un desgaste uniforme en los cuatro neumáticos.",
      fundamento_legal: "Manual de Referencia ANSV sobre mantenimiento preventivo del vehículo.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
  ],
};
