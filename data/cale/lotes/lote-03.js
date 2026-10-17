/* eslint-disable @typescript-eslint/no-require-imports */

const {
  createAttitudeQuestion: att,
  createKnowledgeQuestion: know,
  SOURCES,
} = require("../schema");

const LOTE = "lote-03";

module.exports = {
  lote: LOTE,
  version: 2,
  descripcion:
    "Lote 03 del banco CALE editorial - Clima adverso, conduccion nocturna, luces, equipo de carretera, senalizacion horizontal y mecanica basica.",
  items: [
    att({
      id: "cale-l03-201",
      lote: LOTE,
      subtema: "lluvia torrencial y visibilidad nula",
      hecho_canonico_id: "l03-att-01",
      pregunta:
        "Comienza a caer un aguacero torrencial con granizo y los limpiaparabrisas no dan abasto, impidiendo ver el camino. ¿Cuál es la actitud más prudente?",
      sentido_clave: "seleccion",
      opcion_a:
        "Buscar un lugar seguro fuera de la calzada, como una estación de servicio o parqueadero, encender estacionarias y esperar a que mejoren las condiciones",
      opcion_b: "Acelerar a fondo para salir lo más rápido posible de la zona de tormenta",
      opcion_c:
        "Pegarse a las luces traseras de un camión grande para guiarse a ciegas a alta velocidad",
      opcion_d: "Apagar las luces del vehículo para evitar reflejos molestos en el vidrio",
      respuesta_recomendada: "a",
      explicacion:
        "Conducir sin visibilidad es una temeridad crítica. Detenerse en un lugar seguro fuera del flujo de tráfico hasta recuperar la visibilidad preserva la vida de todos.",
      fundamento_legal:
        "Manual de Referencia ANSV sobre gestión de riesgos climáticos y conducción preventiva.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    att({
      id: "cale-l03-202",
      lote: LOTE,
      subtema: "uso responsable de luces altas",
      hecho_canonico_id: "l03-att-02",
      pregunta:
        "En carretera nocturna sin iluminación pública usted conduce con luces altas. A la distancia divisa un vehículo que se aproxima en sentido contrario. ¿Qué debe hacer?",
      sentido_clave: "seleccion",
      opcion_a: "Mantener las luces altas hasta que el otro conductor haga el cambio primero",
      opcion_b:
        "Pasar de inmediato a luces medias o bajas para evitar deslumbrar al conductor que viene de frente",
      opcion_c: "Apagar completamente las luces durante unos segundos para descansar la vista",
      opcion_d: "Hacer destellos rápidos continuos para exigirle que se orille a la berma",
      respuesta_recomendada: "b",
      explicacion:
        "El encandilamiento puede cegar temporalmente a otro conductor por varios segundos, provocando un choque frontal. El cambio a luces bajas es un deber de seguridad elemental.",
      fundamento_legal: "Ley 769 de 2002, Art. 86; Manual de Referencia ANSV.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    att({
      id: "cale-l03-203",
      lote: LOTE,
      subtema: "reaccion ante encandilamiento",
      hecho_canonico_id: "l03-att-03",
      pregunta:
        "Un vehículo en sentido contrario se acerca con las luces altas encendidas y lo deslumbra. ¿Cómo debe reaccionar éticamente?",
      sentido_clave: "seleccion",
      opcion_a: "Encender sus propias luces altas para deslumbrarlo también en señal de protesta",
      opcion_b: "Cerrar los ojos un instante y esperar a que el otro vehículo pase",
      opcion_c:
        "Moderar la velocidad, evitar mirar directamente los faros y dirigir la vista hacia la línea de borde derecha de su carril",
      opcion_d: "Pitar continuamente y frenar bruscamente en medio de la calzada",
      respuesta_recomendada: "c",
      explicacion:
        "Tomar represalias encendiendo luces altas deja a ambos conductores ciegos en la noche. Dirigir la mirada hacia la demarcación derecha permite mantener la trayectoria con seguridad.",
      fundamento_legal: "Manual de Referencia ANSV sobre conducción nocturna segura.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    att({
      id: "cale-l03-204",
      lote: LOTE,
      subtema: "charcos y peatones en calzada",
      hecho_canonico_id: "l03-att-04",
      pregunta:
        "Al circular por una calle urbana después de llover, observa un gran charco de agua junto al andén por donde caminan varios peatones. ¿Qué conducta demuestra empatía y seguridad?",
      sentido_clave: "seleccion",
      opcion_a: "Acelerar sobre el charco para limpiar las llantas y dispersar el agua rápidamente",
      opcion_b: "Tocar la bocina insistentemente para que los peatones corran a refugiarse",
      opcion_c:
        "Mantener la marcha sin alteración, pues la prioridad sobre la calzada es siempre del vehículo a motor",
      opcion_d:
        "Reducir la velocidad y esquivar el charco si es seguro, evitando empapar de agua y lodo a las personas",
      respuesta_recomendada: "d",
      explicacion:
        "Salpicar agua o lodo a los peatones vulnera la convivencia ciudadana y demuestra falta de empatía vial; además, golpear charcos a velocidad puede provocar hidroplaneo o averías.",
      fundamento_legal:
        "Ley 769 de 2002, Art. 55 y Art. 105; Código Nacional de Policía y Convivencia.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    att({
      id: "cale-l03-205",
      lote: LOTE,
      subtema: "paciencia en descensos de montana",
      hecho_canonico_id: "l03-att-05",
      pregunta:
        "En una carretera sinuosa de descenso usted queda detrás de un tractocamión cargado que desciende despacio. ¿Qué decisión refleja madurez conductual?",
      sentido_clave: "seleccion",
      opcion_a:
        "Guardar distancia prudente, descender en cambio bajo usando el freno motor y esperar un tramo recto con señalización de adelantamiento permitido",
      opcion_b:
        "Pegarse a centímetros de la cola del camión para presionarlo a orillarse a la fuerza",
      opcion_c: "Pitar repetidamente y hacerle señas agresivas para que acelere en las bajadas",
      opcion_d:
        "Adelantar en la primera curva cerrada aprovechando que el camión no puede acelerar",
      respuesta_recomendada: "a",
      explicacion:
        "Los vehículos pesados deben descender lentamente para no sobrecalentar sus frenos. Intentar un adelantamiento a ciegas en pendientes o curvas suele causar siniestros frontales mortales.",
      fundamento_legal: "Manual de Referencia ANSV; Ley 769 de 2002, Art. 73.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    att({
      id: "cale-l03-206",
      lote: LOTE,
      subtema: "conciencia ambiental y residuos",
      hecho_canonico_id: "l03-att-06",
      pregunta:
        "Un pasajero en su automóvil termina de consumir una bebida en lata e intenta arrojarla por la ventana hacia la vía. ¿Qué actitud debe asumir el conductor?",
      sentido_clave: "seleccion",
      opcion_a: "Permitirlo si la vía es rural y no hay presencia de agentes de tránsito",
      opcion_b:
        "Pedirle con firmeza que conserve la lata dentro del vehículo hasta llegar a un cesto de basura adecuado",
      opcion_c: "Frenar en seco en la mitad del carril para obligar al pasajero a recogerla",
      opcion_d: "Abrir también su propia ventanilla para tirar otros residuos acumulados",
      respuesta_recomendada: "b",
      explicacion:
        "Arrojar basuras a la vía pública contamina el entorno, obstruye alcantarillas causando inundaciones y puede golpear a motociclistas, ciclistas o peatones que transitan detrás.",
      fundamento_legal: "Ley 769 de 2002, Art. 78 y Art. 131, infracción B.07; Ley 1801 de 2016.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    att({
      id: "cale-l03-207",
      lote: LOTE,
      subtema: "contaminacion acustica y uso de bocina",
      hecho_canonico_id: "l03-att-07",
      pregunta:
        "Está atrapado en una congestión vehicular cerca de un hospital y la fila de carros no avanza. ¿Cómo debe gestionar el uso del pito?",
      sentido_clave: "seleccion",
      opcion_a: "Tocar toques breves cada 10 segundos para descargar la frustración acumulada",
      opcion_b:
        "Oprimir la bocina de forma continua para que la policía de tránsito agilice el flujo",
      opcion_c:
        "Abstenerse de tocar el pito, entendiendo que no disolverá el trancón y perturba gravemente la tranquilidad y salud de pacientes y vecinos",
      opcion_d:
        "Instalar una corneta de aire de alto decibelio para hacerse escuchar por encima de los demás",
      respuesta_recomendada: "c",
      explicacion:
        "La bocina solo debe utilizarse para prevenir siniestros inminentes. Usarla en trancones genera contaminación acústica, estrés colectivo y está expresamente prohibida en zonas hospitalarias.",
      fundamento_legal:
        "Ley 769 de 2002, Art. 104 y Art. 131, infracción C.38; Resolución 20253040037125.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    att({
      id: "cale-l03-208",
      lote: LOTE,
      subtema: "transicion de luz verde a amarilla",
      hecho_canonico_id: "l03-att-08",
      pregunta:
        "Al aproximarse a una intersección a velocidad prudente, el semáforo cambia de luz verde a luz amarilla cuando usted aún tiene distancia suficiente para frenar. ¿Qué decisión es correcta?",
      sentido_clave: "seleccion",
      opcion_a: "Acelerar con fuerza para cruzar antes de que aparezca la luz roja",
      opcion_b: "Girar bruscamente hacia el andén para esquivar el semáforo",
      opcion_c: "Tocar la bocina y continuar sin verificar el tráfico lateral",
      opcion_d:
        "Detener el vehículo de forma suave y controlada antes de la línea transversal de parada",
      respuesta_recomendada: "d",
      explicacion:
        "La luz amarilla advierte el fin del paso libre. Si el conductor puede detenerse de manera segura sin riesgo de ser impactado por detrás, tiene la obligación legal y moral de detenerse.",
      fundamento_legal: "Ley 769 de 2002, Art. 118; Manual de Señalización Vial 2024.",
      source: SOURCES.LEY_769,
      dificultad: "media",
    }),
    att({
      id: "cale-l03-209",
      lote: LOTE,
      subtema: "paciencia en peajes y retenes",
      hecho_canonico_id: "l03-att-09",
      pregunta:
        "Al llegar a una estación de peaje en un fin de semana festivo se forman filas largas. Un conductor a su derecha intenta meterse a la fuerza sin hacer la fila. ¿Cómo reaccionar?",
      sentido_clave: "seleccion",
      opcion_a:
        "Mantener la calma, cederle el espacio con serenidad y evitar caer en provocaciones o discusiones violentas",
      opcion_b: "Bajar del vehículo con un objeto contundente para exigirle respeto",
      opcion_c: "Acelerar para chocarlo levemente y enseñarle a respetar el turno",
      opcion_d: "Cerrarle el paso agresivamente bloqueando las dos casetas de cobro",
      respuesta_recomendada: "a",
      explicacion:
        "La intolerancia ante infracciones ajenas escala conflictos innecesarios. Priorizar la paz y la seguridad propia y de los acompañantes es señal de madurez y autocontrol emocional.",
      fundamento_legal:
        "Manual de Referencia ANSV sobre inteligencia emocional y convivencia en la vía.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    att({
      id: "cale-l03-210",
      lote: LOTE,
      subtema: "empatia con vehiculo de ensenanza",
      hecho_canonico_id: "l03-att-10",
      pregunta:
        "Adelante de usted va un automóvil con distintivos de escuela de enseñanza automovilística. Al arrancar en una pendiente el motor se le apaga. ¿Cuál debe ser su actitud?",
      sentido_clave: "seleccion",
      opcion_a: "Pegarse a su parachoques y pitar desesperadamente para que aprenda bajo presión",
      opcion_b:
        "Mantener una distancia de seguridad prudente, ser paciente y darle tiempo y tranquilidad al aprendiz para reiniciar la marcha",
      opcion_c: "Pasarlo por la derecha subiéndose al andén peatonal",
      opcion_d: "Lanzar improperios por la ventana hacia el instructor y el alumno",
      respuesta_recomendada: "b",
      explicacion:
        "Todos los conductores pasaron por el proceso de aprendizaje. Acosar a un aprendiz genera pánico, eleva el riesgo de que el carro ruede hacia atrás y colisione con el suyo.",
      fundamento_legal: "Manual de Referencia ANSV; Ley 769 de 2002, Art. 87.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    att({
      id: "cale-l03-211",
      lote: LOTE,
      subtema: "conciencia de fatiga visual",
      hecho_canonico_id: "l03-att-11",
      pregunta:
        "Durante un viaje largo nocturno empieza a sentir sequedad en los ojos, parpadeo constante y dificultad para calcular distancias. ¿Qué decisión toma?",
      sentido_clave: "seleccion",
      opcion_a:
        "Frotarse los ojos fuertemente y seguir conduciendo a mayor velocidad para llegar pronto",
      opcion_b:
        "Encender la radio al máximo volumen y tomarse una bebida energizante para ignorar los síntomas",
      opcion_c:
        "Reconocer los síntomas de fatiga psicofísica, buscar un lugar seguro, detenerse y descansar al menos 20 minutos",
      opcion_d:
        "Conducir con una sola mano y sacar la cabeza por la ventanilla para tomar aire frío",
      respuesta_recomendada: "c",
      explicacion:
        "La fatiga visual y los párpados pesados son la antesala directa del microsueño. Los trucos caseros no eliminan la deuda de sueño del cerebro; la única solución eficaz es el descanso.",
      fundamento_legal: "Manual de Referencia ANSV; Plan Nacional de Seguridad Vial.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    att({
      id: "cale-l03-212",
      lote: LOTE,
      subtema: "fauna en la via",
      hecho_canonico_id: "l03-att-12",
      pregunta:
        "En una carretera rural con señalización de cruce de fauna silvestre observa a un animal detenido en el borde de la calzada. ¿Cómo procede?",
      sentido_clave: "seleccion",
      opcion_a: "Acelerar para asustarlo y obligarlo a internarse en el bosque",
      opcion_b: "Tocar la bocina insistentemente y encender luces altas para aturdirlo",
      opcion_c: "Hacer un giro brusco al carril contrario a ciegas para evitarlo de golpe",
      opcion_d:
        "Reducir la velocidad progresivamente, apagar luces altas si es de noche para no deslumbrarlo y pasar con extrema precaución esperando reacciones impredecibles",
      respuesta_recomendada: "d",
      explicacion:
        "Los animales reaccionan de manera imprevisible ante luces altas y bocinas fuertes. Disminuir la velocidad y pasar con cuidado protege la vida silvestre y evita pérdidas de control del vehículo.",
      fundamento_legal:
        "Manual de Señalización Vial 2024; Manual de Referencia ANSV sobre biodiversidad en corredores viales.",
      source: SOURCES.MANUAL_SENALIZACION,
      dificultad: "media",
    }),
    att({
      id: "cale-l03-213",
      lote: LOTE,
      subtema: "ciclistas bajo lluvia",
      hecho_canonico_id: "l03-att-13",
      pregunta:
        "Bajo la lluvia, un ciclista pedalea por el carril derecho esquivando charcos y alcantarillas. ¿Cuál es su comportamiento como conductor?",
      sentido_clave: "seleccion",
      opcion_a:
        "Brindarle mayor margen de seguridad, ser tolerante y esperar el momento oportuno para adelantar respetando mínimo 1,5 metros de separación lateral",
      opcion_b: "Sobrepasarlo a pocos centímetros para obligarlo a salirse al andén",
      opcion_c: "Pitarle continuamente para exigirle que se detenga y no estorbe",
      opcion_d: "Acelerar a fondo para que el agua expulsada por sus llantas lo aparte de la vía",
      respuesta_recomendada: "a",
      explicacion:
        "La lluvia reduce la adherencia de las bicicletas y oculta baches peligrosos bajo los charcos. El conductor debe redoblar la distancia de protección y la empatía con el ciclista.",
      fundamento_legal: "Ley 1811 de 2016, Art. 1; Ley 769 de 2002, Art. 60.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    att({
      id: "cale-l03-214",
      lote: LOTE,
      subtema: "estacionarias en movimiento bajo lluvia",
      hecho_canonico_id: "l03-att-14",
      pregunta:
        "Bajo una lluvia moderada en autopista, nota que varios conductores circulan a 60 km/h con las luces de emergencia (estacionarias) encendidas permanentemente. ¿Es correcta esta práctica?",
      sentido_clave: "seleccion",
      opcion_a: "Sí, porque las estacionarias deben usarse siempre que caigan gotas de lluvia",
      opcion_b:
        "No, porque las luces estacionarias confunden a los demás haciéndoles creer que el carro está varado y anulan la señalización de cambio de carril con direccionales",
      opcion_c: "Sí, porque reemplazan a las luces medias y gastan menos combustible",
      opcion_d: "Sí, siempre y cuando se toque la bocina en cada curva",
      respuesta_recomendada: "b",
      explicacion:
        "Las luces estacionarias indican peligro o vehículo detenido. Llevarlas encendidas en marcha normal confunde a los demás conductores e inutiliza el uso de las luces direccionales para avisar maniobras.",
      fundamento_legal: "Ley 769 de 2002, Art. 65; Manual de Referencia ANSV.",
      source: SOURCES.LEY_769,
      dificultad: "media",
    }),
    att({
      id: "cale-l03-215",
      lote: LOTE,
      subtema: "acatar banderero o auxiliar de trafico",
      hecho_canonico_id: "l03-att-15",
      pregunta:
        "Bajo un aguacero en una vía de montaña, un auxiliar de tránsito con paleta de PARE y chaleco reflectivo le ordena detenerse por derrumbe parcial. ¿Cómo debe actuar?",
      sentido_clave: "seleccion",
      opcion_a: "Ignorar la orden y pasar rápido antes de que cierren por completo el tramo",
      opcion_b: "Gritar al operario exigiéndole que lo deje pasar porque tiene prisa",
      opcion_c:
        "Acatar de inmediato la indicación, detener el vehículo con estacionarias encendidas a distancia prudente y esperar instrucciones",
      opcion_d: "Adelantar la fila de carros detenidos usando la berma izquierda",
      respuesta_recomendada: "c",
      explicacion:
        "El personal de obra y auxiliares viales protegen vidas en tramos críticos. Desobedecer una orden de detención por riesgo geotécnico o maquinaria pesada puede resultar fatal.",
      fundamento_legal: "Ley 769 de 2002, Art. 111 y Art. 115; Manual de Señalización Vial 2024.",
      source: SOURCES.MANUAL_SENALIZACION,
      dificultad: "facil",
    }),
    att({
      id: "cale-l03-216",
      lote: LOTE,
      subtema: "aseguramiento de carga",
      hecho_canonico_id: "l03-att-16",
      pregunta:
        "Transporta varios objetos en el platón de su camioneta o en la parrilla del techo. ¿Qué responsabilidad tiene antes de iniciar el viaje?",
      sentido_clave: "seleccion",
      opcion_a: "No requiere asegurarlos si el viaje es corto y a baja velocidad",
      opcion_b:
        "Pedirle a un acompañante que asome los brazos por la ventana para sostenerla con las manos",
      opcion_c: "Basta con colocar una bolsa plástica encima sin atar",
      opcion_d:
        "Asegurarse de que la carga esté firmemente amarrada, cubierta y no obstaculice la visibilidad ni represente peligro de desprendimiento en la vía",
      respuesta_recomendada: "d",
      explicacion:
        "La caída de bultos o elementos a la calzada genera siniestros graves por esquive imprevisto o colisión de los vehículos que transitan detrás. Asegurar la carga es deber inexcusable.",
      fundamento_legal: "Ley 769 de 2002, Art. 101 y Art. 131, infracción B.19.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    att({
      id: "cale-l03-217",
      lote: LOTE,
      subtema: "uso de exploradoras no reglamentarias",
      hecho_canonico_id: "l03-att-17",
      pregunta:
        "Un conductor instala barras LED de alta potencia en el parachoques y las enciende en ciudad de noche para 'ver mejor'. ¿Cómo califica esta conducta?",
      sentido_clave: "seleccion",
      opcion_a:
        "Inapropiada y peligrosa, pues deslumbran gravemente a peatones y demás conductores y violan los límites lumínicos legales",
      opcion_b:
        "Excelente, porque entre más luz tenga un vehículo, mayor seguridad habrá en la ciudad",
      opcion_c: "Indiferente, siempre y cuando el vehículo esté limpio",
      opcion_d: "Recomendada exclusivamente para vehículos modelo reciente",
      respuesta_recomendada: "a",
      explicacion:
        "Los reflectores y barras LED de alta dispersión encandilan a quienes vienen de frente o van adelante por sus retrovisores, incrementando exponencialmente el riesgo de atropello o colisión.",
      fundamento_legal:
        "Ley 769 de 2002, Art. 86; Resolución 20253040037125; Código Nacional de Tránsito.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    att({
      id: "cale-l03-218",
      lote: LOTE,
      subtema: "cuidado del embrague en subidas",
      hecho_canonico_id: "l03-att-18",
      pregunta:
        "Al quedar detenido en una pendiente pronunciada detrás de otros vehículos, ¿qué técnica de retención demuestra respeto por el vehículo y la seguridad?",
      sentido_clave: "seleccion",
      opcion_a:
        "Mantener el carro quieto patinando constantemente el embrague y acelerador al límite de corte",
      opcion_b:
        "Aplicar el freno de servicio o de mano y colocar la palanca en neutro mientras espera el avance de la fila",
      opcion_c:
        "Dejar que el carro ruede hacia atrás hasta que apoye en la defensa del carro de atrás",
      opcion_d: "Apagar el motor de inmediato y soltar todos los frenos",
      respuesta_recomendada: "b",
      explicacion:
        "Sostener el vehículo con el embrague a medio recorrido sobrecalienta y quema el disco de fricción de la caja. El freno de estacionamiento garantiza inmovilidad total y segura.",
      fundamento_legal:
        "Manual de Referencia ANSV sobre técnicas de manejo seguro y conservación vehicular.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    att({
      id: "cale-l03-219",
      lote: LOTE,
      subtema: "control de emociones ante conductores lentos",
      hecho_canonico_id: "l03-att-19",
      pregunta:
        "En una avenida urbana con límite de 50 km/h, el vehículo que le precede circula a 35 km/h por el carril derecho. ¿Cuál es la actitud equilibrada?",
      sentido_clave: "seleccion",
      opcion_a: "Pegarse a su parachoques a menos de medio metro para intimidarlo",
      opcion_b: "Cerrarlo bruscamente tras adelantarlo y clavar los frenos como lección",
      opcion_c:
        "Aceptar que circula dentro de los márgenes legales y adelantarlo por el carril izquierdo con total seguridad y señalización cuando haya espacio",
      opcion_d: "Adelantar subiéndose al separador central",
      respuesta_recomendada: "c",
      explicacion:
        "La vía es un espacio compartido. La conducción agresiva y los 'frenazos de castigo' son conductas criminales que causan choques múltiples. Si hay carril libre, se adelanta legalmente.",
      fundamento_legal: "Manual de Referencia ANSV; Ley 769 de 2002, Art. 60.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    att({
      id: "cale-l03-220",
      lote: LOTE,
      subtema: "mantenimiento de luces en mal estado",
      hecho_canonico_id: "l03-att-20",
      pregunta:
        "Al encender su vehículo descubre que una bombilla de las luces bajas principales se fundió. ¿Qué actitud debe asumir antes de conducir de noche?",
      sentido_clave: "seleccion",
      opcion_a: "Viajar usando solo luces exploradoras o altas desalineadas para compensar",
      opcion_b: "Ignorarlo, ya que un solo faro es suficiente para iluminar la calzada",
      opcion_c: "Conducir con las luces de emergencia estacionarias encendidas todo el trayecto",
      opcion_d:
        "Reemplazar la bombilla quemada antes de iniciar la marcha nocturna para garantizar ver y ser visto plenamente",
      respuesta_recomendada: "d",
      explicacion:
        "Circular con un faro quemado hace que los demás confundan su vehículo con una motocicleta y reduce drásticamente su campo visual periférico nocturno.",
      fundamento_legal: "Ley 769 de 2002, Art. 86 y Art. 131, infracción C.28; Manual ANSV.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    att({
      id: "cale-l03-221",
      lote: LOTE,
      subtema: "preservacion de la calma ante desvios",
      hecho_canonico_id: "l03-att-21",
      pregunta:
        "Se pasa de la salida en una autopista de acceso controlado. ¿Qué comportamiento preserva la vida de los usuarios?",
      sentido_clave: "seleccion",
      opcion_a:
        "Continuar serenamente hasta el siguiente retorno o salida legal autorizada, aunque implique recorrer unos kilómetros adicionales",
      opcion_b: "Dar un giro en U cruzando sobre las zonas verdes o el separador central",
      opcion_c: "Frenar en seco, poner reversa por la berma y tomar la salida que perdió",
      opcion_d: "Detenerse en el carril rápido a revisar el mapa en el teléfono celular",
      respuesta_recomendada: "a",
      explicacion:
        "Dar marcha atrás en autopistas o cruzar separadores son maniobras prohibidas y de altísima letalidad. Un desvío de pocos minutos no justifica arriesgar la vida.",
      fundamento_legal: "Ley 769 de 2002, Art. 69 y Art. 131, infracción D.06.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    att({
      id: "cale-l03-222",
      lote: LOTE,
      subtema: "cuidado con el uso del celular con manos libres",
      hecho_canonico_id: "l03-att-22",
      pregunta:
        "Aunque su vehículo cuenta con sistema de manos libres Bluetooth, recibe una llamada de trabajo muy tensa y compleja mientras conduce en tráfico denso. ¿Qué debe hacer?",
      sentido_clave: "seleccion",
      opcion_a:
        "Continuar discutiendo acaloradamente porque la ley permite hablar por manos libres",
      opcion_b:
        "Reconocer que la conversación le quita atención mental a la vía, informar que devolverá la llamada y orillarse en sitio seguro si requiere resolver el asunto",
      opcion_c: "Acelerar para terminar la llamada antes de llegar al trabajo",
      opcion_d: "Cerrar los ojos para concentrarse mejor en los argumentos de la llamada",
      respuesta_recomendada: "b",
      explicacion:
        "La distracción cognitiva generada por una conversación demandante reduce el campo visual y la velocidad de reacción cerebral igual o más que sostener el aparato en la mano.",
      fundamento_legal: "Manual de Referencia ANSV sobre tipos de distracción; Ley 769 de 2002.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    att({
      id: "cale-l03-223",
      lote: LOTE,
      subtema: "humo excesivo en vehiculo propio",
      hecho_canonico_id: "l03-att-23",
      pregunta:
        "Durante la marcha nota que su vehículo emite una nube densa y oscura por el tubo de escape que asfixia a los motociclistas que van detrás. ¿Qué decisión toma?",
      sentido_clave: "seleccion",
      opcion_a: "Acelerar más para que el viento disperse el humo hacia los lados",
      opcion_b: "Instalar una cola cromada en el tubo para disimular la salida de los gases",
      opcion_c:
        "Llevar el vehículo prontamente al taller mecánico para corregir la falla de combustión y evitar contaminar el aire y la visibilidad de los demás",
      opcion_d:
        "Abrir sus ventanillas para que el humo no ingrese a su cabina e ignorar a los demás",
      respuesta_recomendada: "c",
      explicacion:
        "Conducir emitiendo gases ostensiblemente contaminantes atenta contra la salud pública y la seguridad vial, además de constituir causal de inmovilización en revisiones de emisiones.",
      fundamento_legal: "Ley 769 de 2002, Art. 122 y Art. 131, infracción C.35; Ley 2251 de 2022.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    att({
      id: "cale-l03-224",
      lote: LOTE,
      subtema: "respeto por la distancia lateral al sobrepasar",
      hecho_canonico_id: "l03-att-24",
      pregunta:
        "En una vía intermunicipal sin berma va a adelantar a un jinete a caballo que transita por la orilla. ¿Cómo debe proceder?",
      sentido_clave: "seleccion",
      opcion_a: "Pasar a alta velocidad y tocar la bocina para saludar al jinete",
      opcion_b: "Acelerar el motor en vacío para comprobar los reflejos del animal",
      opcion_c: "Pegarse a la grupa del caballo para obligarlo a apurar el paso",
      opcion_d:
        "Reducir la velocidad, dejar amplio espacio lateral, no tocar la bocina para no espantar al animal y adelantar suavemente",
      respuesta_recomendada: "d",
      explicacion:
        "Los animales de monta pueden asustarse fácilmente con ruidos estridentes o aproximaciones veloces, tirando al jinete al asfalto o invadiendo la calzada intempestivamente.",
      fundamento_legal: "Ley 769 de 2002, Art. 60 y Art. 104; Manual de Referencia ANSV.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    att({
      id: "cale-l03-225",
      lote: LOTE,
      subtema: "atencion a senales de advertencia en tablero",
      hecho_canonico_id: "l03-att-25",
      pregunta:
        "En plena marcha por carretera se enciende en el tablero el testigo de temperatura del motor en color rojo. ¿Qué decisión inmediata es correcta?",
      sentido_clave: "seleccion",
      opcion_a:
        "Detener el vehículo de forma segura en la berma o estación más cercana, apagar el motor y esperar asistencia sin abrir el radiador caliente",
      opcion_b: "Ignorarlo y continuar hasta el destino final si faltan menos de 50 kilómetros",
      opcion_c: "Aumentar la velocidad para que el aire frontal enfríe el radiador rápidamente",
      opcion_d: "Echarle agua fría directamente por encima al motor en marcha sin detenerse",
      respuesta_recomendada: "a",
      explicacion:
        "Un testigo rojo indica anomalía crítica. Continuar con el motor sobrecalentado destruye los componentes mecánicos internos (culata y pistones) y puede ocasionar incendio del automotor.",
      fundamento_legal:
        "Manual de Referencia ANSV sobre mantenimiento preventivo y alertas vehiculares.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    att({
      id: "cale-l03-226",
      lote: LOTE,
      subtema: "no arrojar colillas encendidas",
      hecho_canonico_id: "l03-att-26",
      pregunta:
        "En una época de sequía en carretera boscosa, un conductor arroja una colilla de cigarrillo encendida hacia la vegetación del costado. ¿Qué juicio merece este acto?",
      sentido_clave: "seleccion",
      opcion_a: "Es una acción inofensiva si la colilla cae sobre el asfalto",
      opcion_b:
        "Es una falta gravísima de civismo y seguridad que puede desencadenar incendios forestales destructivos y siniestros por humo en la vía",
      opcion_c: "Es justificable si en el vehículo no hay cenicero instalado",
      opcion_d: "Es una práctica recomendada para no saturar de humo el interior del habitáculo",
      respuesta_recomendada: "b",
      explicacion:
        "Las colillas encendidas arrojadas en vías rurales causan tragedias ecológicas e incendios forestales que invaden de humo la vía, cegando a los conductores y cobrando vidas humanas.",
      fundamento_legal: "Ley 769 de 2002, Art. 78; Ley 1801 de 2016.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    att({
      id: "cale-l03-227",
      lote: LOTE,
      subtema: "colaboracion ante vehiculos varados",
      hecho_canonico_id: "l03-att-27",
      pregunta:
        "En una vía de un solo carril por sentido observa que un automóvil se encuentra averiado ocupando parte de la calzada. ¿Cómo contribuye al orden y la seguridad?",
      sentido_clave: "seleccion",
      opcion_a:
        "Acelerar y cerrarle el paso al tráfico contrario para pasar de primero a la fuerza",
      opcion_b: "Insultar al conductor varado por estorbar el camino",
      opcion_c:
        "Reducir la velocidad, encender estacionarias para advertir a los que vienen detrás y alternar el paso con los vehículos del carril opuesto",
      opcion_d: "Estacionarse al lado del averiado a tomar fotos con el teléfono móvil",
      respuesta_recomendada: "c",
      explicacion:
        "La cooperación vial agiliza el tráfico en obstáculos temporales. Advertir con estacionarias y ceder el turno por turnos previene colisiones por alcance y congestión severa.",
      fundamento_legal: "Manual de Referencia ANSV sobre convivencia vial y gestión de incidentes.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    att({
      id: "cale-l03-228",
      lote: LOTE,
      subtema: "responsabilidad en la colocacion de triangulos reflectivos",
      hecho_canonico_id: "l03-att-28",
      pregunta:
        "Su automóvil sufre un pinchazo en una curva ciega de una vía intermunicipal. ¿Dónde y cómo debe ubicar las señales de advertencia (triángulos)?",
      sentido_clave: "seleccion",
      opcion_a: "Pegados directamente sobre el parachoques de su propio carro",
      opcion_b: "A un metro de la puerta del conductor sobre la línea central",
      opcion_c: "Guardados en el baúl para que no se los roben mientras cambia la llanta",
      opcion_d:
        "Antes de entrar a la curva, a suficiente distancia (50 a 100 metros) para que los conductores que se aproximan alcancen a frenar con anticipación",
      respuesta_recomendada: "d",
      explicacion:
        "Colocar los triángulos antes de una curva o cima proporciona el tiempo y la distancia indispensables para que los demás vehículos desaceleren antes de encontrarse con el obstáculo.",
      fundamento_legal: "Ley 769 de 2002, Art. 30 y Art. 79; Manual de Señalización Vial 2024.",
      source: SOURCES.LEY_769,
      dificultad: "media",
    }),
    att({
      id: "cale-l03-229",
      lote: LOTE,
      subtema: "no invadir carril exclusivo de emergencias",
      hecho_canonico_id: "l03-att-29",
      pregunta:
        "En una autopista con congestión masiva la berma lateral derecha se encuentra despejada. ¿Qué decisión ética debe mantener?",
      sentido_clave: "seleccion",
      opcion_a:
        "Permanecer en su carril correspondiente sin invadir la berma, manteniéndola despejada para ambulancias, socorristas o grúas de auxilio",
      opcion_b:
        "Transitar a gran velocidad por la berma para adelantar a todos los carros trancados",
      opcion_c: "Meterse a la berma solo si lleva encendidas las luces estacionarias",
      opcion_d: "Colocar la mitad del carro en la berma y la mitad en el pasto para avanzar",
      respuesta_recomendada: "a",
      explicacion:
        "La berma es una zona de seguridad exclusiva para detenciones de emergencia y paso prioritario de cuerpos de auxilio. Ocuparla como carril de adelantamiento es ilegal y egoísta.",
      fundamento_legal: "Ley 769 de 2002, Art. 131, infracción D.06; Manual de Referencia ANSV.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    att({
      id: "cale-l03-230",
      lote: LOTE,
      subtema: "cuidado ante el asfalto recien mojado",
      hecho_canonico_id: "l03-att-30",
      pregunta:
        "Empiezan a caer las primeras gotas de lluvia tras semanas de clima seco y caluroso. ¿Cuál es la disposición conductual adecuada?",
      sentido_clave: "seleccion",
      opcion_a: "Acelerar para llegar a casa antes de que se moje totalmente el piso",
      opcion_b:
        "Reducir la velocidad y aumentar la distancia de seguimiento, sabiendo que las primeras gotas crean una capa sumamente jabonosa y resbaladiza",
      opcion_c: "Frenar en seco repetidas veces para comprobar si las llantas patinan",
      opcion_d: "Desactivar el limpiaparabrisas para no rayar el vidrio con el polvo",
      respuesta_recomendada: "b",
      explicacion:
        "Al inicio de la lluvia el agua se mezcla con residuos secos de hidrocarburos, aceites y polvo en el pavimento, formando una emulsión altamente deslizante que triplica el riesgo de derrape.",
      fundamento_legal: "Manual de Referencia ANSV sobre factores de adherencia y clima.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    know({
      id: "cale-l03-231",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "pelicula deslizante inicial de lluvia",
      hecho_canonico_id: "l03-mov-01",
      pregunta:
        "¿Por qué el inicio de una llovizna sobre pavimento seco representa un momento de altísimo riesgo de pérdida de adherencia?",
      opcion_a: "Porque las llantas se enfrían de golpe y pierden presión interna en segundos",
      opcion_b: "Porque el asfalto se vuelve blando y atrapa los neumáticos impidiendo girar",
      opcion_c:
        "Porque el agua se combina con partículas de polvo, aceite y caucho acumulados, generando una película viscosa similar al jabón",
      opcion_d: "Porque el viento de la tormenta siempre desestabiliza los frenos mecánicos",
      respuesta_correcta: "c",
      explicacion:
        "Durante los periodos secos se acumulan aceites, hollín y residuos de caucho sobre el pavimento. Al mezclarse con las primeras gotas forman una emulsión jabonosa sumamente resbaladiza.",
      fundamento_legal: "Manual de Referencia ANSV; Guía de Seguridad Vial para Conductores.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    know({
      id: "cale-l03-232",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "mecanica del hidroplaneo aquaplaning",
      hecho_canonico_id: "l03-mov-02",
      pregunta: "¿En qué consiste el fenómeno físico conocido como hidroplaneo o aquaplaning?",
      opcion_a: "El calentamiento extremo de las pastillas de freno al contacto con el agua fría",
      opcion_b: "La evaporación súbita del líquido de frenos debido a la humedad ambiental",
      opcion_c: "La filtración de agua al compartimiento de la batería que bloquea la dirección",
      opcion_d:
        "La pérdida total de contacto entre el neumático y el asfalto provocada por una cuña de agua que el labrado no alcanza a desalojar",
      respuesta_correcta: "d",
      explicacion:
        "Cuando el volumen de agua sobre la calzada excede la capacidad de evacuación de las ranuras de la llanta, el vehículo flota sobre una lámina líquida perdiendo tracción y gobierno de la dirección.",
      fundamento_legal: "Manual de Referencia ANSV sobre dinámica vehicular en clima adverso.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l03-233",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "maniobra ante hidroplaneo",
      hecho_canonico_id: "l03-mov-03",
      pregunta:
        "Si experimenta hidroplaneo y el volante se siente liviano perdiendo respuesta direccional, ¿cuál es la maniobra técnica correcta?",
      opcion_a:
        "Soltar suavemente el acelerador, mantener el volante firme en la trayectoria de la vía y no frenar en seco hasta que las ruedas retomen contacto",
      opcion_b: "Pisar a fondo el pedal de freno y girar bruscamente el timón de un lado a otro",
      opcion_c: "Jalar de inmediato la palanca del freno de mano para bloquear las ruedas traseras",
      opcion_d: "Acelerar a fondo para que la fuerza del motor corte la capa de agua",
      respuesta_correcta: "a",
      explicacion:
        "Frenar en seco o dar volantazos durante el hidroplaneo causa un derrape incontrolable y volcamiento cuando los neumáticos vuelven a tocar asfalto. Debe desacelerarse suavemente manteniendo el volante recto.",
      fundamento_legal: "Manual de Referencia ANSV sobre técnicas de conducción defensiva.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l03-234",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "secado de frenos tras charcos profundos",
      hecho_canonico_id: "l03-mov-04",
      pregunta:
        "Después de cruzar un tramo inundado o charco profundo, ¿qué acción preventiva debe efectuar para asegurar la eficacia de los frenos?",
      opcion_a: "Acelerar al límite para que el viento del motor seque los discos",
      opcion_b:
        "Dar pequeños toques suaves y progresivos al pedal de freno para que la fricción genere calor y evapore el agua de pastillas y bandas",
      opcion_c: "Mantener pisado el embrague a fondo durante los siguientes 5 kilómetros",
      opcion_d: "Detenerse en seco de inmediato en medio de la vía",
      respuesta_correcta: "b",
      explicacion:
        "El agua moja los discos y campanas, reduciendo drásticamente el coeficiente de fricción. Bombear suavemente el freno genera calor que disipa la humedad y restituye la potencia de frenado.",
      fundamento_legal: "Manual de Referencia ANSV sobre seguridad activa en frenado.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l03-235",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "conduccion con niebla densa",
      hecho_canonico_id: "l03-mov-05",
      pregunta:
        "¿Por qué en condiciones de niebla densa o humo NUNCA deben encenderse las luces altas del vehículo?",
      opcion_a: "Porque consumen excesiva energía de la batería cuando el aire está frío",
      opcion_b: "Porque la ley exige circular completamente a oscuras en presencia de niebla",
      opcion_c:
        "Porque el haz elevado de luz choca contra las diminutas gotas de agua suspendidas y se refleja hacia atrás creando un muro blanco que encandila al conductor",
      opcion_d: "Porque las luces altas calientan la niebla y la condensan más rápidamente",
      respuesta_correcta: "c",
      explicacion:
        "Las partículas de agua en la niebla actúan como microscópicos espejos. Las luces altas rebotan directamente en los ojos del conductor (efecto velo blanco); se deben usar luces bajas y exploradoras antiniebla.",
      fundamento_legal: "Ley 769 de 2002, Art. 86; Manual de Referencia ANSV.",
      source: SOURCES.LEY_769,
      dificultad: "media",
    }),
    know({
      id: "cale-l03-236",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "alcance de los faros en conduccion nocturna",
      hecho_canonico_id: "l03-mov-06",
      pregunta:
        "En conducción nocturna por carretera sin alumbrado, ¿cuál es el principio fundamental de velocidad segura respecto a los faros?",
      opcion_a:
        "El conductor debe guiarse únicamente por el mapa del teléfono celular sin mirar la vía",
      opcion_b:
        "La velocidad debe superar los 100 km/h para evitar quedarse dormido en la oscuridad",
      opcion_c:
        "La distancia de frenado no importa de noche porque hay menos vehículos transitando",
      opcion_d:
        "La velocidad debe permitir detener el vehículo completamente dentro del campo iluminado por los faros",
      respuesta_correcta: "d",
      explicacion:
        "Si la distancia necesaria para detener el vehículo es mayor que el alcance visual que proporcionan las luces, el conductor viajará 'a ciegas' y chocará inevitablemente contra cualquier obstáculo imprevisto.",
      fundamento_legal: "Manual de Referencia ANSV sobre campo visual nocturno.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "dificil",
    }),
    know({
      id: "cale-l03-237",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "viento lateral y efecto pantalla",
      hecho_canonico_id: "l03-mov-07",
      pregunta:
        "¿Qué peligro específico produce el 'efecto pantalla' al adelantar a un tractocamión en un puente o planicie con fuerte viento lateral?",
      opcion_a:
        "El vehículo queda protegido momentáneamente del viento al lado del camión, pero al terminar de pasarlo recibe un golpe súbito de viento que puede desviar la trayectoria",
      opcion_b: "El camión absorbe el combustible del tanque por diferencia de presiones",
      opcion_c: "El viento congela instantáneamente el radiador del automóvil",
      opcion_d: "Los frenos dejan de funcionar por falta de aire en el servoasistente",
      respuesta_correcta: "a",
      explicacion:
        "El vehículo pesado actúa como escudo temporal; al salir de su resguardo frontal, el golpe violento de la ráfaga de aire lateral puede desplazar el carro fuera de la calzada si no se sujeta el volante con firmeza.",
      fundamento_legal: "Manual de Referencia ANSV sobre aerodinámica y conducción defensiva.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l03-238",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "peligro de descender en neutro",
      hecho_canonico_id: "l03-mov-08",
      pregunta:
        "¿Por qué descender una pendiente de montaña en punto muerto (neutro) o con el embrague pisado es una práctica sumamente peligrosa?",
      opcion_a: "Porque el motor se apaga y el vehículo se detiene automáticamente en la bajada",
      opcion_b:
        "Porque se pierde la retención del freno de motor, sobrecargando los frenos de servicio hasta provocar sobrecalentamiento, cristalización y pérdida total de frenos",
      opcion_c: "Porque la caja de cambios se bloquea mecánicamente impidiendo girar las ruedas",
      opcion_d: "Porque aumenta el consumo de combustible al máximo nivel en ralenti",
      respuesta_correcta: "b",
      explicacion:
        "Al desconectar la transmisión el peso del vehículo embala la marcha, obligando a pisar el pedal de freno continuamente. La fricción extrema hierve el líquido de frenos (vapor lock) dejando el pedal sin respuesta.",
      fundamento_legal: "Manual de Referencia ANSV; Ley 769 de 2002 sobre conducción técnica.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    know({
      id: "cale-l03-239",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "adherencia en gravilla suelta o arena",
      hecho_canonico_id: "l03-mov-09",
      pregunta:
        "Al transitar sobre una calzada con gravilla suelta, ripio o arena fina, ¿qué alteración física experimenta la conducción?",
      opcion_a: "El vehículo adquiere mayor estabilidad direccional a alta velocidad",
      opcion_b:
        "La distancia de frenado se reduce a la mitad por el efecto de agarre de las piedras",
      opcion_c:
        "La adherencia disminuye drásticamente, incrementando la distancia de detención y el riesgo de derrape en curvas",
      opcion_d: "Los amortiguadores se vuelven automáticamente más rígidos",
      respuesta_correcta: "c",
      explicacion:
        "Las piedras sueltas o la arena actúan como esferas entre la llanta y el suelo rígido, disminuyendo el coeficiente de adherencia y requiriendo maniobras suaves y baja velocidad.",
      fundamento_legal: "Manual de Referencia ANSV sobre superficies de baja fricción.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    know({
      id: "cale-l03-240",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "distancia de seguimiento con calzada humeda",
      hecho_canonico_id: "l03-mov-10",
      pregunta:
        "Si en pavimento seco la regla general de seguimiento seguro es de 2 a 3 segundos, ¿cómo debe adaptarse esta distancia bajo lluvia?",
      opcion_a: "Reducirla a 1 segundo para no perder de vista el vehículo que antecede",
      opcion_b: "Mantener exactamente los mismos segundos sin variar nada",
      opcion_c: "Eliminar la distancia y avanzar pegado a la defensa del otro vehículo",
      opcion_d:
        "Aumentarla al menos al doble (4 a 6 segundos) para compensar el incremento en la distancia de frenado",
      respuesta_correcta: "d",
      explicacion:
        "En calzada húmeda la adherencia disminuye y la distancia de frenado se duplica o triplica. Ampliar la distancia de seguimiento a mínimo 4 a 6 segundos previene colisiones por alcance.",
      fundamento_legal: "Manual de Referencia ANSV; Ley 769 de 2002, Art. 108.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    know({
      id: "cale-l03-241",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "desempanamiento del parabrisas",
      hecho_canonico_id: "l03-mov-11",
      pregunta:
        "¿Cuál es el método técnico más eficaz para desempañar rápidamente el interior del parabrisas cuando llueve?",
      opcion_a:
        "Encender el sistema de aire acondicionado orientando el flujo de ventilación hacia el parabrisas con entrada de aire exterior",
      opcion_b:
        "Limpiar el vidrio con la mano o un trapo sucio mientras se conduce a alta velocidad",
      opcion_c: "Cerrar herméticamente todas las rejillas y apagar la ventilación por completo",
      opcion_d: "Echar agua caliente por dentro del vidrio usando una botella",
      respuesta_correcta: "a",
      explicacion:
        "El aire acondicionado actúa como deshumidificador, secando el aire interior y evaporando la condensación del cristal de forma homogénea sin dejar marcas grasosas en el parabrisas.",
      fundamento_legal:
        "Manual de Referencia ANSV sobre mantenimiento de la visibilidad operativa.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    know({
      id: "cale-l03-242",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "subviraje concepto y correccion",
      hecho_canonico_id: "l03-mov-12",
      pregunta:
        "¿Qué ocurre cuando un vehículo experimenta el fenómeno de 'subviraje' (irse de trompa) en una curva?",
      opcion_a:
        "El eje trasero pierde tracción y la cola del vehículo derrapa hacia el exterior de la curva",
      opcion_b:
        "Las ruedas delanteras pierden adherencia y el vehículo tiende a continuar recto sin obedecer completamente el giro del volante",
      opcion_c: "El motor se apaga y las cuatro ruedas se bloquean de manera permanente",
      opcion_d: "El volante gira sin resistencia dando vueltas de 360 grados sin control",
      respuesta_correcta: "b",
      explicacion:
        "El subviraje ocurre cuando el eje delantero pierde agarre por exceso de velocidad al ingresar a la curva. Se corrige dejando de acelerar suavemente para transferir peso a las ruedas delanteras sin frenar con brusquedad.",
      fundamento_legal: "Manual de Referencia ANSV sobre control dinámico y estabilidad.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "dificil",
    }),
    know({
      id: "cale-l03-243",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "sobreviraje concepto y correccion",
      hecho_canonico_id: "l03-mov-13",
      pregunta:
        "¿Qué caracteriza al fenómeno de 'sobreviraje' (irse de cola) en una maniobra de curva?",
      opcion_a: "El pedal de freno se hunde hasta el piso por falta de líquido hidráulico",
      opcion_b: "El vehículo avanza en línea recta a pesar de doblar la dirección al máximo",
      opcion_c:
        "Las ruedas traseras pierden tracción y la parte posterior del vehículo derrapa hacia el exterior de la curva girando más de lo deseado",
      opcion_d: "Los faros delanteros apuntan hacia el cielo por sobrecarga en el baúl",
      respuesta_correcta: "c",
      explicacion:
        "En el sobreviraje el tren trasero derrapa hacia afuera. Para controlarlo se debe girar el volante suavemente hacia el mismo lado hacia donde derrapa la cola (contravolante) sin acelerar ni clavar los frenos.",
      fundamento_legal: "Manual de Referencia ANSV sobre dinámica automotriz avanzada.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "dificil",
    }),
    know({
      id: "cale-l03-244",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "profundidad del labrado y riesgo de hidroplaneo",
      hecho_canonico_id: "l03-mov-14",
      pregunta:
        "¿Cómo incide el desgaste de la banda de rodadura de las llantas en la probabilidad de sufrir hidroplaneo?",
      opcion_a: "Solo influye el color del caucho del neumático",
      opcion_b:
        "Las llantas completamente lisas expulsan mejor el agua porque no tienen ranuras que la retengan",
      opcion_c: "El labrado no influye en la evacuación de agua sobre asfalto húmedo",
      opcion_d:
        "A menor profundidad del labrado, menor capacidad de desalojar agua y el hidroplaneo ocurre a velocidades mucho más bajas",
      respuesta_correcta: "d",
      explicacion:
        "Las ranuras de la llanta canalizan y expulsan el agua hacia los costados. Con labrado bajo (cercano o inferior a 1,6 mm), una fina capa de agua hace flotar el neumático incluso a 50 km/h.",
      fundamento_legal: "Resolución 20253040037125; Manual de Referencia ANSV.",
      source: SOURCES.RESOLUCION_CALE,
      dificultad: "media",
    }),
    know({
      id: "cale-l03-245",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "adaptacion de la velocidad en curvas cerradas",
      hecho_canonico_id: "l03-mov-15",
      pregunta:
        "¿Cuál es la técnica física correcta para negociar una curva pronunciada de forma segura?",
      opcion_a:
        "Disminuir la velocidad en la recta previa mediante frenado suave y marcha adecuada, y acelerar suavemente una vez superado el punto medio o ápice de la curva",
      opcion_b: "Entrar a alta velocidad y frenar con fuerza justo en la mitad de la curva",
      opcion_c:
        "Pisar el embrague a fondo durante todo el recorrido de la curva para que ruede libre",
      opcion_d: "Cerrar los ojos y confiar en la fuerza centrífuga",
      respuesta_correcta: "a",
      explicacion:
        "Frenar en plena curva desestabiliza la carga sobre las ruedas exteriores y causa derrapes. Toda reducción de velocidad debe realizarse en línea recta antes de ingresar a la curva.",
      fundamento_legal: "Manual de Referencia ANSV; Guía Técnica de Manejo Seguro.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    know({
      id: "cale-l03-246",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "presion de inflado y adherencia sobre mojado",
      hecho_canonico_id: "l03-mov-16",
      pregunta:
        "¿Qué efecto produce circular con neumáticos con presión de aire significativamente inferior a la recomendada por el fabricante sobre pavimento mojado?",
      opcion_a: "Mejora la evacuación de agua porque la llanta se deforma aplastando el charco",
      opcion_b:
        "Aumenta gravemente el riesgo de hidroplaneo, ya que el centro de la banda de rodadura se arquea hacia adentro dejando de evacuar el agua eficientemente",
      opcion_c: "Elimina el consumo de combustible en calzadas inundadas",
      opcion_d: "Hace que los frenos ABS funcionen con el doble de rapidez",
      respuesta_correcta: "b",
      explicacion:
        "Con baja presión la huella de contacto se ahueca en el centro, acumulando agua bajo la llanta y facilitando la pérdida prematura de contacto con el suelo a baja velocidad.",
      fundamento_legal: "Manual de Referencia ANSV sobre inspección de neumáticos y seguridad.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l03-247",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "deslumbramiento y tiempo de recuperacion de la vista",
      hecho_canonico_id: "l03-mov-17",
      pregunta:
        "Cuando la vista de un conductor sufre encandilamiento directo por luces altas nocturnas, ¿cuántos segundos puede demorar el ojo humano en recuperar su visión plena?",
      opcion_a: "Menos de una milésima de segundo de manera instantánea",
      opcion_b: "Exactamente 45 minutos sin importar la edad",
      opcion_c:
        "Aproximadamente entre 3 y 7 segundos, tiempo durante el cual el vehículo avanza decenas de metros a ciegas",
      opcion_d: "No existe recuperación visual nocturna sin una intervención médica",
      respuesta_correcta: "c",
      explicacion:
        "El pigmento visual de la retina se satura por la luz intensa, requiriendo entre 3 y 7 segundos para reajustarse a la penumbra. A 80 km/h, un conductor a ciegas recorre más de 100 metros sin ver obstáculos.",
      fundamento_legal: "Manual de Referencia ANSV sobre psicofisiología del conductor.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l03-248",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "manchas de combustible o acpm en la calzada",
      hecho_canonico_id: "l03-mov-18",
      pregunta:
        "En una curva o glorieta observa un brillo tornasolado o arcoíris sobre el asfalto mojado. ¿Qué representa esta señal visual?",
      opcion_a: "Un aditivo especial que aplican las concesiones para mejorar el agarre",
      opcion_b: "Un defecto óptico inofensivo del parabrisas polarizado",
      opcion_c: "El reflejo natural de la luna llena sobre el pavimento nuevo",
      opcion_d:
        "La presencia de combustible diésel (ACPM) o aceite derramado, lo que convierte la superficie en una zona con adherencia prácticamente nula",
      respuesta_correcta: "d",
      explicacion:
        "El gasóleo/ACPM y el aceite flotan sobre el agua creando una película aceitosa extremadamente deslizante, letal para motociclistas y muy peligrosa para cualquier vehículo a motor.",
      fundamento_legal: "Manual de Referencia ANSV; Guía de Riesgos en Vía.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    know({
      id: "cale-l03-249",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "paso por vados o corrientes de agua",
      hecho_canonico_id: "l03-mov-19",
      pregunta:
        "Al encontrar una corriente de agua que cruza la vía tras una creciente súbita, ¿cuál es la regla de oro para no arriesgar la vida?",
      opcion_a:
        "Si la profundidad del agua supera la mitad de la altura de las ruedas o la corriente es fuerte, jamás intentar cruzar, pues el agua puede arrastrar el automotor o inundar el motor",
      opcion_b: "Acelerar a fondo para que la inercia rompa la fuerza de la corriente",
      opcion_c:
        "Pasar con las cuatro puertas abiertas para que el agua fluya a través del vehículo",
      opcion_d: "Desconectar la batería y empujar el vehículo caminando por el río",
      respuesta_correcta: "a",
      explicacion:
        "Apenas 30 a 50 cm de corriente de agua tienen la fuerza suficiente para levantar y hacer flotar un automóvil liviano, arrastrándolo hacia abismos o ríos con consecuencias trágicas.",
      fundamento_legal:
        "Manual de Referencia ANSV; Unidad Nacional para la Gestión del Riesgo de Desastres.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    know({
      id: "cale-l03-250",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "frenada de emergencia con abs en calzada resbaladiza",
      hecho_canonico_id: "l03-mov-20",
      pregunta:
        "En una frenada de emergencia sobre pavimento mojado con un vehículo equipado con frenos antibloqueo (ABS), ¿cómo debe operar el pedal de freno?",
      opcion_a: "Bombear el pedal soltando y pisando repetidas veces de forma manual",
      opcion_b:
        "Pisar el pedal a fondo con máxima firmeza y de manera continua sin soltarlo, manteniendo el control de la dirección",
      opcion_c: "Aplicar únicamente el freno de mano para evitar que las ruedas delanteras giren",
      opcion_d: "Pisar suavemente solo el pedal de embrague sin tocar el freno",
      respuesta_correcta: "b",
      explicacion:
        "El sistema ABS modula electrónicamente la presión miles de veces por minuto para evitar el bloqueo. El conductor solo debe pisar fuerte y constante el pedal a fondo y dirigir el vehículo hacia un escape seguro.",
      fundamento_legal: "Manual de Referencia ANSV; Reglamento Técnico de Frenos.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l03-251",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "humo denso por quemas agricolas en via",
      hecho_canonico_id: "l03-mov-21",
      pregunta:
        "Al transitar por una llanura o valle ingresa súbitamente a una densa cortina de humo por quema vegetal. ¿Qué comportamiento salva vidas?",
      opcion_a: "Frenar en seco en la mitad del carril y apagar todas las luces",
      opcion_b: "Acelerar a 120 km/h para atravesar la nube de humo en menos de 5 segundos",
      opcion_c:
        "Reducir la velocidad gradualmente, encender luces bajas, activar la recirculación interna del aire, cerrar ventanas y guiarse por las líneas de borde hasta salir del tramo",
      opcion_d: "Detenerse en contravía a tomar fotografías del incendio",
      respuesta_correcta: "c",
      explicacion:
        "El humo anula la visión e intoxica la cabina. Reducir velocidad suavemente sin frenazos bruscos evita que los carros que vienen detrás lo embistan, y la recirculación previene asfixia.",
      fundamento_legal: "Manual de Referencia ANSV sobre emergencias ambientales en carretera.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l03-252",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "impacto del frio y congelamiento leve en pasos de montana",
      hecho_canonico_id: "l03-mov-22",
      pregunta:
        "En pasos de montaña a gran altitud (páramos) durante la madrugada, ¿qué riesgo particular de la calzada debe anticiparse en zonas sombreadas o puentes?",
      opcion_a: "Bloqueo magnético de los sensores del computador del carro",
      opcion_b: "Ebullición del líquido refrigerante por exceso de oxígeno en el aire",
      opcion_c: "Aumento desmedido de la adherencia que frena el vehículo por completo",
      opcion_d:
        "Formación de escarcha o una fina película de hielo transparente (hielo negro) altamente resbaladiza",
      respuesta_correcta: "d",
      explicacion:
        "En zonas de sombra y estructuras elevadas como puentes la temperatura del asfalto cae por debajo de cero grados, condensando humedad que se congela en una película casi invisible sin agarre.",
      fundamento_legal: "Manual de Referencia ANSV sobre conducción en alta montaña.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l03-253",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "fatiga en viajes nocturnos monótonos",
      hecho_canonico_id: "l03-mov-23",
      pregunta:
        "¿Por qué conducir en una autopista recta y solitaria durante la noche genera un alto riesgo de microsueño?",
      opcion_a:
        "Porque la monotonía visual del camino combinada con el ritmo circadiano natural del cuerpo adormece la corteza cerebral sin previo aviso",
      opcion_b: "Porque los faros del automóvil emiten radiación somnífera",
      opcion_c: "Porque la presión de las llantas se incrementa en línea recta",
      opcion_d: "Porque el motor consume el oxígeno exterior de la cabina",
      respuesta_correcta: "a",
      explicacion:
        "La falta de estímulos cambiantes y el reloj biológico (especialmente entre las 02:00 y las 06:00 horas) inducen estados de hipnosis vial y microsueños fulminantes de varios segundos.",
      fundamento_legal: "Manual de Referencia ANSV sobre factores humanos y fatiga.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    know({
      id: "cale-l03-254",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "desgaste prematuro de frenos por mal uso",
      hecho_canonico_id: "l03-mov-24",
      pregunta:
        "Un conductor acostumbra bajar montañas apoyando el pie en el freno de servicio continuamente. ¿Qué efecto técnico perjudicial provoca esta acción?",
      opcion_a: "La recarga automática de la batería a niveles peligrosos de sobrevoltaje",
      opcion_b:
        "El fenómeno de 'fading' o cristalización de las pastillas, donde el material de fricción se vitrifica por calor extremo y deja de morder el disco",
      opcion_c: "El congelamiento instantáneo de las tuberías de freno",
      opcion_d: "La pérdida de alineación de las ruedas traseras",
      respuesta_correcta: "b",
      explicacion:
        "El calor excesivo por fricción sostenida quema las resinas de las pastillas de freno, volviendo su superficie brillante y lisa como vidrio (cristalización), perdiendo casi toda su fuerza de frenado.",
      fundamento_legal:
        "Manual de Referencia ANSV sobre conservación mecánica de sistemas de seguridad.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l03-255",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "reaccion ante desprendimiento de piedras en talud",
      hecho_canonico_id: "l03-mov-25",
      pregunta:
        "Al transitar por un tramo de montaña bajo lluvia fuerte observa pequeñas piedras y lodo rodando por el talud hacia la vía. ¿Qué debe deducir el conductor?",
      opcion_a: "Que la vía está en óptimas condiciones de drenaje",
      opcion_b: "Que puede detenerse justo al pie del talud a tomar un descanso",
      opcion_c:
        "Que existe riesgo inminente de un deslizamiento o derrumbe mayor, por lo que debe moderar la marcha, no detenerse bajo el talud y avisar a las autoridades",
      opcion_d: "Que los operarios de la vía están limpiando la montaña deliberadamente",
      respuesta_correcta: "c",
      explicacion:
        "El desprendimiento de gravilla y lodo en laderas durante aguaceros es el aviso previo de fallas geológicas o aludes de tierra. No detenerse en zonas de talud activo evita quedar sepultado.",
      fundamento_legal:
        "Manual de Referencia ANSV; Guía de Gestión de Riesgos de Desastres Viales.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    know({
      id: "cale-l03-256",
      lote: LOTE,
      nucleo_nombre: "Normas de transito",
      subtema: "horario reglamentario de luces exteriores",
      hecho_canonico_id: "l03-nor-01",
      pregunta:
        "Según el Código Nacional de Tránsito (Ley 769 de 2002), ¿en qué horario es estrictamente obligatorio circular con las luces exteriores encendidas?",
      opcion_a: "Desde las 20:00 horas hasta las 04:00 horas del día siguiente",
      opcion_b: "Solo cuando el alumbrado público de la ciudad esté apagado",
      opcion_c: "Únicamente después de la medianoche",
      opcion_d:
        "Desde las 18:00 horas (6:00 p.m.) hasta las 06:00 horas (6:00 a.m.) del día siguiente, o cuando las condiciones climáticas o de visibilidad lo ameriten",
      respuesta_correcta: "d",
      explicacion:
        "El artículo 86 de la Ley 769 establece la obligatoriedad de encender las luces exteriores entre las 18:00 y las 06:00 horas, o en cualquier momento si la lluvia, niebla o túneles disminuyen la visibilidad.",
      fundamento_legal: "Ley 769 de 2002, Art. 86.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    know({
      id: "cale-l03-257",
      lote: LOTE,
      nucleo_nombre: "Normas de transito",
      subtema: "prohibicion de luces altas en perimetro urbano",
      hecho_canonico_id: "l03-nor-02",
      pregunta:
        "¿Qué norma rige el uso de las luces plenas o altas dentro del perímetro urbano de una ciudad?",
      opcion_a:
        "Están prohibidas en el perímetro urbano, debiendo usarse exclusivamente la luz media o baja",
      opcion_b: "Son obligatorias en todas las vías arterias de la ciudad",
      opcion_c: "Se autorizan únicamente para vehículos de servicio particular",
      opcion_d: "Se permiten siempre que se circule a más de 30 km/h",
      respuesta_correcta: "a",
      explicacion:
        "El artículo 86 del Código Nacional de Tránsito prohíbe taxativamente el uso de luces altas dentro de las zonas urbanas, ya que la iluminación pública y el tráfico denso provocan encandilamiento peligroso.",
      fundamento_legal: "Ley 769 de 2002, Art. 86 y Art. 131, infracción D.08.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    know({
      id: "cale-l03-258",
      lote: LOTE,
      nucleo_nombre: "Normas de transito",
      subtema: "prelacion de vehiculos de emergencia",
      hecho_canonico_id: "l03-nor-03",
      pregunta:
        "Al escuchar la sirena y observar las señales luminosas de una ambulancia que se aproxima en servicio de urgencia, ¿qué obligación legal tiene todo conductor?",
      opcion_a: "Acelerar para abrirle camino y guiarla a alta velocidad",
      opcion_b:
        "Ceder el paso inmediatamente orillándose al costado derecho o izquierdo de la calzada y deteniéndose si es necesario hasta que pase",
      opcion_c:
        "Mantener el carril y velocidad sin inmutarse porque la ambulancia debe esquivar el tráfico",
      opcion_d: "Frenar en seco en el centro de la calzada de forma imprevista",
      respuesta_correcta: "b",
      explicacion:
        "El artículo 64 de la Ley 769 otorga prelación total a los vehículos de emergencia en servicio. Los demás conductores deben despejar la vía orillándose de inmediato sin entorpecer la maniobra.",
      fundamento_legal: "Ley 769 de 2002, Art. 64 y Art. 131, infracción C.31.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    know({
      id: "cale-l03-259",
      lote: LOTE,
      nucleo_nombre: "Normas de transito",
      subtema: "uso legal de luces estacionarias o intermitentes",
      hecho_canonico_id: "l03-nor-04",
      pregunta:
        "¿En qué circunstancia específica autoriza la normativa colombiana el uso de las luces estacionarias o intermitentes de emergencia?",
      opcion_a: "Para estacionar en zonas prohibidas o frente a garajes sin ser multado",
      opcion_b: "Para avisar que se va a cometer una infracción rápida de tránsito",
      opcion_c:
        "Para advertir peligro inminente a otros usuarios, vehículo averiado, detención de emergencia o maniobras de detención forzada",
      opcion_d: "Para circular normalmente a mayor velocidad por el carril izquierdo",
      respuesta_correcta: "c",
      explicacion:
        "El artículo 65 del Código Nacional de Tránsito estipula que las luces de estacionamiento son exclusivamente para indicar peligro, avería o detención de emergencia, nunca como salvoconducto para parquear mal.",
      fundamento_legal: "Ley 769 de 2002, Art. 65.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    know({
      id: "cale-l03-260",
      lote: LOTE,
      nucleo_nombre: "Normas de transito",
      subtema: "reglas de giros a la izquierda en doble sentido",
      hecho_canonico_id: "l03-nor-05",
      pregunta:
        "Para efectuar un giro a la izquierda desde una vía de doble sentido de circulación hacia otra vía, ¿cómo debe posicionarse el conductor reglamentariamente?",
      opcion_a:
        "Pegarse al andén derecho y girar cruzando todos los carriles de forma perpendicular",
      opcion_b: "Girar rápidamente sin usar luces direccionales para no alertar a los peatones",
      opcion_c:
        "Invadir el carril en contravía 50 metros antes de llegar a la esquina para ganar tiempo",
      opcion_d:
        "Aproximarse al eje central divisorio de la calzada sin invadir el sentido contrario, ceder el paso al tráfico que viene de frente y girar con precaución",
      respuesta_correcta: "d",
      explicacion:
        "El artículo 66 de la Ley 769 señala que en giros a la izquierda en vías bidireccionales el vehículo debe arrimarse a la línea central divisoria sin cruzarla, ceder paso a quienes vienen de frente y completar el giro.",
      fundamento_legal: "Ley 769 de 2002, Art. 66.",
      source: SOURCES.LEY_769,
      dificultad: "media",
    }),
    know({
      id: "cale-l03-261",
      lote: LOTE,
      nucleo_nombre: "Normas de transito",
      subtema: "prohibicion de maniobra de reversa en vias publicas",
      hecho_canonico_id: "l03-nor-06",
      pregunta:
        "¿Qué establece el artículo 69 de la Ley 769 de 2002 sobre la maniobra de marcha atrás o retroceso en las vías públicas?",
      opcion_a:
        "Está expresamente prohibida, salvo en casos indispensables para estacionar o en situaciones de emergencia donde sea imposible continuar de frente",
      opcion_b: "Está permitida libremente por cualquier distancia siempre que se toquen bocinazos",
      opcion_c: "Se permite en autopistas si el conductor se pasó de su salida",
      opcion_d: "Solo está prohibida para vehículos de servicio público",
      respuesta_correcta: "a",
      explicacion:
        "La maniobra de reversa en vías públicas es altamente riesgosa y está prohibida con carácter general; solo se autoriza para acomodar el vehículo en maniobras de parqueo o por fuerza mayor justificada.",
      fundamento_legal: "Ley 769 de 2002, Art. 69.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    know({
      id: "cale-l03-262",
      lote: LOTE,
      nucleo_nombre: "Normas de transito",
      subtema: "remolque de vehiculos averiados",
      hecho_canonico_id: "l03-nor-07",
      pregunta:
        "Bajo la normativa colombiana, ¿cómo debe efectuarse el remolque de un vehículo varado en la vía pública?",
      opcion_a: "Atando una cuerda floja o lazo de tela a cualquier velocidad",
      opcion_b:
        "Mediante una grúa autorizada legalmente, o en casos de urgencia con barra rígida de acople para despejar la calzada hasta un lugar seguro cercano",
      opcion_c: "Empujándolo con el parachoques de otro carro particular sin conductor al volante",
      opcion_d: "Arrastrándolo en contravía para cortar camino",
      respuesta_correcta: "b",
      explicacion:
        "El artículo 72 de la Ley 769 restringe el remolque de automotores a servicios especializados de grúa. El uso de cables o lazos improvisados en vía pública está prohibido por el peligro de corte o choque.",
      fundamento_legal: "Ley 769 de 2002, Art. 72 y Art. 131, infracción B.15.",
      source: SOURCES.LEY_769,
      dificultad: "media",
    }),
    know({
      id: "cale-l03-263",
      lote: LOTE,
      nucleo_nombre: "Normas de transito",
      subtema: "prohibicion de reparaciones en vias publicas",
      hecho_canonico_id: "l03-nor-08",
      pregunta:
        "Según el artículo 79 del Código Nacional de Tránsito, ¿dónde está prohibido efectuar reparaciones mecánicas a los vehículos automotores?",
      opcion_a: "En los talleres mecánicos autorizados por la alcaldía",
      opcion_b: "En los garajes privados de las viviendas",
      opcion_c:
        "En las vías públicas, andenes, parques o zonas verdes, salvo reparaciones de estricta emergencia para retirar el automotor",
      opcion_d: "En las estaciones de servicio autorizadas",
      respuesta_correcta: "c",
      explicacion:
        "El espacio público no es un taller mecánico. Efectuar mantenimientos, cambios de aceite o reparaciones rutinarias en andenes o calzadas está sancionado y genera contaminación e invasión del espacio común.",
      fundamento_legal: "Ley 769 de 2002, Art. 79 y Art. 131, infracción C.07.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    know({
      id: "cale-l03-264",
      lote: LOTE,
      nucleo_nombre: "Normas de transito",
      subtema: "equipo de prevencion y seguridad kit de carretera",
      hecho_canonico_id: "l03-nor-09",
      pregunta:
        "¿Cuáles son los 9 elementos mínimos obligatorios que conforman el equipo de prevención y seguridad (kit de carretera) según el artículo 30 de la Ley 769 de 2002?",
      opcion_a:
        "Aceite de motor, líquido de frenos, líquido refrigerante, balde, manguera, gasolina extra, fósforos y trapos",
      opcion_b:
        "GPS, celular con datos, paraguas, cinta adhesiva, radio, cables de audio, chaleco térmico, cargador y gafas oscuras",
      opcion_c:
        "Compresor de aire, carpa para lluvia, extintor vencido, cuerda de remolque elástica, balde de agua, esponja, alicates y radio de comunicaciones",
      opcion_d:
        "Gato, cruceta, 2 señales de carretera (triángulos), botiquín, extintor vigente, 2 tacos de bloqueo, caja de herramientas básica, llanta de repuesto y linterna",
      respuesta_correcta: "d",
      explicacion:
        "El artículo 30 de la Ley 769 fija taxativamente los 9 elementos indispensables para atender averías y emergencias menores en ruta y asegurar la inmovilización y señalización del automotor.",
      fundamento_legal: "Ley 769 de 2002, Art. 30 y Art. 131, infracción C.23.",
      source: SOURCES.LEY_769,
      dificultad: "media",
    }),
    know({
      id: "cale-l03-265",
      lote: LOTE,
      nucleo_nombre: "Normas de transito",
      subtema: "detencion ante pasos ferreos a nivel",
      hecho_canonico_id: "l03-nor-10",
      pregunta:
        "¿A qué distancia mínima del riel más cercano debe detenerse completamente un conductor antes de cruzar una vía férrea a nivel según el artículo 81 de la Ley 769?",
      opcion_a: "A mínimo 5 metros de distancia del riel más próximo",
      opcion_b: "A mínimo 10 centímetros de la carrilera",
      opcion_c: "A exactamente 50 metros sin excepción",
      opcion_d: "No es obligatorio detenerse si no se escucha el silbato del tren",
      respuesta_correcta: "a",
      explicacion:
        "El artículo 81 obliga a todo conductor a detenerse totalmente a no menos de cinco (5) metros del riel más cercano, cerciorarse de que no se aproxime ningún tren y reiniciar la marcha en primera.",
      fundamento_legal: "Ley 769 de 2002, Art. 81.",
      source: SOURCES.LEY_769,
      dificultad: "media",
    }),
    know({
      id: "cale-l03-266",
      lote: LOTE,
      nucleo_nombre: "Normas de transito",
      subtema: "transporte de carga sobresaliente trasera",
      hecho_canonico_id: "l03-nor-11",
      pregunta:
        "Si un vehículo de carga transporta elementos que sobresalen en la parte posterior de la carrocería, ¿cómo debe señalizarse obligatoriamente según el Código de Tránsito?",
      opcion_a: "Con un lazo negro colgado de la carga sin importar la hora",
      opcion_b:
        "De día con un banderín rojo de mínimo 0,50 metros y de noche con una luz roja visible a distancia",
      opcion_c: "Con ramas secas cortadas de los árboles de la carretera",
      opcion_d: "Únicamente encendiendo las luces direccionales derechas",
      respuesta_correcta: "b",
      explicacion:
        "El artículo 101 de la Ley 769 exige señalizar la carga sobresaliente con un banderín rojo en horario diurno y con luz roja reglamentaria en horario nocturno para evitar colisiones por alcance.",
      fundamento_legal: "Ley 769 de 2002, Art. 101 y Art. 131, infracción B.19.",
      source: SOURCES.LEY_769,
      dificultad: "media",
    }),
    know({
      id: "cale-l03-267",
      lote: LOTE,
      nucleo_nombre: "Normas de transito",
      subtema: "uso exclusivo de bocina o pito",
      hecho_canonico_id: "l03-nor-12",
      pregunta:
        "¿Bajo qué circunstancias específicas autoriza la ley el uso de la bocina sonora en un vehículo automotor?",
      opcion_a:
        "Para apurar a los peatones en los cruces y celebrar eventos deportivos en caravana",
      opcion_b: "Para reclamar el paso en semáforos apenas cambian a luz verde",
      opcion_c:
        "Exclusivamente para prevenir accidentes y siniestros inminentes, o en curvas sin visibilidad de carreteras de montaña",
      opcion_d: "Para saludar a amigos o conocidos en la acera",
      respuesta_correcta: "c",
      explicacion:
        "El artículo 104 de la Ley 769 prohíbe el uso indiscriminado de la bocina. Solo se autoriza como aviso de prevención ante peligro inminente de choque o en curvas cerradas de montaña sin visibilidad.",
      fundamento_legal: "Ley 769 de 2002, Art. 104 y Art. 131, infracción C.38.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    know({
      id: "cale-l03-268",
      lote: LOTE,
      nucleo_nombre: "Normas de transito",
      subtema: "adelantamiento por el costado derecho prohibido",
      hecho_canonico_id: "l03-nor-13",
      pregunta:
        "Como regla general del artículo 73 del Código de Tránsito, ¿está permitido adelantar a otro vehículo por su costado derecho?",
      opcion_a: "Sí, siempre que el conductor que adelanta tenga prisa",
      opcion_b: "Sí, siempre y cuando se utilice la berma pavimentada",
      opcion_c: "Sí, en todas las carreteras rurales sin excepción",
      opcion_d:
        "No, todo adelantamiento debe realizarse por la izquierda, salvo cuando el vehículo adelantado va a girar o detenerse a la izquierda",
      respuesta_correcta: "d",
      explicacion:
        "El adelantamiento por la derecha está estrictamente prohibido por norma general; los puntos ciegos a la derecha son mayores y los conductores esperan ser rebasados por la izquierda.",
      fundamento_legal: "Ley 769 de 2002, Art. 73.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    know({
      id: "cale-l03-269",
      lote: LOTE,
      nucleo_nombre: "Normas de transito",
      subtema: "obligatoriedad de senales direccionales",
      hecho_canonico_id: "l03-nor-14",
      pregunta:
        "¿Con cuánta anticipación mínima exige la ley señalizar un cambio de carril o giro con las luces direccionales en zona urbana y carretera?",
      opcion_a: "Mínimo 30 metros de antelación en zonas urbanas y mínimo 60 metros en carretera",
      opcion_b: "Al momento exacto de girar el volante sin antelación alguna",
      opcion_c: "A 5 metros antes de doblar en cualquier tipo de vía",
      opcion_d: "Las direccionales son opcionales y solo se usan si hay agentes de tránsito cerca",
      respuesta_correcta: "a",
      explicacion:
        "El artículo 67 de la Ley 769 exige avisar las maniobras de cambio de carril o giro con una anticipación mínima de 30 metros en zonas urbanas y de 60 metros en carreteras rurales.",
      fundamento_legal: "Ley 769 de 2002, Art. 67 y Art. 131, infracción C.25.",
      source: SOURCES.LEY_769,
      dificultad: "media",
    }),
    know({
      id: "cale-l03-270",
      lote: LOTE,
      nucleo_nombre: "Normas de transito",
      subtema: "prelacion en pendientes estrechas",
      hecho_canonico_id: "l03-nor-15",
      pregunta:
        "En una vía de montaña estrecha donde no caben dos vehículos simultáneamente y no hay señalización, ¿quién tiene la prelación de paso?",
      opcion_a: "El vehículo que desciende (baja), porque va más rápido por la gravedad",
      opcion_b:
        "El vehículo que asciende (sube), debiendo el que baja retroceder o apartarse a un lugar seguro",
      opcion_c: "El vehículo más moderno sin importar el sentido de circulación",
      opcion_d: "El conductor que toque la bocina con mayor intensidad",
      respuesta_correcta: "b",
      explicacion:
        "El artículo 70 de la Ley 769 otorga prelación de paso al vehículo que va subiendo en pendientes estrechas, debido a la dificultad mecánica y física de reiniciar la marcha en ascenso si se detiene.",
      fundamento_legal: "Ley 769 de 2002, Art. 70, numeral 4.",
      source: SOURCES.LEY_769,
      dificultad: "media",
    }),
    know({
      id: "cale-l03-271",
      lote: LOTE,
      nucleo_nombre: "Senalizacion vial e infraestructura",
      subtema: "significado de colores de lineas longitudinales",
      hecho_canonico_id: "l03-sen-01",
      pregunta:
        "En la demarcación horizontal vial colombiana, ¿qué diferencia sustancial existe entre las líneas longitudinales amarillas y las blancas?",
      opcion_a: "Las blancas prohíben adelantar y las amarillas obligan a acelerar a fondo",
      opcion_b: "Las amarillas son de adorno decorativo y las blancas son obligatorias",
      opcion_c:
        "Las amarillas separan flujos de tránsito en sentidos opuestos, mientras que las blancas separan flujos que viajan en el mismo sentido o delimitan bordes",
      opcion_d: "Las amarillas son solo para ciclorrutas y las blancas para camiones",
      respuesta_correcta: "c",
      explicacion:
        "El Manual de Señalización Vial 2024 estipula que el color amarillo divide sentidos de circulación contrarios (flujo bidireccional), mientras que el blanco canaliza carriles del mismo sentido o bordes de pavimento.",
      fundamento_legal: "Manual de Señalización Vial 2024, Capítulo 3; Ley 769 de 2002.",
      source: SOURCES.MANUAL_SENALIZACION,
      dificultad: "facil",
    }),
    know({
      id: "cale-l03-272",
      lote: LOTE,
      nucleo_nombre: "Senalizacion vial e infraestructura",
      subtema: "doble linea amarilla continua",
      hecho_canonico_id: "l03-sen-02",
      pregunta:
        "¿Qué restricción absoluta indica la presencia de una doble línea amarilla continua en el eje de una calzada?",
      opcion_a: "Señala que el carril izquierdo es exclusivo para motocicletas",
      opcion_b: "Autoriza adelantar a cualquier vehículo siempre que no venga nadie a la vista",
      opcion_c: "Indica zona de estacionamiento libre para vehículos pesados",
      opcion_d:
        "Prohíbe terminantemente el adelantamiento y el giro a la izquierda a los vehículos de ambos sentidos de circulación",
      respuesta_correcta: "d",
      explicacion:
        "La doble línea continua amarilla refuerza la prohibición absoluta de adelantar o cruzar la línea divisoria para ambos sentidos de tráfico por ser tramos de nula visibilidad o alta siniestralidad.",
      fundamento_legal: "Manual de Señalización Vial 2024, Sección Demarcación Longitudinal.",
      source: SOURCES.MANUAL_SENALIZACION,
      dificultad: "facil",
    }),
    know({
      id: "cale-l03-273",
      lote: LOTE,
      nucleo_nombre: "Senalizacion vial e infraestructura",
      subtema: "linea longitudinal mixta continua y discontinua",
      hecho_canonico_id: "l03-sen-03",
      pregunta:
        "Al circular por una carretera observa una línea longitudinal mixta (una continua y otra segmentada paralela). ¿Quién tiene permitido adelantar?",
      opcion_a:
        "Únicamente el conductor que circula por el lado adyacente a la línea segmentada o discontinua, siempre que haya condiciones seguras",
      opcion_b: "Ninguno de los dos sentidos puede adelantar en ningún caso",
      opcion_c: "Ambos sentidos simultáneamente porque hay dos líneas",
      opcion_d: "Únicamente el conductor que circula del lado adyacente a la línea continua",
      respuesta_correcta: "a",
      explicacion:
        "En líneas mixtas, la maniobra de adelantamiento solo está permitida para el sentido de circulación que tiene a su izquierda inmediata la línea discontinua; quien tiene la continua tiene prohibido rebasar.",
      fundamento_legal: "Manual de Señalización Vial 2024; Ley 769 de 2002, Art. 73.",
      source: SOURCES.MANUAL_SENALIZACION,
      dificultad: "media",
    }),
    know({
      id: "cale-l03-274",
      lote: LOTE,
      nucleo_nombre: "Senalizacion vial e infraestructura",
      subtema: "demarcacion de cuadricula antibloqueo",
      hecho_canonico_id: "l03-sen-04",
      pregunta:
        "¿Qué significado tiene la demarcación de cuadrícula con líneas amarillas diagonales pintada en el centro de una intersección vial?",
      opcion_a: "Zona habilitada para detenerse a dejar o recoger pasajeros",
      opcion_b:
        "Área de no bloqueo: prohíbe quedar detenido dentro de ella bajo cualquier circunstancia, garantizando la fluidez de las vías transversales",
      opcion_c: "Lugar exclusivo para parqueo de ambulancias y patrullas de policía",
      opcion_d: "Zona de aceleración máxima para cruzar en luz amarilla",
      respuesta_correcta: "b",
      explicacion:
        "La cuadrícula antibloqueo (caja amarilla) prohíbe ingresar a la intersección si la fila de adelante no permite cruzarla completamente, evitando colapsar el paso transversal.",
      fundamento_legal:
        "Manual de Señalización Vial 2024; Ley 769 de 2002, Art. 131, infracción C.03.",
      source: SOURCES.MANUAL_SENALIZACION,
      dificultad: "facil",
    }),
    know({
      id: "cale-l03-275",
      lote: LOTE,
      nucleo_nombre: "Senalizacion vial e infraestructura",
      subtema: "linea transversal de detencion o pare",
      hecho_canonico_id: "l03-sen-05",
      pregunta:
        "¿Dónde debe posicionarse el parachoques delantero del vehículo frente a una línea transversal continua de parada antes de una cebra o semáforo?",
      opcion_a: "Exactamente encima de la cebra peatonal para ver mejor el tráfico",
      opcion_b: "Tres metros más adelante de la línea en medio de la intersección",
      opcion_c:
        "Detrás de la línea transversal de parada, sin pisarla ni sobrepasarla con el parachoques",
      opcion_d: "Sobre la acera peatonal lateral",
      respuesta_correcta: "c",
      explicacion:
        "La línea transversal delimita el límite físico de avance reglamentario. Detenerse sobre ella o invadir la cebra peatonal constituye infracción y bloquea el paso seguro de los peatones.",
      fundamento_legal: "Manual de Señalización Vial 2024; Ley 769 de 2002, Art. 118.",
      source: SOURCES.MANUAL_SENALIZACION,
      dificultad: "facil",
    }),
    know({
      id: "cale-l03-276",
      lote: LOTE,
      nucleo_nombre: "Senalizacion vial e infraestructura",
      subtema: "significado de captaluces tachas reflectivas",
      hecho_canonico_id: "l03-sen-06",
      pregunta:
        "En la señalización horizontal nocturna, ¿qué advierte un conductor al observar tachas reflectivas (ojos de gato) de color ROJO en el pavimento?",
      opcion_a: "Indican el eje divisor entre dos carriles del mismo sentido",
      opcion_b: "Señalan la cercanía de un restaurante o zona comercial",
      opcion_c: "Indican que el límite de velocidad en ese punto es superior a 120 km/h",
      opcion_d:
        "Advierten una línea de borde o sentido de circulación prohibido que no debe ser cruzada bajo ninguna circunstancia",
      respuesta_correcta: "d",
      explicacion:
        "Las tachas rojas delimitan bordes rígidos de calzada, zonas no transitables o rampas de acceso en contravía, señalando al conductor que esa línea no puede ser traspasada.",
      fundamento_legal: "Manual de Señalización Vial 2024, Sección Dispositivos Retrorreflectivos.",
      source: SOURCES.MANUAL_SENALIZACION,
      dificultad: "media",
    }),
    know({
      id: "cale-l03-277",
      lote: LOTE,
      nucleo_nombre: "Senalizacion vial e infraestructura",
      subtema: "luz roja intermitente de semaforo",
      hecho_canonico_id: "l03-sen-07",
      pregunta:
        "¿A qué señalización vertical equivale exactamente una luz ROJA INTERMITENTE en un semáforo según el Manual de Señalización Vial?",
      opcion_a:
        "Equivale exactamente a una señal reglamentaria de PARE (SR-01): detención total, comprobación de vía despejada y reinicio de marcha con precaución",
      opcion_b: "Equivale a una luz verde, autorizando el paso a máxima velocidad",
      opcion_c: "Equivale a una señal de CEDA EL PASO, permitiendo pasar sin parar",
      opcion_d: "Indica que el semáforo está apagado y la vía queda sin reglas",
      respuesta_correcta: "a",
      explicacion:
        "La luz roja intermitente obliga a la detención total del automotor antes de la línea de parada, igual que una señal de PARE. Una vez verificado que no vienen peatones ni vehículos, se puede continuar.",
      fundamento_legal:
        "Manual de Señalización Vial 2024, Capítulo Semáforos; Ley 769 de 2002, Art. 118.",
      source: SOURCES.MANUAL_SENALIZACION,
      dificultad: "media",
    }),
    know({
      id: "cale-l03-278",
      lote: LOTE,
      nucleo_nombre: "Senalizacion vial e infraestructura",
      subtema: "luz amarilla intermitente de semaforo",
      hecho_canonico_id: "l03-sen-08",
      pregunta: "¿Qué conducta exige una luz AMARILLA INTERMITENTE en un semáforo?",
      opcion_a: "Acelerar con fuerza para despejar el cruce de inmediato",
      opcion_b:
        "Moderar la velocidad, avanzar con extrema precaución y ceder el paso si hay peatones o vehículos cruzando (similar a un Ceda el Paso)",
      opcion_c: "Detener el vehículo de manera indefinida hasta que cambie a verde fijo",
      opcion_d: "Realizar un giro en U inmediatamente",
      respuesta_correcta: "b",
      explicacion:
        "La luz amarilla intermitente advierte peligro o cruce regulado con precaución. No exige detención obligatoria total si la vía está despejada, pero impone reducir la marcha y ceder el paso.",
      fundamento_legal: "Ley 769 de 2002, Art. 118; Manual de Señalización Vial 2024.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    know({
      id: "cale-l03-279",
      lote: LOTE,
      nucleo_nombre: "Senalizacion vial e infraestructura",
      subtema: "flecha verde de giro en semaforo",
      hecho_canonico_id: "l03-sen-09",
      pregunta:
        "En una intersección semaforizada, la luz circular principal está en rojo, pero una flecha verde hacia la derecha se ilumina simultáneamente. ¿Qué indica?",
      opcion_a: "Que está prohibido doblar a la derecha",
      opcion_b: "Que todos los vehículos deben avanzar de frente cruzando en rojo",
      opcion_c:
        "Que los vehículos ubicados en el carril correspondiente pueden efectuar exclusivamente el giro a la derecha indicado por la flecha con prelación protegida",
      opcion_d: "Que el semáforo sufrió un cortocircuito eléctrico",
      respuesta_correcta: "c",
      explicacion:
        "Las flechas direccionales semafóricas regulan movimientos específicos de giro de forma protegida, permitiendo la maniobra indicada aun cuando el flujo directo principal permanezca detenido en rojo.",
      fundamento_legal: "Manual de Señalización Vial 2024; Ley 769 de 2002, Art. 118.",
      source: SOURCES.MANUAL_SENALIZACION,
      dificultad: "media",
    }),
    know({
      id: "cale-l03-280",
      lote: LOTE,
      nucleo_nombre: "Senalizacion vial e infraestructura",
      subtema: "cebra peatonal y lineas longitudinales de aproximacion",
      hecho_canonico_id: "l03-sen-10",
      pregunta:
        "Las marcas de aproximación a un paso peatonal (líneas en zigzag o líneas segmentadas gruesas) sobre el pavimento indican:",
      opcion_a: "Zona habilitada para acelerar antes de la esquina",
      opcion_b: "Área exclusiva para carga y descarga de materiales pesados",
      opcion_c: "Pista de prueba para la suspensión del vehículo",
      opcion_d:
        "La proximidad de un cruce peatonal donde está prohibido estacionar, cambiar de carril o adelantar, debiendo reducir la velocidad",
      respuesta_correcta: "d",
      explicacion:
        "La demarcación previa a un paso peatonal advierte la presencia de peatones y prohíbe cualquier maniobra de adelantamiento o parada que obstaculice la visibilidad recíproca entre conductores y transeúntes.",
      fundamento_legal: "Manual de Señalización Vial 2024, Sección Marcas Viales.",
      source: SOURCES.MANUAL_SENALIZACION,
      dificultad: "media",
    }),
    know({
      id: "cale-l03-281",
      lote: LOTE,
      nucleo_nombre: "Senalizacion vial e infraestructura",
      subtema: "linea blanca de borde de pavimento berma",
      hecho_canonico_id: "l03-sen-11",
      pregunta:
        "¿Qué función cumple la línea blanca continua pintada en el borde exterior derecho de la calzada?",
      opcion_a:
        "Delimita el límite transitable de la calzada separándolo de la berma o el andén, sirviendo de guía visual en la oscuridad o bajo lluvia",
      opcion_b: "Divide los carriles de adelantamiento en autopistas",
      opcion_c: "Indica el carril exclusivo para vehículos de carga pesada",
      opcion_d: "Es una línea decorativa sin valor regulatorio",
      respuesta_correcta: "a",
      explicacion:
        "La línea de borde de pavimento orienta al conductor manteniéndolo dentro del área segura de rodadura, especialmente útil de noche o con niebla para evitar salidas de calzada hacia zanjas o bermas.",
      fundamento_legal: "Manual de Señalización Vial 2024; Ley 769 de 2002.",
      source: SOURCES.MANUAL_SENALIZACION,
      dificultad: "facil",
    }),
    know({
      id: "cale-l03-282",
      lote: LOTE,
      nucleo_nombre: "Senalizacion vial e infraestructura",
      subtema: "flechas de seleccion de carril",
      hecho_canonico_id: "l03-sen-12",
      pregunta:
        "Si el carril por donde transita tiene pintada sobre el asfalto una flecha que apunta exclusivamente hacia la izquierda, ¿qué maniobra está obligado a realizar?",
      opcion_a: "Puede seguir recto si el semáforo está en verde",
      opcion_b:
        "Debe efectuar obligatoriamente el giro hacia la izquierda al llegar a la intersección",
      opcion_c: "Puede girar a la derecha si no vienen peatones",
      opcion_d: "Debe detenerse de inmediato y dar reversa",
      respuesta_correcta: "b",
      explicacion:
        "Las flechas de canalización y asignación de carril en intersecciones son de acatamiento obligatorio. Si la flecha es exclusiva de giro, el conductor no puede continuar de frente desde ese carril.",
      fundamento_legal: "Manual de Señalización Vial 2024; Ley 769 de 2002, Art. 110.",
      source: SOURCES.MANUAL_SENALIZACION,
      dificultad: "facil",
    }),
    know({
      id: "cale-l03-283",
      lote: LOTE,
      nucleo_nombre: "Senalizacion vial e infraestructura",
      subtema: "senal sp-27 descenso peligroso",
      hecho_canonico_id: "l03-sen-13",
      pregunta:
        "¿Qué advierte la señal preventiva SP-27 que muestra un vehículo bajando por un plano inclinado con porcentaje de pendiente?",
      opcion_a: "Zona de parqueo en rampa",
      opcion_b: "Fin de la carretera pavimentada",
      opcion_c:
        "Descenso pronunciado o peligroso, advirtiendo la necesidad de reducir la marcha y engranar cambio bajo para usar el freno motor",
      opcion_d: "Zona de carreras de aceleración",
      respuesta_correcta: "c",
      explicacion:
        "La señal preventiva SP-27 alerta al conductor sobre una bajada prolongada con fuerte inclinación, previniendo el sobrecalentamiento de frenos mediante el uso oportuno de marchas bajas.",
      fundamento_legal: "Manual de Señalización Vial 2024, Señal Preventiva SP-27.",
      source: SOURCES.MANUAL_SENALIZACION,
      dificultad: "facil",
    }),
    know({
      id: "cale-l03-284",
      lote: LOTE,
      nucleo_nombre: "Senalizacion vial e infraestructura",
      subtema: "senal sp-39 superficie deslizante",
      hecho_canonico_id: "l03-sen-14",
      pregunta:
        "¿Qué significado tiene la señal preventiva SP-39 que muestra un automóvil con marcas de huellas de neumáticos onduladas detrás?",
      opcion_a: "Pista de pruebas de derrape para automóviles deportivos",
      opcion_b: "Zona de curvas sucesivas a la derecha",
      opcion_c: "Prohibición de circular con llantas nuevas",
      opcion_d:
        "Superficie de calzada deslizante, advirtiendo riesgo de pérdida de adherencia por agua, humedad o materiales sueltos",
      respuesta_correcta: "d",
      explicacion:
        "La señal SP-39 advierte al conductor que ese tramo de vía suele volverse resbaladizo bajo lluvia o humedad, exigiendo reducir la velocidad y evitar frenazos o virajes bruscos.",
      fundamento_legal: "Manual de Señalización Vial 2024, Señal Preventiva SP-39.",
      source: SOURCES.MANUAL_SENALIZACION,
      dificultad: "facil",
    }),
    know({
      id: "cale-l03-285",
      lote: LOTE,
      nucleo_nombre: "Senalizacion vial e infraestructura",
      subtema: "senal sr-38 prohibido el uso de pito",
      hecho_canonico_id: "l03-sen-15",
      pregunta:
        "¿Qué prohíbe la señal reglamentaria SR-38 que contiene el pictograma de una corneta o trompeta cruzada por una banda diagonal roja?",
      opcion_a: "Prohibido el uso de la bocina, pito o señales acústicas en ese tramo de la vía",
      opcion_b: "Prohibido escuchar música con volumen alto dentro del carro",
      opcion_c: "Prohibido el transporte de instrumentos musicales",
      opcion_d: "Zona de libre uso de cornetas neumáticas de camión",
      respuesta_correcta: "a",
      explicacion:
        "La señal SR-38 prohíbe accionar la bocina o aparatos sonoros para evitar contaminación auditiva, instalándose habitualmente frente a hospitales, clínicas, colegios y zonas residenciales protegidas.",
      fundamento_legal:
        "Manual de Señalización Vial 2024, Señal Reglamentaria SR-38; Ley 769 de 2002, Art. 104.",
      source: SOURCES.MANUAL_SENALIZACION,
      dificultad: "facil",
    }),
    know({
      id: "cale-l03-286",
      lote: LOTE,
      nucleo_nombre: "El vehiculo",
      subtema: "funciones del aceite de motor",
      hecho_canonico_id: "l03-veh-01",
      pregunta:
        "¿Cuáles son las cuatro funciones mecánicas primordiales del aceite lubricante en el motor de combustión interna?",
      opcion_a:
        "Mejorar la potencia del radio, suavizar el timón, inflar los neumáticos y evitar el óxido exterior",
      opcion_b:
        "Lubricar las piezas móviles reduciendo fricción, refrigerar zonas internas disipando calor, limpiar sedimentos y sellar la compresión de cilindros",
      opcion_c:
        "Generar la chispa de encendido, recargar la batería, enfriar el aire acondicionado y filtrar los gases de escape",
      opcion_d: "Aumentar el octanaje de la gasolina dentro del tanque de combustible",
      respuesta_correcta: "b",
      explicacion:
        "El aceite no solo disminuye el rozamiento entre metales en movimiento; también arrastra el calor de pistones y bielas, limpia impurezas hacia el filtro y garantiza el sellado de los anillos.",
      fundamento_legal: "Manual de Referencia ANSV sobre componentes y mantenimiento vehicular.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    know({
      id: "cale-l03-287",
      lote: LOTE,
      nucleo_nombre: "El vehiculo",
      subtema: "procedimiento correcto de medicion de aceite",
      hecho_canonico_id: "l03-veh-02",
      pregunta:
        "¿En qué condiciones mecánicas debe encontrarse el vehículo para realizar una medición exacta del nivel de aceite con la varilla medidora?",
      opcion_a: "Con el motor encendido a altas revoluciones en una calle empinada",
      opcion_b: "En plena marcha por carretera a más de 80 km/h",
      opcion_c:
        "Con el motor apagado, frío (o reposado varios minutos), sobre una superficie totalmente plana y horizontal",
      opcion_d: "Con el vehículo inclinado sobre dos ruedas apoyadas en el andén",
      respuesta_correcta: "c",
      explicacion:
        "Para que todo el aceite descienda al cárter y la marca de la varilla refleje el volumen real entre MIN y MAX, el motor debe estar apagado y el vehículo situado en terreno plano y nivelado.",
      fundamento_legal: "Manual de Referencia ANSV sobre inspección básica preoperacional.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    know({
      id: "cale-l03-288",
      lote: LOTE,
      nucleo_nombre: "El vehiculo",
      subtema: "peligro al abrir tapa del radiador caliente",
      hecho_canonico_id: "l03-veh-03",
      pregunta:
        "¿Por qué razón NUNCA debe abrirse la tapa del radiador o del depósito de expansión cuando el motor se encuentra sobrecalentado?",
      opcion_a: "Porque el líquido refrigerante se congela al contacto con el aire ambiental",
      opcion_b: "Porque el tapón pierde su rosca de manera irreversible",
      opcion_c: "Porque la computadora del vehículo se desconfigura automáticamente",
      opcion_d:
        "Porque el circuito se encuentra bajo alta presión y al abrirlo el vapor y refrigerante hirviendo saldrán expulsados violentamente causando quemaduras de gravedad extrema",
      respuesta_correcta: "d",
      explicacion:
        "El sistema de enfriamiento trabaja presurizado a más de 100 °C. Liberar la tapa en caliente provoca una descompresión instantánea que expulsa una columna hirviente de vapor letal para el rostro y cuerpo.",
      fundamento_legal: "Manual de Referencia ANSV sobre seguridad y riesgos en mecánica básica.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    know({
      id: "cale-l03-289",
      lote: LOTE,
      nucleo_nombre: "El vehiculo",
      subtema: "agua corriente vs refrigerante aditivado",
      hecho_canonico_id: "l03-veh-04",
      pregunta:
        "¿Por qué no se debe utilizar agua corriente en lugar de líquido refrigerante formulado en el sistema de enfriamiento del motor?",
      opcion_a:
        "Porque el agua corriente oxida los conductos metálicos internos, produce incrustaciones de sarro y hierve a 100 °C, mientras el refrigerante tiene mayor punto de ebullición y anticorrosivos",
      opcion_b: "Porque el agua apaga las bujías desde adentro del radiador",
      opcion_c: "Porque el agua corriente desgasta los frenos del vehículo",
      opcion_d: "Porque el agua es inflamable a temperaturas superiores a 50 °C",
      respuesta_correcta: "a",
      explicacion:
        "El agua contiene sales que tapan el radiador y causan corrosión severa en el bloque del motor. El refrigerante eleva el punto de ebullición (evitando burbujas de vapor) y protege los metales contra la oxidación.",
      fundamento_legal: "Manual de Referencia ANSV sobre sistema de refrigeración automotriz.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l03-290",
      lote: LOTE,
      nucleo_nombre: "El vehiculo",
      subtema: "funcion de bateria y alternador",
      hecho_canonico_id: "l03-veh-05",
      pregunta:
        "¿Cuál es la función complementaria entre la batería y el alternador en el sistema eléctrico de un automóvil?",
      opcion_a:
        "El alternador solo funciona cuando el carro está apagado y la batería cuando viaja en reversa",
      opcion_b:
        "La batería suministra energía para encender el motor de arranque; una vez el motor está en marcha, el alternador genera la corriente para los sistemas y recarga la batería",
      opcion_c: "La batería impulsa las ruedas y el alternador frena el vehículo",
      opcion_d: "Ambos componentes consumen combustible directamente del tanque",
      respuesta_correcta: "b",
      explicacion:
        "La batería almacena energía química para activar la marcha y encender el motor; una vez encendido, el alternador impulsado por la correa suministra la electricidad de a bordo y recupera la carga acumulada.",
      fundamento_legal: "Manual de Referencia ANSV sobre principios electromecánicos del vehículo.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    know({
      id: "cale-l03-291",
      lote: LOTE,
      nucleo_nombre: "El vehiculo",
      subtema: "funcion de los fusibles",
      hecho_canonico_id: "l03-veh-06",
      pregunta: "¿Cuál es la misión principal de los fusibles en la caja eléctrica del automotor?",
      opcion_a: "Aumentar la potencia lumínica de los faros halógenos",
      opcion_b: "Filtrar el aire que ingresa a la cabina de pasajeros",
      opcion_c:
        "Proteger los circuitos y cables eléctricos fundiéndose de forma controlada cuando ocurre una sobrecarga o cortocircuito, evitando incendios",
      opcion_d: "Regular la presión de inyección de gasolina",
      respuesta_correcta: "c",
      explicacion:
        "Un fusible es un elemento de sacrificio calibrado en amperios. Ante un pico eléctrico o cortocircuito su filamento se rompe, interrumpiendo el flujo de corriente y previniendo que los cables ardan en llamas.",
      fundamento_legal: "Manual de Referencia ANSV sobre seguridad del sistema eléctrico.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    know({
      id: "cale-l03-292",
      lote: LOTE,
      nucleo_nombre: "El vehiculo",
      subtema: "diagnostico humo negro de escape",
      hecho_canonico_id: "l03-veh-07",
      pregunta:
        "Si por el tubo de escape de un vehículo a gasolina sale humo de color NEGRO denso y persistente, ¿qué anomalía mecánica indica?",
      opcion_a: "Paso de líquido refrigerante a los cilindros por falla de culata",
      opcion_b: "Funcionamiento 100 % eficiente y ecológico del catalizador",
      opcion_c: "Quema de aceite lubricante en la cámara de combustión",
      opcion_d:
        "Combustión incompleta con exceso de combustible (mezcla rica), comúnmente por filtro de aire tapado o inyectores defectuosos",
      respuesta_correcta: "d",
      explicacion:
        "El humo negro contiene hollín de gasolina sin quemar debido a falta de aire o exceso de combustible. Aumenta el consumo, contamina el ambiente y deteriora el catalizador rápidamente.",
      fundamento_legal: "Manual de Referencia ANSV sobre emisiones contaminantes y diagnóstico.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l03-293",
      lote: LOTE,
      nucleo_nombre: "El vehiculo",
      subtema: "diagnostico humo azul de escape",
      hecho_canonico_id: "l03-veh-08",
      pregunta:
        "La emisión de humo AZULADO o grisáceo por el escape con olor a aceite quemado delata:",
      opcion_a:
        "Que el aceite del motor se está filtrando a las cámaras de combustión por desgaste de anillos, pistones o retenes de válvula",
      opcion_b: "Que el tanque de combustible contiene agua pura",
      opcion_c: "Que las llantas están perdiendo presión de aire",
      opcion_d: "Que el líquido limpiaparabrisas está llegando al motor",
      respuesta_correcta: "a",
      explicacion:
        "El humo azulado es síntoma clásico de consumo interno de aceite en los cilindros por holguras mecánicas en retenes o anillos de pistón, lo que baja el nivel de aceite y eleva las emisiones tóxicas.",
      fundamento_legal: "Manual de Referencia ANSV sobre diagnóstico mecánico.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l03-294",
      lote: LOTE,
      nucleo_nombre: "El vehiculo",
      subtema: "diagnostico humo blanco espeso persistente",
      hecho_canonico_id: "l03-veh-09",
      pregunta:
        "Un vehículo con el motor caliente emite continuamente por el escape una nube espesa de vapor blanco con olor dulce. ¿Cuál es el diagnóstico probable?",
      opcion_a: "Exceso de aire en la mezcla de combustible",
      opcion_b:
        "Rotura de la junta o empaque de culata, permitiendo el ingreso de líquido refrigerante a las cámaras de combustión",
      opcion_c: "Desgaste en las pastillas de los frenos delanteros",
      opcion_d: "Falla en los amortiguadores traseros",
      respuesta_correcta: "b",
      explicacion:
        "Mientras que una ligera condensación blanca al arrancar en frío es normal, un humo blanco espeso y dulce con el motor caliente delata paso de refrigerante a los cilindros por daño en la culata.",
      fundamento_legal: "Manual de Referencia ANSV; Guía Técnica Automotriz.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l03-295",
      lote: LOTE,
      nucleo_nombre: "El vehiculo",
      subtema: "mision y desgaste del embrague clutch",
      hecho_canonico_id: "l03-veh-10",
      pregunta:
        "¿Por qué conducir habitualmente con el pie apoyado sobre el pedal de embrague (clutch) es un mal hábito costoso y dañino?",
      opcion_a: "Porque incrementa la presión de aire de las ruedas delanteras",
      opcion_b: "Porque apaga el alternador de forma irreversible",
      opcion_c:
        "Porque genera un patinado microscópico continuo que desgasta prematuramente el disco de embrague y sobrecalienta la balinera (rodamiento de empuje)",
      opcion_d: "Porque vacía el líquido del limpiaparabrisas",
      respuesta_correcta: "c",
      explicacion:
        "El más ligero apoyo del pie sobre el pedal vence la holgura libre, provocando fricción continua entre el disco y el volante de inercia, quemando el material de fricción en pocos miles de kilómetros.",
      fundamento_legal: "Manual de Referencia ANSV sobre buenas prácticas de operación vehicular.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    know({
      id: "cale-l03-296",
      lote: LOTE,
      nucleo_nombre: "El vehiculo",
      subtema: "riesgos de circular en reserva minima de combustible",
      hecho_canonico_id: "l03-veh-11",
      pregunta:
        "¿Qué daño técnico puede sufrir un vehículo moderno si se acostumbra a conducirlo permanentemente con el testigo de reserva de combustible encendido?",
      opcion_a: "Bloqueo de las cerraduras eléctricas de las puertas",
      opcion_b: "Descalibración del velocímetro y odómetro digital",
      opcion_c: "Rotura inmediata de los amortiguadores hidráulicos",
      opcion_d:
        "Sobrecalentamiento y avería prematura de la bomba de combustible sumergida en el tanque, y arrastre de impurezas del fondo que taponan el filtro e inyectores",
      respuesta_correcta: "d",
      explicacion:
        "La bomba de gasolina eléctrica se refrigera y lubrica con el mismo combustible que la rodea. Con nivel mínimo trabaja caliente y succiona sedimentos del fondo que dañan inyectores.",
      fundamento_legal: "Manual de Referencia ANSV sobre preservación del sistema de alimentación.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l03-297",
      lote: LOTE,
      nucleo_nombre: "El vehiculo",
      subtema: "funcion del termostato en refrigeracion",
      hecho_canonico_id: "l03-veh-12",
      pregunta: "¿Cuál es la función del termostato en el sistema de enfriamiento del motor?",
      opcion_a:
        "Regular el paso de líquido refrigerante hacia el radiador para que el motor alcance y mantenga rápidamente su temperatura óptima de funcionamiento",
      opcion_b: "Apagar el motor si la temperatura supera los 50 grados",
      opcion_c: "Medir la temperatura ambiente del aire exterior para el aire acondicionado",
      opcion_d: "Controlar la velocidad de giro de las llantas",
      respuesta_correcta: "a",
      explicacion:
        "El termostato permanece cerrado con el motor frío para que caliente rápido; al alcanzar la temperatura de régimen (unos 90 °C) se abre para que el líquido circule al radiador y no se recaliente.",
      fundamento_legal: "Manual de Referencia ANSV sobre sistemas mecánicos de motor.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l03-298",
      lote: LOTE,
      nucleo_nombre: "El vehiculo",
      subtema: "funcion del catalizador o convertidor catalitico",
      hecho_canonico_id: "l03-veh-13",
      pregunta:
        "¿Qué función cumple el convertidor catalítico (catalizador) en la línea de escape del automóvil?",
      opcion_a: "Aumentar el ruido deportivo del vehículo para alertar a los peatones",
      opcion_b:
        "Transformar mediante reacciones químicas los gases altamente nocivos (monóxido de carbono, hidrocarburos y óxidos de nitrógeno) en vapor de agua, nitrógeno y dióxido de carbono menos dañinos",
      opcion_c: "Reciclar el aceite usado devolviéndolo directamente al cárter",
      opcion_d: "Enfriar los neumáticos traseros con el flujo de aire caliente",
      respuesta_correcta: "b",
      explicacion:
        "El catalizador utiliza metales nobles (platino, paladio, rodio) para convertir químicamente gases venenosos de la combustión en compuestos mucho menos contaminantes antes de salir al aire.",
      fundamento_legal:
        "Manual de Referencia ANSV sobre control ambiental; Resolución 20253040037125.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l03-299",
      lote: LOTE,
      nucleo_nombre: "El vehiculo",
      subtema: "importancia del filtro de aire del motor",
      hecho_canonico_id: "l03-veh-14",
      pregunta:
        "¿Qué consecuencia produce circular con un filtro de aire del motor saturado de polvo y suciedad?",
      opcion_a: "Las luces del tablero se apagan de manera automática",
      opcion_b: "El aire acondicionado congela la cabina de pasajeros al instante",
      opcion_c:
        "El motor no recibe el oxígeno necesario para una combustión eficiente, aumentando el consumo de combustible, perdiendo potencia y elevando las emisiones contaminantes",
      opcion_d: "El tanque de gasolina se llena solo por condensación",
      respuesta_correcta: "c",
      explicacion:
        "El filtro de aire impide que entren impurezas abrasivas a los cilindros. Si se tapa, restringe la respiración del motor provocando mezcla rica, pérdida notoria de fuerza y mayor gasto de gasolina.",
      fundamento_legal: "Manual de Referencia ANSV sobre mantenimiento de admisión de combustible.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    know({
      id: "cale-l03-300",
      lote: LOTE,
      nucleo_nombre: "El vehiculo",
      subtema: "correa de reparticion o distribucion",
      hecho_canonico_id: "l03-veh-15",
      pregunta:
        "¿Qué daño catastrófico ocurre en la mayoría de motores si la correa de repartición o distribución se revienta durante la marcha?",
      opcion_a: "Se desinflan los cuatro neumáticos simultáneamente",
      opcion_b: "El combustible del tanque se evapora instantáneamente",
      opcion_c: "Únicamente se apagan las luces exploradoras sin afectar el motor",
      opcion_d:
        "Se pierde la sincronía entre el cigüeñal y el árbol de levas, provocando que los pistones choquen a gran velocidad contra las válvulas abiertas, doblando válvulas y destruyendo culata y pistones",
      respuesta_correcta: "d",
      explicacion:
        "La rotura de la correa de sincronización descoordina el movimiento de pistones y válvulas; al encontrarse en la cámara se produce un impacto mecánico violento de costo multimillonario.",
      fundamento_legal: "Manual de Referencia ANSV sobre mantenimiento preventivo del tren motriz.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
  ],
};
