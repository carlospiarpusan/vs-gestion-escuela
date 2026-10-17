/* eslint-disable @typescript-eslint/no-require-imports */

const {
  createAttitudeQuestion: att,
  createKnowledgeQuestion: know,
  SOURCES,
} = require("../schema");

const LOTE = "lote-02";

module.exports = {
  lote: LOTE,
  version: 2,
  descripcion:
    "Segundo lote oficial CALE - ANSV con 100 preguntas sobre Intersecciones, Glorietas, Adelantamientos, Señales Preventivas/Informativas y Dirección/Suspensión/Seguridad Pasiva.",
  items: [
    // Actitudes (30)
    att({
      id: "cale-l02-101",
      lote: LOTE,
      subtema: "bloqueo de cruces por congestion",
      hecho_canonico_id: "l02-att-01",
      pregunta:
        "El semáforo le muestra luz verde pero la fila de vehículos adelante está detenida al otro lado del cruce. ¿Qué decisión debe tomar?",
      sentido_clave: "seleccion",
      opcion_a:
        "Detenerse antes de la línea de parada y esperar a que haya espacio libre al otro lado para no bloquear el paso transversal",
      opcion_b:
        "Avanzar y quedar sobre la intersección para asegurar el paso antes del cambio de luz",
      opcion_c: "Tocar la bocina y meterse por el espacio peatonal",
      opcion_d: "Acelerar y pasarse al carril en contravía",
      respuesta_recomendada: "a",
      explicacion:
        "Ingresar a una intersección sin espacio libre de salida colapsa la movilidad transversal y atrapa a peatones y vehículos. La luz verde autoriza el paso solo si el cruce puede despejarse.",
      fundamento_legal: "Ley 769 de 2002, Art. 131, infracción C.03; Manual de Referencia ANSV.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    att({
      id: "cale-l02-102",
      lote: LOTE,
      subtema: "adultos mayores en pasos peatonales",
      hecho_canonico_id: "l02-att-02",
      pregunta:
        "Una persona de la tercera edad cruza lentamente por la cebra peatonal y el semáforo cambia a verde para usted. ¿Cómo debe proceder?",
      sentido_clave: "seleccion",
      opcion_a: "Avanzar rozando a la persona para apurarla",
      opcion_b:
        "Esperar pacientemente con el vehículo detenido hasta que termine de cruzar con total seguridad",
      opcion_c: "Hacer rugir el motor en neutro para advertirle que se apresure",
      opcion_d: "Pitar con insistencia para reclamar su turno de vía",
      respuesta_recomendada: "b",
      explicacion:
        "Los peatones que han iniciado el cruce conservan la prelación hasta llegar al andén seguro, independientemente de que el semáforo vehicular cambie a verde.",
      fundamento_legal:
        "Ley 769 de 2002, Art. 105; Manual de Referencia ANSV sobre usuarios vulnerables.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    att({
      id: "cale-l02-103",
      lote: LOTE,
      subtema: "incorporacion en cremallera",
      hecho_canonico_id: "l02-att-03",
      pregunta:
        "En una reducción de dos carriles a uno por obras, ¿qué actitud facilita la fluidez y previene conflictos?",
      sentido_clave: "seleccion",
      opcion_a: "Acelerar para impedir que cualquier carro del carril cerrado se incorpore",
      opcion_b: "Cerrar los ojos y pegarse a la defensa del auto que va adelante",
      opcion_c:
        "Practicar el principio de 'uno a uno' (cremallera), cediendo el paso alternadamente a un vehículo del carril vecino",
      opcion_d: "Orillarse a pelear con los conductores que intentan ingresar",
      respuesta_recomendada: "c",
      explicacion:
        "El método de incorporación en cremallera (uno y uno) reduce trancones, elimina frenazos bruscos y previene roces laterales en estrechamientos de calzada.",
      fundamento_legal: "Manual de Referencia ANSV sobre comportamiento seguro y convivencia vial.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    att({
      id: "cale-l02-104",
      lote: LOTE,
      subtema: "maniobra holandesa de apertura de puertas",
      hecho_canonico_id: "l02-att-04",
      pregunta:
        "¿Por qué se recomienda abrir la puerta del vehículo con la mano derecha (la más alejada de la manija) al estacionar junto a la acera?",
      sentido_clave: "seleccion",
      opcion_a: "Porque ejerce mayor fuerza mecánica sobre la cerradura",
      opcion_b: "Porque evita que se descargue la batería del automóvil",
      opcion_c: "Porque es una exigencia exclusiva para carros descapotables",
      opcion_d:
        "Porque obliga al cuerpo a girar el torso hacia atrás, permitiendo mirar por el espejo y hacia la calle para no golpear a un ciclista o motociclista",
      respuesta_recomendada: "d",
      explicacion:
        "La técnica holandesa fuerza la rotación del tronco y la mirada hacia el ángulo ciego trasero, evitando el siniestro conocido como 'dooring' (impactar a un ciclista con la puerta abierta).",
      fundamento_legal:
        "Manual de Referencia ANSV sobre convivencia vial con ciclistas y usuarios vulnerables.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    att({
      id: "cale-l02-105",
      lote: LOTE,
      subtema: "renuncia a la prelacion para evitar choque",
      hecho_canonico_id: "l02-att-05",
      pregunta:
        "Usted tiene la vía prioritaria, pero observa que un camión se aproxima al cruce a gran velocidad sin intención de parar. ¿Qué actitud es la correcta?",
      sentido_clave: "seleccion",
      opcion_a:
        "Frenar preventivamente y ceder el paso para preservar la integridad física y evitar una colisión fatal",
      opcion_b: "Acelerar para imponer su derecho de vía legal, confiando en que el camión frenará",
      opcion_c: "Cerrar los ojos y tocar la bocina",
      opcion_d: "Hacer un viraje brusco hacia el andén",
      respuesta_recomendada: "a",
      explicacion:
        "En conducción defensiva la vida siempre está por encima de la prioridad de paso. Tener la razón legal no sirve de nada si se sufre un siniestro mortal.",
      fundamento_legal:
        "Manual de Referencia ANSV sobre conducción defensiva y evaluación del riesgo.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    att({
      id: "cale-l02-106",
      lote: LOTE,
      subtema: "uso obligatorio de lentes formulados",
      hecho_canonico_id: "l02-att-06",
      pregunta:
        "Si en su licencia de conducción figura la restricción de conducir con lentes correctores, ¿cuál es su responsabilidad?",
      sentido_clave: "seleccion",
      opcion_a: "Usarlos únicamente de noche o en carretera abierta",
      opcion_b: "Llevarlos puestos permanentemente cada vez que conduzca cualquier vehículo",
      opcion_c: "Guardarlos en la guantera por si un policía de tránsito los solicita",
      opcion_d: "Prescindir de ellos si siente que ve bien a corta distancia",
      respuesta_recomendada: "b",
      explicacion:
        "Las restricciones médicas de la licencia son de cumplimiento estricto. Conducir sin las gafas formuladas reduce la agudeza visual y la anticipación de riesgos, además de constituir infracción.",
      fundamento_legal: "Ley 769 de 2002, Art. 18; Manual de Referencia ANSV.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    att({
      id: "cale-l02-107",
      lote: LOTE,
      subtema: "paciencia ante buseta detenida",
      hecho_canonico_id: "l02-att-07",
      pregunta:
        "Un bus de servicio público se detiene en su carril para dejar un pasajero. ¿Qué decisión previene un atropello?",
      sentido_clave: "seleccion",
      opcion_a: "Acelerar a fondo para adelantarlo a ciegas por la izquierda",
      opcion_b: "Adelantarlo por la derecha subiendo dos ruedas al andén",
      opcion_c:
        "Detenerse detrás del bus guardando distancia, o adelantar a velocidad muy reducida anticipando que un peatón puede cruzar por delante del bus",
      opcion_d: "Pitarle de manera continua para que no se detenga",
      respuesta_recomendada: "c",
      explicacion:
        "El volumen de un bus oculta completamente a los peatones que bajan e intentan cruzar por delante de él. Rebasar con cautela extrema o esperar salva vidas.",
      fundamento_legal: "Manual de Referencia ANSV sobre puntos ciegos y cruces peatonales.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    att({
      id: "cale-l02-108",
      lote: LOTE,
      subtema: "rechazo a adelantar en curva",
      hecho_canonico_id: "l02-att-08",
      pregunta:
        "En una carretera de montaña va detrás de un camión de carga lenta antes de una curva a la derecha con línea continua. ¿Cuál es la decisión prudente?",
      sentido_clave: "seleccion",
      opcion_a: "Adelantar en plena curva si el camión no echa humo",
      opcion_b: "Adelantar por la berma derecha a toda velocidad",
      opcion_c: "Sacar medio carro al carril opuesto para ver si viene alguien",
      opcion_d:
        "Mantenerse detrás a distancia prudente y esperar pacientemente hasta encontrar una recta con línea segmentada y visibilidad total",
      respuesta_recomendada: "d",
      explicacion:
        "Adelantar en curva sin visibilidad es una de las maniobras más letales en Colombia, pues causa choques frontales con vehículos que descienden en sentido contrario.",
      fundamento_legal: "Ley 769 de 2002, Art. 73; Manual de Señalización Vial 2024.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    att({
      id: "cale-l02-109",
      lote: LOTE,
      subtema: "respeto a personas con coche de bebe",
      hecho_canonico_id: "l02-att-09",
      pregunta:
        "Al doblar en una esquina observa a una persona empujando un coche de bebé sobre el cruce. ¿Cómo debe actuar?",
      sentido_clave: "seleccion",
      opcion_a:
        "Detener la marcha por completo, ceder el paso amablemente y esperar a que el coche y el adulto alcancen la acera opuesta",
      opcion_b: "Avanzar lentamente obligando al peatón a retroceder",
      opcion_c: "Hacer sonar la bocina para que apuren el paso",
      opcion_d: "Girar rápidamente cortando la esquina por detrás del coche",
      respuesta_recomendada: "a",
      explicacion:
        "Los coches de bebé colocan al menor en la línea frontal del peligro. La detención total del automotor garantiza la protección absoluta de la madre o acompañante y del bebé.",
      fundamento_legal: "Ley 769 de 2002, Art. 63 y Art. 105; Manual de Referencia ANSV.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    att({
      id: "cale-l02-110",
      lote: LOTE,
      subtema: "mantenimiento antes de salir a carretera",
      hecho_canonico_id: "l02-att-10",
      pregunta:
        "Va a emprender un viaje largo de vacaciones con su familia. ¿Qué actitud refleja mayor responsabilidad técnica?",
      sentido_clave: "seleccion",
      opcion_a: "Confiar en que el vehículo no fallará porque no ha molestado en ciudad",
      opcion_b:
        "Realizar una inspección preoperacional exhaustiva de frenos, llantas, fluidos, luces y equipo de carretera antes de encender el motor",
      opcion_c:
        "Revisar los niveles de aceite únicamente cuando se encienda un testigo en el tablero",
      opcion_d: "Comprar un galón de agua para llevar en la cabina y no revisar nada más",
      respuesta_recomendada: "b",
      explicacion:
        "Las exigencias mecánicas de la carretera (velocidad sostenida, temperatura, pendientes) multiplican el estrés del vehículo. El mantenimiento preventivo evita siniestros y varadas peligrosas.",
      fundamento_legal: "Manual de Referencia ANSV sobre inspección técnica preoperacional.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    att({
      id: "cale-l02-111",
      lote: LOTE,
      subtema: "presion de vehiculo trasero pegado",
      hecho_canonico_id: "l02-att-11",
      pregunta:
        "Si en carretera un vehículo se le pega peligrosamente a la parte trasera presionándolo para que corra más, ¿qué debe hacer?",
      sentido_clave: "seleccion",
      opcion_a: "Pisar bruscamente el pedal de freno para asustarlo y obligarlo a despegarse",
      opcion_b: "Acelerar al máximo para perderlo de vista",
      opcion_c:
        "Mantener la calma, no aumentar la velocidad más allá del límite, encender la direccional derecha y facilitarle el adelantamiento en cuanto sea seguro",
      opcion_d: "Activar las luces antiniebla traseras y frenar con el freno de mano",
      respuesta_recomendada: "c",
      explicacion:
        "Frenar en seco provoca una colisión por alcance segura. Facilitar el sobrepaso al conductor impaciente elimina el peligro de su cercanía sin engancharse en disputas viales.",
      fundamento_legal: "Manual de Referencia ANSV sobre conducción defensiva y hostilidad vial.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    att({
      id: "cale-l02-112",
      lote: LOTE,
      subtema: "convivencia con vehiculos de emergencia",
      hecho_canonico_id: "l02-att-12",
      pregunta:
        "Escucha sirenas de una ambulancia que se aproxima detrás en una avenida congestionada. ¿Cuál es su deber ético y legal?",
      sentido_clave: "seleccion",
      opcion_a: "Quedarse inmóvil en su carril porque no hay espacio visible",
      opcion_b: "Pasarse el semáforo en rojo a 60 km/h sin mirar",
      opcion_c: "Acelerar delante de la ambulancia para aprovechar que los demás le abren paso",
      opcion_d:
        "Maniobrar con prudencia hacia el costado derecho o izquierdo de la calzada para abrir un pasillo central despejado",
      respuesta_recomendada: "d",
      explicacion:
        "Facilitar el paso a vehículos de emergencia salva vidas. Los conductores deben orillarse con seguridad hacia los extremos de la calzada para crear el 'carril de emergencia' central.",
      fundamento_legal: "Ley 769 de 2002, Art. 64; Manual de Referencia ANSV.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    att({
      id: "cale-l02-113",
      lote: LOTE,
      subtema: "cuidado con mascotas en zonas residenciales",
      hecho_canonico_id: "l02-att-13",
      pregunta:
        "En una calle barrial observa a un perro suelto trotando cerca del borde de la acera. ¿Qué actitud es la indicada?",
      sentido_clave: "seleccion",
      opcion_a:
        "Moderar la velocidad, cubrir el freno y prever una trayectoria evasiva controlada por si el animal cruza intempestivamente",
      opcion_b: "Acelerar para asustar al animal antes de que baje a la calzada",
      opcion_c: "Pitarle a medio metro para que huya",
      opcion_d: "Ignorar la situación porque los animales siempre esquivan a los carros",
      respuesta_recomendada: "a",
      explicacion:
        "Los animales reaccionan de forma impredecible ante ruidos o estímulos. Bajar la velocidad previene tanto el atropello del animal como maniobras violentas que causen choques contra postes u otros autos.",
      fundamento_legal: "Manual de Referencia ANSV sobre factores de riesgo en el entorno.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    att({
      id: "cale-l02-114",
      lote: LOTE,
      subtema: "prudencia en charcos junto a peatones",
      hecho_canonico_id: "l02-att-14",
      pregunta:
        "En una vía urbana hay acumulación de agua lluvia junto al andén por donde caminan varios peatones. ¿Cómo debe pasar?",
      sentido_clave: "seleccion",
      opcion_a: "A velocidad normal porque el agua es inevitable en invierno",
      opcion_b:
        "Reduciendo notablemente la velocidad para no salpicar agua ni barro sobre los peatones y evitar hidroplaneo",
      opcion_c: "Acelerando para que el agua salga proyectada con fuerza hacia la acera",
      opcion_d: "Subiéndose al andén para esquivar el charco",
      respuesta_recomendada: "b",
      explicacion:
        "Salpicar a los peatones denota falta de empatía ciudadana y además entrar rápido a un charco profundo puede desviar la dirección del vehículo o provocar hidroplaneo.",
      fundamento_legal:
        "Manual de Referencia ANSV sobre convivencia ciudadana y conducción en lluvia.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    att({
      id: "cale-l02-115",
      lote: LOTE,
      subtema: "respeto a cupos de discapacidad",
      hecho_canonico_id: "l02-att-15",
      pregunta:
        "Llega a un centro comercial y el único parqueadero libre está demarcado en azul con el símbolo de accesibilidad para personas con discapacidad. No tiene discapacidad ni transporta a nadie que la tenga. ¿Qué debe hacer?",
      sentido_clave: "seleccion",
      opcion_a: "Parquear allí si la diligencia tardará menos de cinco minutos",
      opcion_b: "Ocupar el lugar dejando las luces de parqueo encendidas",
      opcion_c:
        "Respetar el espacio reservado y continuar buscando un parqueadero ordinario, sin importar el tiempo adicional que le tome",
      opcion_d: "Parquear ocupando dos cupos normales para compensar",
      respuesta_recomendada: "c",
      explicacion:
        "Los espacios azules son un derecho de accesibilidad universal para personas con movilidad reducida. Usurparlos vulnera la equidad social y acarrea sanciones de tránsito.",
      fundamento_legal:
        "Ley 769 de 2002, Art. 131, infracción C.02; Manual de Señalización Vial 2024.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    att({
      id: "cale-l02-116",
      lote: LOTE,
      subtema: "distraccion por discusion acalorada",
      hecho_canonico_id: "l02-att-16",
      pregunta:
        "Durante la marcha se desata una discusión intensa con uno de los pasajeros que le genera enojo y descontrol. ¿Cuál es la decisión segura?",
      sentido_clave: "seleccion",
      opcion_a: "Acelerar y manejar agresivamente para desahogar la molestia",
      opcion_b: "Cerrar los ojos y pedir silencio a los gritos mientras conduce",
      opcion_c: "Continuar conduciendo mirando al pasajero a la cara para defender su punto",
      opcion_d:
        "Buscar un sitio seguro y autorizado para detener el vehículo, calmar los ánimos y solo reiniciar la marcha cuando recupere la serenidad mental",
      respuesta_recomendada: "d",
      explicacion:
        "La alteración emocional extrema bloquea la capacidad de evaluar riesgos viales. Detener el carro elimina el peligro de conducir con la mente nublada por la ira.",
      fundamento_legal: "Manual de Referencia ANSV sobre estados emocionales y conducción.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    att({
      id: "cale-l02-117",
      lote: LOTE,
      subtema: "atencion al circular junto a ciclorruta",
      hecho_canonico_id: "l02-att-17",
      pregunta:
        "Va a girar a la derecha en una intersección por donde cruza una ciclorruta paralela. ¿Qué comportamiento es indispensable?",
      sentido_clave: "seleccion",
      opcion_a:
        "Detenerse antes del cruce, mirar detenidamente en ambos sentidos de la ciclorruta y dar prelación a los ciclistas antes de completar el viraje",
      opcion_b:
        "Girar rápidamente cortando el paso de las bicicletas porque los autos tienen motor",
      opcion_c: "Tocar la bocina y girar lentamente sin detenerse",
      opcion_d: "Bloquear la ciclorruta con la trompa del auto para mirar el tráfico",
      respuesta_recomendada: "a",
      explicacion:
        "Al cambiar de dirección, el conductor intercepta la trayectoria de la ciclorruta. Los ciclistas tienen prelación de paso sobre los vehículos automotores que giran.",
      fundamento_legal: "Ley 1811 de 2016; Ley 769 de 2002, Art. 63 y Art. 66.",
      source: SOURCES.LEY_769,
      dificultad: "media",
    }),
    att({
      id: "cale-l02-118",
      lote: LOTE,
      subtema: "actitud ante ciclomotores y patinetas",
      hecho_canonico_id: "l02-att-18",
      pregunta:
        "¿Cómo debe comportarse un automovilista frente a los usuarios de patinetas y bicicletas eléctricas en el entorno urbano?",
      sentido_clave: "seleccion",
      opcion_a: "Ignorarlos porque no están matriculados en el RUNT",
      opcion_b:
        "Tratarlos como actores viales legítimos y vulnerables, conservando distancia prudente y evitando maniobras de hostigamiento o encierro",
      opcion_c: "Cerrarles el paso para obligarlos a bajarse a caminar",
      opcion_d: "Adelantarlos rozando sus hombros para que sientan la presión de la calle",
      respuesta_recomendada: "b",
      explicacion:
        "Los usuarios de micromovilidad están reconocidos por la ley colombiana (Ley 2251 de 2022) y son altamente vulnerables ante un impacto por carecer de carrocería protectora.",
      fundamento_legal: "Ley 2251 de 2022, Art. 106; Manual de Referencia ANSV.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    att({
      id: "cale-l02-119",
      lote: LOTE,
      subtema: "reconocimiento de error propio",
      hecho_canonico_id: "l02-att-19",
      pregunta:
        "Si comete un error involuntario de conducción (como apagar el motor o pasarse un carril) que incomoda a otro conductor, ¿cuál es la actitud adecuada?",
      sentido_clave: "seleccion",
      opcion_a: "Acelerar a fondo y huir del lugar cometiendo más infracciones",
      opcion_b: "Bajar la ventana y agredir verbalmente al otro para no mostrar debilidad",
      opcion_c:
        "Hacer un gesto de disculpa sereno con la mano, corregir la maniobra con calma y evitar discusiones estériles",
      opcion_d: "Quedarse atravesado en medio de la calle lamentándose",
      respuesta_recomendada: "c",
      explicacion:
        "La cortesía y el reconocimiento maduro de los errores desescalan de inmediato la tensión vial y promueven una cultura de convivencia y paz en las carreteras.",
      fundamento_legal: "Manual de Referencia ANSV sobre inteligencia emocional al volante.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    att({
      id: "cale-l02-120",
      lote: LOTE,
      subtema: "conciencia sobre el punto ciego de camiones",
      hecho_canonico_id: "l02-att-20",
      pregunta:
        "Al circular junto a una tractomula de gran porte en carretera, ¿qué decisión refleja una lectura adecuada del riesgo?",
      sentido_clave: "seleccion",
      opcion_a: "Permanecer pegado a su costado derecho de manera prolongada",
      opcion_b: "Cambiar de carril bruscamente justo delante de su cabina",
      opcion_c: "Manejar pegado a su parachoques trasero para aprovechar la succión aerodinámica",
      opcion_d:
        "Evitar ubicarse en sus puntos ciegos laterales y traseros; si va a adelantarlo, hacerlo con decisión y sin titubeos cuando haya visibilidad",
      respuesta_recomendada: "d",
      explicacion:
        "Los vehículos articulados tienen enormes ángulos muertos en los que un auto particular desaparece de la vista del conductor. Permanecer a su costado es una trampa mortal.",
      fundamento_legal:
        "Manual de Referencia ANSV sobre convivencia con vehículos de carga pesada.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    att({
      id: "cale-l02-121",
      lote: LOTE,
      subtema: "solidaridad con peatones bajo lluvia",
      hecho_canonico_id: "l02-att-21",
      pregunta:
        "En una tarde de lluvia torrencial, varios peatones esperan en una esquina empapándose porque ningún auto se detiene. ¿Qué debe hacer un conductor empático?",
      sentido_clave: "seleccion",
      opcion_a:
        "Detenerse con prudencia, señalizar a los vehículos de atrás y cederles el paso seguro para que alcancen el resguardo del andén opuesto",
      opcion_b: "Acelerar para no mojarse su propio carro",
      opcion_c: "Tocar la bocina al pasar junto a ellos",
      opcion_d: "Hacer cambio de luces para burlarse de su situación",
      respuesta_recomendada: "a",
      explicacion:
        "Bajo condiciones climáticas difíciles, los peatones sufren las mayores penurias. Cederles el paso con seguridad vial demuestra solidaridad humana y respeto por la vida.",
      fundamento_legal: "Manual de Referencia ANSV sobre solidaridad y protección del peatón.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    att({
      id: "cale-l02-122",
      lote: LOTE,
      subtema: "evitar estacionar en paraderos de buses",
      hecho_canonico_id: "l02-att-22",
      pregunta:
        "Necesita hacer una llamada telefónica urgente y observa la bahía de un paradero de transporte público vacía. ¿Cómo debe proceder?",
      sentido_clave: "seleccion",
      opcion_a: "Parquear allí dejando las luces estacionarias prendidas mientras habla",
      opcion_b:
        "Buscar un parqueadero autorizado o una calle secundaria donde esté permitido estacionar, dejando el paradero totalmente libre para los buses y usuarios",
      opcion_c: "Bloquear la entrada del paradero para que nadie más entre",
      opcion_d: "Estacionar sobre la acera frente al paradero",
      respuesta_recomendada: "b",
      explicacion:
        "Ocupar paraderos de transporte público obliga a los buses a recoger pasajeros en medio de la calzada, exponiéndolos al atropello y generando congestión severa.",
      fundamento_legal: "Ley 769 de 2002, Art. 75 y Art. 76; Manual de Señalización Vial 2024.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    att({
      id: "cale-l02-123",
      lote: LOTE,
      subtema: "prudencia ante ninos en bicicletas",
      hecho_canonico_id: "l02-att-23",
      pregunta:
        "En una vía barrial transita un niño en bicicleta tambaleándose ligeramente. ¿Qué actitud preventiva debe tomar?",
      sentido_clave: "seleccion",
      opcion_a: "Adelantarlo a velocidad para dejarlo atrás rápidamente",
      opcion_b: "Pitarle fuertemente para que se caiga a un lado",
      opcion_c:
        "Disminuir la velocidad al mínimo, aumentar la separación lateral a más de dos metros y esperar el momento oportuno para pasarlo sin asustarlo",
      opcion_d: "Pasar rozando sus ruedas para que aprenda a mantener el equilibrio",
      respuesta_recomendada: "c",
      explicacion:
        "Los niños en bicicleta carecen de estabilidad motriz perfecta y pueden caerse hacia el centro de la calle ante un bache o sobresalto. Dejar un margen amplio previene el atropello.",
      fundamento_legal: "Manual de Referencia ANSV sobre protección de menores y ciclistas.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    att({
      id: "cale-l02-124",
      lote: LOTE,
      subtema: "prudencia en cimas de cuestas",
      hecho_canonico_id: "l02-att-24",
      pregunta:
        "Al aproximarse a la cima de una pendiente donde la visibilidad sobre la calzada contraria es nula, ¿qué conducta debe asumir?",
      sentido_clave: "seleccion",
      opcion_a: "Adelantar al vehículo que va adelante antes de llegar al punto más alto",
      opcion_b: "Colocar el vehículo en punto muerto",
      opcion_c: "Conducir por el centro de la calzada utilizando el pito continuo",
      opcion_d:
        "Ceñirse estrictamente a su carril derecho, reducir la velocidad y abstenerse de cualquier maniobra invasiva del carril contrario",
      respuesta_recomendada: "d",
      explicacion:
        "En las cimas de cuestas no hay distancia de visibilidad de parada frente a vehículos que vengan en contra. Mantenerse en su carril a velocidad moderada es vital.",
      fundamento_legal: "Ley 769 de 2002, Art. 73; Manual de Referencia ANSV.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    att({
      id: "cale-l02-125",
      lote: LOTE,
      subtema: "respeto a vehiculos de traccion animal",
      hecho_canonico_id: "l02-att-25",
      pregunta:
        "En una carretera secundaria rural se encuentra detrás de una carreta halada por un caballo. ¿Cómo debe rebasarla?",
      sentido_clave: "seleccion",
      opcion_a:
        "Reducir la velocidad, no tocar la bocina para no asustar al animal, y adelantar dejando un margen lateral amplio con suavidad",
      opcion_b: "Pegarse a la cola del caballo y sonar la bocina con estruendo",
      opcion_c: "Gritarle al cochero para que se tire a la cuneta",
      opcion_d: "Pasar a toda velocidad levantando polvo",
      respuesta_recomendada: "a",
      explicacion:
        "Un caballo asustado por la bocina puede desbocarse, patear hacia atrás o volcar la carreta sobre la vía. El sobrepaso debe ser calmado, silencioso y con amplio espacio lateral.",
      fundamento_legal: "Ley 769 de 2002, Art. 98; Manual de Referencia ANSV.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    att({
      id: "cale-l02-126",
      lote: LOTE,
      subtema: "rechazo al zigzagueo urbano",
      hecho_canonico_id: "l02-att-26",
      pregunta:
        "¿Por qué cambiar repetidamente de carril en zigzag durante horas pico es una conducta reprochable y peligrosa?",
      sentido_clave: "seleccion",
      opcion_a: "Porque desgasta la pintura de los costados del automóvil",
      opcion_b:
        "Porque genera continuos puntos ciegos, aumenta los frenazos en cadena y no aporta ninguna ganancia real de tiempo",
      opcion_c: "Porque es una maniobra permitida solo para taxis",
      opcion_d: "Porque incrementa el frío dentro del habitáculo",
      respuesta_recomendada: "b",
      explicacion:
        "El zigzagueo entre carriles desestabiliza el flujo vehicular, multiplica el riesgo de choques laterales por puntos ciegos y genera el 'efecto acordeón' en el tráfico.",
      fundamento_legal:
        "Manual de Referencia ANSV sobre comportamiento seguro y cambios de carril.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    att({
      id: "cale-l02-127",
      lote: LOTE,
      subtema: "actitud ante fallo de semaforo",
      hecho_canonico_id: "l02-att-27",
      pregunta:
        "Llega a un cruce concurrido donde el semáforo está totalmente apagado por un corte de energía. ¿Qué actitud debe guiar su proceder?",
      sentido_clave: "seleccion",
      opcion_a: "Acelerar y pasar primero que los demás porque el semáforo no funciona",
      opcion_b: "Tocar el pito incesantemente para exigir el paso libre",
      opcion_c:
        "Tratar la intersección como un cruce no regulado, detenerse, aplicar la regla de la derecha y ceder el paso con máxima prudencia",
      opcion_d: "Quedarse inmóvil esperando a que regrese la energía eléctrica",
      respuesta_recomendada: "c",
      explicacion:
        "Ante un semáforo fuera de servicio, la intersección pasa a regirse por las normas generales de prelación: máxima precaución, detención previa y paso alternado cediendo a la derecha.",
      fundamento_legal: "Ley 769 de 2002, Art. 70; Manual de Referencia ANSV.",
      source: SOURCES.LEY_769,
      dificultad: "media",
    }),
    att({
      id: "cale-l02-128",
      lote: LOTE,
      subtema: "responsabilidad en el uso de luces altas",
      hecho_canonico_id: "l02-att-28",
      pregunta:
        "Va por carretera oscura con luces plenas (altas) y divisa un carro que viene en sentido contrario a 300 metros. ¿Cuándo debe cambiar a luces bajas?",
      sentido_clave: "seleccion",
      opcion_a: "Cuando el otro conductor le haga cambio de luces reclamándole",
      opcion_b: "Nunca, porque el que apaga las altas pierde visibilidad",
      opcion_c: "Solo cuando los dos carros se crucen de frente",
      opcion_d:
        "De inmediato, por iniciativa propia y antes de los 200 metros, para no encandilar la vista del otro conductor",
      respuesta_recomendada: "d",
      explicacion:
        "El cambio a luces bajas debe ser preventivo y espontáneo a mínimo 200 metros de distancia, evitando cegar al conductor contrario y protegiendo a ambos automotores de una colisión frontal.",
      fundamento_legal: "Ley 769 de 2002, Art. 86; Manual de Señalización Vial 2024.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    att({
      id: "cale-l02-129",
      lote: LOTE,
      subtema: "verificacion de seguros y puertas",
      hecho_canonico_id: "l02-att-29",
      pregunta:
        "Al iniciar la marcha, ¿por qué es importante verificar que todas las puertas estén bien cerradas con seguro y los cinturones abrochados?",
      sentido_clave: "seleccion",
      opcion_a:
        "Para evitar la apertura accidental de puertas en marcha y garantizar la retención de los ocupantes ante cualquier maniobra evasiva",
      opcion_b: "Para que no se escape el aire acondicionado del carro",
      opcion_c: "Para que la alarma no suene al llegar al destino",
      opcion_d: "Para mejorar la velocidad máxima en recta",
      respuesta_recomendada: "a",
      explicacion:
        "Asegurar puertas y cinturones antes de rodar garantiza que nadie salga expulsado del habitáculo en caso de impacto o giro brusco, lo cual constituye la mayor causa de muerte en choques.",
      fundamento_legal: "Manual de Referencia ANSV sobre seguridad del habitáculo y ocupantes.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    att({
      id: "cale-l02-130",
      lote: LOTE,
      subtema: "cultura de no invadir andenes",
      hecho_canonico_id: "l02-att-30",
      pregunta:
        "Para evitar un trancón corto, varios conductores se suben a la acera peatonal con sus vehículos. ¿Cuál debe ser su actitud?",
      sentido_clave: "seleccion",
      opcion_a: "Seguirlos para no quedarse atrás en la congestión",
      opcion_b:
        "Rechazar categóricamente esa conducta, respetando el andén como espacio sagrado y exclusivo de los peatones",
      opcion_c: "Subir solo dos ruedas para dejar pasar a los que vienen detrás",
      opcion_d: "Pitar a los peatones que caminan por la acera para que se aparten",
      respuesta_recomendada: "b",
      explicacion:
        "El andén es el espacio vital de protección de los peatones. Invadirlo con automotores es una falta grave de cultura ciudadana y una infracción gravosa (D.05) que causa muertes peatonales.",
      fundamento_legal: "Ley 769 de 2002, Art. 131, infracción D.05; Manual ANSV.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    // Movilidad segura y sostenible (25)
    know({
      id: "cale-l02-131",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "subviraje en curvas",
      hecho_canonico_id: "l02-mov-01",
      pregunta:
        "¿En qué consiste el fenómeno de 'subviraje' (irse de trompa) al tomar una curva y cómo se corrige adecuadamente?",
      opcion_a:
        "Las ruedas traseras pierden agarre y el carro gira de más hacia el interior; se corrige acelerando a fondo",
      opcion_b:
        "El volante se bloquea por falta de líquido hidráulico; se corrige jalando el freno de mano",
      opcion_c:
        "Las ruedas delanteras pierden adherencia y el vehículo tiende a seguir recto hacia el exterior de la curva; se corrige soltando suavemente el acelerador sin frenar en seco",
      opcion_d: "El auto se inclina sobre dos ruedas únicamente",
      respuesta_correcta: "c",
      explicacion:
        "En el subviraje el eje delantero patina y no obedece al volante. La solución técnica es levantar el pie del acelerador para transferir peso a las ruedas delanteras y recuperar tracción.",
      fundamento_legal: "Manual de Referencia ANSV sobre dinámica vehicular y control de derrapes.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "dificil",
    }),
    know({
      id: "cale-l02-132",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "sobreviraje en curvas",
      hecho_canonico_id: "l02-mov-02",
      pregunta:
        "¿Qué es el 'sobreviraje' (irse de cola o trompo) y cuál es la maniobra recomendada para mantener el control?",
      opcion_a: "El timón gira solo hacia el lado contrario",
      opcion_b:
        "El vehículo frena automáticamente gracias al sistema ABS sin que el conductor haga nada",
      opcion_c: "El motor se apaga por exceso de revoluciones",
      opcion_d:
        "Las ruedas traseras pierden tracción y la cola del vehículo derrapa hacia el exterior; se corrige haciendo contravolante suave en la dirección del derrape sin clavar los frenos",
      respuesta_correcta: "d",
      explicacion:
        "El sobreviraje ocurre cuando el eje trasero derrapa. Para corregirlo se aplica contravolante (girar el timón suavemente hacia el lado adonde se desplaza la cola) sin pisar el pedal de freno a fondo.",
      fundamento_legal: "Manual de Referencia ANSV sobre física aplicada y control del derrape.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "dificil",
    }),
    know({
      id: "cale-l02-133",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "fases del adelantamiento",
      hecho_canonico_id: "l02-mov-03",
      pregunta:
        "¿Cuáles son las tres fases consecutivas que componen una maniobra de adelantamiento seguro?",
      opcion_a:
        "Preparación y comprobación de seguridad, ejecución del sobrepaso con señalización, y reincorporación gradual al carril original",
      opcion_b: "Aceleración, frenado y parqueo",
      opcion_c: "Bocinazo, invasión del andén y detención",
      opcion_d: "Giro en U, reversa y aceleración",
      respuesta_correcta: "a",
      explicacion:
        "El adelantamiento reglamentario consta de: 1. Fase de preparación (visibilidad y espejos), 2. Fase de ejecución (direccional izquierda y rebase con holgura) y 3. Fase de retorno (direccional derecha y regreso suave).",
      fundamento_legal: "Ley 769 de 2002, Art. 73; Manual de Referencia ANSV.",
      source: SOURCES.LEY_769,
      dificultad: "media",
    }),
    know({
      id: "cale-l02-134",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "zonas no-zone de camiones",
      hecho_canonico_id: "l02-mov-04",
      pregunta:
        "¿Qué regla de oro ayuda a saber si su automóvil se encuentra dentro de los puntos ciegos de un camión pesado que circula adelante?",
      opcion_a: "Si el camión echa humo negro, usted está visible",
      opcion_b:
        "Si usted no puede ver la cara o los ojos del conductor en los espejos laterales del camión, él tampoco puede verlo a usted",
      opcion_c: "Si usted puede leer la placa del camión, está en zona segura",
      opcion_d: "Los camiones pesados no tienen puntos ciegos gracias a sus retrovisores gigantes",
      respuesta_correcta: "b",
      explicacion:
        "La visibilidad óptica es recíproca. Si desde su posición no divisa el rostro del camionero en sus espejos exteriores, usted se encuentra en una de sus amplias zonas ciegas ('No-Zone').",
      fundamento_legal: "Manual de Referencia ANSV sobre convivencia con vehículos de carga.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    know({
      id: "cale-l02-135",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "distancia lateral ciclistas ley 1811",
      hecho_canonico_id: "l02-mov-05",
      pregunta:
        "Conforme a la Ley 1811 de 2016, ¿cuál es la distancia lateral mínima que debe conservar un vehículo automotor al sobrepasar a un ciclista?",
      opcion_a: "Medio metro (0,5 metros)",
      opcion_b: "Dos metros y medio en ciudad y cinco en carretera",
      opcion_c: "Al menos un metro y medio (1,5 metros)",
      opcion_d: "Treinta centímetros si el ciclista va con chaleco reflectivo",
      respuesta_correcta: "c",
      explicacion:
        "El artículo 10 de la Ley 1811 de 2016 exige dejar un espacio lateral mínimo de 1,5 metros para amortiguar el efecto succión del vehículo y proteger al ciclista ante baches o vientos.",
      fundamento_legal: "Ley 1811 de 2016, Art. 10; Ley 769 de 2002, Art. 60.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    know({
      id: "cale-l02-136",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "eleccion de carril en glorieta",
      hecho_canonico_id: "l02-mov-06",
      pregunta:
        "Al ingresar a una glorieta de dos carriles, si va a tomar la primera o segunda salida (seguir de frente), ¿por qué carril debe circular?",
      opcion_a: "Por el carril interior (izquierdo)",
      opcion_b: "Por la berma interior de la rotonda",
      opcion_c: "En diagonal cortando ambos carriles",
      opcion_d: "Por el carril exterior (derecho) de la calzada anular",
      respuesta_correcta: "d",
      explicacion:
        "Para salir de inmediato o continuar de frente se usa el carril exterior derecho. El carril interior izquierdo se reserva para quienes van a girar a la izquierda (tercera salida) o realizar un retorno en U.",
      fundamento_legal: "Manual de Referencia ANSV sobre intersecciones giratorias y glorietas.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l02-137",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "efecto tunel por velocidad",
      hecho_canonico_id: "l02-mov-07",
      pregunta:
        "¿Qué alteración perceptiva experimenta el campo visual del conductor a medida que aumenta la velocidad de marcha?",
      opcion_a:
        "Se produce el efecto túnel: el campo visual se estrecha progresivamente hacia el centro, perdiendo nitidez sobre los laterales",
      opcion_b: "El campo visual se amplía hasta permitir ver los costados sin mover la cabeza",
      opcion_c: "Los colores de las señales se perciben más brillantes e intensos",
      opcion_d: "Se incrementa la capacidad de calcular la velocidad de los peatones",
      respuesta_correcta: "a",
      explicacion:
        "A 40 km/h el campo visual es de unos 100 grados; a 100 km/h se reduce a menos de 40 grados (efecto túnel), haciendo prácticamente invisibles a peatones y ciclistas en los bordes.",
      fundamento_legal: "Manual de Referencia ANSV sobre velocidad y capacidad perceptiva.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l02-138",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "interseccion con visibilidad tapada",
      hecho_canonico_id: "l02-mov-08",
      pregunta:
        "Al aproximarse a un cruce donde una camioneta estacionada le impide ver si viene tráfico por la transversal, ¿qué técnica debe aplicar?",
      opcion_a: "Acelerar para atravesar la boca de la calle lo más rápido posible",
      opcion_b:
        "Detenerse, asomar muy lentamente la parte delantera del vehículo centímetro a centímetro hasta lograr contacto visual claro, y solo avanzar si no hay peligro",
      opcion_c: "Pitar una sola vez y mandarse de una",
      opcion_d: "Dar marcha atrás y regresar en contravía",
      respuesta_correcta: "b",
      explicacion:
        "La técnica del asomo progresivo ('centímetro a centímetro') permite ganar ángulo de visión sin poner en riesgo la trompa del auto ni invadir la trayectoria de la vía transversal.",
      fundamento_legal:
        "Manual de Referencia ANSV sobre conducción preventiva en cruces con visibilidad limitada.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l02-139",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "giro amplio de tractomulas",
      hecho_canonico_id: "l02-mov-09",
      pregunta:
        "Un camión articulado va a girar a la derecha en una esquina y primero se abre hacia la izquierda ocupando parte del carril vecino. ¿Por qué lo hace?",
      opcion_a: "Porque el conductor se equivocó de ruta",
      opcion_b: "Para competir por la vía contra los vehículos particulares",
      opcion_c:
        "Porque necesita radio de giro amplio para evitar que las ruedas del remolque se suban al andén o aplasten a peatones en la esquina",
      opcion_d: "Porque está prohibido girar a la derecha en camión",
      respuesta_correcta: "c",
      explicacion:
        "Los vehículos largos sufren el fenómeno de 'corte de trayectoria': las ruedas traseras viajan por un radio más cerrado que las delanteras. Nunca debe intentarse rebasar por la derecha a un camión que gira.",
      fundamento_legal: "Manual de Referencia ANSV sobre convivencia con vehículos pesados.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l02-140",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "frenada en recta antes de curva",
      hecho_canonico_id: "l02-mov-10",
      pregunta:
        "¿Por qué toda desaceleración y reducción de marchas debe completarse en línea recta antes de iniciar el giro del volante en una curva?",
      opcion_a: "Para que no se bloquee el sistema de calefacción",
      opcion_b: "Para evitar que la gasolina se derrame dentro del tanque",
      opcion_c: "Porque la ley prohíbe el uso de la caja de cambios en las curvas",
      opcion_d:
        "Porque las llantas tienen mayor capacidad de adherencia longitudinal cuando están rectas que cuando están soportando fuerzas laterales de giro",
      respuesta_correcta: "d",
      explicacion:
        "El círculo de adherencia de la llanta es finito: si se le exige frenar fuerte y girar al mismo tiempo, el neumático se satura y derrapa. Separar frenada y giro maximiza la seguridad.",
      fundamento_legal: "Manual de Referencia ANSV sobre física de la adherencia en curvas.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "dificil",
    }),
    know({
      id: "cale-l02-141",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "incorporacion a carril de aceleracion",
      hecho_canonico_id: "l02-mov-11",
      pregunta: "¿Cuál es la función del carril de aceleración en una autopista o vía rápida?",
      opcion_a:
        "Permitir al conductor aumentar la velocidad progresivamente hasta igualar la del flujo principal para incorporarse en un hueco sin obligar a frenar a otros",
      opcion_b: "Servir de zona de parqueo provisional para cambiar llantas",
      opcion_c:
        "Detenerse en seco al inicio del carril y esperar a que la vía quede totalmente vacía",
      opcion_d: "Adelantar por la derecha a los vehículos de la autopista",
      respuesta_correcta: "a",
      explicacion:
        "El carril de aceleración está diseñado para nivelar la velocidad del vehículo entrante con la de los que ya circulan por la vía principal, logrando una sincronización fluida y sin frenazos.",
      fundamento_legal: "Manual de Referencia ANSV sobre vías rápidas e incorporaciones.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l02-142",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "uso del carril de desaceleracion",
      hecho_canonico_id: "l02-mov-12",
      pregunta:
        "Para salir de una autopista a través de un carril de desaceleración, ¿cuál es el procedimiento correcto?",
      opcion_a:
        "Frenar fuertemente sobre el carril central de la autopista antes de entrar a la salida",
      opcion_b:
        "Entrar al carril de desaceleración sin frenar bruscamente y reducir la velocidad una vez que todo el vehículo esté dentro de él",
      opcion_c: "Poner reversa si se pasó la salida unos metros",
      opcion_d: "Apagar las luces direccionales para no confundir a los demás",
      respuesta_correcta: "b",
      explicacion:
        "Frenar en la autopista antes de ingresar al carril de salida genera colisiones por alcance. Se debe mantener la marcha, entrar limpiamente a la vía de desaceleración y frenar allí.",
      fundamento_legal: "Manual de Referencia ANSV sobre maniobras en vías de alta velocidad.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l02-143",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "adelantamiento prohibido en puentes",
      hecho_canonico_id: "l02-mov-13",
      pregunta:
        "¿Por qué está estrictamente prohibido adelantar en puentes, viaductos y túneles de calzada única?",
      opcion_a: "Porque el eco del motor aturde a los conductores",
      opcion_b: "Porque el peso de dos vehículos en paralelo sobrepasa la resistencia del puente",
      opcion_c:
        "Porque la calzada suele ser estrecha, carece de bermas de escape laterales y no hay margen de maniobra ante un imprevisto",
      opcion_d: "Porque los puentes solo están diseñados para el paso de peatones",
      respuesta_correcta: "c",
      explicacion:
        "Los puentes y túneles son infraestructuras rígidas con barreras y muros a los lados sin zonas de escape. Cualquier roce o error en un adelantamiento desencadena siniestros catastróficos.",
      fundamento_legal: "Ley 769 de 2002, Art. 73; Manual de Referencia ANSV.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    know({
      id: "cale-l02-144",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "peralte de una curva",
      hecho_canonico_id: "l02-mov-14",
      pregunta:
        "¿Qué es el peralte de una curva en la infraestructura vial y qué beneficio aporta a la seguridad?",
      opcion_a: "Un reductor de velocidad pintado con líneas amarillas",
      opcion_b: "La profundidad de las cunetas de drenaje de agua",
      opcion_c: "El muro de contención metálico ubicado en el borde de la vía",
      opcion_d:
        "La inclinación transversal dada a la calzada hacia el interior de la curva para contrarrestar parte de la fuerza centrífuga que empuja al auto hacia afuera",
      respuesta_correcta: "d",
      explicacion:
        "El peralte es la inclinación física de la carretera que ayuda a mantener el automóvil dentro del carril en curvas, compensando la fuerza centrífuga mediante la fuerza de la gravedad.",
      fundamento_legal: "Manual de Diseño Geométrico de Carreteras (INVIAS); Manual ANSV.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l02-145",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "riesgo al adelantar varios vehiculos",
      hecho_canonico_id: "l02-mov-15",
      pregunta:
        "¿Por qué intentar adelantar a una fila de varios vehículos simultáneamente en carretera es una maniobra de altísimo riesgo?",
      opcion_a:
        "Porque exige recorrer una distancia enorme en contravía y si aparece un carro de frente, no habrá espacio para reincorporarse en la fila",
      opcion_b: "Porque consume más aceite de motor que de costumbre",
      opcion_c: "Porque está permitido adelantar únicamente un carro cada media hora",
      opcion_d: "Porque las llantas se desbalancean de inmediato",
      respuesta_correcta: "a",
      explicacion:
        "Al rebasar una fila entera, el conductor permanece demasiado tiempo en el carril opuesto. Si surge un conflicto frontal, los autos de la fila circulan pegados impidiendo meterse de regreso.",
      fundamento_legal: "Manual de Referencia ANSV sobre maniobras de adelantamiento seguro.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l02-146",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "anticipacion ante vehiculo escolar detenido",
      hecho_canonico_id: "l02-mov-16",
      pregunta:
        "Al transitar detrás de una ruta escolar con luces intermitentes encendidas que se detiene a la derecha, ¿qué debe hacer?",
      opcion_a: "Acelerar y adelantar a toda velocidad tocando la bocina",
      opcion_b:
        "Detenerse detrás o adelantar a paso de hombre con extrema precaución, previendo que niños puedan descender y cruzar corriendo por delante o detrás del bus",
      opcion_c: "Hacer cambio de luces para exigir que la ruta no tape la calle",
      opcion_d: "Subirse a la acera contraria para continuar la marcha",
      respuesta_correcta: "b",
      explicacion:
        "Los niños descienden de los buses escolares con la atención puesta en sus hogares o amigos, cruzando a ciegas. La prudencia exige reducir drásticamente la velocidad o detenerse.",
      fundamento_legal: "Ley 769 de 2002, Art. 74; Manual de Referencia ANSV.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    know({
      id: "cale-l02-147",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "efecto tijera en tractocamiones",
      hecho_canonico_id: "l02-mov-17",
      pregunta:
        "¿Qué es el 'efecto tijera' en vehículos pesados articulados y por qué representa un peligro para quienes circulan cerca?",
      opcion_a: "El sonido característico que hacen los frenos de aire al soltar el pedal",
      opcion_b: "El corte automático del suministro de combustible en pendientes",
      opcion_c:
        "El bloqueo o derrape de las ruedas del remolque o tractor que hace que el remolque se pliegue sobre la cabina barriendo todos los carriles adyacentes",
      opcion_d: "El funcionamiento cruzado de las plumillas limpiaparabrisas",
      respuesta_correcta: "c",
      explicacion:
        "En frenadas violentas o pavimento deslizante, el remolque puede perder tracción y adelantarse a la cabina en ángulo agudo (tijera), arrasando con todo lo que encuentre en los carriles vecinos.",
      fundamento_legal: "Manual de Referencia ANSV sobre dinámica de vehículos pesados.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "dificil",
    }),
    know({
      id: "cale-l02-148",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "distancia lateral al adelantar vehiculos parqueados",
      hecho_canonico_id: "l02-mov-18",
      pregunta:
        "Al transitar junto a una hilera de automóviles parqueados en una calle urbana, ¿qué margen lateral preventivo debe conservar?",
      opcion_a: "Treinta centímetros para no molestar a los que vienen de frente",
      opcion_b: "No es necesario dejar ninguna distancia lateral",
      opcion_c: "Pegarse a los carros estacionados rozando los espejos",
      opcion_d:
        "Al menos un metro de separación lateral (la distancia de una puerta abierta), para evitar colisionar si alguien abre una puerta de repente o sale un peatón oculto",
      respuesta_correcta: "d",
      explicacion:
        "Conservar al menos 1 metro de margen respecto a los autos parqueados previene el impacto contra puertas que se abren sorpresivamente o contra niños y peatones que salen entre los vehículos.",
      fundamento_legal: "Manual de Referencia ANSV sobre distancia de seguridad lateral.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l02-149",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "posicion de manos en el timon",
      hecho_canonico_id: "l02-mov-19",
      pregunta:
        "¿Cuál es la posición ergonómica y segura de sujeción del volante recomendada universalmente por los estándares de seguridad vial?",
      opcion_a:
        "Ambas manos sobre el volante en la posición equivalente a las '9 y 3' o '10 y 2' del reloj, con los pulgares apoyados sin rodear el aro",
      opcion_b:
        "Con una sola mano en la parte superior ('las 12:00') y el codo apoyado en la ventana",
      opcion_c: "Con ambas manos juntas en la parte inferior del timón ('las 6:00')",
      opcion_d: "Tomando el volante por los radios interiores",
      respuesta_correcta: "a",
      explicacion:
        "La posición '9 y 3' o '10 y 2' permite el mayor radio de giro sin cruzar los brazos, asegura control direccional inmediato y evita que el despliegue del airbag rompa los brazos o los proyecte al rostro.",
      fundamento_legal: "Manual de Referencia ANSV sobre ergonomía y postura de conducción.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    know({
      id: "cale-l02-150",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "peligro de circular en punto muerto",
      hecho_canonico_id: "l02-mov-20",
      pregunta:
        "¿Por qué descender una pendiente larga en neutro (punto muerto) o con el embrague pisado es una práctica peligrosa e incorrecta?",
      opcion_a: "Porque hace que el aire acondicionado se caliente de inmediato",
      opcion_b:
        "Porque desconecta el motor de las ruedas anulando el freno motor, dejando toda la retención sobrecalentando los frenos y restando control direccional al auto",
      opcion_c: "Porque aumenta el consumo de combustible en un 50%",
      opcion_d: "Porque apaga las luces exteriores del vehículo automáticamente",
      respuesta_correcta: "b",
      explicacion:
        "Al rodar en neutro el carro gana velocidad por inercia sin el auxilio del freno motor; los frenos se sobrecalientan en pocos minutos sufriendo 'fading' y se pierde tracción para esquivar peligros.",
      fundamento_legal: "Manual de Referencia ANSV sobre técnicas de descenso y mecánica básica.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l02-151",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "maniobra en reversa",
      hecho_canonico_id: "l02-mov-21",
      pregunta:
        "¿Qué precauciones obligatorias debe tomar un conductor antes de dar marcha atrás con su vehículo?",
      opcion_a: "Pitar una sola vez y acelerar de inmediato confiando en los sensores",
      opcion_b: "Dar reversa a alta velocidad para salir rápido del obstáculo",
      opcion_c:
        "Verificar personalmente los tres espejos retrovisores y la zona posterior directa para comprobar que no haya niños, mascotas u obstáculos en el punto ciego",
      opcion_d: "Mirar únicamente hacia adelante y guiarse por el sonido de la carrocería",
      respuesta_correcta: "c",
      explicacion:
        "La maniobra de retroceso tiene una zona ciega trasera muy amplia donde los niños pequeños y mascotas no son vistos por los espejos. La verificación atenta previa es obligatoria.",
      fundamento_legal: "Ley 769 de 2002, Art. 69; Manual de Referencia ANSV.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    know({
      id: "cale-l02-152",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "adelantamiento a vehiculo detenido en cebra",
      hecho_canonico_id: "l02-mov-22",
      pregunta:
        "En una vía de dos carriles en el mismo sentido, el vehículo del carril derecho se detiene antes de un paso peatonal. ¿Qué debe hacer usted si circula por el carril izquierdo?",
      opcion_a: "Acelerar para pasarlo antes de que reinicie la marcha",
      opcion_b: "Cambiar de carril y pegarse detrás del vehículo detenido",
      opcion_c: "Tocar la bocina y continuar sin frenar",
      opcion_d:
        "Detenerse también a la par, ya que el vehículo detenido está cediendo el paso a un peatón que usted no puede ver en ese instante",
      respuesta_correcta: "d",
      explicacion:
        "El vehículo detenido actúa como una pantalla visual que oculta al peatón cruzando. Sobrepasarlo genera el siniestro mortal conocido como 'atropello en cruce ciego'.",
      fundamento_legal: "Ley 769 de 2002, Art. 74 y Art. 105; Manual ANSV.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    know({
      id: "cale-l02-153",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "perdida de frenos en carretera",
      hecho_canonico_id: "l02-mov-23",
      pregunta:
        "Si en pleno viaje desciende una cuesta y al pisar el pedal de freno este se va al fondo sin frenar, ¿cuál es la secuencia correcta de emergencia?",
      opcion_a:
        "Bombear el pedal, reducir marchas sucesivamente (freno motor), accionar el freno de mano de forma suave y gradual, y buscar una rampa de frenado o el borde de la vía",
      opcion_b: "Apagar el motor de golpe y quitar las manos del timón",
      opcion_c:
        "Jalar bruscamente el freno de mano al máximo para bloquear las ruedas de inmediato",
      opcion_d: "Lanzarse del vehículo en marcha abriendo la puerta",
      respuesta_correcta: "a",
      explicacion:
        "El bombeo puede recuperar presión residual; bajar marchas aprovecha la compresión del motor, y el freno de mano gradual (con botón presionado) frena las ruedas traseras sin trompo.",
      fundamento_legal:
        "Manual de Referencia ANSV sobre emergencias mecánicas y control del vehículo.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "dificil",
    }),
    know({
      id: "cale-l02-154",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "presion de llantas y combustible",
      hecho_canonico_id: "l02-mov-24",
      pregunta:
        "¿Cómo impacta mantener la presión de inflado correcta en los neumáticos sobre el consumo de combustible y la sostenibilidad ambiental?",
      opcion_a: "No tiene ninguna incidencia en el consumo de gasolina ni en las emisiones",
      opcion_b:
        "Reduce la resistencia a la rodadura del neumático, disminuyendo el consumo de combustible hasta en un 4% y reduciendo la emisión de CO2",
      opcion_c: "Aumenta el consumo de combustible porque el carro va más liviano",
      opcion_d: "Solo influye si el automóvil es 100% eléctrico",
      respuesta_correcta: "b",
      explicacion:
        "Una llanta desinflada genera mayor fricción y arrastre contra el piso. Calibrarlas a la presión del fabricante optimiza el consumo de combustible y reduce la huella de carbono.",
      fundamento_legal: "Manual de Referencia ANSV sobre ecoconducción y movilidad sostenible.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    know({
      id: "cale-l02-155",
      lote: LOTE,
      nucleo_nombre: "Movilidad segura y sostenible",
      subtema: "efecto tijera en frenadas bruscas",
      hecho_canonico_id: "l02-mov-25",
      pregunta:
        "Al frenar de emergencia en línea recta sin sistema ABS, ¿qué ocurre si las cuatro ruedas se bloquean totalmente?",
      opcion_a: "El conductor puede maniobrar y esquivar obstáculos con absoluta facilidad",
      opcion_b: "El vehículo gira en U de forma automática",
      opcion_c:
        "El vehículo patina en la dirección que llevaba su inercia sin responder al volante, perdiendo todo control direccional",
      opcion_d: "La distancia de frenado se reduce a cero metros",
      respuesta_correcta: "c",
      explicacion:
        "Una rueda bloqueada no transmite fuerza lateral; por tanto, aunque se gire el timón hacia los lados, el automóvil continuará deslizándose en línea recta hacia el obstáculo.",
      fundamento_legal: "Manual de Referencia ANSV sobre dinámica de frenado y adherencia.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    // Normas de transito (15)
    know({
      id: "cale-l02-156",
      lote: LOTE,
      nucleo_nombre: "Normas de transito",
      subtema: "prelacion en intersecciones no senalizadas",
      hecho_canonico_id: "l02-nor-01",
      pregunta:
        "En una intersección donde no hay semáforo ni señales de PARE o CEDA EL PASO, ¿quién tiene la prelación de paso entre vías de igual categoría?",
      opcion_a: "El vehículo que transita a mayor velocidad",
      opcion_b: "El conductor que toque primero la bocina",
      opcion_c: "El vehículo más pesado o de mayor tamaño",
      opcion_d: "El vehículo que se aproxima por la derecha del conductor",
      respuesta_correcta: "d",
      explicacion:
        "El artículo 70 de la Ley 769 establece la 'regla de la derecha': en intersecciones de igual categoría sin señalización, tiene prelación de paso el vehículo que aparece por el lado derecho.",
      fundamento_legal: "Ley 769 de 2002, Art. 70, numeral 1.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    know({
      id: "cale-l02-157",
      lote: LOTE,
      nucleo_nombre: "Normas de transito",
      subtema: "prelacion en glorietas articulo 70",
      hecho_canonico_id: "l02-nor-02",
      pregunta:
        "De acuerdo con el artículo 70 del Código Nacional de Tránsito, ¿quién tiene la prelación de vía en una glorieta o rotonda?",
      opcion_a: "El vehículo que ya transita dentro de la glorieta",
      opcion_b: "El vehículo que intenta ingresar a la glorieta desde la vía más ancha",
      opcion_c: "El vehículo que sale de la glorieta sobre los que van dentro",
      opcion_d: "Los camiones de carga sobre los automóviles en todo momento",
      respuesta_correcta: "a",
      explicacion:
        "En las glorietas tiene prelación el automotor que ya se encuentra circulando dentro del anillo vial sobre aquellos que pretenden incorporarse a ella desde las vías de acceso.",
      fundamento_legal: "Ley 769 de 2002, Art. 70, numeral 3.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    know({
      id: "cale-l02-158",
      lote: LOTE,
      nucleo_nombre: "Normas de transito",
      subtema: "prelacion en pendientes estrechas",
      hecho_canonico_id: "l02-nor-03",
      pregunta:
        "En una pendiente angosta donde no caben dos vehículos simultáneamente, ¿quién tiene la prelación de paso?",
      opcion_a: "El vehículo que va bajando",
      opcion_b: "El vehículo que va subiendo",
      opcion_c: "El vehículo que pese más",
      opcion_d: "El vehículo que lleve las luces encendidas",
      respuesta_correcta: "b",
      explicacion:
        "El vehículo que asciende tiene prelación debido a la mayor dificultad técnica y de adherencia que representa reiniciar la marcha cuesta arriba si se ve forzado a detenerse.",
      fundamento_legal: "Ley 769 de 2002, Art. 70, numeral 4; Manual de Referencia ANSV.",
      source: SOURCES.LEY_769,
      dificultad: "media",
    }),
    know({
      id: "cale-l02-159",
      lote: LOTE,
      nucleo_nombre: "Normas de transito",
      subtema: "antelacion obligatoria de direccionales",
      hecho_canonico_id: "l02-nor-04",
      pregunta:
        "Conforme al artículo 67 de la Ley 769, ¿con qué antelación mínima deben encenderse las luces direccionales para avisar un giro o cambio de carril?",
      opcion_a: "Mínimo 5 metros antes en cualquier vía",
      opcion_b: "Solo en el instante exacto en que se gira el volante",
      opcion_c: "Con antelación mínima de 30 metros en zona urbana y de 60 metros en carretera",
      opcion_d: "Con 200 metros en ciudad y 500 metros en carretera",
      respuesta_correcta: "c",
      explicacion:
        "El artículo 67 exige anticipar la maniobra encendiendo las luces direccionales con mínimo 30 metros de antelación en áreas urbanas y 60 metros en carreteras o autopistas.",
      fundamento_legal: "Ley 769 de 2002, Art. 67.",
      source: SOURCES.LEY_769,
      dificultad: "media",
    }),
    know({
      id: "cale-l02-160",
      lote: LOTE,
      nucleo_nombre: "Normas de transito",
      subtema: "obligacion del conductor adelantado",
      hecho_canonico_id: "l02-nor-05",
      pregunta:
        "Según el artículo 69 de la Ley 769, cuando el conductor de un vehículo advierta que va a ser adelantado por otro, ¿qué obligación tiene?",
      opcion_a: "Acelerar para evitar que lo rebasen",
      opcion_b: "Encender las luces altas para alumbrarle el camino",
      opcion_c: "Tocar la bocina y frenar de golpe",
      opcion_d:
        "Mantener su derecha y no aumentar la velocidad hasta que el otro vehículo haya culminado la maniobra",
      respuesta_correcta: "d",
      explicacion:
        "El conductor al que le adelantan no debe entorpecer la maniobra: debe ceñirse a la derecha de su carril y mantener o reducir suavemente su velocidad para que el rebase sea rápido y seguro.",
      fundamento_legal: "Ley 769 de 2002, Art. 69.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    know({
      id: "cale-l02-161",
      lote: LOTE,
      nucleo_nombre: "Normas de transito",
      subtema: "lugares de adelantamiento prohibido",
      hecho_canonico_id: "l02-nor-06",
      pregunta:
        "De acuerdo con el artículo 73 de la Ley 769, ¿en cuáles de los siguientes sitios está expresamente prohibido adelantar a otro vehículo?",
      opcion_a:
        "En intersecciones, curvas pronunciadas, pendientes sin visibilidad, pasos a nivel férreos, puentes, túneles y por la berma",
      opcion_b: "En rectas planas de doble calzada con buena visibilidad",
      opcion_c: "En carreteras concesionadas durante el día",
      opcion_d: "En calles de sentido único con más de tres carriles",
      respuesta_correcta: "a",
      explicacion:
        "El artículo 73 enumera los sitios donde el riesgo geométrico o de cruce de flujos hace que el adelantamiento sea una maniobra prohibida bajo sanción de comparendo severo.",
      fundamento_legal: "Ley 769 de 2002, Art. 73.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    know({
      id: "cale-l02-162",
      lote: LOTE,
      nucleo_nombre: "Normas de transito",
      subtema: "adelantamiento por la derecha prohibido",
      hecho_canonico_id: "l02-nor-07",
      pregunta:
        "¿Por cuál costado de la calzada debe efectuarse reglamentariamente todo adelantamiento según el artículo 73 del Código de Tránsito?",
      opcion_a: "Por la derecha siempre que haya berma asfaltada",
      opcion_b:
        "Por la izquierda, quedando prohibido adelantar por la derecha salvo que el vehículo precedente haya señalizado su intención de girar a la izquierda",
      opcion_c: "Por cualquier lado indiferentemente en vías urbanas",
      opcion_d: "Por la acera peatonal si la vía está congestionada",
      respuesta_correcta: "b",
      explicacion:
        "El sobrepaso se realiza por la izquierda. La única excepción legal para rebasar por la derecha es cuando el auto que nos antecede esté detenido o virando hacia la izquierda con direccional puesta.",
      fundamento_legal: "Ley 769 de 2002, Art. 73, Parágrafo 1°.",
      source: SOURCES.LEY_769,
      dificultad: "media",
    }),
    know({
      id: "cale-l02-163",
      lote: LOTE,
      nucleo_nombre: "Normas de transito",
      subtema: "reduccion a 30 kmh articulo 74",
      hecho_canonico_id: "l02-nor-08",
      pregunta:
        "El artículo 74 de la Ley 769 señala que los conductores deben reducir la velocidad a 30 km/h en situaciones especiales como:",
      opcion_a: "En autopistas de doble calzada con lluvia ligera",
      opcion_b: "Únicamente al pasar frente a los peajes",
      opcion_c:
        "Lugares de concentración de personas, zonas escolares, proximidad a hospitales y cuando la visibilidad sea escasa",
      opcion_d: "Solo cuando lleven pasajeros ancianos a bordo",
      respuesta_correcta: "c",
      explicacion:
        "El artículo 74 ordena reducir la velocidad a 30 km/h en zonas de aglomeración humana, colegios, hospitales, intersecciones sin prelación clara y tramos con niebla o lluvia intensa.",
      fundamento_legal: "Ley 769 de 2002, Art. 74.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    know({
      id: "cale-l02-164",
      lote: LOTE,
      nucleo_nombre: "Normas de transito",
      subtema: "distancia reglamentaria de estacionamiento",
      hecho_canonico_id: "l02-nor-09",
      pregunta:
        "Según el artículo 75 de la Ley 769, ¿a qué distancia máxima del andén y mínima de una intersección debe estacionarse un vehículo?",
      opcion_a: "A 50 centímetros del andén y encima de la cebra",
      opcion_b: "A un metro del andén y pegado a la esquina",
      opcion_c: "A dos metros del andén para no rayar los rines",
      opcion_d:
        "A no más de 30 centímetros del andén y a mínimo 5 metros de la esquina o intersección",
      respuesta_correcta: "d",
      explicacion:
        "El estacionamiento paralelo al andén debe quedar a no más de 30 cm de la acera y a más de 5 metros de las esquinas para preservar el radio de giro de los demás vehículos y la visibilidad peatonal.",
      fundamento_legal: "Ley 769 de 2002, Art. 75.",
      source: SOURCES.LEY_769,
      dificultad: "media",
    }),
    know({
      id: "cale-l02-165",
      lote: LOTE,
      nucleo_nombre: "Normas de transito",
      subtema: "prohibicion de estacionar articulo 76",
      hecho_canonico_id: "l02-nor-10",
      pregunta:
        "¿En cuáles de los siguientes lugares prohíbe expresamente estacionar el artículo 76 del Código de Tránsito?",
      opcion_a:
        "Sobre andenes, zonas verdes, vías arterias, puentes, túneles, pasos a nivel, curvas y frente a hidrantes",
      opcion_b: "En bahías de estacionamiento debidamente autorizadas y señalizadas",
      opcion_c: "En parqueaderos públicos de centros comerciales",
      opcion_d: "En garajes privados con autorización del propietario",
      respuesta_correcta: "a",
      explicacion:
        "El artículo 76 enumera los sitios prohibidos para estacionar: andenes, zonas verdes, puentes, túneles, curvas, entradas de garajes, frente a hidrantes y a menos de 5 metros de intersecciones.",
      fundamento_legal: "Ley 769 de 2002, Art. 76.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    know({
      id: "cale-l02-166",
      lote: LOTE,
      nucleo_nombre: "Normas de transito",
      subtema: "uso del carril izquierdo articulo 68",
      hecho_canonico_id: "l02-nor-11",
      pregunta:
        "En una calzada con dos o más carriles en el mismo sentido, ¿para qué debe destinarse preferentemente el carril izquierdo según el artículo 68?",
      opcion_a: "Para transitar a velocidad mínima o detenerse con estacionarias",
      opcion_b:
        "Para adelantar a otros vehículos o transitar a la velocidad máxima permitida para la vía",
      opcion_c: "Para vehículos pesados de carga y maquinaria agrícola",
      opcion_d: "Exclusivamente para motocicletas de bajo cilindraje",
      respuesta_correcta: "b",
      explicacion:
        "El carril izquierdo es de sobrepaso y tránsito a mayor velocidad legal. Los vehículos lentos y pesados deben marchar obligatoriamente por los carriles de la derecha.",
      fundamento_legal: "Ley 769 de 2002, Art. 68.",
      source: SOURCES.LEY_769,
      dificultad: "facil",
    }),
    know({
      id: "cale-l02-167",
      lote: LOTE,
      nucleo_nombre: "Normas de transito",
      subtema: "giro a la izquierda en doble via",
      hecho_canonico_id: "l02-nor-12",
      pregunta:
        "Para girar a la izquierda desde una vía de doble sentido de circulación según el artículo 66, ¿cómo debe posicionarse el vehículo?",
      opcion_a: "Pegado al andén derecho cruzando todos los carriles en diagonal",
      opcion_b: "Por la berma contraria acelerando a fondo",
      opcion_c:
        "Aproximándose al eje central divisorio sin invadir el carril en contravía, cediendo el paso a quienes vengan de frente",
      opcion_d: "En contravía desde media cuadra antes",
      respuesta_correcta: "c",
      explicacion:
        "El giro a la izquierda en vías bidireccionales se prepara arrimando el carro a la línea central demarcada, sin pisarla ni invadirla, esperando el espacio libre del flujo contrario antes de doblar.",
      fundamento_legal: "Ley 769 de 2002, Art. 66.",
      source: SOURCES.LEY_769,
      dificultad: "media",
    }),
    know({
      id: "cale-l02-168",
      lote: LOTE,
      nucleo_nombre: "Normas de transito",
      subtema: "distancia al vehiculo de adelante en fila",
      hecho_canonico_id: "l02-nor-13",
      pregunta:
        "Al detenerse detrás de otro vehículo en un semáforo o retención vehicular, ¿qué distancia mínima de seguridad debe dejarse?",
      opcion_a: "Pegar el parachoques delantero a diez centímetros del otro carro",
      opcion_b: "La longitud exacta de tres camiones articulados",
      opcion_c: "Mínimo veinte metros de distancia libre",
      opcion_d:
        "Una distancia suficiente que permita ver los neumáticos traseros del vehículo delantero apoyados en el suelo",
      respuesta_correcta: "d",
      explicacion:
        "Ver las llantas traseras del auto de adelante tocando el piso garantiza entre 2 y 3 metros de espacio. Si el carro delantero se vara o rueda hacia atrás, permite maniobrar y salir sin dar reversa.",
      fundamento_legal: "Manual de Referencia ANSV sobre distancia de detención preventiva.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    know({
      id: "cale-l02-169",
      lote: LOTE,
      nucleo_nombre: "Normas de transito",
      subtema: "prohibicion de adelantar por berma",
      hecho_canonico_id: "l02-nor-14",
      pregunta:
        "¿Qué tipo de infracción y sanción comete el conductor que adelanta a otro vehículo transitando por la berma?",
      opcion_a: "Infracción tipo D.06 con multa de 30 salarios mínimos legales diarios vigentes",
      opcion_b: "Infracción tipo A con multa de 4 salarios mínimos diarios",
      opcion_c: "No constituye infracción si la carretera no tiene peaje",
      opcion_d: "Una amonestación pedagógica sin valor económico",
      respuesta_correcta: "a",
      explicacion:
        "Adelantar en berma está tipificado en la infracción D.06 de la Ley 769 (30 SMDLV), considerada una de las maniobras más temerarias e ilegales del Código de Tránsito.",
      fundamento_legal: "Ley 769 de 2002, Art. 131, infracción D.06.",
      source: SOURCES.LEY_769,
      dificultad: "media",
    }),
    know({
      id: "cale-l02-170",
      lote: LOTE,
      nucleo_nombre: "Normas de transito",
      subtema: "estacionamiento en pendientes",
      hecho_canonico_id: "l02-nor-15",
      pregunta:
        "Al estacionar un automóvil en una pendiente pronunciada, además de activar el freno de mano, ¿qué medida mecánica ordena la ley?",
      opcion_a: "Dejar el vehículo en neutro y con las luces de parqueo encendidas",
      opcion_b:
        "Engranar primera marcha en subida o reversa en bajada, y girar las ruedas delanteras hacia el andén o cuneta",
      opcion_c: "Desinflar las llantas traseras a la mitad de su presión",
      opcion_d: "Dejar una puerta semiabierta para que actúe de freno aerodinámico",
      respuesta_correcta: "b",
      explicacion:
        "En pendientes ascendentes se deja primera puesta y ruedas hacia la calzada/andén; en pendientes descendentes se deja reversa y ruedas hacia el andén. La caja bloquea la transmisión si falla el freno de mano.",
      fundamento_legal: "Ley 769 de 2002, Art. 77.",
      source: SOURCES.LEY_769,
      dificultad: "media",
    }),
    // Senalizacion vial e infraestructura (15)
    know({
      id: "cale-l02-171",
      lote: LOTE,
      nucleo_nombre: "Senalizacion vial e infraestructura",
      subtema: "caracteristicas senales preventivas",
      hecho_canonico_id: "l02-sen-01",
      pregunta:
        "¿Cuáles son las características visuales y la función de las Señales Preventivas (SP) según el Manual de Señalización Vial?",
      opcion_a: "Círculo rojo con fondo blanco que impone comparendos inmediatos",
      opcion_b: "Rectángulo azul con letras blancas que señala talleres mecánicos",
      opcion_c:
        "Rombo con fondo amarillo, orla negra y símbolo negro, cuya función es advertir la existencia y naturaleza de un peligro en la vía",
      opcion_d: "Triángulo verde con fondo reflectivo que indica velocidad libre",
      respuesta_correcta: "c",
      explicacion:
        "Las señales preventivas (código SP) alertan anticipadamente sobre curvas, resaltos, angostamientos o cruces para que el conductor ajuste su velocidad y atención antes de llegar al peligro.",
      fundamento_legal:
        "Manual de Señalización Vial de Colombia (Resolución 20243040045005 de 2024).",
      source: SOURCES.MANUAL_SENALIZACION,
      dificultad: "facil",
    }),
    know({
      id: "cale-l02-172",
      lote: LOTE,
      nucleo_nombre: "Senalizacion vial e infraestructura",
      subtema: "curva peligrosa sp-01",
      hecho_canonico_id: "l02-sen-02",
      pregunta:
        "¿Qué advierte la señal preventiva SP-01 (CURVA PELIGROSA A LA IZQUIERDA O DERECHA)?",
      opcion_a: "Un giro en U obligatorio más adelante",
      opcion_b: "Una zona de parqueo permitido sobre la curva",
      opcion_c: "El inicio de una autopista de doble calzada",
      opcion_d:
        "Una curva cerrada con radio pequeño que exige reducir considerablemente la velocidad antes de ingresar a ella",
      respuesta_correcta: "d",
      explicacion:
        "La señal SP-01 advierte una curva de geometría cerrada donde la fuerza centrífuga es elevada; obliga a frenar con antelación para no salirse del carril.",
      fundamento_legal: "Manual de Señalización Vial de Colombia 2024.",
      source: SOURCES.MANUAL_SENALIZACION,
      dificultad: "facil",
    }),
    know({
      id: "cale-l02-173",
      lote: LOTE,
      nucleo_nombre: "Senalizacion vial e infraestructura",
      subtema: "curva pronunciada sp-03",
      hecho_canonico_id: "l02-sen-03",
      pregunta:
        "¿Cómo se diferencia la señal de Curva Peligrosa (SP-01) de la señal de Curva Pronunciada (SP-03)?",
      opcion_a:
        "SP-01 advierte una curva en ángulo recto cerrada, mientras que SP-03 advierte una curva con radio más abierto y menor curvatura",
      opcion_b: "SP-01 solo se usa en túneles y SP-03 en puentes",
      opcion_c: "SP-03 es de color azul y SP-01 es roja",
      opcion_d: "No existe ninguna diferencia en su trazado",
      respuesta_correcta: "a",
      explicacion:
        "La señal SP-01 dibuja una flecha doblada en ángulo recto (curva cerrada peligrosa), mientras que SP-03 dibuja un arco suave (curva pronunciada pero con mayor radio de giro).",
      fundamento_legal: "Manual de Señalización Vial de Colombia 2024.",
      source: SOURCES.MANUAL_SENALIZACION,
      dificultad: "media",
    }),
    know({
      id: "cale-l02-174",
      lote: LOTE,
      nucleo_nombre: "Senalizacion vial e infraestructura",
      subtema: "curva y contracurva sp-05",
      hecho_canonico_id: "l02-sen-04",
      pregunta:
        "¿Qué situación vial comunica la señal preventiva SP-05 (CURVA Y CONTRACURVA PELIGROSA)?",
      opcion_a: "Un retorno en rotonda",
      opcion_b:
        "La proximidad de dos curvas continuas de sentido contrario separadas por una tangente corta de menos de 60 metros",
      opcion_c: "Una vía sin salida",
      opcion_d: "Una calzada en obras de repavimentación",
      respuesta_correcta: "b",
      explicacion:
        "La señal SP-05 advierte dos curvas sucesivas en 'S' enlazadas con poco espacio intermedio, donde el vehículo transfiere pesos de un costado al otro requiriendo velocidad controlada.",
      fundamento_legal: "Manual de Señalización Vial de Colombia 2024.",
      source: SOURCES.MANUAL_SENALIZACION,
      dificultad: "media",
    }),
    know({
      id: "cale-l02-175",
      lote: LOTE,
      nucleo_nombre: "Senalizacion vial e infraestructura",
      subtema: "curvas sucesivas sp-07",
      hecho_canonico_id: "l02-sen-05",
      pregunta: "La señal preventiva SP-07 (CURVAS SUCESIVAS) advierte al conductor sobre:",
      opcion_a: "Un puente colgante angosto",
      opcion_b: "Un cruce semaforizado doble",
      opcion_c: "Un tramo sinuoso de tres o más curvas consecutivas en la carretera",
      opcion_d: "Una pista de carreras autorizada",
      respuesta_correcta: "c",
      explicacion:
        "La señal SP-07 indica un sector sinuoso de montaña o ladera donde se sucederán tres o más curvas seguidas, exigiendo mantener una velocidad moderada y constante.",
      fundamento_legal: "Manual de Señalización Vial de Colombia 2024.",
      source: SOURCES.MANUAL_SENALIZACION,
      dificultad: "facil",
    }),
    know({
      id: "cale-l02-176",
      lote: LOTE,
      nucleo_nombre: "Senalizacion vial e infraestructura",
      subtema: "senal de resalto sp-25",
      hecho_canonico_id: "l02-sen-06",
      pregunta:
        "¿Qué precaución exige la señal preventiva SP-25 (RESALTO / REDUCTOR DE VELOCIDAD)?",
      opcion_a: "Acelerar para saltar el obstáculo sin tocarlo",
      opcion_b: "Girar en U para buscar otra vía",
      opcion_c: "Detenerse y apagar el motor",
      opcion_d:
        "Reducir la velocidad oportunamente para cruzar el resalto físico sin dañar la suspensión del auto ni perder el control del volante",
      respuesta_correcta: "d",
      explicacion:
        "La señal SP-25 advierte la presencia de un reductor físico de velocidad en la calzada; pasar a velocidad excesiva puede romper amortiguadores, desviar el auto o lesionar ocupantes.",
      fundamento_legal: "Manual de Señalización Vial de Colombia 2024.",
      source: SOURCES.MANUAL_SENALIZACION,
      dificultad: "facil",
    }),
    know({
      id: "cale-l02-177",
      lote: LOTE,
      nucleo_nombre: "Senalizacion vial e infraestructura",
      subtema: "senal de depresion sp-26",
      hecho_canonico_id: "l02-sen-07",
      pregunta: "¿Qué peligro advierte la señal preventiva SP-26 (DEPRESIÓN)?",
      opcion_a:
        "Un hundimiento o bache brusco en la rasante de la calzada que puede golpear el cárter o desestabilizar el automotor",
      opcion_b: "Una pendiente prolongada de subida",
      opcion_c: "Una zona deprimida socialmente",
      opcion_d: "Un túnel vehicular subterráneo",
      respuesta_correcta: "a",
      explicacion:
        "La señal SP-26 (badén o depresión cóncava) avisa un desnivel hacia abajo en la vía que acumula agua y puede golpear la parte inferior del carro si no se reduce la marcha.",
      fundamento_legal: "Manual de Señalización Vial de Colombia 2024.",
      source: SOURCES.MANUAL_SENALIZACION,
      dificultad: "media",
    }),
    know({
      id: "cale-l02-178",
      lote: LOTE,
      nucleo_nombre: "Senalizacion vial e infraestructura",
      subtema: "descenso peligroso sp-27",
      hecho_canonico_id: "l02-sen-08",
      pregunta:
        "Al divisar la señal preventiva SP-27 (DESCENSO PELIGROSO), ¿qué acción técnica debe anticipar el conductor?",
      opcion_a: "Bajar en neutro para aprovechar la gravedad",
      opcion_b:
        "Reducir la velocidad y engranar una marcha baja para utilizar la retención del freno motor durante la bajada pronunciada",
      opcion_c: "Desconectar la batería para evitar cortocircuitos",
      opcion_d: "Conducir tocando la bocina en cada metro",
      respuesta_correcta: "b",
      explicacion:
        "La señal SP-27 advierte una pendiente descendente con porcentaje de inclinación elevado, donde el uso del freno motor en marcha baja es vital para no quemar los frenos.",
      fundamento_legal: "Manual de Señalización Vial de Colombia 2024.",
      source: SOURCES.MANUAL_SENALIZACION,
      dificultad: "facil",
    }),
    know({
      id: "cale-l02-179",
      lote: LOTE,
      nucleo_nombre: "Senalizacion vial e infraestructura",
      subtema: "reduccion de calzada sp-29",
      hecho_canonico_id: "l02-sen-09",
      pregunta:
        "¿Qué maniobra exige la señal preventiva SP-29 (REDUCCIÓN ASIMÉTRICA DE LA CALZADA)?",
      opcion_a: "Acelerar para cerrar el paso a los vehículos del carril que finaliza",
      opcion_b: "Frenar en seco en medio de la calzada",
      opcion_c:
        "Comprobar los espejos retrovisores, señalizar y realizar una incorporación ordenada y progresiva hacia el carril que continúa abierto",
      opcion_d: "Detenerse a esperar una grúa",
      respuesta_correcta: "c",
      explicacion:
        "La señal SP-29 notifica que uno de los carriles se suprime o estrecha adelante; los conductores deben acoplarse con suavidad sin forzar maniobras violentas de último momento.",
      fundamento_legal: "Manual de Señalización Vial de Colombia 2024.",
      source: SOURCES.MANUAL_SENALIZACION,
      dificultad: "media",
    }),
    know({
      id: "cale-l02-180",
      lote: LOTE,
      nucleo_nombre: "Senalizacion vial e infraestructura",
      subtema: "superficie deslizante sp-39",
      hecho_canonico_id: "l02-sen-10",
      pregunta:
        "La señal preventiva SP-39 (SUPERFICIE DESLIZANTE) le indica que en ese tramo de vía:",
      opcion_a: "Las llantas se adhieren mejor que en otras carreteras",
      opcion_b: "La calzada es exclusiva para patinaje deportivo",
      opcion_c: "Se permite derrapar para diversión de los ocupantes",
      opcion_d:
        "El pavimento presenta pérdida notable de fricción (por humedad, aceite o pulimento), exigiendo moderar la velocidad y evitar frenazos y volantazos",
      respuesta_correcta: "d",
      explicacion:
        "SP-39 muestra un auto derrapando. Alerta sobre tramos resbaladizos donde cualquier maniobra brusca romperá el límite de adherencia provocando trompos inmediatos.",
      fundamento_legal: "Manual de Señalización Vial de Colombia 2024.",
      source: SOURCES.MANUAL_SENALIZACION,
      dificultad: "facil",
    }),
    know({
      id: "cale-l02-181",
      lote: LOTE,
      nucleo_nombre: "Senalizacion vial e infraestructura",
      subtema: "senal zona escolar sp-47",
      hecho_canonico_id: "l02-sen-11",
      pregunta:
        "¿Qué función cumple la señal preventiva SP-47 (ZONA ESCOLAR) y a qué velocidad máxima obliga?",
      opcion_a:
        "Advierte la cercanía de un centro educativo y obliga a reducir la velocidad a un máximo estricto de 30 km/h",
      opcion_b: "Permite circular a 60 km/h si los estudiantes están en clase",
      opcion_c: "Señala un parqueadero exclusivo para rutas de colegio",
      opcion_d: "Prohíbe el paso de vehículos particulares",
      respuesta_correcta: "a",
      explicacion:
        "La señal SP-47 previene el riesgo de atropello infantil en las proximidades de colegios o jardines infantiles, donde la ley fija el límite máximo en 30 km/h.",
      fundamento_legal: "Ley 2251 de 2022; Manual de Señalización Vial de Colombia 2024.",
      source: SOURCES.MANUAL_SENALIZACION,
      dificultad: "facil",
    }),
    know({
      id: "cale-l02-182",
      lote: LOTE,
      nucleo_nombre: "Senalizacion vial e infraestructura",
      subtema: "senal ciclistas en la via sp-59",
      hecho_canonico_id: "l02-sen-12",
      pregunta:
        "Al encontrar la señal preventiva SP-59 (CICLISTAS EN LA VÍA), ¿qué recaudos debe adoptar el automovilista?",
      opcion_a: "Tocar el pito continuamente para que las bicicletas no ingresen a la calzada",
      opcion_b:
        "Extremar la atención en los costados, moderar la velocidad y dejar al menos 1,5 metros de distancia lateral al momento de sobrepasar a un ciclista",
      opcion_c: "Adelantar al ciclista sin cambiar de carril",
      opcion_d: "Exigirle al ciclista que transite por la acera peatonal",
      respuesta_correcta: "b",
      explicacion:
        "SP-59 advierte la presencia constante de bicicletas en la calzada vehicular o el cruce de ciclorrutas, recordando el deber de convivir dejando 1,5 metros de separación.",
      fundamento_legal: "Ley 1811 de 2016; Manual de Señalización Vial de Colombia 2024.",
      source: SOURCES.MANUAL_SENALIZACION,
      dificultad: "facil",
    }),
    know({
      id: "cale-l02-183",
      lote: LOTE,
      nucleo_nombre: "Senalizacion vial e infraestructura",
      subtema: "clasificacion senales informativas",
      hecho_canonico_id: "l02-sen-13",
      pregunta:
        "¿Cuál es el color y propósito de las señales informativas de destino y orientación geográfica en carreteras nacionales?",
      opcion_a: "Fondo rojo con orla blanca",
      opcion_b: "Fondo amarillo con orla negra",
      opcion_c: "Fondo verde con orlas, flechas y letras blancas reflectivas",
      opcion_d: "Fondo naranja fluorescente",
      respuesta_correcta: "c",
      explicacion:
        "Las señales informativas de dirección, destino, preselección de carril y distancias en carreteras son de fondo verde con caracteres blancos para guiar al viajero con alta legibilidad.",
      fundamento_legal: "Manual de Señalización Vial de Colombia 2024.",
      source: SOURCES.MANUAL_SENALIZACION,
      dificultad: "facil",
    }),
    know({
      id: "cale-l02-184",
      lote: LOTE,
      nucleo_nombre: "Senalizacion vial e infraestructura",
      subtema: "senales informativas azules de servicios",
      hecho_canonico_id: "l02-sen-14",
      pregunta:
        "¿Qué tipo de información comunican las señales verticales rectangulares con fondo azul?",
      opcion_a: "Órdenes de detención y multas",
      opcion_b: "Límites máximos de velocidad en túneles",
      opcion_c: "Zonas de deslizamiento de tierra",
      opcion_d:
        "Servicios generales y de emergencia al usuario de la vía (hospitales, talleres, estaciones de servicio, teléfonos, hospedaje)",
      respuesta_correcta: "d",
      explicacion:
        "Las señales informativas de servicios (código SIS) son de fondo azul con pictograma blanco o negro dentro de un recuadro blanco, informando sobre auxilio y abastecimiento.",
      fundamento_legal: "Manual de Señalización Vial de Colombia 2024.",
      source: SOURCES.MANUAL_SENALIZACION,
      dificultad: "facil",
    }),
    know({
      id: "cale-l02-185",
      lote: LOTE,
      nucleo_nombre: "Senalizacion vial e infraestructura",
      subtema: "senales turisticas de fondo cafe",
      hecho_canonico_id: "l02-sen-15",
      pregunta: "¿Qué indican las señales informativas con fondo de color marrón o café?",
      opcion_a: "Puntos de interés turístico, histórico, recreativo, ecológico y cultural",
      opcion_b: "Vías deterioradas sin pavimentar",
      opcion_c: "Zonas de derrumbe de barro activo",
      opcion_d: "Finiquito de la garantía de la carretera",
      respuesta_correcta: "a",
      explicacion:
        "El color café o marrón está reservado internacionalmente y en Colombia para la señalización turística y patrimonial (parques nacionales, monumentos, sitios históricos).",
      fundamento_legal: "Manual de Señalización Vial de Colombia 2024.",
      source: SOURCES.MANUAL_SENALIZACION,
      dificultad: "facil",
    }),
    // El vehiculo (15)
    know({
      id: "cale-l02-186",
      lote: LOTE,
      nucleo_nombre: "El vehiculo",
      subtema: "sistema de direccion asistida",
      hecho_canonico_id: "l02-veh-01",
      pregunta:
        "¿Qué función cumple el sistema de dirección asistida (hidráulica o electroasistida EPS) en un vehículo moderno?",
      opcion_a: "Girar el automóvil automáticamente sin necesidad de conductor",
      opcion_b:
        "Reducir el esfuerzo físico necesario para girar el volante a bajas velocidades o al parquear, endureciéndose progresivamente en carretera para dar estabilidad",
      opcion_c: "Aumentar la potencia del motor en las subidas",
      opcion_d: "Reemplazar el uso de las luces direccionales",
      respuesta_correcta: "b",
      explicacion:
        "La dirección asistida multiplica la fuerza del conductor facilitando maniobras lentas y parqueo, pero en velocidad se torna más firme para evitar volantazos bruscos involuntarios.",
      fundamento_legal: "Manual de Referencia ANSV sobre sistemas mecánicos de control vehicular.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    know({
      id: "cale-l02-187",
      lote: LOTE,
      nucleo_nombre: "El vehiculo",
      subtema: "amortiguadores desgastados",
      hecho_canonico_id: "l02-veh-02",
      pregunta:
        "¿Cuáles son los síntomas característicos y los peligros de conducir con amortiguadores en mal estado?",
      opcion_a: "El líquido de frenos se desborda del depósito",
      opcion_b: "Las luces del tablero parpadean de color verde",
      opcion_c:
        "El carro rebota excesivamente tras pasar un bache, se inclina de forma peligrosa en curvas y aumenta significativamente la distancia de frenado",
      opcion_d: "El radio pierde sintonía en carreteras curvas",
      respuesta_correcta: "c",
      explicacion:
        "Los amortiguadores mantienen la llanta pegada al suelo. Si están vencidos, la rueda rebota en el aire; al no haber contacto constante, el carro no frena bien y derrapa en curvas.",
      fundamento_legal: "Manual de Referencia ANSV sobre sistema de suspensión y seguridad activa.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l02-188",
      lote: LOTE,
      nucleo_nombre: "El vehiculo",
      subtema: "alineacion del vehiculo",
      hecho_canonico_id: "l02-veh-03",
      pregunta:
        "Si en una recta plana y sin viento suelta suavemente el volante y el automóvil se desvía de inmediato hacia un lado, ¿qué anomalía presenta?",
      opcion_a: "Falta de líquido refrigerante en el radiador",
      opcion_b: "Desgaste del disco de embrague",
      opcion_c: "Un cortocircuito en el alternador",
      opcion_d:
        "Problemas de alineación de la dirección o diferencia de presión entre los neumáticos delanteros",
      respuesta_correcta: "d",
      explicacion:
        "La desviación lateral en recta indica que la geometría de la dirección (convergencia, caída o avance) está descalibrada, o que una llanta delantera rueda con mucho menos aire que la otra.",
      fundamento_legal: "Manual de Referencia ANSV sobre mantenimiento de dirección y neumáticos.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    know({
      id: "cale-l02-189",
      lote: LOTE,
      nucleo_nombre: "El vehiculo",
      subtema: "balanceo de ruedas",
      hecho_canonico_id: "l02-veh-04",
      pregunta:
        "¿Qué síntoma típico percibe el conductor cuando las ruedas delanteras se encuentran desbalanceadas?",
      opcion_a:
        "Vibraciones molestas en el volante que se acentúan a ciertas velocidades (por ejemplo entre 80 y 100 km/h)",
      opcion_b: "Humo negro saliendo por las rejillas del aire acondicionado",
      opcion_c: "Olor a gasolina quemada en la cabina",
      opcion_d: "El pedal de freno se traba en el fondo",
      respuesta_correcta: "a",
      explicacion:
        "El desbalanceo ocurre por una distribución despareja del peso en la rueda, produciendo fuerzas centrífugas que hacen vibrar el timón y desgastan rodamientos y terminales de dirección.",
      fundamento_legal: "Manual de Referencia ANSV sobre mantenimiento mecánico preventivo.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    know({
      id: "cale-l02-190",
      lote: LOTE,
      nucleo_nombre: "El vehiculo",
      subtema: "cinturon de seguridad tres puntos",
      hecho_canonico_id: "l02-veh-05",
      pregunta:
        "¿Por qué el cinturón de seguridad de tres puntos es considerado el elemento de seguridad pasiva más efectivo en el automóvil?",
      opcion_a: "Porque evita que el conductor sienta cansancio en los brazos",
      opcion_b:
        "Porque retiene el cuerpo por las zonas óseas más fuertes (clavícula y pelvis), distribuye las fuerzas de desaceleración e impide salir eyectado del habitáculo",
      opcion_c: "Porque bloquea las puertas en caso de inundación",
      opcion_d: "Porque sustituye la necesidad de que el vehículo tenga frenos",
      respuesta_correcta: "b",
      explicacion:
        "El cinturón de 3 puntos ancla el cuerpo a la estructura rígida del chasis, evitando el golpe contra el timón, parabrisas o pilares y reduciendo a la mitad el riesgo de muerte.",
      fundamento_legal: "Manual de Referencia ANSV sobre seguridad pasiva del vehículo.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "facil",
    }),
    know({
      id: "cale-l02-191",
      lote: LOTE,
      nucleo_nombre: "El vehiculo",
      subtema: "peligro del efecto submarino",
      hecho_canonico_id: "l02-veh-06",
      pregunta:
        "¿En qué consiste el 'efecto submarino' y cómo se previene al usar el cinturón de seguridad?",
      opcion_a: "La caída del vehículo a un río o lago",
      opcion_b: "El bloqueo de la bomba de agua del motor",
      opcion_c:
        "El deslizamiento del cuerpo por debajo de la banda abdominal del cinturón en una colisión, causado por llevar el asiento demasiado reclinado o usar cojines; se previene sentándose erguido con la banda sobre la pelvis",
      opcion_d: "La pérdida de tracción en calzadas inundadas",
      respuesta_correcta: "c",
      explicacion:
        "Si el pasajero va recostado o coloca almohadones, el cuerpo se desliza por debajo del cinturón en el choque. La banda aplasta los órganos blandos del abdomen provocando hemorragias internas fatales.",
      fundamento_legal: "Manual de Referencia ANSV sobre uso correcto del cinturón de seguridad.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "dificil",
    }),
    know({
      id: "cale-l02-192",
      lote: LOTE,
      nucleo_nombre: "El vehiculo",
      subtema: "ajuste correcto del apoyacabezas",
      hecho_canonico_id: "l02-veh-07",
      pregunta:
        "¿Cuál es la regulación geométrica correcta del apoyacabezas para evitar el 'latigazo cervical' en impactos por alcance?",
      opcion_a: "Dejarlo en la posición más baja posible a nivel del cuello",
      opcion_b: "Inclinarlo hacia adelante hasta tocar la frente",
      opcion_c: "Retirarlo del asiento para tener mejor visión hacia atrás",
      opcion_d:
        "Alinear el borde superior del apoyacabezas con la parte superior de la cabeza (o altura de los ojos) y a una separación no mayor de 4 centímetros",
      respuesta_correcta: "d",
      explicacion:
        "El apoyacabezas es un elemento de seguridad pasiva, no de confort. Si queda a nivel de la nuca actúa como punto de apoyo que fractura el cuello; debe frenar el retroceso de la cabeza de inmediato.",
      fundamento_legal: "Manual de Referencia ANSV sobre prevención de lesiones cervicales.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l02-193",
      lote: LOTE,
      nucleo_nombre: "El vehiculo",
      subtema: "funcionamiento del airbag",
      hecho_canonico_id: "l02-veh-08",
      pregunta:
        "¿Cómo funciona la bolsa de aire (airbag) y qué relación guarda con el cinturón de seguridad?",
      opcion_a:
        "Se infla pirotécnicamente en milisegundos mediante sensores de desaceleración y es un sistema suplementario (SRS) que solo funciona eficazmente si se lleva puesto el cinturón",
      opcion_b:
        "El airbag se infla lentamente para permitir acostarse sobre él y reemplaza totalmente al cinturón",
      opcion_c: "Se acciona pisando a fondo el pedal del embrague",
      opcion_d: "Funciona únicamente cuando el vehículo circula a más de 120 km/h",
      respuesta_correcta: "a",
      explicacion:
        "El airbag se despliega a más de 300 km/h. Si el ocupante no lleva el cinturón, su cuerpo se estrella de frente contra la bolsa en plena expansión pirotécnica, sufriendo lesiones severas o muerte.",
      fundamento_legal: "Manual de Referencia ANSV sobre sistemas de retención suplementaria SRS.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l02-194",
      lote: LOTE,
      nucleo_nombre: "El vehiculo",
      subtema: "distancia minima al airbag frontal",
      hecho_canonico_id: "l02-veh-09",
      pregunta:
        "¿Qué distancia mínima debe mediar entre el pecho del conductor y el centro del volante que contiene el airbag frontal?",
      opcion_a: "Cinco centímetros para alcanzar mejor los pedales",
      opcion_b: "Al menos 25 centímetros de separación",
      opcion_c: "Un metro y medio de distancia",
      opcion_d: "No importa la distancia mientras los pies toquen el piso",
      respuesta_correcta: "b",
      explicacion:
        "Se requiere un margen mínimo de 25 cm para permitir que la bolsa se infle en el espacio libre antes de amortiguar el torso. Manejar pegado al volante provoca quemaduras y fracturas por el estallido.",
      fundamento_legal: "Manual de Referencia ANSV sobre ergonomía y seguridad pasiva.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l02-195",
      lote: LOTE,
      nucleo_nombre: "El vehiculo",
      subtema: "silla infantil mirando atras y airbag",
      hecho_canonico_id: "l02-veh-10",
      pregunta:
        "¿Por qué está estrictamente prohibido instalar un Sistema de Retención Infantil en sentido contrario a la marcha en el asiento delantero con airbag activo?",
      opcion_a: "Porque tapa la vista del espejo retrovisor derecho",
      opcion_b: "Porque descarga la batería del automóvil",
      opcion_c:
        "Porque al inflarse violentamente el airbag frontal golpea el respaldo de la silla infantil con una fuerza brutal capaz de causar la muerte instantánea del bebé",
      opcion_d: "Porque raya el tapizado del asiento",
      respuesta_correcta: "c",
      explicacion:
        "El airbag explota contra la cabecera de la silla de espaldas, aplastándola contra el respaldo y quebrando la columna o el cráneo del menor. Los bebés deben viajar atrás o con el airbag frontal desconectado.",
      fundamento_legal:
        "Manual de Referencia ANSV; Resolución 20253040037125; Normas técnicas de retención infantil.",
      source: SOURCES.RESOLUCION_CALE,
      dificultad: "facil",
    }),
    know({
      id: "cale-l02-196",
      lote: LOTE,
      nucleo_nombre: "El vehiculo",
      subtema: "anclajes isofix latch",
      hecho_canonico_id: "l02-veh-11",
      pregunta:
        "¿Qué ventaja ofrecen los anclajes rígidos tipo ISOFIX o LATCH en comparación con asegurar la silla infantil solo con el cinturón?",
      opcion_a: "Permiten que la silla gire 360 grados mientras el vehículo está en marcha",
      opcion_b: "Permiten usar sillas caseras de madera o plástico común",
      opcion_c: "Hacen que el niño duerma más rápido",
      opcion_d:
        "Fijan la silla infantil directamente a la estructura metálica del chasis del vehículo, reduciendo errores de instalación y evitando desplazamientos en un choque",
      respuesta_correcta: "d",
      explicacion:
        "ISOFIX/LATCH conecta la silla a argollas soldadas al chasis del auto. Evita el 70% de las malas instalaciones típicas del cinturón y minimiza la excursión hacia adelante en caso de choque.",
      fundamento_legal:
        "Manual de Referencia ANSV sobre sistemas de retención infantil homologados.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l02-197",
      lote: LOTE,
      nucleo_nombre: "El vehiculo",
      subtema: "deformacion programada de la carroceria",
      hecho_canonico_id: "l02-veh-12",
      pregunta:
        "¿Cuál es el propósito de las zonas de deformación programada en la estructura delantera y trasera de los vehículos modernos?",
      opcion_a:
        "Arrugarse y colapsar progresivamente durante el impacto para absorber la energía cinética del choque, evitando que esa fuerza destructiva se transmita a los ocupantes",
      opcion_b: "Asegurar que el carro quede completamente rígido sin abollarse en los choques",
      opcion_c: "Abaratar los costos de fabricación de las latas",
      opcion_d: "Hacer el vehículo más pesado para no patinar en el barro",
      respuesta_correcta: "a",
      explicacion:
        "Antiguamente se creía que un carro rígido era más seguro; en realidad, transfería toda la desaceleración a los órganos humanos matando a los ocupantes. La deformación programada disipa la energía.",
      fundamento_legal: "Manual de Referencia ANSV sobre ingeniería de seguridad pasiva.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l02-198",
      lote: LOTE,
      nucleo_nombre: "El vehiculo",
      subtema: "habitaculo indeformable",
      hecho_canonico_id: "l02-veh-13",
      pregunta:
        "¿Qué es la 'célula de supervivencia' o habitáculo indeformable en el diseño de seguridad pasiva?",
      opcion_a: "Un compartimiento blindado ubicado en el baúl para guardar el kit de carretera",
      opcion_b:
        "La estructura central de aceros de ultra alta resistencia que rodea a los pasajeros, diseñada para mantenerse intacta y evitar el aplastamiento del espacio vital en choques o volcamientos",
      opcion_c: "El depósito hermético de combustible",
      opcion_d: "La cubierta plástica que protege el motor",
      respuesta_correcta: "b",
      explicacion:
        "La cabina de pasajeros está construida con aceros especiales indeformables para garantizar el espacio vital de supervivencia, mientras la trompa y la cola del carro se deforman para absorber el golpe.",
      fundamento_legal:
        "Manual de Referencia ANSV sobre seguridad pasiva y resistencia estructural.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l02-199",
      lote: LOTE,
      nucleo_nombre: "El vehiculo",
      subtema: "columna de direccion colapsable",
      hecho_canonico_id: "l02-veh-14",
      pregunta:
        "¿Qué función de seguridad pasiva cumple la columna de dirección colapsable o telescópica?",
      opcion_a: "Permite doblar el timón para parquear en espacios estrechos",
      opcion_b: "Facilita la aceleración automática del automotor",
      opcion_c:
        "Se pliega o desmorona sobre sí misma en una colisión frontal para evitar que el timón y la barra de dirección penetren en el pecho del conductor",
      opcion_d: "Ajusta la altura del espejo retrovisor interior",
      respuesta_correcta: "c",
      explicacion:
        "En choques frontales severos, la fuerza empuja el motor y la caja hacia la cabina. La columna colapsable se retrae telescópicamente, impidiendo que el eje del volante impacte el tórax del conductor.",
      fundamento_legal: "Manual de Referencia ANSV sobre seguridad del puesto de mando.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
    know({
      id: "cale-l02-200",
      lote: LOTE,
      nucleo_nombre: "El vehiculo",
      subtema: "barra estabilizadora",
      hecho_canonico_id: "l02-veh-15",
      pregunta:
        "¿Qué función cumple la barra estabilizadora dentro del sistema de suspensión del automóvil?",
      opcion_a: "Frenar las ruedas traseras cuando se apaga el motor",
      opcion_b: "Cargar la batería durante los viajes nocturnos",
      opcion_c: "Sujetar el radiador al chasis para que no vibre",
      opcion_d:
        "Conectar los dos lados de la suspensión para reducir el balanceo o inclinación lateral de la carrocería en las curvas, mejorando la estabilidad",
      respuesta_correcta: "d",
      explicacion:
        "La barra de torsión estabilizadora transfiere fuerza de la rueda exterior a la interior en curvas, manteniendo el chasis más plano y evitando volcamientos o pérdidas de adherencia.",
      fundamento_legal:
        "Manual de Referencia ANSV sobre sistemas de suspensión y estabilidad dinámica.",
      source: SOURCES.MANUAL_ANSV,
      dificultad: "media",
    }),
  ],
};
