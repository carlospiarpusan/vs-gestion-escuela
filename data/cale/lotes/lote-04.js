/* eslint-disable @typescript-eslint/no-require-imports */

const {
  createAttitudeQuestion: att,
  createKnowledgeQuestion: know,
  SOURCES,
} = require("../schema");

const LOTE = "lote-04";

module.exports = {
  lote: LOTE,
  version: 2,
  descripcion:
    "Lote 04 del banco CALE editorial - Usuarios vulnerables, ecoconduccion, licencias, SOAT, RTM, senalizacion de obra e inspeccion preoperacional.",
  items: [
    att({
      id: "cale-l04-301",
      lote: LOTE,
      subtema: "convivencia con ciclistas en ascenso",
      hecho_canonico_id: "l04-att-01",
      pregunta:
        "En una carretera de montaña estrecha y en ascenso, un grupo de ciclistas pedalea despacio ocupando su carril. ¿Cuál es la actitud responsable del conductor?",
      sentido_clave: "seleccion",
      opcion_a:
        "Guardar distancia prudente detrás de ellos con paciencia y adelantar únicamente cuando la visibilidad sea total y pueda dejar al menos 1,5 metros de separación lateral",
      opcion_b: "Tocar la bocina en tono amenazante y empujarlos con el parachoques",
      opcion_c: "Acelerar a fondo y pasar rozando a los ciclistas para despejar la vía rápidamente",
      opcion_d: "Adelantar en plena curva cerrada a ciegas confiando en la suerte",
      respuesta_recomendada: "a",
      explicacion:
        "Los ciclistas en subida hacen un esfuerzo físico considerable y pueden perder el equilibrio ante ráfagas o sustos. Esperar un tramo recto y respetar la distancia legal de 1,5 metros preserva sus vidas.",
      fundamento_legal: "Ley 1811 de 2016, Art. 1; Ley 769 de 2002, Art. 60.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    att({
      id: "cale-l04-302",
      lote: LOTE,
      subtema: "respeto por ciclorrutas y carriles exclusivos",
      hecho_canonico_id: "l04-att-02",
      pregunta:
        "Hay un trancón severo en la calzada vehicular mixta y el bicicarril segregado al costado derecho está totalmente vacío. ¿Qué decisión toma?",
      sentido_clave: "seleccion",
      opcion_a: "Meter el automóvil por el bicicarril para avanzar tres cuadras y doblar",
      opcion_b:
        "Permanecer en el carril vehicular correspondiente y respetar de forma absoluta el espacio exclusivo de los ciclistas",
      opcion_c: "Invadir el bicicarril solo con dos ruedas para ir más rápido",
      opcion_d: "Estacionarse sobre el bicicarril a contestar un mensaje de texto",
      respuesta_recomendada: "b",
      explicacion:
        "Las ciclorrutas e infraestructura exclusiva garantizan la supervivencia de los usuarios vulnerables. Invadirlas con automotores expone a los ciclistas a siniestros graves y genera multas severas.",
      fundamento_legal: "Ley 769 de 2002, Art. 131, infracción D.05; Ley 1811 de 2016.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    att({
      id: "cale-l04-303",
      lote: LOTE,
      subtema: "aproximacion a bus escolar detenido",
      hecho_canonico_id: "l04-att-03",
      pregunta:
        "Un bus escolar se detiene delante de usted con luces destellantes para dejar a varios niños. ¿Qué comportamiento preventivo debe adoptar?",
      sentido_clave: "seleccion",
      opcion_a: "Acelerar y pasarlo a toda velocidad antes de que los niños desciendan",
      opcion_b: "Tocar la bocina continuamente para que los niños no se acerquen a su carro",
      opcion_c:
        "Reducir la velocidad al mínimo o detenerse, observando con extrema atención ante la alta probabilidad de que un niño cruce la calle corriendo por delante o detrás del bus",
      opcion_d: "Pasarlo por la derecha usando el andén peatonal",
      respuesta_recomendada: "c",
      explicacion:
        "Los niños tienen menor percepción del riesgo y campo visual reducido, y el tamaño del bus oculta su presencia. Disminuir la velocidad y prepararse para frenar evita atropellos fatales.",
      fundamento_legal:
        "Ley 769 de 2002, Art. 105; Manual de Referencia ANSV sobre usuarios vulnerables.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    att({
      id: "cale-l04-304",
      lote: LOTE,
      subtema: "respeto por trabajadores de obra vial",
      hecho_canonico_id: "l04-att-04",
      pregunta:
        "Al atravesar una zona de obras en la carretera, un auxiliar de tránsito (paletero) muestra la paleta de SIGA. ¿Cómo debe pasar por la zona de trabajo?",
      sentido_clave: "seleccion",
      opcion_a: "Acelerar al límite máximo de la carretera para no perder tiempo",
      opcion_b: "Cerrar los ojos y pasar a ciegas levantando polvo",
      opcion_c: "Lanzar objetos a los obreros por generar retrasos en el viaje",
      opcion_d:
        "Avanzar a velocidad reducida y constante, con máxima atención al paso cercano de obreros y maquinaria pesada",
      respuesta_recomendada: "d",
      explicacion:
        "Los obreros y auxiliares viales laboran a escasos centímetros del tráfico vehicular. Respetar los límites temporales de obra protege su integridad física en un entorno laboral de alto riesgo.",
      fundamento_legal: "Manual de Señalización Vial 2024, Capítulo 4; Ley 769 de 2002, Art. 115.",
      source: SOURCES.MANUAL_SENALIZACION,
      dificultad: "facil",
    }),
    att({
      id: "cale-l04-305",
      lote: LOTE,
      subtema: "etica ante documentos obligatorios soat y rtm",
      hecho_canonico_id: "l04-att-05",
      pregunta:
        "Le ofrecen comprar un certificado de Revisión Técnico-Mecánica o póliza de SOAT sin presentar el vehículo a revisión ni pagar la tarifa legal. ¿Cuál es la postura ética y legal?",
      sentido_clave: "seleccion",
      opcion_a:
        "Rechazar de plano la propuesta y realizar los trámites legales en Centros de Diagnóstico y aseguradoras autorizados, garantizando que el carro sea seguro y tenga respaldo real",
      opcion_b: "Aceptar la oferta para ahorrar dinero y tiempo",
      opcion_c: "Aceptarla solo si el vehículo es de modelo reciente",
      opcion_d: "Comprar el documento falso y prestarlo a otros familiares",
      respuesta_recomendada: "a",
      explicacion:
        "Adquirir documentos falsificados es un delito penal de falsedad y fraude, y circular con un carro sin verificar mecánicamente o sin póliza real deja desprotegidas a las víctimas ante una tragedia.",
      fundamento_legal: "Ley 769 de 2002, Art. 50 y Art. 131; Código Penal Colombiano, Art. 289.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    att({
      id: "cale-l04-306",
      lote: LOTE,
      subtema: "colaboracion en puestos de control de transito",
      hecho_canonico_id: "l04-att-06",
      pregunta:
        "Una autoridad de tránsito le indica orillarse en un puesto de control en carretera para verificar antecedentes y documentos. ¿Cuál es su actitud?",
      sentido_clave: "seleccion",
      opcion_a: "Acelerar y evadir el retén poniendo en riesgo a los uniformados y demás usuarios",
      opcion_b:
        "Atender la orden con respeto, detenerse en el lugar indicado, apagar el motor y presentar la documentación requerida con serenidad",
      opcion_c: "Bajarse del vehículo insultando y amenazando con influencias políticas",
      opcion_d: "Negarse a abrir la ventanilla y encerrarse con seguro",
      respuesta_recomendada: "b",
      explicacion:
        "Los controles de tránsito verifican la legalidad y seguridad en las carreteras. Cooperar con respeto agiliza el procedimiento y fomenta la cultura de la legalidad institucional.",
      fundamento_legal: "Ley 769 de 2002, Art. 7 y Art. 131, infracción C.36; Ley 1801 de 2016.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    att({
      id: "cale-l04-307",
      lote: LOTE,
      subtema: "asertividad ante presion social de pasajeros",
      hecho_canonico_id: "l04-att-07",
      pregunta:
        "Los amigos que viajan con usted en el vehículo le insisten en que acelere más allá del límite permitido y haga maniobras peligrosas para 'sentir adrenalina'. ¿Cómo actúa?",
      sentido_clave: "seleccion",
      opcion_a: "Ceder a la presión para no ser objeto de burlas en el grupo",
      opcion_b: "Soltar el volante en plena marcha para asustarlos",
      opcion_c:
        "Mantenerse firme y asertivo, recordando que la responsabilidad legal y moral de la vida de todos a bordo recae en el conductor, respetando siempre los límites de velocidad",
      opcion_d: "Retar a carreras ilegales a otros conductores en la vía",
      respuesta_recomendada: "c",
      explicacion:
        "El conductor es la máxima autoridad de seguridad dentro del vehículo. La asertividad para rechazar provocaciones y priorizar la seguridad previene siniestros derivados de la presión grupal.",
      fundamento_legal:
        "Manual de Referencia ANSV sobre factores psicosociales y toma de decisiones.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    att({
      id: "cale-l04-308",
      lote: LOTE,
      subtema: "responsabilidad ante medicamentos que causan somnolencia",
      hecho_canonico_id: "l04-att-08",
      pregunta:
        "El médico le receta un antihistamínico fuerte o relajante que advierte en el empaque 'produce somnolencia; no opere maquinaria ni conduzca'. ¿Qué decisión toma?",
      sentido_clave: "seleccion",
      opcion_a: "Tomarse el medicamento y conducir tomando café cargado para neutralizar el efecto",
      opcion_b: "Duplicar la dosis del fármaco para terminar el tratamiento más rápido",
      opcion_c: "Conducir solo distancias cortas a más de 80 km/h para llegar antes de dormirse",
      opcion_d:
        "Abstenerse por completo de conducir mientras dure el tratamiento o utilizar transporte público",
      respuesta_recomendada: "d",
      explicacion:
        "Los psicofármacos y medicamentos con advertencia de sedación reducen el tiempo de reacción y la vigilancia mental tanto o más que el alcohol. Conducir bajo sus efectos es altamente riesgoso.",
      fundamento_legal:
        "Manual de Referencia ANSV sobre farmacología y conducción; Ley 769 de 2002.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    att({
      id: "cale-l04-309",
      lote: LOTE,
      subtema: "disciplina en la inspeccion preoperacional diaria",
      hecho_canonico_id: "l04-att-09",
      pregunta:
        "Tiene prisa por salir a trabajar por la mañana. ¿Cómo debe gestionar la inspección visual preoperacional del automóvil?",
      sentido_clave: "seleccion",
      opcion_a:
        "Tomarse unos minutos indispensables para realizar una ronda visual rápida alrededor del vehículo (llantas, luces, espejos y ausencia de fugas)",
      opcion_b: "Omitirla durante meses porque el carro es moderno y nunca ha fallado",
      opcion_c: "Arrancar de inmediato acelerando a fondo con el freno de mano puesto",
      opcion_d: "Hacer la inspección únicamente cuando el vehículo se quede varado en la vía",
      respuesta_recomendada: "a",
      explicacion:
        "Una rápida inspección de 360 grados detecta llantas bajas, vidrios sucios o charcos de líquidos antes de iniciar la marcha, evitando siniestros mecánicos y averías costosas en plena ruta.",
      fundamento_legal: "Manual de Referencia ANSV sobre inspección técnica preoperacional.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    att({
      id: "cale-l04-310",
      lote: LOTE,
      subtema: "complacencia en rutas cotidianas conocidas",
      hecho_canonico_id: "l04-att-10",
      pregunta:
        "Lleva 10 años recorriendo la misma ruta diaria entre su casa y su trabajo. ¿Qué actitud mental debe mantener para evitar siniestros por complacencia?",
      sentido_clave: "seleccion",
      opcion_a:
        "Conducir en 'piloto automático' revisando las redes sociales porque ya conoce cada esquina",
      opcion_b:
        "Mantener el mismo nivel de atención activa y alerta que si transitara por una vía desconocida, reconociendo que los peatones y el tráfico varían cada segundo",
      opcion_c: "No respetar los semáforos del barrio si sabe a qué hora cambian",
      opcion_d: "Aumentar la velocidad en zonas residenciales confiando en su memoria",
      respuesta_recomendada: "b",
      explicacion:
        "El exceso de confianza en trayectos rutinarios es causa principal de siniestros urbanos. Creer que nada cambiará disminuye la atención y demora la respuesta ante peatones o cierres imprevistos.",
      fundamento_legal: "Manual de Referencia ANSV sobre factores humanos y sesgo de familiaridad.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    att({
      id: "cale-l04-311",
      lote: LOTE,
      subtema: "convivencia con repartidores en motocicleta",
      hecho_canonico_id: "l04-att-11",
      pregunta:
        "En una avenida congestionada, un motociclista de mensajería avanza con un bulto grande en su parrilla. ¿Cuál es la conducta prudente de un automovilista?",
      sentido_clave: "seleccion",
      opcion_a: "Acelerar para cerrarle el espacio lateral y hacerlo caer",
      opcion_b: "Tocarle la bocina a centímetros de su espalda para intimidarlo",
      opcion_c:
        "Facilitarle visibilidad, no hacer maniobras bruscas sin direccionales y conservar distancia prudente reconociendo su inestabilidad y vulnerabilidad",
      opcion_d: "Tratar de quitarle el paquete con la mano desde la ventana",
      respuesta_recomendada: "c",
      explicacion:
        "Los motociclistas de reparto enfrentan presiones laborales y su vehículo es inestable con carga. La empatía y anticipación evitan roces que casi siempre terminan con el motociclista en el pavimento.",
      fundamento_legal: "Manual de Referencia ANSV; Ley 769 de 2002, Art. 60.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    att({
      id: "cale-l04-312",
      lote: LOTE,
      subtema: "solidaridad ante carro averiado empujado por personas",
      hecho_canonico_id: "l04-att-12",
      pregunta:
        "Dos personas empujan manualmente un vehículo averiado para sacarlo de un cruce congestionado. ¿Qué actitud demuestra civismo?",
      sentido_clave: "seleccion",
      opcion_a: "Pitarles furiosamente para que se apuren",
      opcion_b: "Bajar a burlarse de ellos por tener un carro viejo",
      opcion_c: "Acelerar pasándoles a milímetros de los pies",
      opcion_d:
        "Detenerse a distancia segura, protegerlos con las luces estacionarias de su propio vehículo y facilitarles la maniobra hasta despejar la calzada",
      respuesta_recomendada: "d",
      explicacion:
        "Las personas que empujan un automotor están desprotegidas en medio del tráfico. Protegerlos con el propio vehículo y brindarles paciencia evita atropellos y colabora con el bien común.",
      fundamento_legal: "Ley 769 de 2002, Art. 55 sobre principios de solidaridad y respeto.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    att({
      id: "cale-l04-313",
      lote: LOTE,
      subtema: "paciencia ante desfiles o eventos deportivos en via",
      hecho_canonico_id: "l04-att-13",
      pregunta:
        "Una carrera atlética o evento cívico autorizado por la alcaldía genera desvíos y paso restringido en su ruta. ¿Cómo debe reaccionar?",
      sentido_clave: "seleccion",
      opcion_a:
        "Aceptar las indicaciones de los organizadores y agentes de tránsito con paciencia y tomar las rutas alternas dispuestas",
      opcion_b: "Meter el automóvil a la fuerza a través de las vallas y los atletas",
      opcion_c: "Insultar a los deportistas por ocupar el espacio público",
      opcion_d: "Estacionar en contravía bloqueando el paso de los competidores",
      respuesta_recomendada: "a",
      explicacion:
        "El uso del espacio vial para eventos cívicos autorizados promueve el deporte y la salud comunitaria. La tolerancia ciudadana y el seguimiento de desvíos garantizan la seguridad colectiva.",
      fundamento_legal: "Ley 769 de 2002, Art. 111 y Art. 119.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    att({
      id: "cale-l04-314",
      lote: LOTE,
      subtema: "cuidado al abrir puertas en estacionamiento",
      hecho_canonico_id: "l04-att-14",
      pregunta:
        "Al estacionar en un centro comercial o bahía junto a otro vehículo, ¿cómo debe abrir las puertas?",
      sentido_clave: "seleccion",
      opcion_a: "Empujar la puerta con fuerza sin mirar si golpea al carro de al lado",
      opcion_b:
        "Abrir la puerta de forma cuidadosa y controlada con la mano, asegurándose de no golpear ni rayar la carrocería del vehículo contiguo",
      opcion_c: "Dejar que la puerta rebote contra el espejo retrovisor del vecino",
      opcion_d: "Patear la puerta para que se abra completamente",
      respuesta_recomendada: "b",
      explicacion:
        "El respeto a la propiedad privada ajena y el cuidado al descender evitan daños materiales y rencillas vecinales innecesarias en parqueaderos.",
      fundamento_legal: "Ley 769 de 2002, Art. 55; Código Nacional de Convivencia.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    att({
      id: "cale-l04-315",
      lote: LOTE,
      subtema: "prudencia en maniobras de adelantamiento a buses intermunicipales",
      hecho_canonico_id: "l04-att-15",
      pregunta:
        "Va detrás de un bus intermunicipal que se detiene en la berma de una vía rural a dejar un pasajero. ¿Cómo debe sobrepasarlo?",
      sentido_clave: "seleccion",
      opcion_a: "Acelerar a fondo sin mirar, asumiendo que el camino está libre",
      opcion_b: "Tocar la bocina y pasarlo por la berma derecha",
      opcion_c:
        "Reducir la velocidad, anticipar que el pasajero recién descendido podría cruzar intempestivamente por delante del bus y adelantar con cautela",
      opcion_d: "Pegarse a la defensa trasera del bus y empujarlo",
      respuesta_recomendada: "c",
      explicacion:
        "Es muy común que los pasajeros que se bajan de un bus crucen la calzada por el frente del vehículo pesado sin visibilidad; moderar la marcha evita atropellos mortales.",
      fundamento_legal: "Manual de Referencia ANSV sobre zonas de parada de transporte público.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    att({
      id: "cale-l04-316",
      lote: LOTE,
      subtema: "atencion a ciclistas infantiles en zonas residenciales",
      hecho_canonico_id: "l04-att-16",
      pregunta:
        "Al circular por una calle residencial observa a varios niños montando en bicicleta por la acera. ¿Qué precaución especial debe tomar?",
      sentido_clave: "seleccion",
      opcion_a: "Acelerar para que los niños escuchen el motor y no bajen a la calle",
      opcion_b: "Ignorarlos, pues si están en el andén no representan ningún riesgo",
      opcion_c: "Pitarles fuertemente para asustarlos y que se vayan a sus casas",
      opcion_d:
        "Reducir la velocidad a menos de 30 km/h y estar preparado para frenar, previendo que un niño pueda caer o lanzarse a la calzada de forma imprevista",
      respuesta_recomendada: "d",
      explicacion:
        "Los niños carecen de reflejos maduros y pueden perder el equilibrio hacia la vía en cualquier instante. Mantener velocidad inferior a 30 km/h permite frenar a tiempo ante cualquier contingencia.",
      fundamento_legal: "Ley 2251 de 2022; Ley 769 de 2002, Art. 106.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    att({
      id: "cale-l04-317",
      lote: LOTE,
      subtema: "mantenimiento del parabrisas limpio",
      hecho_canonico_id: "l04-att-17",
      pregunta:
        "El parabrisas de su vehículo tiene una capa gruesa de polvo y grasa exterior que encandila con la luz del atardecer. ¿Qué actitud asume?",
      sentido_clave: "seleccion",
      opcion_a:
        "Limpiar a fondo el parabrisas y rellenar el depósito del limpiaparabrisas antes de salir a la vía",
      opcion_b: "Conducir mirando por la ventanilla lateral izquierda",
      opcion_c: "Ponerse gafas oscuras muy densas para no ver la suciedad",
      opcion_d: "Encender las luces altas para neutralizar el brillo solar",
      respuesta_recomendada: "a",
      explicacion:
        "Un cristal sucio dispersa la luz directa del sol poniente, provocando ceguera instantánea por deslumbramiento. La visibilidad cristalina es el primer requisito de seguridad.",
      fundamento_legal: "Manual de Referencia ANSV sobre alistamiento y visibilidad.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    att({
      id: "cale-l04-318",
      lote: LOTE,
      subtema: "responsabilidad ante vidrios polarizados ilegales",
      hecho_canonico_id: "l04-att-18",
      pregunta:
        "Le proponen instalar un polarizado oscuro de grado casi opaco en el parabrisas delantero. ¿Qué decisión toma?",
      sentido_clave: "seleccion",
      opcion_a: "Aceptarlo para que nadie pueda ver el interior del vehículo",
      opcion_b:
        "Rechazarlo, ya que viola las normas técnicas de luminosidad permitida y reduce drásticamente la visión nocturna del conductor, elevando el riesgo de siniestro",
      opcion_c: "Instalarlo solo en la mitad del parabrisas",
      opcion_d: "Aceptarlo siempre que circule de día",
      respuesta_recomendada: "b",
      explicacion:
        "El parabrisas delantero debe conservar una transmitancia lumínica mínima legal (mínimo 70 %) para que el conductor pueda distinguir peatones y ciclistas en la noche sin restricciones ópticas.",
      fundamento_legal:
        "Resolución 3777 de 2003 del Ministerio de Transporte; Ley 769 de 2002, Art. 131, infracción B.10.",
      source: SOURCES.LEY_769,
      dificultad: "media",
    }),
    att({
      id: "cale-l04-319",
      lote: LOTE,
      subtema: "rechazo a carreras clandestinas o piques",
      hecho_canonico_id: "l04-att-19",
      pregunta:
        "Un conductor se detiene a su lado en un semáforo urbano, acelera su motor y le hace gestos para salir a toda velocidad en una carrera al cambiar a verde. ¿Cuál es su respuesta?",
      sentido_clave: "seleccion",
      opcion_a: "Aceptar el desafío para demostrar la potencia de su automotor",
      opcion_b: "Chocarle el carro por el costado para que no arranque",
      opcion_c:
        "Ignorar la provocación, mantener la serenidad e iniciar la marcha de forma suave y respetuosa con los límites legales",
      opcion_d: "Bajarse del carro en el semáforo a agredir físicamente al otro conductor",
      respuesta_recomendada: "c",
      explicacion:
        "Las carreras callejeras ('piques') son conductas criminales que causan muertes violentas de transeúntes inocentes. La madurez conductual rechaza cualquier incitación temeraria.",
      fundamento_legal: "Ley 769 de 2002, Art. 131, infracción C.29; Código Penal Colombiano.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    att({
      id: "cale-l04-320",
      lote: LOTE,
      subtema: "respeto por la prelacion de vehiculos de bomberos",
      hecho_canonico_id: "l04-att-20",
      pregunta:
        "Una máquina de bomberos en emergencia intenta salir de su estación con sirena activada, pero la calle tiene tráfico lento. ¿Qué debe hacer?",
      sentido_clave: "seleccion",
      opcion_a: "Acelerar para pasar antes de que el camión de bomberos invada el carril",
      opcion_b: "Estacionarse frente al portón de la estación de bomberos",
      opcion_c: "Tocar la bocina para que los bomberos esperen a que pase su fila",
      opcion_d:
        "Detenerse inmediatamente antes de la salida de la estación dejando el espacio totalmente libre para el paso prioritario de los bomberos",
      respuesta_recomendada: "d",
      explicacion:
        "Cada segundo en la respuesta a un incendio o rescate salva vidas humanas. Bloquear o disputar el paso a vehículos de socorro en emergencia es una falta ética gravísima y sancionable.",
      fundamento_legal: "Ley 769 de 2002, Art. 64 y Art. 131, infracción C.31.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    att({
      id: "cale-l04-321",
      lote: LOTE,
      subtema: "actitud ante ciclistas en rotondas",
      hecho_canonico_id: "l04-att-21",
      pregunta:
        "Al ingresar a una glorieta observa a un ciclista que ya circula dentro de ella por el carril exterior. ¿Cómo procede?",
      sentido_clave: "seleccion",
      opcion_a:
        "Ceder el paso al ciclista reconociendo que quien ya circula dentro de la glorieta tiene la prelación legal",
      opcion_b: "Meterse rápidamente por delante cortándole la trayectoria al ciclista",
      opcion_c: "Obligar al ciclista a salirse de la glorieta a punta de pito",
      opcion_d: "Girar en sentido contrario al de la glorieta para esquivarlo",
      respuesta_recomendada: "a",
      explicacion:
        "Quien circula dentro de la rotonda tiene prelación sobre quien va a ingresar. Cortar el giro a un ciclista en rotonda es causa frecuente de atropellos por aplastamiento lateral.",
      fundamento_legal: "Ley 769 de 2002, Art. 70, numeral 5; Ley 1811 de 2016.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    att({
      id: "cale-l04-322",
      lote: LOTE,
      subtema: "cuidado con motociclistas en dias de lluvia",
      hecho_canonico_id: "l04-att-22",
      pregunta:
        "Bajo la lluvia, un motociclista circula delante de usted a velocidad moderada esquivando las líneas de pintura vial mojadas. ¿Cuál es su actitud?",
      sentido_clave: "seleccion",
      opcion_a: "Pegarse a su guardabarro trasero para exigirle que acelere",
      opcion_b:
        "Ampliar la distancia de seguimiento a más del doble, comprendiendo que la pintura mojada resbala como hielo y el motociclista puede caer con facilidad",
      opcion_c: "Echarle las luces altas de forma intermitente para cegarlo por sus espejos",
      opcion_d: "Pasarlo rozando por el mismo carril",
      respuesta_recomendada: "b",
      explicacion:
        "La pintura vial mojada reduce la fricción en más de un 70 % para ruedas de moto. Si el motociclista cae y el automovilista no guarda distancia suficiente, lo arrollará sin remedio.",
      fundamento_legal: "Manual de Referencia ANSV sobre vulnerabilidad del motociclista.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    att({
      id: "cale-l04-323",
      lote: LOTE,
      subtema: "cuidado del ambiente y no dejar motor encendido en reposo",
      hecho_canonico_id: "l04-att-23",
      pregunta:
        "Va a esperar a una persona durante 15 minutos en un estacionamiento al aire libre. ¿Qué práctica demuestra conciencia ecológica y de salud?",
      sentido_clave: "seleccion",
      opcion_a:
        "Dejar el motor encendido en ralentí los 15 minutos solo para tener el aire acondicionado prendido",
      opcion_b: "Acelerar el motor continuamente en neutro para que no se descargue la batería",
      opcion_c:
        "Apagar el motor del vehículo para ahorrar combustible, reducir emisiones de gases tóxicos y disminuir el ruido ambiental",
      opcion_d: "Dejar las luces altas encendidas con el motor apagado",
      respuesta_recomendada: "c",
      explicacion:
        "El ralentí innecesario gasta combustible, desgasta el motor y emite monóxido de carbono e hidrocarburos a la atmósfera sin prestar ningún servicio de movilidad.",
      fundamento_legal: "Manual de Referencia ANSV sobre ecoconducción y movilidad sostenible.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    att({
      id: "cale-l04-324",
      lote: LOTE,
      subtema: "atencion a senales corporales de agentes de transito",
      hecho_canonico_id: "l04-att-24",
      pregunta:
        "En una intersección donde el semáforo está en verde, un agente de tránsito se coloca de espaldas o de frente a usted con los brazos en cruz. ¿Qué debe hacer?",
      sentido_clave: "seleccion",
      opcion_a: "Seguir derecho porque la luz verde del semáforo vale más que el agente",
      opcion_b: "Girar rápidamente a la derecha en contravía",
      opcion_c: "Tocarle la bocina al agente para que se quite de en medio",
      opcion_d:
        "Detener la marcha por completo, ya que las órdenes y señales del agente de tránsito priman sobre cualquier semáforo o señal fija",
      respuesta_recomendada: "d",
      explicacion:
        "El artículo 111 de la Ley 769 establece la jerarquía indiscutible de las señales de tránsito: la orden del agente de tránsito prevalece sobre semáforos, señales verticales y demarcaciones.",
      fundamento_legal: "Ley 769 de 2002, Art. 111; Manual de Señalización Vial 2024.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    att({
      id: "cale-l04-325",
      lote: LOTE,
      subtema: "responsabilidad en la instalacion de accesorios cortantes o defensas",
      hecho_canonico_id: "l04-att-25",
      pregunta:
        "Le proponen instalar en su camioneta una defensa metálica rígida artesanal ('tumbaburros' o barra antibloqueo) con salientes puntiagudos. ¿Cuál es la evaluación ética?",
      sentido_clave: "seleccion",
      opcion_a:
        "Inaceptable y peligrosa, pues en un eventual atropello amputaría o causaría lesiones mortales directas a peatones y ciclistas, además de anular la absorción de impacto del chasis",
      opcion_b: "Excelente, porque protege la pintura de su carro ante cualquier choque menor",
      opcion_c: "Recomendada si el vehículo transita únicamente en ciudad",
      opcion_d: "Opcional siempre que se pinte de color brillante",
      respuesta_recomendada: "a",
      explicacion:
        "Las defensas rígidas no homologadas alteran la deformación programada de la carrocería, impiden el despliegue correcto de los airbags y convierten al vehículo en un ariete letal contra personas vulnerables.",
      fundamento_legal:
        "Manual de Referencia ANSV sobre seguridad vehicular; Resolución 20253040037125.",
      source: SOURCES.RESOLUCION_CALE,
      dificultad: "media",
    }),
    att({
      id: "cale-l04-326",
      lote: LOTE,
      subtema: "uso adecuado de la berma solo emergencias",
      hecho_canonico_id: "l04-att-26",
      pregunta:
        "Durante un viaje familiar por carretera se le antoja comprar unas frutas en un puesto informal ubicado junto a la curva de la carretera. ¿Dónde debe detenerse?",
      sentido_clave: "seleccion",
      opcion_a: "En la mitad de la curva sobre el carril de circulación con estacionarias puestas",
      opcion_b:
        "Buscar un parador seguro o estación fuera de la calzada y berma, evitando estacionar en bermas estrechas o curvas donde el carro puede ser embestido",
      opcion_c: "Estacionar en el carril en contravía para no caminar",
      opcion_d: "Apagar el motor en plena subida y bajarse a negociar el precio",
      respuesta_recomendada: "b",
      explicacion:
        "Parar en bermas de curvas o tramos angostos para compras recreativas causa colisiones traseras devastadoras. Las detenciones deben realizarse en parqueaderos o zonas amplias seguras.",
      fundamento_legal: "Ley 769 de 2002, Art. 75 y Art. 76.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    att({
      id: "cale-l04-327",
      lote: LOTE,
      subtema: "respeto a personas en sillas de ruedas o muletas",
      hecho_canonico_id: "l04-att-27",
      pregunta:
        "Una persona en silla de ruedas cruza por una rampa peatonal en la esquina sin semáforo. ¿Cómo debe comportarse el conductor?",
      sentido_clave: "seleccion",
      opcion_a: "Acelerar para pasar antes de que la silla de ruedas alcance la mitad de la vía",
      opcion_b: "Tocar el pito fuertemente para apurarla",
      opcion_c:
        "Detener totalmente el vehículo a distancia segura, tener paciencia y ceder el paso hasta que la persona culmine el cruce en el andén opuesto",
      opcion_d: "Hacer señales desobligantes con la mano",
      respuesta_recomendada: "c",
      explicacion:
        "Las personas con movilidad reducida gozan de prelación absoluta y especial protección constitucional y vial. La paciencia y el respeto garantizan su derecho a la movilidad segura.",
      fundamento_legal: "Ley 769 de 2002, Art. 105; Manual de Referencia ANSV.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    att({
      id: "cale-l04-328",
      lote: LOTE,
      subtema: "evitar conducir con ira o tras altercados personales",
      hecho_canonico_id: "l04-att-28",
      pregunta:
        "Acaba de sostener una discusión familiar o laboral muy grave y se siente profundamente alterado, furioso e hiperventilando. ¿Qué debe hacer antes de tomar el volante?",
      sentido_clave: "seleccion",
      opcion_a: "Subirse al carro y conducir a alta velocidad para descargar la rabia acumulada",
      opcion_b: "Tomar una copa de licor para relajarse antes de manejar",
      opcion_c: "Conducir tocando la bocina para desahogar la frustración",
      opcion_d:
        "Esperar a calmarse, respirar profundamente, recuperar el equilibrio emocional y solo encender el vehículo cuando recupere la serenidad y la concentración plena",
      respuesta_recomendada: "d",
      explicacion:
        "El estado de ira o cólera ciega el juicio racional, incrementa conductas de riesgo temerarias y multiplica exponencialmente la posibilidad de siniestros letales. No se debe conducir con ira.",
      fundamento_legal: "Manual de Referencia ANSV sobre inteligencia emocional y seguridad vial.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    att({
      id: "cale-l04-329",
      lote: LOTE,
      subtema: "prudencia ante charcos con ciclistas cercanos",
      hecho_canonico_id: "l04-att-29",
      pregunta:
        "Usted circula detrás de un ciclista y observa un gran hueco lleno de agua justo en la trayectoria del ciclista. ¿Cómo actúa?",
      sentido_clave: "seleccion",
      opcion_a:
        "Prever que el ciclista abrirá su línea de trayectoria hacia la izquierda para esquivar el hueco, por lo que debe reducir la velocidad y dejarle espacio suficiente para su maniobra",
      opcion_b: "Pegarse al ciclista para que salte el charco a la fuerza",
      opcion_c: "Pasarlo por la derecha rozando el charco",
      opcion_d: "Empujarlo hacia el charco con el parachoques",
      respuesta_recomendada: "a",
      explicacion:
        "Los charcos ocultan baches profundos que pueden derribar a un ciclista. Anticipar que el ciclista esquivará el obstáculo hacia el centro del carril previene colisiones por alcance.",
      fundamento_legal: "Ley 1811 de 2016; Manual de Referencia ANSV.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    att({
      id: "cale-l04-330",
      lote: LOTE,
      subtema: "actitud ante vehiculos de traccion animal",
      hecho_canonico_id: "l04-att-30",
      pregunta:
        "En una vía semirrural encuentra una carreta tirada por un caballo que avanza despacio. ¿Qué consideración de seguridad debe aplicar?",
      sentido_clave: "seleccion",
      opcion_a: "Hacer rugir el motor y pitar muy cerca de las orejas del animal para asustarlo",
      opcion_b:
        "Tratarlo con respeto, no tocar la bocina para no desbocar al animal y adelantar dejando amplio margen de separación lateral en sitio permitido",
      opcion_c: "Cerrar al carromato para obligarlo a caer a la zanja",
      opcion_d: "Lanzarle agua con los limpiaparabrisas",
      respuesta_recomendada: "b",
      explicacion:
        "Los animales asustados por ruidos agudos pueden desbocarse, voltear la carreta e invadir la calzada de forma descontrolada. El trato paciente previene siniestros graves.",
      fundamento_legal: "Ley 769 de 2002, Art. 60 y Art. 104; Manual de Referencia ANSV.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    know({
      id: "cale-l04-331",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "vulnerabilidad biomecanica del cuerpo humano",
      hecho_canonico_id: "l04-mov-01",
      pregunta:
        "Desde el punto de vista biomecánico, ¿por qué los peatones, ciclistas y motociclistas son categorizados como usuarios vulnerables de la vía?",
      opcion_a: "Porque no pagan peajes en las autopistas concesionadas",
      opcion_b: "Porque circulan a mayor velocidad que los vehículos pesados",
      opcion_c:
        "Porque carecen de una estructura o carrocería que absorba la energía del impacto, recibiendo las fuerzas cinéticas directamente en sus cuerpos",
      opcion_d: "Porque sus vehículos no tienen placa de identificación metálica",
      respuesta_correcta: "c",
      explicacion:
        "A diferencia de los ocupantes de automóviles protegidos por chasis indeformable, cinturones y airbags, los usuarios vulnerables absorben la desaceleración y choque en sus huesos y órganos vitales.",
      fundamento_legal: "Manual de Referencia ANSV sobre enfoque de Sistema Seguro y Biomecánica.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    know({
      id: "cale-l04-332",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "conflicto de giro a la derecha con ciclistas",
      hecho_canonico_id: "l04-mov-02",
      pregunta:
        "Al disponerse a girar a la derecha en una intersección urbana, ¿cuál es el peligro más común relacionado con los ciclistas?",
      opcion_a: "Que los ciclistas frenen el motor del carro con sus manos",
      opcion_b: "Que el ciclista gire en contravía a más de 90 km/h",
      opcion_c: "Que la bicicleta se adhiera al chasis por magnetismo",
      opcion_d:
        "El 'corte de trayectoria', donde el automóvil gira a la derecha cruzándose en la línea recta de un ciclista que avanza por el costado derecho o punto ciego del vehículo",
      respuesta_correcta: "d",
      explicacion:
        "Muchos conductores giran a la derecha sin verificar el espejo lateral derecho ni el ángulo muerto, arrollando a ciclistas que avanzan en línea recta con prelación sobre el carril contiguo.",
      fundamento_legal: "Ley 1811 de 2016; Manual de Referencia ANSV.",
      source: SOURCES.LEY_769,
      dificultad: "media",
    }),
    know({
      id: "cale-l04-333",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "efectos de antihistaminicos de primera generacion",
      hecho_canonico_id: "l04-mov-03",
      pregunta:
        "¿Qué efecto secundario crítico provocan los antihistamínicos clásicos (como difenhidramina o clorfeniramina) en quien conduce?",
      opcion_a:
        "Somnolencia intensa, disminución de la vigilancia, visión borrosa y aumento notable del tiempo de reacción",
      opcion_b: "Aumento desmedido de la agudeza auditiva y reflejos instantáneos",
      opcion_c: "Reducción de la distancia de frenado del vehículo",
      opcion_d: "Inmunidad total frente a los microsueños",
      respuesta_correcta: "a",
      explicacion:
        "Los antihistamínicos de primera generación cruzan la barrera hematoencefálica y deprimen el sistema nervioso central, generando sedación y aletargamiento psicomotor similar a un estado de embriaguez leve.",
      fundamento_legal: "Manual de Referencia ANSV sobre psicofármacos y seguridad vial.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l04-334",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "efecto de los ansioliticos y relajantes musculares",
      hecho_canonico_id: "l04-mov-04",
      pregunta:
        "El consumo de medicamentos ansiolíticos (benzodiacepinas) o relajantes musculares afecta la conducción porque:",
      opcion_a: "Acelera la frecuencia cardíaca y estimula la agresividad al volante",
      opcion_b:
        "Provoca hipotonía muscular, lentitud motriz, somnolencia y pérdida de capacidad de concentración para resolver emergencias",
      opcion_c: "Aumenta la potencia del motor del automotor",
      opcion_d: "Mejora la visión nocturna en condiciones de niebla",
      respuesta_correcta: "b",
      explicacion:
        "Estos medicamentos relajan en exceso el tono muscular y retardan las órdenes motoras del cerebro hacia pies y manos, impidiendo maniobras evasivas rápidas ante peligros repentinos.",
      fundamento_legal: "Manual de Referencia ANSV; Guía de Medicamentos y Conducción Segura.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l04-335",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "riesgo vial ante crisis de alergia o estornudos",
      hecho_canonico_id: "l04-mov-05",
      pregunta:
        "¿Por qué un ataque de estornudos sucesivos provocado por rinitis alérgica severa es peligroso a alta velocidad en autopista?",
      opcion_a: "Porque los airbags pueden detonarse por el sonido del estornudo",
      opcion_b: "Porque el estornudo bloquea mecánicamente los pedales del automóvil",
      opcion_c:
        "Porque cada estornudo obliga a cerrar los ojos de manera involuntaria durante casi un segundo, recorriendo decenas de metros a ciegas sin control visual",
      opcion_d: "Porque los limpiaparabrisas se activan de forma automática",
      respuesta_correcta: "c",
      explicacion:
        "Al estornudar se cierran los ojos por reflejo neuromuscular incondicionado. Una ráfaga de 3 o 4 estornudos a 90 km/h equivale a viajar a ciegas por más de 75 metros sobre la calzada.",
      fundamento_legal: "Manual de Referencia ANSV sobre salud y aptitud psicofísica.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l04-336",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "arranque en frio en ecoconduccion",
      hecho_canonico_id: "l04-mov-06",
      pregunta:
        "En los principios de conducción eficiente y sostenible (ecoconducción), ¿cómo debe encenderse un motor moderno a gasolina?",
      opcion_a: "Pisando el acelerador a fondo antes de girar la llave de contacto",
      opcion_b: "Remolcarlo con otro vehículo para que arranque con el embrague",
      opcion_c: "Acelerar repetidas veces en neutro durante 10 minutos antes de partir",
      opcion_d:
        "Girar la llave sin pisar el pedal del acelerador, ya que la inyección electrónica dosifica exactamente el combustible necesario",
      respuesta_correcta: "d",
      explicacion:
        "En vehículos modernos con inyección electrónica, pisar el acelerador al encender es un vicio obsoleto que descalibra la mezcla, desperdicia combustible y arroja hidrocarburos sin quemar al escape.",
      fundamento_legal: "Manual de Referencia ANSV sobre técnicas de ecoconducción.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    know({
      id: "cale-l04-337",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "rango optimo de revoluciones para cambios de marcha",
      hecho_canonico_id: "l04-mov-07",
      pregunta:
        "Para una conducción ecológica y de bajo consumo en un automóvil a gasolina, ¿en qué rango de revoluciones por minuto (RPM) se recomienda pasar a una marcha superior?",
      opcion_a: "Aproximadamente entre 2.000 y 2.500 RPM",
      opcion_b: "Entre 5.000 y 6.500 RPM cerca del corte de inyección",
      opcion_c: "A menos de 500 RPM haciendo que el motor vibre y se apague",
      opcion_d: "Únicamente cuando el tubo de escape empiece a echar fuego",
      respuesta_correcta: "a",
      explicacion:
        "Cambiar de marcha entre 2.000 y 2.500 RPM en motores de gasolina (y entre 1.500 y 2.000 RPM en diésel) aprovecha el torque óptimo del motor, minimizando el consumo y las emisiones sonoras y gaseosas.",
      fundamento_legal: "Manual de Referencia ANSV sobre eficiencia energética vehicular.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l04-338",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "desaceleracion con marcha engranada vs neutro",
      hecho_canonico_id: "l04-mov-08",
      pregunta:
        "Al aproximarse a un semáforo en rojo o descenso, ¿por qué es más eficiente desacelerar con una marcha puesta que rodar en neutro?",
      opcion_a: "Porque en neutro el motor consume cero combustible",
      opcion_b:
        "Porque con marcha engranada y sin pisar el acelerador entra en funcionamiento el corte de inyección (consumo cero), mientras en neutro el motor gasta combustible para mantenerse en ralentí",
      opcion_c: "Porque rodar en neutro destruye la batería al instante",
      opcion_d: "Porque con marcha puesta las llantas se inflan automáticamente",
      respuesta_correcta: "b",
      explicacion:
        "El sistema de corte de inyección en desaceleración corta el suministro de combustible al 100 % cuando el motor es arrastrado por las ruedas con marcha puesta, logrando consumo cero y freno motor.",
      fundamento_legal: "Manual de Referencia ANSV sobre principios de inyección y ecoconducción.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "dificil",
    }),
    know({
      id: "cale-l04-339",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "impacto del portaequipajes o baca de techo",
      hecho_canonico_id: "l04-mov-09",
      pregunta:
        "¿Qué impacto tiene en la sostenibilidad y el consumo viajar con un portaequipajes de techo (baca o maletero de techo) instalado permanentemente, incluso vacío?",
      opcion_a: "Reduce el consumo porque estabiliza el flujo de viento como un alerón",
      opcion_b: "No produce ningún efecto sobre la aerodinámica ni el gasto energético",
      opcion_c:
        "Aumenta la resistencia aerodinámica del vehículo, pudiendo incrementar el consumo de combustible entre un 10 % y un 20 % en carretera",
      opcion_d: "Enfría el motor haciendo que consuma menos aceite",
      respuesta_correcta: "c",
      explicacion:
        "Cualquier bulto o barra en el techo rompe la línea aerodinámica del vehículo. A velocidades de carretera la resistencia del aire crece exponencialmente, disparando el gasto innecesario de gasolina.",
      fundamento_legal: "Manual de Referencia ANSV sobre resistencia al avance y ecoconducción.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l04-340",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "ventanillas abiertas vs aire acondicionado a alta velocidad",
      hecho_canonico_id: "l04-mov-10",
      pregunta:
        "A velocidades superiores a 80 km/h en autopista, ¿qué opción es más eficiente desde el punto de vista aerodinámico y de consumo?",
      opcion_a: "Bajar completamente las cuatro ventanillas para que entre aire fresco",
      opcion_b: "Retirar los retrovisores laterales para reducir peso",
      opcion_c: "Conducir con las puertas entreabiertas",
      opcion_d:
        "Cerrar las ventanillas y utilizar la ventilación o aire acondicionado a temperatura moderada, ya que las ventanas abiertas generan un 'efecto paracaídas' de alta resistencia",
      respuesta_correcta: "d",
      explicacion:
        "A alta velocidad el aire que ingresa por ventanillas abiertas frena el automóvil como una bolsa de resistencia (efecto paracaídas), consumiendo más combustible que el propio compresor del aire acondicionado.",
      fundamento_legal: "Manual de Referencia ANSV sobre eficiencia energética en ruta.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l04-341",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "frecuencia de pausas activas en viajes largos",
      hecho_canonico_id: "l04-mov-11",
      pregunta:
        "En la planificación de un viaje por carretera de larga distancia, ¿cada cuánto tiempo o kilometraje se recomienda realizar una parada de descanso?",
      opcion_a:
        "Cada 2 horas de conducción continua o aproximadamente cada 200 kilómetros, durante al menos 15 a 20 minutos",
      opcion_b: "Cada 12 horas consecutivas sin detenerse",
      opcion_c: "Únicamente cuando el tanque de gasolina se vacíe por completo",
      opcion_d: "Solo si el vehículo se recalienta y echa humo",
      respuesta_correcta: "a",
      explicacion:
        "Detenerse cada 2 horas o 200 km permite estirar músculos, oxigenar el cerebro, hidratarse y reactivar los sentidos, contrarrestando la fatiga psicofísica acumulada y previniendo microsueños.",
      fundamento_legal: "Manual de Referencia ANSV; Plan Nacional de Seguridad Vial.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    know({
      id: "cale-l04-342",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "alimentacion e hidratacion del conductor",
      hecho_canonico_id: "l04-mov-12",
      pregunta:
        "¿Por qué no se aconseja ingerir comidas copiosas o muy abundantes antes o durante un viaje por carretera?",
      opcion_a: "Porque aumentan el peso total del carro sobrecargando la suspensión",
      opcion_b:
        "Porque provocan somnolencia posprandial intensa (marea alcalina), ya que el flujo sanguíneo se concentra en el sistema digestivo restando oxigenación al cerebro",
      opcion_c: "Porque la digestión pesada descalibra los sensores del cinturón de seguridad",
      opcion_d: "Porque la comida en el estómago afecta la adherencia de las llantas",
      respuesta_correcta: "b",
      explicacion:
        "La digestión de grasas e hidratos pesados induce sopor, pesadez ocular y lentitud de reflejos. En viajes largos se deben preferir comidas ligeras, frutas y abundante agua.",
      fundamento_legal: "Manual de Referencia ANSV sobre hábitos saludables del conductor.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    know({
      id: "cale-l04-343",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "angulo muerto en vehiculos pesados No-Zone",
      hecho_canonico_id: "l04-mov-13",
      pregunta:
        "Al transitar cerca de un tractocamión, ¿cuál es la regla básica para saber si el conductor del camión puede verlo a usted en sus espejos?",
      opcion_a: "Si usted puede ver la placa trasera del camión, él lo ve perfectamente",
      opcion_b: "Los camiones pesados no tienen puntos ciegos gracias a su gran altura",
      opcion_c:
        "Si usted no puede ver la cara o los ojos del conductor del camión a través de sus retrovisores exteriores, usted se encuentra en su punto ciego y él no sabe que usted está allí",
      opcion_d: "El conductor de camión siempre ve todo gracias al sonido del motor ajeno",
      respuesta_correcta: "c",
      explicacion:
        "Los vehículos articulados poseen enormes áreas ciegas ('No-Zone') adelante, atrás y en ambos costados (especialmente el derecho). Si no hay contacto visual por espejo, el automovilista es invisible para el camionero.",
      fundamento_legal:
        "Manual de Referencia ANSV sobre interacción segura con vehículos de carga.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    know({
      id: "cale-l04-344",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "giro amplio a la derecha de tractocamiones",
      hecho_canonico_id: "l04-mov-14",
      pregunta:
        "Un camión articulado va a girar a la derecha en una esquina estrecha y abre su trayectoria hacia el carril izquierdo. ¿Qué debe hacer el vehículo que va detrás?",
      opcion_a: "Aprovechar el espacio vacío a la derecha del camión para meterse y adelantarlo",
      opcion_b: "Subirse al andén para esquivar el giro del camión",
      opcion_c: "Tocar la bocina y acelerar al lado del remolque",
      opcion_d:
        "Permanecer detrás y esperar pacientemente sin invadir el espacio a la derecha, sabiendo que el remolque cerrará ese espacio al doblar (efecto tijera)",
      respuesta_correcta: "d",
      explicacion:
        "Por geometría vehicular el remolque toma una trayectoria más cerrada que la cabina. Intentar colarse por la derecha mientras el camión gira termina en aprisionamiento y aplastamiento fatal.",
      fundamento_legal: "Manual de Referencia ANSV sobre radios de giro y puntos ciegos.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l04-345",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "distribucion de peso del equipaje en baul",
      hecho_canonico_id: "l04-mov-15",
      pregunta:
        "¿Cómo deben acomodarse las maletas más pesadas en el maletero de un automóvil antes de salir a carretera?",
      opcion_a:
        "En el fondo del baúl, lo más pegadas posible al respaldo del asiento trasero y sobre el piso, para mantener el centro de gravedad bajo y centrado",
      opcion_b: "En la parte superior, sueltas encima de las maletas livianas",
      opcion_c: "Colgadas del parachoques trasero con cuerdas elásticas",
      opcion_d: "En la bandeja trasera interior debajo del vidrio panorámico",
      respuesta_correcta: "a",
      explicacion:
        "Colocar los bultos pesados en el piso y contra el espaldar trasero evita que el centro de gravedad se desplace hacia atrás o arriba, manteniendo el control y la estabilidad en frenadas y curvas.",
      fundamento_legal: "Manual de Referencia ANSV sobre estiba y dinámica de carga.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l04-346",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "peligro letal de objetos sueltos en la bandeja trasera",
      hecho_canonico_id: "l04-mov-16",
      pregunta:
        "¿Qué riesgo letal representa llevar objetos duros o pesados (computadores portátiles, botellas, libros) sueltos en la bandeja trasera del carro?",
      opcion_a: "Pueden rayar la tapicería del techo con las vibraciones",
      opcion_b:
        "En una frenada brusca o colisión a 50 km/h, la inercia multiplica su peso efectivo hasta por 30 o 40 veces, proyectándolos como proyectiles mortales contra la cabeza de los ocupantes",
      opcion_c: "Consumen energía del desempañador trasero de forma invisible",
      opcion_d: "Bloquean la salida del aire acondicionado hacia las sillas delanteras",
      respuesta_correcta: "b",
      explicacion:
        "En un impacto un objeto suelto sigue viajando a la velocidad previa al choque. Un computador de 2 kg se convierte en un proyectil de más de 60 kg que puede desnucar a los pasajeros delanteros.",
      fundamento_legal: "Manual de Referencia ANSV sobre física del impacto y seguridad pasiva.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    know({
      id: "cale-l04-347",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "gestion del estres y congestion urbana",
      hecho_canonico_id: "l04-mov-17",
      pregunta:
        "¿Qué efecto biológico produce el estrés prolongado en un conductor atascado en el tráfico sobre su toma de decisiones?",
      opcion_a: "Aumenta la paciencia y mejora la capacidad de análisis sereno",
      opcion_b: "Disminuye el consumo de gasolina del motor en ralentí",
      opcion_c:
        "Eleva los niveles de cortisol y adrenalina, induciendo impulsividad, visión túnel, subestimación de riesgos y reacciones hostiles",
      opcion_d: "Acelera el cambio de los semáforos de la ciudad",
      respuesta_correcta: "c",
      explicacion:
        "El estrés crónico activa respuestas biológicas primitivas de pelea o huida, nublando el córtex prefrontal encargado del autocontrol y multiplicando las maniobras temerarias de choque.",
      fundamento_legal: "Manual de Referencia ANSV sobre factores psicológicos en la conducción.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l04-348",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "impacto de la presion de inflado en consumo energetico",
      hecho_canonico_id: "l04-mov-18",
      pregunta:
        "¿Cómo afecta a la economía de combustible circular habitualmente con neumáticos desinflados en 5 o más PSI por debajo de lo normal?",
      opcion_a: "Ahorra gasolina porque la llanta tiene más agarre con el suelo",
      opcion_b: "Genera electricidad adicional que recarga la batería",
      opcion_c: "No tiene ningún impacto medible en el gasto energético del motor",
      opcion_d:
        "Incrementa la resistencia a la rodadura, aumentando el consumo de combustible hasta en un 5 % y acelerando el desgaste irregular de los hombros de la llanta",
      respuesta_correcta: "d",
      explicacion:
        "Una llanta baja de aire se deforma excesivamente en cada giro. Esa resistencia extra obliga al motor a ejercer mayor fuerza para rodar, incrementando el consumo de combustible y la huella de carbono.",
      fundamento_legal: "Manual de Referencia ANSV sobre mantenimiento de neumáticos y ecología.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    know({
      id: "cale-l04-349",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "planificacion de ruta antes de partir",
      hecho_canonico_id: "l04-mov-19",
      pregunta:
        "¿Por qué configurar la ruta en la aplicación de navegación (GPS) ANTES de poner en marcha el vehículo es un principio de seguridad innegociable?",
      opcion_a:
        "Porque manipular pantallas táctiles o teléfonos mientras se conduce combina distracción visual, manual y cognitiva simultáneamente, multiplicando por cuatro el riesgo de siniestro",
      opcion_b: "Porque los satélites solo funcionan con el vehículo detenido",
      opcion_c: "Porque el mapa digital se borra si el carro entra en movimiento",
      opcion_d: "Porque el velocímetro digital se bloquea si el GPS está activo",
      respuesta_correcta: "a",
      explicacion:
        "Digitar direcciones o buscar rutas en marcha desvía la vista y las manos del control vehicular durante segundos vitales, siendo una de las mayores causas de atropello y alcance en Colombia.",
      fundamento_legal: "Ley 769 de 2002, Art. 131, infracción C.38; Manual de Referencia ANSV.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    know({
      id: "cale-l04-349-b",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "efecto de bebidas energizantes combinadas con fatiga",
      hecho_canonico_id: "l04-mov-20",
      pregunta:
        "¿Qué peligro encierra consumir bebidas energizantes o café cargado para intentar continuar conduciendo con sueño severo?",
      opcion_a: "Eliminan completamente la necesidad biológica de dormir por 48 horas",
      opcion_b:
        "Crean una falsa sensación pasajera de alerta que enmascara el cansancio, seguida de un 'efecto rebote' o colapso súbito donde sobreviene un microsueño fulminante",
      opcion_c: "Hacen que el carro consuma más combustible por las vibraciones del conductor",
      opcion_d: "Provocan fallas en los sensores del computador a bordo",
      respuesta_correcta: "b",
      explicacion:
        "La cafeína y taurina bloquean los receptores de adenosina en el cerebro pero no eliminan la fatiga celular. Al agotarse el estimulante el sueño acumulado golpea de golpe, causando microsueños letales.",
      fundamento_legal:
        "Manual de Referencia ANSV sobre fisiología del sueño y falsos estimulantes.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l04-351",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "transporte multimodal y reduccion de emisiones",
      hecho_canonico_id: "l04-mov-21",
      pregunta:
        "¿Cuál es el beneficio ambiental y urbano de promover el uso combinado de bicicleta, caminata y transporte masivo frente al uso del vehículo particular individual?",
      opcion_a: "Aumentar el número de peajes en las ciudades",
      opcion_b: "Hacer que los automóviles particulares duren más de 100 años",
      opcion_c:
        "Reducir significativamente las emisiones de gases de efecto invernadero (CO2), disminuir la polución del aire urbano, descongestionar vías y mejorar la salud colectiva",
      opcion_d: "Eliminar la necesidad de construir andenes peatonales",
      respuesta_correcta: "c",
      explicacion:
        "El transporte multimodal sostenible optimiza el espacio público y mitiga el cambio climático y las enfermedades respiratorias infantiles ocasionadas por el exceso de combustión fósil.",
      fundamento_legal: "Ley 1811 de 2016; Plan Nacional de Seguridad Vial y Movilidad Sostenible.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    know({
      id: "cale-l04-352",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "distraccion auditiva por audifonos al conducir",
      hecho_canonico_id: "l04-mov-22",
      pregunta:
        "¿Por qué conducir un automóvil o motocicleta utilizando auriculares o audífonos intrauditivos en ambos oídos es peligroso e indebido?",
      opcion_a: "Porque descargan la batería del celular rápidamente",
      opcion_b: "Porque interfieren con la frecuencia de la radio comunitaria",
      opcion_c: "Porque aumentan la resistencia del viento sobre el casco",
      opcion_d:
        "Porque aíslan al conductor del entorno acústico, impidiendo escuchar sirenas de ambulancias, bocinazos de prevención, motores cercanos o fallas mecánicas",
      respuesta_correcta: "d",
      explicacion:
        "El sentido del oído alerta sobre peligros fuera del campo visual directo. Anular los sonidos del tráfico con música en auriculares disminuye los reflejos de supervivencia.",
      fundamento_legal:
        "Ley 769 de 2002; Manual de Referencia ANSV sobre distractores sensoriales.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    know({
      id: "cale-l04-353",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "velocidad en zonas residenciales y supervivencia de ninos",
      hecho_canonico_id: "l04-mov-23",
      pregunta:
        "Según estudios internacionales de la ANSV y la OMS, si un vehículo impacta a un niño a 30 km/h la probabilidad de supervivencia es de más del 90 %. ¿Qué ocurre si la velocidad sube a 50 km/h?",
      opcion_a:
        "El riesgo de muerte o lesiones discapacitantes permanentes se dispara dramáticamente, superando el 50 % de letalidad",
      opcion_b: "La probabilidad de supervivencia se mantiene idéntica",
      opcion_c: "El niño sale despedido hacia arriba sin sufrir ninguna lesión",
      opcion_d: "La fuerza del impacto disminuye gracias a la inercia del vehículo",
      respuesta_correcta: "a",
      explicacion:
        "La energía de choque aumenta al cuadrado de la velocidad. A 50 km/h el impacto contra el cuerpo frágil de un niño equivale a una caída libre desde un cuarto piso, siendo altamente letal.",
      fundamento_legal: "Ley 2251 de 2022 ('Ley Julián Esteban'); Manual de Referencia ANSV.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    know({
      id: "cale-l04-354",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "visibilidad reducida por polarizados no reglamentarios",
      hecho_canonico_id: "l04-mov-24",
      pregunta:
        "¿Cómo afecta el uso de vidrios oscurecidos fuera de la norma técnica en la conducción nocturna?",
      opcion_a: "Aumenta la definición de las siluetas en la oscuridad",
      opcion_b:
        "Resta luminosidad crítica al ojo del conductor, haciendo invisibles a peatones con ropas oscuras y ciclistas sin luces en cruces o pasos peatonales",
      opcion_c: "Mejora la capacidad de frenado del vehículo sobre mojado",
      opcion_d: "Reduce el gasto de combustible en un 30 %",
      respuesta_correcta: "b",
      explicacion:
        "Un vidrio excesivamente tintado actúa como si el conductor llevara gafas de sol a medianoche, anulando el contraste periférico y provocando atropellos en giros urbanos.",
      fundamento_legal: "Resolución 3777 de 2003; Manual de Referencia ANSV.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l04-355",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "mantenimiento de la distancia lateral de seguridad",
      hecho_canonico_id: "l04-mov-25",
      pregunta:
        "Al transitar por calles con filas de vehículos estacionados a los lados, ¿por qué es fundamental mantener una separación lateral de al menos un metro con dichos autos?",
      opcion_a: "Para no rayar los retrovisores propios al pasar",
      opcion_b: "Para que el aire de ventilación circule libremente por la calle",
      opcion_c:
        "Para evitar colisionar si algún ocupante de los autos estacionados abre súbitamente la puerta sin mirar o si un peatón sale inesperadamente entre los carros",
      opcion_d: "Para permitir que los perros callejeros duerman en la calzada",
      respuesta_correcta: "c",
      explicacion:
        "El fenómeno de la puerta abierta intempestivamente ('dooring') causa muertes e impactos severos. Dejar margen lateral preventivo brinda el espacio indispensable de reacción y frenado.",
      fundamento_legal: "Manual de Referencia ANSV sobre maniobras urbanas defensivas.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    know({
      id: "cale-l04-356",
      lote: LOTE,
      nucleo_nombre: "Normas de transito",
      subtema: "categorias de licencia para servicio particular",
      hecho_canonico_id: "l04-nor-01",
      pregunta:
        "En Colombia, ¿qué tipo de vehículos autoriza a conducir una licencia de categoría B1 según el Código Nacional de Tránsito?",
      opcion_a: "Motocicletas de alto cilindraje y mototaxis de servicio público",
      opcion_b: "Exclusivamente tractores agrícolas y maquinaria de construcción",
      opcion_c: "Buses y tractocamiones articulados de servicio público",
      opcion_d:
        "Automóviles, motocarros, camperos, camionetas, cuatrimotos y microbuses de servicio PARTICULAR",
      respuesta_correcta: "d",
      explicacion:
        "La categoría B1 ampara la conducción de automotores livianos (automóviles, camperos, camionetas) destinados única y exclusivamente al servicio particular o privado.",
      fundamento_legal: "Ley 769 de 2002, Art. 17; Decreto 019 de 2012.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    know({
      id: "cale-l04-357",
      lote: LOTE,
      nucleo_nombre: "Normas de transito",
      subtema: "licencia de motocicleta a1 vs a2",
      hecho_canonico_id: "l04-nor-02",
      pregunta:
        "¿Cuál es la diferencia legal entre las licencias de conducción de categoría A1 y A2 en Colombia?",
      opcion_a:
        "La A1 autoriza motocicletas de hasta 125 c.c. de cilindraje; la A2 autoriza motocicletas, motociclos y mototriciclos de más de 125 c.c. de cilindraje",
      opcion_b: "La A1 es para mujeres y la A2 para hombres",
      opcion_c: "La A1 es para servicio público y la A2 para servicio particular",
      opcion_d: "La A1 autoriza a llevar tres pasajeros y la A2 solo uno",
      respuesta_correcta: "a",
      explicacion:
        "El Código de Tránsito clasifica las licencias de dos ruedas por potencia y cilindraje: A1 hasta 125 centímetros cúbicos y A2 para cilindrajes superiores a 125 c.c.",
      fundamento_legal: "Ley 769 de 2002, Art. 17; Resolución 1500 de 2005.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    know({
      id: "cale-l04-358",
      lote: LOTE,
      nucleo_nombre: "Normas de transito",
      subtema: "equivalencia de licencias publicas sobre particulares",
      hecho_canonico_id: "l04-nor-03",
      pregunta:
        "Si un conductor es titular de una licencia de conducción vigente categoría C1 (servicio público liviano), ¿puede conducir un automóvil particular categoría B1?",
      opcion_a: "No, debe tramitar obligatoriamente dos licencias separadas",
      opcion_b:
        "Sí, porque quien está legalmente autorizado para operar vehículos de servicio público puede conducir vehículos particulares de categoría igual o equivalente",
      opcion_c: "Solo los domingos y días festivos",
      opcion_d: "Solo si viaja acompañado por un agente de policía",
      respuesta_correcta: "b",
      explicacion:
        "De acuerdo con el principio de equivalencia normativa, las categorías de servicio público (C1, C2, C3) autorizan a conducir vehículos de servicio particular de clase igual o inferior (B1, B2, B3).",
      fundamento_legal: "Ley 769 de 2002, Art. 17; Decreto 019 de 2012.",
      source: SOURCES.LEY_769,
      dificultad: "media",
    }),
    know({
      id: "cale-l04-359",
      lote: LOTE,
      nucleo_nombre: "Normas de transito",
      subtema: "licencia de carro no autoriza moto",
      hecho_canonico_id: "l04-nor-04",
      pregunta:
        "¿Puede un conductor que posee licencia categoría B1 o C1 conducir legalmente una motocicleta de 150 c.c.?",
      opcion_a:
        "Sí, porque las licencias de cuatro ruedas cubren automáticamente todos los vehículos de dos ruedas",
      opcion_b: "Sí, siempre que no lleve parrillero o acompañante",
      opcion_c:
        "No, las licencias para automóviles no autorizan a operar motocicletas; debe obtener y portar la categoría A1 o A2 correspondiente",
      opcion_d: "Sí, si la motocicleta es de su propiedad",
      respuesta_correcta: "c",
      explicacion:
        "La dinámica de conducción y destrezas de una motocicleta son totalmente distintas a las de un carro. Conducir moto con licencia exclusiva de automóvil equivale a conducir sin licencia para esa clase de vehículo.",
      fundamento_legal: "Ley 769 de 2002, Art. 17 y Art. 131, infracción D.01.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    know({
      id: "cale-l04-360",
      lote: LOTE,
      nucleo_nombre: "Normas de transito",
      subtema: "edad minima para obtener licencia de conduccion",
      hecho_canonico_id: "l04-nor-05",
      pregunta:
        "¿Cuál es la edad mínima exigida en Colombia para tramitar la licencia de conducción para servicio PARTICULAR y para servicio PÚBLICO?",
      opcion_a: "14 años para particular y 16 años para público",
      opcion_b: "21 años para cualquier tipo de licencia",
      opcion_c: "18 años para particular y 25 años para público",
      opcion_d:
        "16 años cumplidos para servicio particular y 18 años cumplidos para servicio público",
      respuesta_correcta: "d",
      explicacion:
        "El artículo 19 de la Ley 769 exige un mínimo de dieciséis (16) años cumplidos para automotores particulares y la mayoría de edad (18 años cumplidos) para vehículos de servicio público.",
      fundamento_legal: "Ley 769 de 2002, Art. 19.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    know({
      id: "cale-l04-361",
      lote: LOTE,
      nucleo_nombre: "Normas de transito",
      subtema: "vigencia de licencia de conduccion particular",
      hecho_canonico_id: "l04-nor-06",
      pregunta:
        "Bajo la ley colombiana, ¿cuál es la vigencia de la licencia de conducción para vehículos de servicio PARTICULAR para personas menores de 60 años de edad?",
      opcion_a: "Vigencia de diez (10) años",
      opcion_b: "2 años contados desde la expedición",
      opcion_c: "Vigencia indefinida de por vida",
      opcion_d: "1 año renovable cada diciembre",
      respuesta_correcta: "a",
      explicacion:
        "El Decreto Ley 019 de 2012 fijó la vigencia de licencias particulares en 10 años para menores de 60 años, 5 años para personas entre 60 y 80 años, y 1 año para mayores de 80 años.",
      fundamento_legal: "Ley 769 de 2002, Art. 22; Decreto Ley 019 de 2012, Art. 197.",
      source: SOURCES.LEY_769,
      dificultad: "media",
    }),
    know({
      id: "cale-l04-362",
      lote: LOTE,
      nucleo_nombre: "Normas de transito",
      subtema: "vigencia de licencia de servicio publico",
      hecho_canonico_id: "l04-nor-07",
      pregunta:
        "¿Cuál es la vigencia de la licencia de conducción para operar vehículos de servicio PÚBLICO en conductores menores de 60 años?",
      opcion_a: "Diez (10) años",
      opcion_b: "Tres (3) años",
      opcion_c: "Seis (6) meses",
      opcion_d: "Veinte (20) años",
      respuesta_correcta: "b",
      explicacion:
        "Para servicio público, las licencias tienen una vigencia de 3 años para personas menores de 60 años, y de 1 año para conductores mayores de 60 años, garantizando controles médicos frecuentes.",
      fundamento_legal: "Ley 769 de 2002, Art. 22; Decreto 019 de 2012.",
      source: SOURCES.LEY_769,
      dificultad: "media",
    }),
    know({
      id: "cale-l04-363",
      lote: LOTE,
      nucleo_nombre: "Normas de transito",
      subtema: "cobertura del seguro obligatorio soat",
      hecho_canonico_id: "l04-nor-08",
      pregunta:
        "¿Qué amparo específico cubre la póliza del Seguro Obligatorio de Accidentes de Tránsito (SOAT) en Colombia?",
      opcion_a: "Cubre los daños de latonería y pintura de los vehículos siniestrados",
      opcion_b: "Cubre el robo del vehículo y las pérdidas por vandalismo",
      opcion_c:
        "Ampara única y exclusivamente la atención médica, hospitalaria, quirúrgica, farmacéutica, incapacidad y muerte de todas las personas lesionadas (ocupantes y peatones) involucradas en el siniestro",
      opcion_d: "Paga las multas de tránsito acumuladas del conductor",
      respuesta_correcta: "c",
      explicacion:
        "El SOAT es un seguro social con función humanitaria que garantiza cobertura médica inmediata a cualquier víctima de siniestro vial. NO cubre daños materiales, latonería, hurtos ni responsabilidad civil extracontractual.",
      fundamento_legal: "Estatuto Orgánico del Sistema Financiero; Ley 769 de 2002, Art. 42.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    know({
      id: "cale-l04-364",
      lote: LOTE,
      nucleo_nombre: "Normas de transito",
      subtema: "periodicidad revision tecnico mecanica particulares ley 2294",
      hecho_canonico_id: "l04-nor-09",
      pregunta:
        "Conforme a la normativa vigente (Ley 2294 de 2023), ¿cuándo debe realizar la primera Revisión Técnico-Mecánica un automóvil PARTICULAR nuevo de servicio privado?",
      opcion_a: "A los seis meses de comprado en el concesionario",
      opcion_b: "Únicamente cuando vaya a vender el vehículo",
      opcion_c: "Al décimo año de antigüedad",
      opcion_d:
        "Al quinto (5°) año contado a partir de la fecha de su matrícula inicial, y de allí en adelante cada año",
      respuesta_correcta: "d",
      explicacion:
        "La Ley 2294 de 2023 modificó los plazos: los vehículos particulares nuevos deben realizar su primera revisión técnico-mecánica y de gases al 5° año desde la fecha de matrícula, renovándola anualmente.",
      fundamento_legal: "Ley 2294 de 2023, Art. 179; Ley 769 de 2002, Art. 52.",
      source: SOURCES.LEY_769,
      dificultad: "media",
    }),
    know({
      id: "cale-l04-365",
      lote: LOTE,
      nucleo_nombre: "Normas de transito",
      subtema: "periodicidad rtm servicio publico y motos",
      hecho_canonico_id: "l04-nor-10",
      pregunta:
        "¿Cuándo deben efectuar la primera Revisión Técnico-Mecánica las motocicletas nuevas y los vehículos de servicio público nuevos?",
      opcion_a:
        "A los dos (2) años contados a partir de su fecha de matrícula inicial, y de allí en adelante anualmente",
      opcion_b: "A los cinco años de matriculados",
      opcion_c: "Cada seis meses desde el primer día de uso",
      opcion_d: "A los diez años de rodamiento",
      respuesta_correcta: "a",
      explicacion:
        "Por su mayor exposición al desgaste y riesgo, las motocicletas y los vehículos de servicio público nuevos deben someterse a la primera revisión técnico-mecánica a los 2 años de matrícula, y luego cada año.",
      fundamento_legal: "Ley 769 de 2002, Art. 52; Ley 2294 de 2023.",
      source: SOURCES.LEY_769,
      dificultad: "media",
    }),
    know({
      id: "cale-l04-366",
      lote: LOTE,
      nucleo_nombre: "Normas de transito",
      subtema: "distancia lateral minima de adelantamiento a ciclistas ley 1811",
      hecho_canonico_id: "l04-nor-11",
      pregunta:
        "¿Cuál es la distancia lateral mínima obligatoria que debe dejar todo vehículo automotor al adelantar a un ciclista según la Ley 1811 de 2016?",
      opcion_a: "Mínimo 20 centímetros",
      opcion_b: "Mínimo 1,5 metros de separación lateral",
      opcion_c: "Exactamente 5 metros",
      opcion_d: "No existe distancia mínima si se toca la bocina",
      respuesta_correcta: "b",
      explicacion:
        "La Ley 1811 de 2016 consagra que todo conductor que sobrepase a un ciclista debe mantener una distancia no menor a un metro y medio (1,5 m) para evitar derribarlo con la turbulencia del aire o roces.",
      fundamento_legal: "Ley 1811 de 2016, Art. 1; Ley 769 de 2002, Art. 60.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    know({
      id: "cale-l04-367",
      lote: LOTE,
      nucleo_nombre: "Normas de transito",
      subtema: "derecho del ciclista a ocupar un carril completo",
      hecho_canonico_id: "l04-nor-12",
      pregunta:
        "¿Qué derecho asiste a los ciclistas en calzadas mixtas donde no exista ciclorruta o carril exclusivo según la Ley 1811 de 2016?",
      opcion_a: "Deben bajarse de la bicicleta y caminar si hay carros circulando",
      opcion_b:
        "Tienen la obligación de circular exclusivamente por encima de los andenes peatonales",
      opcion_c:
        "Tienen derecho a ocupar el carril completo para su seguridad, no estando obligados a circular pegados a la cuneta o andén",
      opcion_d: "Solo pueden circular en horarios nocturnos",
      respuesta_correcta: "c",
      explicacion:
        "La Ley 1811 reconoce a los ciclistas como usuarios plenos de la vía con derecho a transitar ocupando el centro del carril para hacerse visibles y evitar puertas abiertas de autos parqueados.",
      fundamento_legal: "Ley 1811 de 2016, Art. 14; Ley 769 de 2002, Art. 95.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    know({
      id: "cale-l04-368",
      lote: LOTE,
      nucleo_nombre: "Normas de transito",
      subtema: "obligaciones del conductor adelantado",
      hecho_canonico_id: "l04-nor-13",
      pregunta:
        "Cuando a usted le anuncian que va a ser adelantado por otro vehículo en carretera, ¿qué obligación legal le impone el artículo 69 de la Ley 769?",
      opcion_a: "Acelerar para evitar que lo pasen",
      opcion_b: "Encender las luces altas y tocar la bocina",
      opcion_c: "Girar bruscamente a la izquierda para bloquearlo",
      opcion_d:
        "Mantener su carril, no aumentar la velocidad y de ser posible reducirla para facilitar la maniobra segura del otro automotor",
      respuesta_correcta: "d",
      explicacion:
        "El conductor del vehículo que va a ser sobrepasado debe conservar su trayectoria por la derecha y no acelerar, colaborando para que el adelantamiento concluya en el menor tiempo y distancia posibles.",
      fundamento_legal: "Ley 769 de 2002, Art. 69; Manual de Referencia ANSV.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    know({
      id: "cale-l04-369",
      lote: LOTE,
      nucleo_nombre: "Normas de transito",
      subtema: "distancia de estacionamiento al anden e interseccion",
      hecho_canonico_id: "l04-nor-14",
      pregunta:
        "Según el Código Nacional de Tránsito, ¿a qué distancia máxima del andén y a qué distancia mínima de una intersección o esquina debe estacionarse un vehículo en vías autorizadas?",
      opcion_a:
        "A una distancia no mayor de treinta (30) centímetros del andén y a no menos de cinco (5) metros de la intersección",
      opcion_b: "A máximo 1 metro del andén y a 1 metro de la esquina",
      opcion_c: "Subido completamente sobre la acera peatonal",
      opcion_d: "A tres metros del andén en doble fila",
      respuesta_correcta: "a",
      explicacion:
        "El artículo 75 y 76 de la Ley 769 exige estacionar paralelo a menos de 30 cm del borde del andén y dejando libres al menos 5 metros desde la esquina para garantizar el radio de giro y la visibilidad del cruce.",
      fundamento_legal: "Ley 769 de 2002, Art. 75 y Art. 76; Art. 131, infracción C.02.",
      source: SOURCES.LEY_769,
      dificultad: "media",
    }),
    know({
      id: "cale-l04-370",
      lote: LOTE,
      nucleo_nombre: "Normas de transito",
      subtema: "prohibicion de parquear en sitios criticos",
      hecho_canonico_id: "l04-nor-15",
      pregunta:
        "¿En cuáles de los siguientes lugares está terminantemente prohibido estacionar según el artículo 76 del Código de Tránsito?",
      opcion_a: "En los parqueaderos públicos habilitados",
      opcion_b:
        "En andenes, zonas verdes, vías arterias, puentes, túneles, curvas y frente a garajes o hidrantes",
      opcion_c: "En las bahías de estacionamiento expresamente señalizadas",
      opcion_d: "Dentro del garaje de la propia vivienda",
      respuesta_correcta: "b",
      explicacion:
        "El artículo 76 lista taxativamente los lugares prohibidos para parquear, buscando preservar la fluidez, la seguridad estructural y el acceso a emergencias de bomberos o garajes privados.",
      fundamento_legal: "Ley 769 de 2002, Art. 76 y Art. 131, infracción C.02.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    know({
      id: "cale-l04-371",
      lote: LOTE,
      nucleo_nombre: "Senalizacion vial e infraestructura",
      subtema: "color naranja de senalizacion transitoria de obra",
      hecho_canonico_id: "l04-sen-01",
      pregunta:
        "En el Manual de Señalización Vial 2024, ¿qué color de fondo identifica de forma exclusiva y obligatoria a las señales de obra y transitorias en la vía?",
      opcion_a: "Verde esmeralda",
      opcion_b: "Azul marino",
      opcion_c: "Naranja fluorescente o retrorreflectivo",
      opcion_d: "Blanco hueso sin reflejo",
      respuesta_correcta: "c",
      explicacion:
        "El color naranja se reserva exclusivamente para zonas de obras, trabajos de mantenimiento o emergencias en la calzada, advirtiendo a los conductores de condiciones anormales temporales.",
      fundamento_legal: "Manual de Señalización Vial 2024, Capítulo 4 (Señalización de Obra).",
      source: SOURCES.MANUAL_SENALIZACION,
      dificultad: "facil",
    }),
    know({
      id: "cale-l04-372",
      lote: LOTE,
      nucleo_nombre: "Senalizacion vial e infraestructura",
      subtema: "senal spo-01 trabajos en la via",
      hecho_canonico_id: "l04-sen-02",
      pregunta:
        "¿Qué advierte la señal transitoria de obra SPO-01 que muestra a una persona paleando tierra sobre fondo naranja?",
      opcion_a: "Zona de cultivo agrícola cercana",
      opcion_b: "Lugar habilitado para arrojar escombros",
      opcion_c: "Pista de patinaje sobre arena",
      opcion_d:
        "Presencia próxima de obras o trabajos sobre la vía, advirtiendo reducir la marcha y anticipar obstáculos o desvíos",
      respuesta_correcta: "d",
      explicacion:
        "La señal preventiva de obra SPO-01 alerta la proximidad de labores humanas o maquinaria en la vía, exigiendo extremar precauciones y moderar la velocidad.",
      fundamento_legal: "Manual de Señalización Vial 2024, Señal Preventiva de Obra SPO-01.",
      source: SOURCES.MANUAL_SENALIZACION,
      dificultad: "facil",
    }),
    know({
      id: "cale-l04-373",
      lote: LOTE,
      nucleo_nombre: "Senalizacion vial e infraestructura",
      subtema: "senal spo-02 auxiliar de transito banderero",
      hecho_canonico_id: "l04-sen-03",
      pregunta:
        "¿Qué indica la señal transitoria SPO-02 que muestra la silueta de una persona sosteniendo una bandera o paleta sobre fondo naranja?",
      opcion_a:
        "Presencia obligatoria de un auxiliar de tránsito (banderero) regulando el flujo alterno de vehículos por cierre temporal de carril",
      opcion_b: "Fin de la zona urbana",
      opcion_c: "Desfile patrio en la carretera",
      opcion_d: "Venta de banderas y recuerdos turísticos",
      respuesta_correcta: "a",
      explicacion:
        "La señal SPO-02 prepara al conductor para encontrar a un operario debidamente identificado dirigiendo el tránsito por paso a un solo carril, cuyas indicaciones de PARE y SIGA deben acatarse.",
      fundamento_legal: "Manual de Señalización Vial 2024, Señal Preventiva de Obra SPO-02.",
      source: SOURCES.MANUAL_SENALIZACION,
      dificultad: "facil",
    }),
    know({
      id: "cale-l04-374",
      lote: LOTE,
      nucleo_nombre: "Senalizacion vial e infraestructura",
      subtema: "dispositivos de canalizacion maletines y conos",
      hecho_canonico_id: "l04-sen-04",
      pregunta:
        "¿Cuál es la función técnica de los conos de obra y barreras plásticas tipo 'maletín' rellenas de agua instaladas en una zona vial?",
      opcion_a: "Decorar las bermas durante festivales municipales",
      opcion_b:
        "Canalizar, aislar y guiar el flujo del tráfico de manera segura alrededor del área de trabajo o peligro, protegiendo a operarios y conductores",
      opcion_c: "Servir de bebedero de agua para animales callejeros",
      opcion_d: "Servir de graderías para espectadores de eventos",
      respuesta_correcta: "b",
      explicacion:
        "Los dispositivos de canalización delimitan el sendero transitable temporal, encauzan a los vehículos de manera segura y amortiguan posibles desvíos contra zonas de excavación profunda.",
      fundamento_legal: "Manual de Señalización Vial 2024, Sección Dispositivos de Canalización.",
      source: SOURCES.MANUAL_SENALIZACION,
      dificultad: "facil",
    }),
    know({
      id: "cale-l04-375",
      lote: LOTE,
      nucleo_nombre: "Senalizacion vial e infraestructura",
      subtema: "zona de espera adelantada motobox y bicibox",
      hecho_canonico_id: "l04-sen-05",
      pregunta:
        "¿Qué es una zona de espera adelantada ('motobox' o 'bicibox') demarcada en el pavimento antes de un semáforo?",
      opcion_a: "Un área exclusiva para estacionar motocicletas durante la noche",
      opcion_b: "Una zona de carreras de velocidad corta",
      opcion_c:
        "Un espacio reservado entre la línea de parada de automóviles y el paso peatonal para que motos y bicicletas se posicionen adelante en luz roja, mejorando su visibilidad y arranque seguro",
      opcion_d: "Un taller mecánico móvil en medio de la calle",
      respuesta_correcta: "c",
      explicacion:
        "El motobox y bicibox ubica a los vehículos vulnerables por delante de los carros detenidos en rojo, evitando que queden en los puntos ciegos laterales y salgan con mayor fluidez y seguridad al cambiar a verde.",
      fundamento_legal: "Manual de Señalización Vial 2024; Manual de Referencia ANSV.",
      source: SOURCES.MANUAL_SENALIZACION,
      dificultad: "media",
    }),
    know({
      id: "cale-l04-376",
      lote: LOTE,
      nucleo_nombre: "Senalizacion vial e infraestructura",
      subtema: "paso peatonal elevado o pompeyano",
      hecho_canonico_id: "l04-sen-06",
      pregunta:
        "¿Qué es un paso peatonal a nivel o 'pompeyano' y qué obligación impone a los conductores automotores?",
      opcion_a: "Un puente peatonal metálico elevado sobre la vía",
      opcion_b: "Una rampa de carreras para probar amortiguadores",
      opcion_c: "Un túnel subterráneo para ciclistas",
      opcion_d:
        "Una sobreelevación continua de la calzada que queda a la misma altura del andén con demarcación de cebra, obligando al conductor a reducir drásticamente la velocidad y ceder prelación total al peatón",
      respuesta_correcta: "d",
      explicacion:
        "El pompeyano nivela la calzada con la acera para privilegiar la accesibilidad universal de peatones y personas con movilidad reducida, funcionando como reductor de velocidad físico ineludible.",
      fundamento_legal: "Manual de Señalización Vial 2024; Ley 769 de 2002, Art. 105.",
      source: SOURCES.MANUAL_SENALIZACION,
      dificultad: "media",
    }),
    know({
      id: "cale-l04-377",
      lote: LOTE,
      nucleo_nombre: "Senalizacion vial e infraestructura",
      subtema: "carril preferencial solo bus",
      hecho_canonico_id: "l04-sen-07",
      pregunta:
        "¿Qué restricción rige sobre los carriles demarcados con la leyenda 'SOLO BUS' en corredores viales urbanos?",
      opcion_a:
        "Son carriles exclusivos para el transporte público masivo o colectivo; los vehículos particulares solo pueden ingresar transitoriamente para efectuar giros a la derecha inmediatos o acceso a predios",
      opcion_b: "Cualquier vehículo particular puede parquear allí por tiempo ilimitado",
      opcion_c: "Son carriles de alta velocidad para adelantar por la derecha",
      opcion_d: "Son pistas exclusivas para carreras de patinetas eléctricas",
      respuesta_correcta: "a",
      explicacion:
        "La priorización del transporte masivo agiliza el traslado de la mayoría de ciudadanos. Transitar o parquear en carriles 'Solo Bus' está severamente sancionado por el Código de Tránsito.",
      fundamento_legal:
        "Ley 769 de 2002, Art. 131, infracción C.14; Manual de Señalización Vial 2024.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    know({
      id: "cale-l04-378",
      lote: LOTE,
      nucleo_nombre: "Senalizacion vial e infraestructura",
      subtema: "isla o refugio peatonal intermedio",
      hecho_canonico_id: "l04-sen-08",
      pregunta:
        "¿Qué función cumple un refugio peatonal o isla central en avenidas anchas de varios carriles?",
      opcion_a: "Sirve de parqueadero para motocicletas de mensajería",
      opcion_b:
        "Permite a los peatones cruzar la avenida en dos etapas seguras, sirviendo de zona protegida intermedia si no alcanzan a completar el cruce en un solo ciclo semafórico",
      opcion_c: "Es un área de depósito temporal de basuras",
      opcion_d: "Es una pista de calentamiento para deportistas",
      respuesta_correcta: "b",
      explicacion:
        "Los refugios peatonales protegen a adultos mayores, niños y personas con discapacidad en calzadas anchas, permitiéndoles cruzar de forma fraccionada sin quedar atrapados entre los flujos vehiculares.",
      fundamento_legal:
        "Manual de Señalización Vial 2024, Sección Dispositivos de Protección Peatonal.",
      source: SOURCES.MANUAL_SENALIZACION,
      dificultad: "facil",
    }),
    know({
      id: "cale-l04-379",
      lote: LOTE,
      nucleo_nombre: "Senalizacion vial e infraestructura",
      subtema: "resaltos parabolicos y trapezoidales",
      hecho_canonico_id: "l04-sen-09",
      pregunta:
        "¿Cuál es el propósito de la instalación de reductores físicos de velocidad (resaltos o 'policías acostados') debidamente señalizados en zonas urbanas?",
      opcion_a: "Dañar mecánicamente la suspensión de todos los carros",
      opcion_b: "Impedir el paso de camiones de basura",
      opcion_c:
        "Forzar físicamente la reducción de velocidad vehicular a niveles seguros (generalmente ≤30 km/h) en zonas escolares, residenciales o de alta accidentalidad peatonal",
      opcion_d: "Elevar la calzada para evitar inundaciones pluviales",
      respuesta_correcta: "c",
      explicacion:
        "Los reductores de velocidad son medidas de pacificación de tránsito para proteger vidas vulnerables en sectores escolares y residenciales donde las señales verticales no son respetadas voluntariamente.",
      fundamento_legal:
        "Manual de Señalización Vial 2024, Capítulo Dispositivos Físicos de Calzada.",
      source: SOURCES.MANUAL_SENALIZACION,
      dificultad: "facil",
    }),
    know({
      id: "cale-l04-380",
      lote: LOTE,
      nucleo_nombre: "Senalizacion vial e infraestructura",
      subtema: "bandas sonoras o alertadoras transversales",
      hecho_canonico_id: "l04-sen-10",
      pregunta:
        "¿Qué efecto generan las bandas sonoras transversales (resaltos milimétricos continuos o estoperoles) al pasar sobre ellas en carretera?",
      opcion_a: "Desinflan las ruedas para detener el automóvil a la fuerza",
      opcion_b: "Apagan el motor de forma controlada",
      opcion_c: "Recargan de forma inalámbrica la batería del vehículo",
      opcion_d:
        "Producen una vibración táctil en el volante y un zumbido sonoro que alerta al conductor distraído o somnoliento sobre la cercanía de un punto de alto riesgo o peaje",
      respuesta_correcta: "d",
      explicacion:
        "Las bandas sonoras advierten de forma sensorial (oído y tacto) la aproximación a curvas peligrosas, glorietas, estaciones de peaje o cruces críticos, induciendo al conductor a desacelerar.",
      fundamento_legal: "Manual de Señalización Vial 2024, Sección Dispositivos de Alerta.",
      source: SOURCES.MANUAL_SENALIZACION,
      dificultad: "facil",
    }),
    know({
      id: "cale-l04-381",
      lote: LOTE,
      nucleo_nombre: "Senalizacion vial e infraestructura",
      subtema: "senal sp-47 zona escolar",
      hecho_canonico_id: "l04-sen-11",
      pregunta:
        "¿Qué comportamiento exige de forma estricta la señal preventiva SP-47 que muestra dos siluetas escolares con libros cruzando?",
      opcion_a:
        "Reducir la velocidad a un máximo estricto de treinta (30) km/h y extremar la precaución ante la presencia constante de menores cruzando la calzada",
      opcion_b: "Acelerar a 80 km/h para despejar la zona rápidamente",
      opcion_c: "Tocar la bocina continuamente para que los niños salgan de la calle",
      opcion_d: "Estacionar en doble fila en la puerta del colegio",
      respuesta_correcta: "a",
      explicacion:
        "La señal SP-47 y la Ley 2251 de 2022 fijan un límite máximo imperativo de 30 km/h en zonas escolares para salvaguardar a los niños en sus horarios de entrada y salida de clases.",
      fundamento_legal: "Ley 2251 de 2022, Art. 106; Manual de Señalización Vial 2024.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    know({
      id: "cale-l04-382",
      lote: LOTE,
      nucleo_nombre: "Senalizacion vial e infraestructura",
      subtema: "senal sp-59 ciclistas en la via",
      hecho_canonico_id: "l04-sen-12",
      pregunta:
        "¿Qué advierte la señal preventiva SP-59 con pictograma de bicicleta sobre rombo amarillo?",
      opcion_a: "Prohibición de circular en bicicleta en esa vía",
      opcion_b:
        "Proximidad de un sector de la vía con alta presencia o cruce habitual de ciclistas, debiendo extremar la precaución y moderar la velocidad",
      opcion_c: "Taller de reparación de bicicletas gratuito",
      opcion_d: "Zona exclusiva para guardar bicicletas",
      respuesta_correcta: "b",
      explicacion:
        "La señal SP-59 alerta a los conductores de automotores sobre corredores con intenso flujo de ciclistas para prevenir atropellos y fomentar el respeto por la distancia de 1,5 metros.",
      fundamento_legal: "Manual de Señalización Vial 2024, Señal Preventiva SP-59.",
      source: SOURCES.MANUAL_SENALIZACION,
      dificultad: "facil",
    }),
    know({
      id: "cale-l04-383",
      lote: LOTE,
      nucleo_nombre: "Senalizacion vial e infraestructura",
      subtema: "senal sr-28a prohibido parquear y detenerse",
      hecho_canonico_id: "l04-sen-13",
      pregunta:
        "¿Cuál es la diferencia crítica entre la señal reglamentaria SR-28 (una sola banda diagonal roja sobre la letra P) y la SR-28A (doble banda diagonal formando una 'X' roja sobre la letra P)?",
      opcion_a: "Significan exactamente lo mismo sin ninguna diferencia legal",
      opcion_b: "La SR-28 es para carros y la SR-28A es para motocicletas",
      opcion_c:
        "La SR-28 prohíbe parquear pero autoriza detenerse momentáneamente para dejar o tomar pasajeros; la SR-28A prohíbe tanto parquear como detenerse transitoriamente bajo cualquier circunstancia",
      opcion_d: "La SR-28 autoriza estacionar gratis y la SR-28A cobra parqueadero",
      respuesta_correcta: "c",
      explicacion:
        "La señal SR-28A (la 'X' roja) prohíbe la detención total del vehículo incluso por breves segundos para dejar o recoger pasajeros, común en vías rápidas o accesos a túneles y puentes.",
      fundamento_legal: "Manual de Señalización Vial 2024, Señales Reglamentarias SR-28 y SR-28A.",
      source: SOURCES.MANUAL_SENALIZACION,
      dificultad: "media",
    }),
    know({
      id: "cale-l04-384",
      lote: LOTE,
      nucleo_nombre: "Senalizacion vial e infraestructura",
      subtema: "senal sr-16 prohibido adelantar",
      hecho_canonico_id: "l04-sen-14",
      pregunta:
        "¿Qué prohíbe terminantemente la señal reglamentaria SR-16 que muestra dos automóviles paralelos (uno negro y uno rojo dentro de orla roja)?",
      opcion_a: "Prohibido circular dos vehículos en el mismo sentido",
      opcion_b: "Permitido adelantar a más de 120 km/h",
      opcion_c: "Obligación de chocar de costado con el vehículo vecino",
      opcion_d:
        "Prohibido efectuar maniobras de adelantamiento a otros vehículos en ese tramo de vía",
      respuesta_correcta: "d",
      explicacion:
        "La señal SR-16 prohíbe rebasar a otros vehículos debido a falta de visibilidad, curvas cerradas, puentes angostos o alta tasa de accidentalidad frontal en ese tramo vial.",
      fundamento_legal:
        "Manual de Señalización Vial 2024, Señal Reglamentaria SR-16; Ley 769 de 2002, Art. 73.",
      source: SOURCES.MANUAL_SENALIZACION,
      dificultad: "facil",
    }),
    know({
      id: "cale-l04-385",
      lote: LOTE,
      nucleo_nombre: "Senalizacion vial e infraestructura",
      subtema: "senal si-01 primeros auxilios",
      hecho_canonico_id: "l04-sen-15",
      pregunta:
        "¿Qué servicio informa la señal vertical informativa azul con una cruz roja sobre cuadro blanco (SI-01)?",
      opcion_a:
        "Proximidad de un centro de primeros auxilios, puesto de salud o atención médica de urgencias en carretera",
      opcion_b: "Cercanía de una iglesia o templo religioso",
      opcion_c: "Intersección peligrosa de cuatro esquinas",
      opcion_d: "Zona de cementerio municipal",
      respuesta_correcta: "a",
      explicacion:
        "La señal informativa de servicios generales SI-01 orienta a conductores en ruta sobre la ubicación inmediata de puestos médicos o de socorro para atender emergencias de salud.",
      fundamento_legal: "Manual de Señalización Vial 2024, Señal Informativa SI-01.",
      source: SOURCES.MANUAL_SENALIZACION,
      dificultad: "facil",
    }),
    know({
      id: "cale-l04-386",
      lote: LOTE,
      nucleo_nombre: "El vehiculo",
      subtema: "secuencia de inspeccion preoperacional 360",
      hecho_canonico_id: "l04-veh-01",
      pregunta:
        "¿Cuál es el objetivo principal de realizar la inspección preoperacional de 360 grados alrededor del automotor antes del encendido diario?",
      opcion_a: "Verificar el estado estético de la cera y brillo de la carrocería",
      opcion_b:
        "Verificar ausencia de charcos de fugas en el suelo, estado y presión visual de las 4 llantas, limpieza y funcionamiento de luces y retrovisores y estado de placas legibles",
      opcion_c: "Comprobar si el radio tiene sintonizada la emisora preferida",
      opcion_d: "Asegurarse de que el aire acondicionado esté a máxima potencia",
      respuesta_correcta: "b",
      explicacion:
        "La inspección preoperacional circular detecta averías críticas (llantas bajas, cortes en el caucho, fugas de frenos o aceite y bombillas fundidas) antes de salir a la vía pública.",
      fundamento_legal: "Manual de Referencia ANSV sobre protocolo de alistamiento operacional.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    know({
      id: "cale-l04-387",
      lote: LOTE,
      nucleo_nombre: "El vehiculo",
      subtema: "ergonomia y ajuste de distancia del asiento al pedalier",
      hecho_canonico_id: "l04-veh-02",
      pregunta:
        "¿Cómo se calibra la distancia longitudinal correcta entre el asiento del conductor y los pedales?",
      opcion_a: "Con la pierna totalmente estirada y la rodilla trabada al pisar el pedal a fondo",
      opcion_b: "Con las rodillas dobladas golpeando directamente el tablero de mandos",
      opcion_c:
        "Pisar a fondo el pedal de freno o embrague de tal modo que la rodilla conserve una ligera flexión (unos 120 grados), garantizando fuerza máxima sin fracturarse en caso de choque frontal",
      opcion_d: "Colocando cojines sueltos debajo de las piernas",
      respuesta_correcta: "c",
      explicacion:
        "Llevar la rodilla con ligera flexión permite pisar a fondo con máxima fuerza de palanca y evita que la cadera o fémur se destrocen ante la transmisión de energía de un impacto frontal.",
      fundamento_legal:
        "Manual de Referencia ANSV sobre ergonomía y biomecánica en el puesto de mando.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l04-388",
      lote: LOTE,
      nucleo_nombre: "El vehiculo",
      subtema: "sujecion correcta del volante 9 y 3",
      hecho_canonico_id: "l04-veh-03",
      pregunta:
        "¿Cuál es la posición técnica y segura recomendada para sujetar el volante en vehículos modernos equipados con airbag?",
      opcion_a: "Sujetar el volante con una sola mano por la parte superior (las 12 del reloj)",
      opcion_b: "Manejar con las rodillas para tener las manos libres",
      opcion_c: "Sujetar el volante por dentro de los radios del timón con las palmas hacia arriba",
      opcion_d:
        "Colocar las manos en la posición horaria de las '9 y 3' o '10 y 2' con los pulgares apoyados sin rodear el aro y brazos ligeramente doblados",
      respuesta_correcta: "d",
      explicacion:
        "La posición '9 y 3' permite el mayor ángulo de giro sin soltar el timón, y evita que los brazos sufran fracturas severas por el despliegue explosivo del airbag a más de 250 km/h.",
      fundamento_legal: "Manual de Referencia ANSV sobre ergonomía y seguridad activa.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    know({
      id: "cale-l04-389",
      lote: LOTE,
      nucleo_nombre: "El vehiculo",
      subtema: "reaccion ante reventon de llanta delantera en marcha",
      hecho_canonico_id: "l04-veh-04",
      pregunta:
        "Si a 80 km/h en carretera estalla súbitamente una llanta delantera provocando un tirón violento hacia un lado, ¿cuál es la maniobra que salva la vida?",
      opcion_a:
        "Sujetar el volante firmemente con ambas manos para mantener la trayectoria recta, soltar suavemente el acelerador, NO frenar bruscamente y orillarse cuando la velocidad sea baja",
      opcion_b: "Clavar los frenos a fondo y soltar el volante por el susto",
      opcion_c: "Jalar de inmediato la palanca del freno de mano al máximo",
      opcion_d: "Girar el volante bruscamente hacia el lado contrario del tirón",
      respuesta_correcta: "a",
      explicacion:
        "Frenar en seco con una llanta destrozada hace que el rin muerda el asfalto desestabilizando el carro y provocando un vuelco inmediato. Mantener firme el volante y desacelerar progresivamente preserva el control.",
      fundamento_legal: "Manual de Referencia ANSV sobre emergencias mecánicas en ruta.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l04-390",
      lote: LOTE,
      nucleo_nombre: "El vehiculo",
      subtema: "falla total de frenos en descenso de montana",
      hecho_canonico_id: "l04-veh-05",
      pregunta:
        "Si al descender una pendiente de montaña pisa el pedal de freno y se va al fondo sin ninguna resistencia ni frenado, ¿qué secuencia técnica debe ejecutar?",
      opcion_a: "Apagar el motor de inmediato retirando la llave del encendido",
      opcion_b:
        "Bombear el pedal por si hay presión residual, rebajar marchas de forma sucesiva (4ª a 3ª, 2ª y 1ª) para retener con freno motor, aplicar el freno de mano progresivamente y buscar un escape o lecho de frenado",
      opcion_c: "Saltar del automóvil en movimiento",
      opcion_d: "Poner la palanca de cambios en neutro y acelerar",
      respuesta_correcta: "b",
      explicacion:
        "El freno motor en cambios bajos retiene drásticamente la inercia del vehículo, y el freno de mano aplicado con suavidad ayuda a frenar las ruedas traseras sin bloquearlas.",
      fundamento_legal:
        "Manual de Referencia ANSV sobre actuación ante fallas catastróficas de frenos.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "dificil",
    }),
    know({
      id: "cale-l04-391",
      lote: LOTE,
      nucleo_nombre: "El vehiculo",
      subtema: "apertura intempestiva del capo en marcha",
      hecho_canonico_id: "l04-veh-06",
      pregunta:
        "Durante la marcha a velocidad se abre súbitamente el capó del motor golpeando el parabrisas y tapando por completo su visión frontal. ¿Cómo actúa?",
      opcion_a: "Frenar en seco en el carril sin mirar atrás",
      opcion_b: "Acelerar para que el viento empuje el capó y lo vuelva a cerrar",
      opcion_c:
        "Mantener la calma, no frenar con violencia, guiarse por la rendija inferior que queda entre el capó y el tablero o por la ventanilla lateral, encender estacionarias y detenerse en la berma",
      opcion_d: "Cerrar los ojos y esperar el choque",
      respuesta_correcta: "c",
      explicacion:
        "Casi siempre queda una ranura visual bajo la base del capó o es posible asomar la vista por la ventanilla izquierda para conservar la línea vial y orillarse con suavidad sin provocar un choque múltiple.",
      fundamento_legal: "Manual de Referencia ANSV sobre control en emergencias de visibilidad.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l04-392",
      lote: LOTE,
      nucleo_nombre: "El vehiculo",
      subtema: "conato de incendio en compartimiento motor",
      hecho_canonico_id: "l04-veh-07",
      pregunta:
        "Si sale humo denso y llamas por los bordes del capó del motor en plena marcha, ¿cuál es el procedimiento seguro para usar el extintor?",
      opcion_a: "Abrir el capó completamente hacia arriba de golpe para ver el fuego",
      opcion_b: "Encender el aire acondicionado al máximo para sofocar el humo",
      opcion_c: "Arrojar un balde de gasolina sobre el motor",
      opcion_d:
        "Detenerse fuera de la vía, cortar el encendido, evacuar a todos, no abrir el capó de golpe para no avivar las llamas con oxígeno, y aplicar el polvo químico del extintor a través de la parrilla frontal o por una pequeña rendija",
      respuesta_correcta: "d",
      explicacion:
        "Abrir de par en par el capó alimenta las llamas con un torrente súbito de oxígeno (efecto 'flashover') que envuelve al conductor en fuego. Se debe aplicar el agente extintor por las ranuras.",
      fundamento_legal:
        "Manual de Referencia ANSV sobre control de incendios vehiculares; Ley 769 de 2002, Art. 30.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l04-393",
      lote: LOTE,
      nucleo_nombre: "El vehiculo",
      subtema: "alineacion y balanceo vehicular",
      hecho_canonico_id: "l04-veh-08",
      pregunta:
        "Si al soltar levemente el volante en una recta plana el vehículo 'tira' o se desvía fuertemente hacia la derecha, y a 80 km/h el volante vibra intensamente en las manos, el automóvil requiere:",
      opcion_a:
        "Servicio de alineación de la geometría de dirección y balanceo dinámico de las ruedas",
      opcion_b: "Cambiar la bomba de gasolina",
      opcion_c: "Cambio de líquido refrigerante",
      opcion_d: "Rellenar el aceite de la caja de cambios",
      respuesta_correcta: "a",
      explicacion:
        "La desviación lateral delata desalineación de los ángulos de convergencia o caída de las ruedas, mientras que la vibración cíclica del timón a velocidad indica desbalanceo de las masas de los rines y llantas.",
      fundamento_legal:
        "Manual de Referencia ANSV sobre mantenimiento de sistemas de dirección y rodaje.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    know({
      id: "cale-l04-394",
      lote: LOTE,
      nucleo_nombre: "El vehiculo",
      subtema: "efecto del desgaste de amortiguadores en la frenada",
      hecho_canonico_id: "l04-veh-09",
      pregunta:
        "¿Cómo inciden unos amortiguadores en mal estado o vencidos en la distancia de frenado de un automóvil?",
      opcion_a: "Acortan la distancia de frenado haciéndola más rápida",
      opcion_b:
        "Incrementan la distancia de frenado significativamente, ya que la rueda rebota sin mantener contacto firme y constante con el pavimento",
      opcion_c: "No influyen en nada en la frenada, solo en la comodidad de los pasajeros",
      opcion_d: "Hacen que los frenos ABS se apaguen para siempre",
      respuesta_correcta: "b",
      explicacion:
        "La misión del amortiguador es evitar que el resorte oscile y la llanta salte. Si está desgastado, la llanta pasa fracciones de segundo rebotando en el aire sin traccionar ni frenar, alargando metros la detención.",
      fundamento_legal: "Manual de Referencia ANSV sobre suspensión y seguridad activa.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l04-395",
      lote: LOTE,
      nucleo_nombre: "El vehiculo",
      subtema: "ajuste correcto de retrovisores para reducir puntos ciegos",
      hecho_canonico_id: "l04-veh-10",
      pregunta:
        "¿Cómo se deben regular los espejos retrovisores exteriores laterales para minimizar los puntos ciegos laterales?",
      opcion_a: "De tal forma que se vea la mayor parte de la puerta y costado de su propio carro",
      opcion_b: "Apuntando totalmente hacia el piso para ver las llantas",
      opcion_c:
        "Ajustándolos hacia afuera hasta que apenas se divise una pequeña fracción del borde trasero de su propia carrocería, abriendo el campo hacia los carriles adyacentes",
      opcion_d: "Apuntando directamente al cielo para ver las nubes",
      respuesta_correcta: "c",
      explicacion:
        "Ver demasiado de la propia carrocería en los espejos laterales es un error común que desperdicia campo visual útil. Abrirlos hacia los carriles vecinos reduce enormemente el ángulo muerto.",
      fundamento_legal: "Manual de Referencia ANSV sobre ajuste de visibilidad operativa.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    know({
      id: "cale-l04-396",
      lote: LOTE,
      nucleo_nombre: "El vehiculo",
      subtema: "ajuste del apoyacabezas latigazo cervical",
      hecho_canonico_id: "l04-veh-11",
      pregunta:
        "¿Cuál es la regulación ergonómica correcta del apoyacabezas del asiento para prevenir lesiones graves por latigazo cervical en caso de choque por detrás?",
      opcion_a: "Retirarlo completamente del vehículo para que no estorbe la visibilidad",
      opcion_b: "A la altura del cuello para que sirva de almohada para dormir",
      opcion_c: "En la posición más baja posible apoyando en los omóplatos",
      opcion_d:
        "La parte superior del apoyacabezas debe coincidir a la altura de la parte superior de la cabeza (o nivel de los ojos), a una distancia no mayor de 4 cm de la nuca",
      respuesta_correcta: "d",
      explicacion:
        "El apoyacabezas es un elemento de seguridad pasiva, no de confort. Si queda bajo, actúa como punto de palanca que quiebra las vértebras cervicales; ajustado a la coronilla frena el rebote brusco de la cabeza.",
      fundamento_legal:
        "Manual de Referencia ANSV sobre seguridad pasiva; Resolución 20253040037125.",
      source: SOURCES.RESOLUCION_CALE,
      dificultad: "facil",
    }),
    know({
      id: "cale-l04-397",
      lote: LOTE,
      nucleo_nombre: "El vehiculo",
      subtema: "prohibicion de silla infantil mirando hacia atras frente a airbag activo",
      hecho_canonico_id: "l04-veh-12",
      pregunta:
        "¿Por qué está estrictamente prohibido instalar un sistema de retención infantil (silla para bebé) orientado hacia atrás en el asiento del copiloto con el airbag frontal activado?",
      opcion_a:
        "Porque al detonarse el airbag impacta el respaldo de la silla infantil con fuerza explosiva descomunal, pudiendo fracturar el cráneo del bebé o causarle asfixia letal inmediata",
      opcion_b: "Porque el bebé no puede ver el paisaje de adelante",
      opcion_c: "Porque la silla desgasta el sensor de cinturón del pasajero",
      opcion_d: "Porque el peso del bebé descalibra los frenos ABS",
      respuesta_correcta: "a",
      explicacion:
        "El airbag se infla a más de 300 km/h en milisegundos. Si choca contra la silla infantil en sentido inverso a la marcha, descarga toda esa energía de impacto directo en la cabeza del infante.",
      fundamento_legal: "Resolución 20253040037125; Manual de Referencia ANSV.",
      source: SOURCES.RESOLUCION_CALE,
      dificultad: "media",
    }),
    know({
      id: "cale-l04-398",
      lote: LOTE,
      nucleo_nombre: "El vehiculo",
      subtema: "efecto submarino en el cinturon de seguridad",
      hecho_canonico_id: "l04-veh-13",
      pregunta: "¿Qué es el 'efecto submarino' y cómo se produce durante un choque frontal?",
      opcion_a: "La caída del vehículo a un río o masa de agua profunda",
      opcion_b:
        "El deslizamiento del cuerpo del ocupante por debajo de la banda pélvica del cinturón de seguridad, causado por una mala postura (asiento muy reclinado) o uso de cojines, provocando graves hemorragias internas en el abdomen",
      opcion_c: "El fallo simultáneo de todos los circuitos eléctricos bajo el agua",
      opcion_d: "El empañamiento instantáneo de los vidrios laterales",
      respuesta_correcta: "b",
      explicacion:
        "Si el cinturón no apoya firmemente en los huesos de la pelvis, o el espaldar está muy acostado, el cuerpo se escurre hacia abajo en el impacto, desgarrando órganos abdominales blandos contra la correa.",
      fundamento_legal: "Manual de Referencia ANSV sobre cinemática del trauma vehicular.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l04-399",
      lote: LOTE,
      nucleo_nombre: "El vehiculo",
      subtema: "zonas de deformacion programada del chasis",
      hecho_canonico_id: "l04-veh-14",
      pregunta:
        "¿Cuál es la función de diseño de las 'zonas de deformación programada' en la estructura delantera y trasera de los vehículos modernos?",
      opcion_a: "Hacer que el carro se rompa fácilmente para obligar al dueño a comprar repuestos",
      opcion_b: "Aumentar la velocidad máxima en línea recta",
      opcion_c:
        "Arrugarse y colapsar progresivamente durante un impacto para disipar y absorber la mayor cantidad posible de energía cinética, protegiendo el habitáculo indeformable de los ocupantes",
      opcion_d: "Permitir que el motor caiga dentro de la cabina de pasajeros",
      respuesta_correcta: "c",
      explicacion:
        "Antiguamente los carros rígidos no se deformaban, pero transmitían toda la desaceleración brutal a los órganos internos de los pasajeros. Hoy la carrocería se deforma como escudo amortiguador.",
      fundamento_legal:
        "Manual de Referencia ANSV sobre seguridad pasiva y resistencia estructural.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    know({
      id: "cale-l04-400",
      lote: LOTE,
      nucleo_nombre: "El vehiculo",
      subtema: "indicadores de desgaste twi en las llantas",
      hecho_canonico_id: "l04-veh-15",
      pregunta:
        "¿Qué son los resaltos de caucho denominados 'testigos de desgaste TWI' ubicados dentro de los canales principales de la banda de rodadura de una llanta?",
      opcion_a: "Válvulas secretas de inflado automático",
      opcion_b: "Puntos de amarre para instalar cadenas de nieve",
      opcion_c: "Adornos decorativos de fábrica sin función técnica",
      opcion_d:
        "Indicadores físicos de 1,6 mm de altura que señalan que el neumático alcanzó el límite legal de desgaste y debe ser reemplazado de inmediato al quedar al ras con el labrado",
      respuesta_correcta: "d",
      explicacion:
        "Cuando el labrado se gasta y llega al mismo nivel del puente TWI (Tread Wear Indicator, 1,6 mm), la llanta es ilegal para transitar y pierde toda capacidad de evacuar agua sobre mojado.",
      fundamento_legal: "Resolución 20253040037125; Ley 769 de 2002, Art. 50.",
      source: SOURCES.RESOLUCION_CALE,
      dificultad: "facil",
    }),
  ],
};
