/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

const items = [
  // ==========================================
  // ACTITUDES (30 preguntas: cale-l05-401 a 430)
  // ==========================================
  {
    type: "att",
    id: "cale-l05-401",
    subtema: "deber humanitario y no fuga en siniestros",
    hecho_canonico_id: "l05-att-01",
    pregunta:
      "Usted se ve involucrado en una colisión con una motocicleta y el motociclista cae al pavimento herido. ¿Cuál es su deber legal y ético fundamental?",
    opcion_a: "Huir rápidamente del lugar para evitar problemas con la policía o la multitud",
    opcion_b:
      "Permanecer en el sitio, asegurar el área, solicitar asistencia médica de urgencias de inmediato y prestar auxilio dentro de sus posibilidades",
    opcion_c: "Esconder el vehículo en un parqueadero cercano antes de que lleguen las autoridades",
    opcion_d: "Gritar al herido acusándolo del siniestro mientras agoniza",
    respuesta_recomendada: "b",
    explicacion:
      "Darse a la fuga ante un siniestro con heridos es el delito penal de omisión de socorro. El auxilio a las víctimas y la permanencia en el lugar son deberes éticos y legales sagrados.",
    fundamento_legal:
      "Ley 769 de 2002, Art. 131, infracción D.07; Código Penal Colombiano, Art. 131 (Omisión de socorro).",
    source: "LEY_769",
    dificultad: "facil",
  },
  {
    type: "att",
    id: "cale-l05-402",
    subtema: "no ser espectador morboso que obstaculiza socorristas",
    hecho_canonico_id: "l05-att-02",
    pregunta:
      "Al pasar junto a un siniestro vial donde ya están trabajando ambulancias y policías, ¿cuál debe ser su comportamiento?",
    opcion_a:
      "Detener la marcha en medio de la calzada para grabar videos y fotos con el celular y subirlos a redes sociales",
    opcion_b:
      "Continuar la marcha con precaución a velocidad constante sin detenerse a mirar (evitar el 'efecto mirón'), dejando las vías de acceso libres para los equipos de emergencia",
    opcion_c: "Bajarse del auto a discutir con los paramédicos sobre cómo atienden a los pacientes",
    opcion_d: "Tocar la bocina insistentemente para exigir que retiren rápido a los heridos",
    respuesta_recomendada: "b",
    explicacion:
      "El 'efecto mirón' causa choques por alcance adicionales y colapsa los corredores de emergencia por donde deben transitar ambulancias hacia centros hospitalarios.",
    fundamento_legal: "Manual de Referencia ANSV sobre gestión de incidentes viales.",
    source: "MANUAL_ANSV",
    dificultad: "facil",
  },
  {
    type: "att",
    id: "cale-l05-403",
    subtema: "prudencia y no quitar el casco a motociclista herido",
    hecho_canonico_id: "l05-att-03",
    pregunta:
      "En un siniestro vial un motociclista está tendido en el asfalto quejándose de dolor en el cuello. Una persona sin conocimientos médicos intenta jalarle el casco para quitárselo. ¿Cómo actúa usted?",
    opcion_a: "Ayudarle a jalar con más fuerza para retirar el casco rápidamente",
    opcion_b:
      "Impedirlo con calma y firmeza, explicando que manipular el casco sin técnica profesional puede causar sección de la médula espinal y parálisis permanente o muerte",
    opcion_c: "Sentar al motociclista bruscamente para que recupere el aire",
    opcion_d: "Ofrecerle un vaso de gaseosa fría y pastillas para el dolor",
    respuesta_recomendada: "b",
    explicacion:
      "Retirar el casco a un herido sin entrenamiento inmovilizador desplaza las vértebras cervicales fracturadas, cortando la médula espinal. Solo personal médico entrenado debe retirarlo.",
    fundamento_legal: "Manual de Referencia ANSV sobre soporte vital y primeros auxilios viales.",
    source: "MANUAL_ANSV",
    dificultad: "facil",
  },
  {
    type: "att",
    id: "cale-l05-404",
    subtema: "respeto por estacionamientos para personas con discapacidad",
    hecho_canonico_id: "l05-att-04",
    pregunta:
      "Llega a un supermercado lloviendo y todos los parqueaderos están llenos, excepto un espacio azul reservado con el símbolo internacional de accesibilidad para personas con discapacidad. ¿Qué hace?",
    opcion_a: "Estacionar allí porque tiene prisa y solo tardará cinco minutos",
    opcion_b:
      "Respetar de forma irrestricta el espacio reservado y buscar un estacionamiento común disponible, aunque deba caminar más o esperar",
    opcion_c: "Estacionar atravesado ocupando la rampa peatonal",
    opcion_d: "Dejar el carro en ese puesto y poner las estacionarias para que no lo multen",
    respuesta_recomendada: "b",
    explicacion:
      "Las plazas azules están diseñadas con dimensiones especiales para sillas de ruedas. Usurparlas vulnera los derechos fundamentales de personas con limitaciones físicas reales.",
    fundamento_legal: "Ley 769 de 2002, Art. 131, infracción C.02; Ley 1287 de 2009.",
    source: "LEY_769",
    dificultad: "facil",
  },
  {
    type: "att",
    id: "cale-l05-405",
    subtema: "cultura de legalidad ante camaras de fotodeteccion",
    hecho_canonico_id: "l05-att-05",
    pregunta:
      "En una autopista con límite de 50 km/h señalizada con cámaras de fotodetección, ¿cuál es la conducta vial correcta?",
    opcion_a:
      "Conducir a 90 km/h y clavar los frenos en seco justo 20 metros antes de la cámara para acelerar de nuevo después",
    opcion_b:
      "Mantener una velocidad constante y segura de 50 km/h o menos a lo largo de todo el corredor vial, protegiendo la vida y no solo evitando sanciones",
    opcion_c: "Tapar la placa con un trapo o cinta para burlar la fotodetección",
    opcion_d: "Pasar pegado a un camión grande para que tape la vista del lente",
    respuesta_recomendada: "b",
    explicacion:
      "Frenar bruscamente frente a las cámaras provoca choques por alcance. La velocidad segura salva vidas en todo el trayecto, no solo frente a los puntos de fiscalización.",
    fundamento_legal: "Ley 769 de 2002; Ley 2251 de 2022; Manual de Referencia ANSV.",
    source: "LEY_769",
    dificultad: "facil",
  },
  {
    type: "att",
    id: "cale-l05-406",
    subtema: "transporte responsable de animales domesticos",
    hecho_canonico_id: "l05-att-06",
    pregunta:
      "Va a viajar con su perro en el automóvil. ¿Cuál es la forma ética y segura de transportarlo?",
    opcion_a: "Llevarlo sentado en sus piernas sobre el volante para que disfrute el viaje",
    opcion_b:
      "Llevarlo en el asiento trasero dentro de un guacal asegurado o sujeto con arnés especial adaptado al broche del cinturón de seguridad",
    opcion_c:
      "Dejarlo con la cabeza y medio cuerpo por fuera de la ventanilla delantera a alta velocidad",
    opcion_d: "Encerrarlo dentro del baúl oscuro del vehículo",
    respuesta_recomendada: "b",
    explicacion:
      "Una mascota suelta distrae al conductor, puede bloquear los pedales y en una colisión se convierte en un proyectil de alto impacto mortal para ella misma y los ocupantes.",
    fundamento_legal:
      "Ley 769 de 2002, Art. 87; Ley 1774 de 2016 (Protección Animal); Manual ANSV.",
    source: "LEY_769",
    dificultad: "facil",
  },
  {
    type: "att",
    id: "cale-l05-407",
    subtema: "prudencia ante ganado en vias rurales",
    hecho_canonico_id: "l05-att-07",
    pregunta:
      "En una vía intermunicipal divisa un lote de reses cruzando lentamente por la calzada. ¿Cómo debe proceder?",
    opcion_a: "Acelerar a fondo para que el ruido espante a los animales",
    opcion_b:
      "Detenerse o reducir la velocidad a paso de hombre, apagar luces altas si es de noche, abstenerse de tocar el pito y esperar con serenidad a que terminen de cruzar",
    opcion_c: "Embestir a una res suavemente con la defensa delantera para abrirse camino",
    opcion_d: "Bajar del vehículo a perseguir al ganado con una varilla",
    respuesta_recomendada: "b",
    explicacion:
      "El ganado asustado por ruidos o luces puede embestir el vehículo o correr desordenadamente hacia otros carros. La calma y paciencia garantizan un paso seguro.",
    fundamento_legal: "Manual de Señalización Vial 2024; Manual de Referencia ANSV.",
    source: "MANUAL_SENALIZACION",
    dificultad: "facil",
  },
  {
    type: "att",
    id: "cale-l05-408",
    subtema: "etica ante danos menores a vehiculos estacionados",
    hecho_canonico_id: "l05-att-08",
    pregunta:
      "Al parquear en un estacionamiento público roza accidentalmente la puerta de otro vehículo causándole un raspón visible, pero nadie lo vio. ¿Cómo actúa con integridad?",
    opcion_a: "Acelerar y marcharse de inmediato del lugar antes de que alguien lo note",
    opcion_b:
      "Esperar al propietario o dejarle una nota visible con sus datos de contacto y teléfono para responder civilmente por el daño ocasionado",
    opcion_c: "Pintar el raspón con un marcador negro y culpar al celador del parqueadero",
    opcion_d: "Patear la otra puerta para igualar el golpe",
    respuesta_recomendada: "b",
    explicacion:
      "La honradez y responsabilidad civil fortalecen el tejido social. Responder por los daños causados involuntariamente es la marca de un ciudadano ejemplar.",
    fundamento_legal: "Código Civil Colombiano; Ley 769 de 2002, Art. 55.",
    source: "LEY_769",
    dificultad: "facil",
  },
  {
    type: "att",
    id: "cale-l05-409",
    subtema: "tranquilidad y respeto acustico nocturno",
    hecho_canonico_id: "l05-att-09",
    pregunta:
      "Llega a medianoche a su barrio residencial. ¿Qué comportamiento demuestra consideración hacia sus vecinos?",
    opcion_a: "Tocar varios pitazos fuertes para que le abran la reja del garaje",
    opcion_b:
      "Llegar a baja velocidad, sin revolucionar el motor ni tocar la bocina, apagando las luces altas para no alumbrar las ventanas de las viviendas",
    opcion_c: "Dejar el equipo de sonido encendido a todo volumen con las puertas abiertas",
    opcion_d: "Acelerar el carro en neutro varias veces antes de apagarlo",
    respuesta_recomendada: "b",
    explicacion:
      "El descanso nocturno es un derecho ciudadano. La conducción silenciosa y considerada en zonas habitacionales evita perturbaciones del sueño y conflictos vecinales.",
    fundamento_legal: "Ley 769 de 2002, Art. 104; Ley 1801 de 2016 (Código de Convivencia).",
    source: "LEY_769",
    dificultad: "facil",
  },
  {
    type: "att",
    id: "cale-l05-410",
    subtema: "cultura de aprendizaje continuo del conductor",
    hecho_canonico_id: "l05-att-10",
    pregunta:
      "Un conductor que lleva 20 años manejando afirma que no necesita aprender nada nuevo ni leer leyes de tránsito actualizadas. ¿Cómo califica esta postura?",
    opcion_a: "Totalmente acertada, porque la experiencia práctica reemplaza a cualquier ley",
    opcion_b:
      "Errónea y riesgosa, pues las normas, tecnologías vehiculares y dinámicas viales evolucionan continuamente, requiriendo actualización y humildad para corregir malos hábitos",
    opcion_c: "Excelente, porque los conductores antiguos conducen mejor que nadie",
    opcion_d: "Indiferente, siempre y cuando no reciba comparendos",
    respuesta_recomendada: "b",
    explicacion:
      "El sesgo de omnisciencia o exceso de confianza ciega a los conductores veteranos. Leyes como la 2251 de 2022 cambiaron velocidades y reglas que todo ciudadano debe conocer y aplicar.",
    fundamento_legal: "Manual de Referencia ANSV sobre formación continua y seguridad vial.",
    source: "MANUAL_ANSV",
    dificultad: "facil",
  },
  {
    type: "att",
    id: "cale-l05-411",
    subtema: "serenidad ante trancones por emergencias",
    hecho_canonico_id: "l05-att-11",
    pregunta:
      "Queda atrapado en un monumental trancón en carretera debido al cierre por un rescate tras un choque grave. ¿Qué actitud mental debe asumir?",
    opcion_a: "Enojarse, gritar e intentar circular en contravía por el carril opuesto",
    opcion_b:
      "Comprender la gravedad de la situación humana, ser paciente, mantener el vehículo en su carril con motor apagado si está detenido y no bloquear los pasos de auxilio",
    opcion_c: "Bajar a pelear con los agentes de policía que custodian la zona de rescate",
    opcion_d: "Quitar los conos de seguridad puestos por los bomberos para pasar",
    respuesta_recomendada: "b",
    explicacion:
      "La empatía ante la tragedia ajena es esencial. El tiempo de retraso no se compara con la vida de personas atrapadas o atendidas por socorristas en la vía.",
    fundamento_legal: "Ley 769 de 2002, Art. 55; Manual de Referencia ANSV.",
    source: "MANUAL_ANSV",
    dificultad: "facil",
  },
  {
    type: "att",
    id: "cale-l05-412",
    subtema: "rechazo al acoso callejero en la via",
    hecho_canonico_id: "l05-att-12",
    pregunta:
      "Un conductor hace sonar la bocina y lanza piropos o comentarios lascivos por la ventana a una mujer que camina o se desplaza en bicicleta. ¿Cómo califica este acto?",
    opcion_a: "Una costumbre aceptable y cordial de cortejo vial",
    opcion_b:
      "Una manifestación violenta e inaceptable de acoso callejero que intimida, distrae y vulnera la dignidad y la seguridad de las mujeres en el espacio público",
    opcion_c: "Un saludo normal permitido si no se baja del carro",
    opcion_d: "Una falta leve que solo se sanciona si hay un policía al lado",
    respuesta_recomendada: "b",
    explicacion:
      "El acoso callejero desde automotores degrada el espacio vial y genera riesgo de atropello o desestabilización a ciclistas y peatonas al sentirse amenazadas.",
    fundamento_legal:
      "Ley 1257 de 2008; Ley 1801 de 2016; Manual de Referencia ANSV con enfoque de género.",
    source: "MANUAL_ANSV",
    dificultad: "facil",
  },
  {
    type: "att",
    id: "cale-l05-413",
    subtema: "atencion a personas con baston blanco",
    hecho_canonico_id: "l05-att-13",
    pregunta:
      "En una esquina sin semáforo observa a una persona con un bastón blanco extendido disponiéndose a cruzar la calle. ¿Qué debe hacer inmediatamente?",
    opcion_a: "Acelerar para cruzar antes de que baje a la calzada",
    opcion_b:
      "Detener totalmente el vehículo a distancia prudente y cederle el paso absoluto con paciencia y en silencio sin tocar la bocina",
    opcion_c: "Tocar la bocina repetidamente para avisarle que va a pasar un carro",
    opcion_d: "Gritarle desde el carro por dónde debe caminar",
    respuesta_recomendada: "b",
    explicacion:
      "El bastón blanco identifica a personas con discapacidad visual total. Tocar la bocina las desorienta gravemente y les causa pánico. La detención silenciosa garantiza su cruce seguro.",
    fundamento_legal: "Ley 769 de 2002, Art. 105; Ley 982 de 2005.",
    source: "LEY_769",
    dificultad: "facil",
  },
  {
    type: "att",
    id: "cale-l05-414",
    subtema: "seguridad de menores seguros de ninos en puertas",
    hecho_canonico_id: "l05-att-14",
    pregunta:
      "Va a transportar a dos niños pequeños en el asiento trasero de su vehículo familiar. ¿Qué medida de prevención técnica debe verificar antes de arrancar?",
    opcion_a: "Abrir las ventanas al máximo para que puedan sacar los brazos",
    opcion_b:
      "Activar el seguro infantil mecánico en el canto de las puertas traseras y bloquear los elevavidrios eléctricos desde la consola del conductor",
    opcion_c: "Permitirles viajar de pie entre los dos asientos delanteros",
    opcion_d: "No ponerles el cinturón de seguridad para que no se sientan incómodos",
    respuesta_recomendada: "b",
    explicacion:
      "El bloqueo de niños en puertas y ventanillas impide que un infante abra intempestivamente la puerta en marcha o asome su cabeza, evitando caídas o atrapamientos trágicos.",
    fundamento_legal:
      "Manual de Referencia ANSV sobre seguridad de menores a bordo; Ley 769 de 2002, Art. 82.",
    source: "MANUAL_ANSV",
    dificultad: "facil",
  },
  {
    type: "att",
    id: "cale-l05-415",
    subtema: "cuidado ante charcos y salpicaduras",
    hecho_canonico_id: "l05-att-15",
    pregunta:
      "Al doblar en una esquina bajo lluvia hay un gran encharcamiento cerca del paradero donde esperan varias personas vestidas de trabajo. ¿Cómo procede?",
    opcion_a: "Pasar a toda velocidad levantando una ola de agua para limpiar el chasis",
    opcion_b:
      "Reducir la velocidad al mínimo indispensable para no salpicar agua ni ensuciar a los usuarios del transporte público",
    opcion_c: "Pitarles para que se alejen corriendo bajo la lluvia",
    opcion_d: "Girar bruscamente patinando las llantas traseras",
    respuesta_recomendada: "b",
    explicacion:
      "Empapar intencionalmente o por desidia a ciudadanos en paraderos es una cobardía y falta de empatía elemental. Conducir a paso lento demuestra respeto por el prójimo.",
    fundamento_legal: "Ley 769 de 2002, Art. 55; Código de Policía y Convivencia.",
    source: "LEY_769",
    dificultad: "facil",
  },
  {
    type: "att",
    id: "cale-l05-416",
    subtema: "responsabilidad al vender o transferir un vehiculo",
    hecho_canonico_id: "l05-att-16",
    pregunta:
      "Vende su automóvil usado a otra persona. ¿Cuál es la única manera legal y responsable de formalizar la entrega?",
    opcion_a:
      "Firmar una servilleta o carta informal y entregar las llaves sin hacer traspaso ante el organismo de tránsito",
    opcion_b:
      "Radicar y culminar el trámite oficial de traspaso ante el Organismo de Tránsito correspondiente y el RUNT, transfiriendo legalmente la titularidad al comprador",
    opcion_c:
      "Dejar el vehículo a su nombre indefinidamente para que el comprador no pague impuestos",
    opcion_d: "Botar las placas viejas a la basura y no avisar a nadie",
    respuesta_recomendada: "b",
    explicacion:
      "Vender un vehículo con traspaso 'abierto' mantiene al vendedor como responsable solidario de fotocomparendos, siniestros con víctimas o delitos cometidos con el automotor.",
    fundamento_legal: "Ley 769 de 2002, Art. 47; Decreto 019 de 2012; Normas RUNT.",
    source: "LEY_769",
    dificultad: "media",
  },
  {
    type: "att",
    id: "cale-l05-417",
    subtema: "respeto por la privacidad y datos personales en siniestros",
    hecho_canonico_id: "l05-att-17",
    pregunta:
      "En una colisión simple sin lesionados, ambos conductores intercambian datos para sus aseguradoras. ¿Cómo deben tratarse esos datos?",
    opcion_a:
      "Publicar las fotos de la cédula y dirección del otro conductor en redes sociales incitando al odio",
    opcion_b:
      "Usar los datos exclusivamente para el trámite asegurador y conciliación legal con estricta reserva y respeto a la privacidad",
    opcion_c: "Llamar a altas horas de la noche a amenazar a la familia del otro conductor",
    opcion_d: "Vender los datos a bases de cobros irregulares",
    respuesta_recomendada: "b",
    explicacion:
      "El tratamiento de datos personales en siniestros viales está protegido por la ley de Habeas Data. El uso indebido o difusión pública para hostigamiento es punible.",
    fundamento_legal: "Ley 1581 de 2012; Ley 769 de 2002.",
    source: "LEY_769",
    dificultad: "facil",
  },
  {
    type: "att",
    id: "cale-l05-418",
    subtema: "rechazo al consumo de alcohol aun en dosis minimas",
    hecho_canonico_id: "l05-att-18",
    pregunta:
      "En una reunión de negocios le sirven una sola copa de vino y luego debe manejar su automóvil de regreso a casa. ¿Cuál es la decisión correcta?",
    opcion_a: "Tomarse la copa asumiendo que una sola bebida no afecta los reflejos",
    opcion_b:
      "Abstenerse de ingerir la copa de vino o dejar el vehículo estacionado y regresar en taxi, asumiendo la política de cero alcohol al volante",
    opcion_c: "Tomársela rápido y masticar chicle de menta para engañar al alcohosensor",
    opcion_d: "Conducir por calles oscuras para evadir los retenes de la policía",
    respuesta_recomendada: "b",
    explicacion:
      "En Colombia rige la Ley 1696 de 2013 con tolerancia cero a partir de 20 mg de etanol (Grado Cero). Incluso una sola copa altera la visión periférica y conlleva multas millonarias y suspensión de licencia.",
    fundamento_legal: "Ley 1696 de 2013, Art. 1; Ley 769 de 2002, Art. 152.",
    source: "LEY_1696",
    dificultad: "facil",
  },
  {
    type: "att",
    id: "cale-l05-419",
    subtema: "actitud ante vehiculos de traccion electrica silenciosos",
    hecho_canonico_id: "l05-att-19",
    pregunta:
      "Usted conduce un vehículo 100 % eléctrico por una calle peatonal o compartida. ¿Qué precaución extra debe asumir éticamente?",
    opcion_a: "Acelerar fuerte y pitar a cada paso para que la gente le abra camino",
    opcion_b:
      "Redoblar la atención y circular a paso muy lento, reconociendo que los peatones no escuchan el sonido de un motor de combustión y pueden cruzar sin advertir su presencia",
    opcion_c: "Instalar una sirena de ambulancia en el techo",
    opcion_d: "Asumir que los peatones siempre miran hacia atrás antes de dar un paso",
    respuesta_recomendada: "b",
    explicacion:
      "Los vehículos eléctricos son prácticamente inaudibles a bajas velocidades. La responsabilidad de evitar atropellos recae enteramente en la extrema prudencia del conductor.",
    fundamento_legal: "Manual de Referencia ANSV sobre nuevas tecnologías y usuarios vulnerables.",
    source: "MANUAL_ANSV",
    dificultad: "facil",
  },
  {
    type: "att",
    id: "cale-l05-420",
    subtema: "autocontrol ante comparendos o sanciones",
    hecho_canonico_id: "l05-att-20",
    pregunta:
      "Un agente de tránsito le impone una orden de comparendo por una infracción cometida. ¿Cómo debe canalizar su desacuerdo si considera que no la cometió?",
    opcion_a: "Agredir física o verbalmente al agente y romper la boleta en pedazos",
    opcion_b:
      "Recibir la orden de comparendo con respeto y ejercer su derecho constitucional a la defensa solicitando audiencia pública ante el inspector de tránsito dentro de los plazos legales",
    opcion_c: "Ofrecer dinero en efectivo al policía para que no cargue la multa al sistema",
    opcion_d: "Bloquear la vía con su vehículo en señal de protesta",
    respuesta_recomendada: "b",
    explicacion:
      "El soborno es el delito de cohecho y la agresión es violencia contra servidor público. El Estado de derecho contempla vías institucionales formales para impugnar comparendos en audiencias.",
    fundamento_legal: "Ley 769 de 2002, Art. 136; Código Penal Colombiano, Art. 407 (Cohecho).",
    source: "LEY_769",
    dificultad: "facil",
  },
  {
    type: "att",
    id: "cale-l05-421",
    subtema: "respeto en accesos a colegios y guarderias",
    hecho_canonico_id: "l05-att-21",
    pregunta:
      "Va a dejar a su hijo en el colegio en hora pico matinal. ¿Cómo debe actuar en la puerta de la institución?",
    opcion_a:
      "Estacionar en triple fila bloqueando el carril de circulación mientras se baja a conversar",
    opcion_b:
      "Utilizar las zonas de descargue rápido autorizadas, hacer el descenso ágilmente por el lado del andén y reiniciar la marcha sin obstruir el flujo escolar",
    opcion_c: "Subir el automóvil sobre la acera peatonal para que el niño no camine",
    opcion_d:
      "Dejar el carro en la mitad de la calle con las luces estacionarias encendidas por 20 minutos",
    respuesta_recomendada: "b",
    explicacion:
      "El parqueo en doble o triple fila frente a escuelas genera caos vial, obliga a los niños a caminar entre autos en movimiento y dispara el riesgo de atropello.",
    fundamento_legal: "Ley 769 de 2002, Art. 76 y Art. 131, infracción C.02.",
    source: "LEY_769",
    dificultad: "facil",
  },
  {
    type: "att",
    id: "cale-l05-422",
    subtema: "prudencia en maniobras de incorporacion desde predios",
    hecho_canonico_id: "l05-att-22",
    pregunta:
      "Va a salir con su automóvil desde el garaje de su casa hacia la calle cruzando el andén peatonal. ¿Cómo debe realizar la maniobra?",
    opcion_a: "Salir marcha atrás a gran velocidad tocando la bocina para que los peatones corran",
    opcion_b:
      "Asomar la trompa muy lentamente a paso de peatón, detenerse totalmente antes de cruzar la acera, ceder el paso a peatones y ciclistas y solo ingresar a la vía cuando esté despejada",
    opcion_c:
      "Salir mirando únicamente hacia el lado de donde vienen los carros sin mirar la acera",
    opcion_d: "Acelerar a fondo confiando en que nadie camina a esa hora",
    respuesta_recomendada: "b",
    explicacion:
      "Al salir de un predio privado o garaje los peatones en el andén tienen prelación absoluta sobre cualquier automotor. Salir a ciegas es causa frecuente de atropellos infantiles.",
    fundamento_legal: "Ley 769 de 2002, Art. 66 y Art. 105.",
    source: "LEY_769",
    dificultad: "facil",
  },
  {
    type: "att",
    id: "cale-l05-423",
    subtema: "cuidado del habitaculo libre de humos toxicos",
    hecho_canonico_id: "l05-att-23",
    pregunta:
      "Viaja con niños o personas vulnerables en el vehículo. ¿Cuál es la postura ética sobre fumar o vapear dentro del habitáculo cerrado?",
    opcion_a: "Está permitido si se baja un centímetro la ventanilla del conductor",
    opcion_b:
      "Debe prohibirse totalmente, protegiendo la salud pulmonar de los ocupantes contra el humo de segunda mano y evitando distracciones con fósforos o cenizas",
    opcion_c: "Es recomendable para tranquilizar los nervios del conductor",
    opcion_d: "Solo está prohibido si el vehículo es de servicio público",
    respuesta_recomendada: "b",
    explicacion:
      "Fumar en cabinas cerradas satura el aire de sustancias cancerígenas y monóxido de carbono, además de que la manipulación de cigarrillos o vapeadores distrae la vista y las manos.",
    fundamento_legal: "Ley 1335 de 2009 (Control del Tabaco); Manual de Referencia ANSV.",
    source: "MANUAL_ANSV",
    dificultad: "facil",
  },
  {
    type: "att",
    id: "cale-l05-424",
    subtema: "empatia ante personas que cruzan fuera de la cebra",
    hecho_canonico_id: "l05-att-24",
    pregunta:
      "Un peatón cruza imprudentemente la calzada a mitad de cuadra fuera del paso peatonal. ¿Cuál debe ser la reacción del conductor?",
    opcion_a: "Acelerar para asustarlo y 'enseñarle' a cruzar por la esquina",
    opcion_b:
      "Frenar a tiempo con serenidad y proteger su vida, reconociendo que el derecho a la vida prima de forma absoluta sobre cualquier error o imprudencia humana",
    opcion_c: "Rozarlo intencionalmente con el espejo para golpearlo de forma leve",
    opcion_d: "Lanzarle insultos y bajarse a golpearlo",
    respuesta_recomendada: "b",
    explicacion:
      "El enfoque de Sistema Seguro y la Constitución Política protegen la vida como valor supremo. Ninguna imprudencia peatonal justifica una agresión o atropello voluntario.",
    fundamento_legal:
      "Constitución Política de Colombia, Art. 11; Manual de Referencia ANSV sobre Visión Cero.",
    source: "MANUAL_ANSV",
    dificultad: "facil",
  },
  {
    type: "att",
    id: "cale-l05-425",
    subtema: "atencion a la senalizacion de lechos de frenado",
    hecho_canonico_id: "l05-att-25",
    pregunta:
      "En una prolongada bajada de cordillera observa la entrada a un lecho o rampa de frenado de emergencia. ¿Está permitido usarla para descansar o tomarse fotos?",
    opcion_a: "Sí, siempre que no haya camiones bajando en ese instante",
    opcion_b:
      "No, está terminantemente prohibido estacionar o bloquear una rampa de frenado, pues es el único salvavidas de un camión sin frenos que puede ingresar a 120 km/h en cualquier segundo",
    opcion_c: "Sí, si se ponen las luces estacionarias",
    opcion_d: "Es un mirador turístico habilitado por la concesión",
    respuesta_recomendada: "b",
    explicacion:
      "Bloquear un lecho de frenado es un acto de demencia vial que causaría la muerte inmediata de los ocupantes si un tractocamión sin frenos ingresa a la rampa de escape.",
    fundamento_legal: "Manual de Señalización Vial 2024; Ley 769 de 2002, Art. 76.",
    source: "MANUAL_SENALIZACION",
    dificultad: "facil",
  },
  {
    type: "att",
    id: "cale-l05-426",
    subtema: "responsabilidad ante vidrios templados laterales rotos",
    hecho_canonico_id: "l05-att-26",
    pregunta:
      "Una ventana lateral de su vehículo sufre un golpe y queda reemplazada por un plástico opaco improvisado pegado con cinta. ¿Qué actitud asume?",
    opcion_a: "Conducir indefinidamente con el plástico porque no entra frío",
    opcion_b:
      "Reparar e instalar el vidrio de seguridad reglamentario de inmediato antes de volver a transitar, pues el plástico anula la visibilidad por espejos y no brinda protección en caso de impacto",
    opcion_c: "Quitar también la otra ventana para igualar el aspecto",
    opcion_d: "Pintar el plástico de color negro para mejorar la privacidad",
    respuesta_recomendada: "b",
    explicacion:
      "Circular con ventanas cubiertas por plásticos opacos crea puntos ciegos totales laterales, impidiendo ver motociclistas y ciclistas, y constituye infracción técnico-mecánica.",
    fundamento_legal: "Ley 769 de 2002, Art. 50 y Art. 131, infracción C.35.",
    source: "LEY_769",
    dificultad: "facil",
  },
  {
    type: "att",
    id: "cale-l05-427",
    subtema: "convivencia con vehiculos funerarios o caravanas de duelo",
    hecho_canonico_id: "l05-att-27",
    pregunta:
      "Se encuentra en su recorrido con un cortejo o caravana fúnebre debidamente identificada que avanza despacio. ¿Cómo debe comportarse?",
    opcion_a: "Meterse en medio de la fila de vehículos fúnebres para adelantar rápido",
    opcion_b:
      "Guardar respeto, no tocar la bocina, no cortar la comitiva y permitir su desplazamiento ordenado",
    opcion_c: "Hacer señales agresivas al carro fúnebre para que acelere",
    opcion_d: "Prender las luces altas y pegar su parachoques al cortejo",
    respuesta_recomendada: "b",
    explicacion:
      "El respeto ante el duelo ajeno es un pilar de la cultura ciudadana y convivencia pacífica en las vías públicas.",
    fundamento_legal: "Ley 769 de 2002, Art. 55; Manual de Referencia ANSV.",
    source: "LEY_769",
    dificultad: "facil",
  },
  {
    type: "att",
    id: "cale-l05-428",
    subtema: "responsabilidad en la disposicion final de llantas y aceites",
    hecho_canonico_id: "l05-att-28",
    pregunta:
      "Realiza el cambio de aceite y llantas de su vehículo. ¿Dónde deben entregarse los residuos usados?",
    opcion_a: "Arrojarlos a una quebrada o alcantarilla de la calle",
    opcion_b:
      "Entregarlos exclusivamente en puntos de recolección posconsumo o talleres certificados para su reciclaje ambiental seguro",
    opcion_c: "Quemarlos en un lote baldío en la noche",
    opcion_d: "Enterrarlos en el jardín de la casa",
    respuesta_recomendada: "b",
    explicacion:
      "Un solo litro de aceite contamina hasta un millón de litros de agua potable. Los aceites y neumáticos usados deben ingresar a cadenas autorizadas de posconsumo ambiental.",
    fundamento_legal:
      "Resolución 1457 de 2010 (Llantas usadas) y normatividad MinAmbiente; Ley 1801 de 2016.",
    source: "MANUAL_ANSV",
    dificultad: "facil",
  },
  {
    type: "att",
    id: "cale-l05-429",
    subtema: "prudencia en el cruce de puentes estrechos",
    hecho_canonico_id: "l05-att-29",
    pregunta:
      "Al aproximarse a un puente de un solo carril ve que del otro lado ya ingresó un camión pesado a la estructura. ¿Qué debe hacer?",
    opcion_a: "Acelerar a fondo para meterse al puente y obligar al camión a retroceder",
    opcion_b:
      "Detenerse antes del acceso al puente, esperar con paciencia a que el camión termine de cruzar y solo después iniciar el paso",
    opcion_c: "Tocar la bocina y meter la mitad del carro en el puente",
    opcion_d: "Adelantar la fila de espera por la derecha",
    respuesta_recomendada: "b",
    explicacion:
      "En puentes angostos de un solo sentido alterno quien ya ingresó tiene prelación. Forzar el ingreso causa bloqueos insolubles y alto riesgo de caída al vacío.",
    fundamento_legal: "Manual de Señalización Vial 2024; Ley 769 de 2002, Art. 70.",
    source: "MANUAL_SENALIZACION",
    dificultad: "facil",
  },
  {
    type: "att",
    id: "cale-l05-430",
    subtema: "honestidad y preparacion en el examen cale",
    hecho_canonico_id: "l05-att-30",
    pregunta:
      "Un tramitador ilegal le ofrece 'garantizarle el aprobado' en el examen teórico del CALE mediante cámaras ocultas o suplantación. ¿Cuál es su decisión?",
    opcion_a: "Aceptar para no tener que estudiar las normas de tránsito",
    opcion_b:
      "Rechazar enérgicamente el fraude, denunciar al tramitador y estudiar con dedicación para aprobar el examen por mérito y conocimiento propio",
    opcion_c: "Pagarle la mitad antes del examen y la otra mitad después",
    opcion_d: "Recomendar el tramitador a otros aspirantes a conductor",
    respuesta_recomendada: "b",
    explicacion:
      "El examen CALE evalúa conocimientos indispensables para no causar la muerte de seres humanos en las vías. Quien compra una licencia comete fraude y se convierte en un peligro andante.",
    fundamento_legal: "Resolución 20253040037125; Código Penal Colombiano, Art. 289 y Art. 296.",
    source: "RESOLUCION_CALE",
    dificultad: "facil",
  },

  // ==========================================
  // MOVILIDAD SEGURA Y SOSTENIBLE (25 preguntas: cale-l05-431 a 455)
  // ==========================================
  {
    type: "know",
    id: "cale-l05-431",
    nucleo_nombre: "Movilidad segura y sostenible",
    subtema: "protocolo pas paso 1 proteger",
    hecho_canonico_id: "l05-mov-01",
    pregunta:
      "En el protocolo internacional y de la ANSV ante siniestros viales PAS (Proteger, Avisar, Socorrer), ¿cuál es la primera acción obligatoria en la etapa de PROTEGER?",
    opcion_a: "Sacar a las víctimas jalándolas de los brazos a toda velocidad",
    opcion_b:
      "Garantizar la propia seguridad y la de la escena (chaleco reflectivo, estacionar seguro, apagar motores siniestrados y colocar señales reflectivas de advertencia)",
    opcion_c: "Llamar a los familiares de los accidentados",
    opcion_d: "Mover los vehículos para que no estorben el tráfico",
    respuesta_correcta: "b",
    explicacion:
      "La regla de oro del socorrismo es no convertirse en una nueva víctima. Proteger el lugar evita que otros vehículos colisionen contra la escena y los auxiliadores.",
    fundamento_legal: "Manual de Referencia ANSV sobre protocolo PAS y primeros auxilios.",
    source: "MANUAL_ANSV",
    dificultad: "facil",
  },
  {
    type: "know",
    id: "cale-l05-432",
    nucleo_nombre: "Movilidad segura y sostenible",
    subtema: "protocolo pas paso 2 avisar",
    hecho_canonico_id: "l05-mov-02",
    pregunta:
      "Durante la etapa de AVISAR en el protocolo PAS, ¿a qué líneas de emergencia en Colombia debe comunicarse y qué información crítica debe suministrar?",
    opcion_a:
      "A la línea 123 o al #767 de Policía de Carreteras, indicando ubicación exacta (dirección o poste PR), número de heridos, estado aparente y riesgos especiales (fuego, químicos)",
    opcion_b: "A las redes sociales para publicar una transmisión en vivo",
    opcion_c: "A una empresa de grúas particulares para negociar tarifas de remolque",
    opcion_d: "Únicamente a la aseguradora privada sin avisar a las autoridades de salud",
    respuesta_correcta: "a",
    explicacion:
      "Llamar al 123 o al #767 con datos precisos de georreferenciación y estado de víctimas activa el despacho inmediato de ambulancias medicalizadas y cuerpos de rescate adecuados.",
    fundamento_legal: "Manual de Referencia ANSV; Sistema Nacional de Gestión del Riesgo.",
    source: "MANUAL_ANSV",
    dificultad: "facil",
  },
  {
    type: "know",
    id: "cale-l05-433",
    nucleo_nombre: "Movilidad segura y sostenible",
    subtema: "protocolo pas paso 3 socorrer principios basicos",
    hecho_canonico_id: "l05-mov-03",
    pregunta:
      "¿Cuál es el principio rector fundamental en la etapa de SOCORRER a heridos de un siniestro vial?",
    opcion_a: "'Curar todas las heridas en el sitio cueste lo que cueste'",
    opcion_b:
      "'Primero no hacer daño' (primum non nocere): brindar apoyo vital básico, calmar al herido y evitar maniobras que puedan agravar sus lesiones",
    opcion_c: "'Hacer caminar al herido de inmediato para que no se duerma'",
    opcion_d: "'Suministrar bebidas alcohólicas para desinfectar el organismo'",
    respuesta_correcta: "b",
    explicacion:
      "En primeros auxilios viales la premisa cardinal es proteger las funciones vitales sin empeorar traumatismos espinales o fracturas mediante manipulaciones bruscas e inadecuadas.",
    fundamento_legal: "Manual de Referencia ANSV sobre atención prehospitalaria básica.",
    source: "MANUAL_ANSV",
    dificultad: "facil",
  },
  {
    type: "know",
    id: "cale-l05-434",
    nucleo_nombre: "Movilidad segura y sostenible",
    subtema: "prohibicion de mover a heridos de siniestro vial",
    hecho_canonico_id: "l05-mov-04",
    pregunta:
      "¿Por qué NO se debe mover ni trasladar a un herido de siniestro vial, salvo que exista riesgo inminente de explosión, incendio o atropello?",
    opcion_a: "Porque se ensucia la tapicería de los otros carros",
    opcion_b:
      "Porque un movimiento incorrecto de la columna vertebral puede seccionar la médula espinal, provocando tetraplejía permanente o muerte instantánea",
    opcion_c: "Porque la ambulancia cobra una tarifa más alta si el herido ya fue movido",
    opcion_d: "Porque el herido debe esperar sentado sin hablar",
    respuesta_correcta: "b",
    explicacion:
      "En todo trauma vehicular debe sospecharse lesión de columna cervical. Mover al herido sin camilla rígida ni collarín inmovilizador puede convertir una fisura ósea en una parálisis irreparable.",
    fundamento_legal: "Manual de Referencia ANSV sobre soporte vital y cinemática del trauma.",
    source: "MANUAL_ANSV",
    dificultad: "facil",
  },
  {
    type: "know",
    id: "cale-l05-435",
    nucleo_nombre: "Movilidad segura y sostenible",
    subtema: "no suministrar agua alimentos ni pastillas a lesionados",
    hecho_canonico_id: "l05-mov-05",
    pregunta:
      "¿Por qué está contraindicado suministrar agua, café, alimentos o pastillas analgésicas a una persona herida en un siniestro vial?",
    opcion_a: "Porque los alimentos alteran el color de la sangre",
    opcion_b:
      "Porque si pierde el conocimiento puede broncoaspirar (ahogarse con su propio vómito), y si requiere cirugía de urgencia el estómago debe estar completamente vacío para la anestesia general",
    opcion_c: "Porque los analgésicos apagan el motor de la ambulancia",
    opcion_d: "Porque el agua fría provoca fiebre instantánea",
    respuesta_correcta: "b",
    explicacion:
      "Dar de beber a un traumatizado puede ahogarlo si su nivel de consciencia decae; además, la ingesta reciente retrasa cirugías urgentes vitales debido al riesgo de aspiración pulmonar por anestesia.",
    fundamento_legal: "Manual de Referencia ANSV sobre principios de primeros auxilios viales.",
    source: "MANUAL_ANSV",
    dificultad: "facil",
  },
  {
    type: "know",
    id: "cale-l05-436",
    nucleo_nombre: "Movilidad segura y sostenible",
    subtema: "control de hemorragia externa por presion directa",
    hecho_canonico_id: "l05-mov-06",
    pregunta:
      "¿Cuál es la maniobra de primeros auxilios más efectiva para contener una hemorragia externa severa en una extremidad?",
    opcion_a: "Echar tierra seca o café molido directamente dentro de la herida",
    opcion_b:
      "Efectuar presión directa y firme sobre la herida con un apósito, gasa o paño limpio de forma sostenida sin retirarlo",
    opcion_c: "Lavar la herida con agua hirviendo",
    opcion_d: "Aplicar un torniquete improvisado con alambre apretado al cuello",
    respuesta_correcta: "b",
    explicacion:
      "La compresión directa detiene el flujo sanguíneo favoreciendo la coagulación. Si el paño se empapa, se coloca otro encima sin retirar el primero para no romper los coágulos incipientes.",
    fundamento_legal:
      "Manual de Referencia ANSV; Guías Internacionales de Primeros Auxilios de la Cruz Roja.",
    source: "MANUAL_ANSV",
    dificultad: "facil",
  },
  {
    type: "know",
    id: "cale-l05-437",
    nucleo_nombre: "Movilidad segura y sostenible",
    subtema: "posicion lateral de seguridad pls",
    hecho_canonico_id: "l05-mov-07",
    pregunta:
      "¿En qué situación clínica se utiliza la Posición Lateral de Seguridad (PLS) para un lesionado de siniestro vial?",
    opcion_a: "Cuando la persona está completamente consciente y caminando sin problemas",
    opcion_b:
      "En personas inconscientes que RESPIRAN con normalidad y no presentan traumatismo evidente de columna ni fracturas graves, para evitar que la lengua obstruya las vías aéreas o se asfixien con vómito",
    opcion_c: "Cuando la persona no respira ni tiene pulso",
    opcion_d: "Para hacerle masajes en la espalda al herido",
    respuesta_correcta: "b",
    explicacion:
      "La PLS mantiene despejada la vía aérea al evitar que la lengua caiga hacia atrás y permite la salida libre de fluidos o vómito al exterior en personas inconscientes con respiración espontánea.",
    fundamento_legal: "Manual de Referencia ANSV sobre soporte vital básico.",
    source: "MANUAL_ANSV",
    dificultad: "media",
  },
  {
    type: "know",
    id: "cale-l05-438",
    nucleo_nombre: "Movilidad segura y sostenible",
    subtema: "conduccion segura en tuneles reglas de oro",
    hecho_canonico_id: "l05-mov-08",
    pregunta:
      "¿Cuáles son las tres reglas obligatorias de seguridad antes de ingresar y durante la circulación en un túnel vial?",
    opcion_a: "Encender luces altas, acelerar a fondo y tocar la bocina en el interior",
    opcion_b:
      "Encender las luces bajas antes de ingresar, quitarse las gafas oscuras y mantener mayor distancia de seguridad sin cambiar indebidamente de carril",
    opcion_c: "Apagar todas las luces y abrir las cuatro puertas",
    opcion_d: "Detenerse en la entrada a tomar fotografías de la estructura",
    respuesta_correcta: "b",
    explicacion:
      "El túnel es un ambiente confinado de alto riesgo. Encender luces bajas combate la penumbra, quitarse gafas evita ceguera súbita al ingresar y guardar distancia previene siniestros masivos.",
    fundamento_legal:
      "Manual de Señalización Vial 2024; Manual de Referencia ANSV sobre túneles viales.",
    source: "MANUAL_SENALIZACION",
    dificultad: "facil",
  },
  {
    type: "know",
    id: "cale-l05-439",
    nucleo_nombre: "Movilidad segura y sostenible",
    subtema: "actuacion ante averia o humo dentro de un tunel",
    hecho_canonico_id: "l05-mov-09",
    pregunta:
      "Si su vehículo sufre una avería grave o incendio dentro de un túnel largo, ¿cuál es el procedimiento seguro de evacuación?",
    opcion_a: "Quedarse encerrado dentro del carro con las ventanas cerradas esperando auxilio",
    opcion_b:
      "Orillarse a un apartadero o al borde derecho, apagar motor dejando la llave puesta, encender estacionarias, alertar por el poste SOS y evacuar a pie hacia la salida de emergencia más cercana siguiendo las señales verdes",
    opcion_c: "Girar en U y conducir en contravía a toda velocidad dentro del túnel",
    opcion_d: "Caminar por la mitad de la calzada buscando la entrada del túnel",
    respuesta_correcta: "b",
    explicacion:
      "El humo en túneles es altamente tóxico y letal en minutos. Dejar las llaves puestas permite a los bomberos mover el carro, y evacuar hacia las salidas peatonales señalizadas salva la vida.",
    fundamento_legal: "Manual de Referencia ANSV; Normas de Seguridad en Túneles de INVIAS.",
    source: "MANUAL_ANSV",
    dificultad: "media",
  },
  {
    type: "know",
    id: "cale-l05-440",
    nucleo_nombre: "Movilidad segura y sostenible",
    subtema: "efecto de la carga en la distancia de frenado",
    hecho_canonico_id: "l05-mov-10",
    pregunta:
      "Cuando un vehículo viaja con cupo completo de pasajeros y el baúl totalmente cargado, ¿qué ocurre físicamente con su frenado?",
    opcion_a: "Frena en menor distancia porque las llantas se aplastan contra el piso",
    opcion_b:
      "La mayor masa incrementa la inercia del vehículo, aumentando notablemente la distancia de detención y el esfuerzo exigido a los frenos",
    opcion_c: "La distancia de frenado es exactamente idéntica con el carro vacío o cargado",
    opcion_d: "Los frenos no actúan sobre las ruedas traseras",
    respuesta_correcta: "b",
    explicacion:
      "A mayor masa total, mayor es la energía cinética que los frenos deben disipar en forma de calor para detener el vehículo, lo que alarga sustancialmente los metros de frenada.",
    fundamento_legal: "Manual de Referencia ANSV sobre física y dinámica del movimiento.",
    source: "MANUAL_ANSV",
    dificultad: "facil",
  },
  {
    type: "know",
    id: "cale-l05-441",
    nucleo_nombre: "Movilidad segura y sostenible",
    subtema: "centro de gravedad alto por equipaje en techo",
    hecho_canonico_id: "l05-mov-11",
    pregunta:
      "¿Por qué transportar bultos pesados en la parrilla o techo del automóvil incrementa el riesgo de volcamiento en curvas?",
    opcion_a: "Porque el viento levanta las llantas delanteras en el aire",
    opcion_b:
      "Porque eleva el centro de gravedad del vehículo, amplificando la fuerza centrífuga y el balanceo de la carrocería en virajes",
    opcion_c: "Porque bloquea la salida del líquido de frenos",
    opcion_d: "Porque aumenta la potencia del motor hacia las ruedas",
    respuesta_correcta: "b",
    explicacion:
      "Cuanto más alto se sitúa el centro de gravedad respecto al suelo, más fácil es que la fuerza centrífuga supere el apoyo de las ruedas en una curva, provocando el vuelco lateral.",
    fundamento_legal: "Manual de Referencia ANSV sobre estabilidad vehicular.",
    source: "MANUAL_ANSV",
    dificultad: "media",
  },
  {
    type: "know",
    id: "cale-l05-442",
    nucleo_nombre: "Movilidad segura y sostenible",
    subtema: "deslumbramiento por sobrecarga trasera en faros",
    hecho_canonico_id: "l05-mov-12",
    pregunta:
      "Si carga en exceso el baúl de un vehículo liviano sin compensar la altura de las luces, ¿qué efecto secundario nocturno produce sobre los demás?",
    opcion_a: "Los faros apuntan al suelo y no iluminan nada",
    opcion_b:
      "La parte trasera se hunde y la trompa se levanta, haciendo que el haz de luces bajas apunte hacia arriba y encandile a los conductores que vienen de frente",
    opcion_c: "Las bombillas traseras se queman por exceso de peso",
    opcion_d: "La luz de reversa se queda encendida hacia adelante",
    respuesta_correcta: "b",
    explicacion:
      "El hundimiento de la suspensión trasera altera el ángulo geométrico de los faros delanteros, deslumbrando gravemente al tráfico en sentido contrario si no se corrige con el regulador de faros.",
    fundamento_legal: "Manual de Referencia ANSV sobre sistemas ópticos e inspección de carga.",
    source: "MANUAL_ANSV",
    dificultad: "media",
  },
  {
    type: "know",
    id: "cale-l05-443",
    nucleo_nombre: "Movilidad segura y sostenible",
    subtema: "tiempo de reaccion ante emergencias imprevistas",
    hecho_canonico_id: "l05-mov-13",
    pregunta:
      "El tiempo de reacción promedio de un conductor sano y sobrio es de 0,75 a 1 segundo. Si viaja a 90 km/h en carretera, ¿qué distancia recorre el vehículo durante ese segundo antes de que el pie toque el freno?",
    opcion_a: "Apenas 5 metros",
    opcion_b: "Aproximadamente 25 metros a ciegas sin desacelerar un solo kilómetro",
    opcion_c: "Exactamente 100 metros",
    opcion_d: "Menos de 50 centímetros",
    respuesta_correcta: "b",
    explicacion:
      "A 90 km/h el vehículo avanza a 25 metros por segundo (90 / 3,6 = 25 m/s). En el segundo que el cerebro demora en ver el peligro y pisar el pedal, el carro recorre 25 metros sin frenar.",
    fundamento_legal: "Manual de Referencia ANSV sobre cálculo de distancias de reacción y parada.",
    source: "MANUAL_ANSV",
    dificultad: "dificil",
  },
  {
    type: "know",
    id: "cale-l05-444",
    nucleo_nombre: "Movilidad segura y sostenible",
    subtema: "energia cinetica y duplicacion de velocidad",
    hecho_canonico_id: "l05-mov-14",
    pregunta:
      "Si un vehículo duplica su velocidad de 40 km/h a 80 km/h, ¿en cuántas veces se incrementa su energía cinética y su distancia teórica de frenado?",
    opcion_a: "Se duplica exactamente al doble (2 veces)",
    opcion_b: "Se cuadruplica (4 veces más energía cinética y 4 veces más distancia de frenado)",
    opcion_c: "Se mantiene igual porque el vehículo tiene el mismo peso",
    opcion_d: "Se reduce a la mitad gracias a la aerodinámica",
    respuesta_correcta: "b",
    explicacion:
      "La energía cinética responde a la fórmula Ec = 1/2 · m · v^2. Al estar la velocidad al cuadrado, duplicar la velocidad cuadruplica la energía que debe absorberse en un frenado o choque.",
    fundamento_legal: "Manual de Referencia ANSV sobre física aplicada a la seguridad vial.",
    source: "MANUAL_ANSV",
    dificultad: "dificil",
  },
  {
    type: "know",
    id: "cale-l05-445",
    nucleo_nombre: "Movilidad segura y sostenible",
    subtema: "ubicacion de triangulos reflectivos en carretera",
    hecho_canonico_id: "l05-mov-15",
    pregunta:
      "Al detenerse por avería en una carretera recta de doble sentido, ¿a qué distancia mínima deben situarse los dos dispositivos reflectivos de señalización (triángulos)?",
    opcion_a: "A 1 metro detrás del baúl",
    opcion_b:
      "Uno a mínimo 30 a 50 metros adelante y otro a mínimo 50 a 100 metros atrás del vehículo averiado, visibles a suficiente distancia",
    opcion_c: "Encima del techo del vehículo",
    opcion_d: "Guardados en la guantera",
    respuesta_correcta: "b",
    explicacion:
      "En vías rápidas o bidireccionales se debe alertar a ambos sentidos de tráfico con anticipación suficiente para que un vehículo a 80 o 90 km/h pueda desacelerar o cambiar de carril sin chocar.",
    fundamento_legal: "Ley 769 de 2002, Art. 30; Manual de Señalización Vial 2024.",
    source: "LEY_769",
    dificultad: "media",
  },
  {
    type: "know",
    id: "cale-l05-446",
    nucleo_nombre: "Movilidad segura y sostenible",
    subtema: "peligro del microsueno y horarios de mayor incidencia",
    hecho_canonico_id: "l05-mov-16",
    pregunta:
      "¿En qué franjas horarias del día se concentra la mayor cantidad de siniestros mortales por microsueño debido al ritmo circadiano humano?",
    opcion_a: "Entre las 09:00 a.m. y las 11:00 a.m.",
    opcion_b:
      "Entre las 02:00 a.m. y las 06:00 a.m. en la madrugada, y entre las 02:00 p.m. y las 04:00 p.m. en la tarde",
    opcion_c: "A las 08:00 p.m. únicamente",
    opcion_d: "No existe relación entre los horarios y el sueño biológico",
    respuesta_correcta: "b",
    explicacion:
      "El reloj biológico humano tiene dos picos fisiológicos de somnolencia natural profunda: la madrugada (2:00 a 6:00 a.m.) y el bajón posprandial vespertino (2:00 a 4:00 p.m.).",
    fundamento_legal: "Manual de Referencia ANSV sobre cronobiología y factores de riesgo.",
    source: "MANUAL_ANSV",
    dificultad: "media",
  },
  {
    type: "know",
    id: "cale-l05-447",
    nucleo_nombre: "Movilidad segura y sostenible",
    subtema: "chaleco reflectivo para conductor en averias nocturnas",
    hecho_canonico_id: "l05-mov-17",
    pregunta:
      "¿Por qué es crucial que el conductor se coloque un chaleco retrorreflectivo ANTES de descender del vehículo a la calzada o berma por una avería nocturna?",
    opcion_a: "Para que no le dé frío con el viento de la noche",
    opcion_b:
      "Porque multiplica la visibilidad del peatón ante los faros de otros vehículos hasta más de 150 metros de distancia, evitando atropellos letales en la oscuridad",
    opcion_c: "Para cumplir con la moda vial de las carreteras",
    opcion_d: "Porque el chaleco tiene propiedades impermeables contra el aceite",
    respuesta_correcta: "b",
    explicacion:
      "Una persona vestida de oscuro en una berma nocturna es invisible hasta que está a menos de 20 metros. El chaleco retrorreflectivo refleja los faros permitiendo ser visto a cientos de metros.",
    fundamento_legal: "Manual de Referencia ANSV; Ley 769 de 2002.",
    source: "MANUAL_ANSV",
    dificultad: "facil",
  },
  {
    type: "know",
    id: "cale-l05-448",
    nucleo_nombre: "Movilidad segura y sostenible",
    subtema: "conduccion con lluvia y niebla en descenso de montana",
    hecho_canonico_id: "l05-mov-18",
    pregunta:
      "Al descender una montaña bajo lluvia continua y niebla, ¿cuál es la combinación de conducción técnica obligatoria?",
    opcion_a: "Bajar en neutro con luces altas y limpiaparabrisas apagado",
    opcion_b:
      "Luces bajas y exploradoras antiniebla encendidas, marcha baja engranada para aprovechar el freno motor, mayor distancia de seguridad y frenadas suaves y anticipadas",
    opcion_c: "Acelerar en las curvas para que las llantas evacuen el agua con mayor fuerza",
    opcion_d: "Circular con el freno de mano medio puesto todo el trayecto",
    respuesta_correcta: "b",
    explicacion:
      "Esta combinación maximiza la visibilidad propia sin encandilarse, evita la cristalización de los frenos por sobrecalentamiento y previene el hidroplaneo en bajada.",
    fundamento_legal: "Manual de Referencia ANSV sobre conducción en cordillera y clima crítico.",
    source: "MANUAL_ANSV",
    dificultad: "facil",
  },
  {
    type: "know",
    id: "cale-l05-449",
    nucleo_nombre: "Movilidad segura y sostenible",
    subtema: "campo visual y vision periferica en movimiento",
    hecho_canonico_id: "l05-mov-19",
    pregunta:
      "¿Qué ocurre con el ángulo de la visión periférica del conductor a medida que aumenta la velocidad del automotor?",
    opcion_a: "Se expande alcanzando los 180 grados de visión panorámica",
    opcion_b:
      "Se estrecha de forma progresiva (efecto túnel), reduciendo la capacidad de percibir peatones, señales o peligros que provengan de los costados de la vía",
    opcion_c: "Permanece completamente invariable sin importar la velocidad",
    opcion_d: "Permite ver hacia atrás sin necesidad de mirar retrovisores",
    respuesta_correcta: "b",
    explicacion:
      "A 30 km/h el campo visual ronda los 100 grados; a 100 km/h se reduce a menos de 40 grados, haciendo casi invisibles los obstáculos periféricos laterales.",
    fundamento_legal: "Manual de Referencia ANSV sobre psicofísica de la percepción visual.",
    source: "MANUAL_ANSV",
    dificultad: "media",
  },
  {
    type: "know",
    id: "cale-l05-450",
    nucleo_nombre: "Movilidad segura y sostenible",
    subtema: "riesgo del uso de dispositivos manos libres en conduccion",
    hecho_canonico_id: "l05-mov-20",
    pregunta:
      "Aunque el uso de manos libres esté autorizado por el Código de Tránsito, ¿qué advierten los estudios científicos de la ANSV sobre su impacto cognitivo?",
    opcion_a: "Que elimina por completo cualquier tipo de distracción al volante",
    opcion_b:
      "Que la distracción cognitiva o mental persiste de forma severa, demorando el tiempo de reacción y haciendo que el conductor mire pero 'no procese' lo que ocurre en la vía (ceguera por falta de atención)",
    opcion_c: "Que mejora los reflejos motrices del conductor en un 50 %",
    opcion_d: "Que previene los fallos mecánicos del motor",
    respuesta_correcta: "b",
    explicacion:
      "El cerebro humano no es multitarea real. Procesar una llamada compleja absorbe recursos mentales del lóbulo frontal, demorando la reacción de frenado tanto como hablar con el teléfono en la oreja.",
    fundamento_legal: "Manual de Referencia ANSV sobre distracción cognitiva y accidentalidad.",
    source: "MANUAL_ANSV",
    dificultad: "media",
  },
  {
    type: "know",
    id: "cale-l05-451",
    nucleo_nombre: "Movilidad segura y sostenible",
    subtema: "adelantamiento a ciclistas en curvas prohibido",
    hecho_canonico_id: "l05-mov-21",
    pregunta:
      "¿Por qué está absolutamente prohibido adelantar a un ciclista en una curva sin visibilidad, aun cuando el ciclista ruede despacio?",
    opcion_a: "Porque las bicicletas tienen prelación para adelantar al carro en las curvas",
    opcion_b:
      "Porque para respetar el metro y medio legal de distancia se debe invadir el carril contrario a ciegas, exponiéndose a un choque frontal devastador contra un vehículo que venga de frente",
    opcion_c: "Porque la fuerza centrífuga empuja la bicicleta hacia el capó",
    opcion_d: "Porque el ciclista puede pedalear más rápido que el carro",
    respuesta_correcta: "b",
    explicacion:
      "Sobrepasar con 1,5 metros de margen exige ocupar parte del carril en contravía. Hacerlo en una curva ciega es una ruleta rusa de choque frontal con consecuencias trágicas.",
    fundamento_legal: "Ley 769 de 2002, Art. 73; Ley 1811 de 2016.",
    source: "LEY_769",
    dificultad: "facil",
  },
  {
    type: "know",
    id: "cale-l05-452",
    nucleo_nombre: "Movilidad segura y sostenible",
    subtema: "peligro de adelantar en intersecciones o bocacalles",
    hecho_canonico_id: "l05-mov-22",
    pregunta:
      "¿Por qué el artículo 73 del Código de Tránsito prohíbe adelantar a otros vehículos en intersecciones o bocacalles?",
    opcion_a: "Porque los semáforos se apagan automáticamente durante el adelantamiento",
    opcion_b:
      "Porque el vehículo que va a ser adelantado tapa la visibilidad de peatones que cruzan o vehículos transversales que se incorporan al cruce",
    opcion_c: "Porque la pintura de las cebras desgasta las llantas de forma irregular",
    opcion_d: "Porque las intersecciones solo pueden cruzarse en reversa",
    respuesta_correcta: "b",
    explicacion:
      "En un cruce el vehículo rebasado actúa como pantalla visual. Adelantar en esa zona suele terminar arrollando al peatón que cruzaba protegido por el primer carro.",
    fundamento_legal: "Ley 769 de 2002, Art. 73, numeral 1.",
    source: "LEY_769",
    dificultad: "facil",
  },
  {
    type: "know",
    id: "cale-l05-453",
    nucleo_nombre: "Movilidad segura y sostenible",
    subtema: "movilidad activa y beneficios de la caminata",
    hecho_canonico_id: "l05-mov-23",
    pregunta:
      "¿Cuál es el impacto positivo en la sostenibilidad de las ciudades al reemplazar viajes cortos en automóvil particular (menores a 1 km) por caminata o bicicleta?",
    opcion_a: "Aumenta la congestión de los andenes",
    opcion_b:
      "Elimina las emisiones de gases contaminantes en los arranques en frío (fase de mayor consumo), reduce la saturación de parqueaderos y combate el sedentarismo ciudadano",
    opcion_c: "Provoca que los automóviles se dañen por desuso",
    opcion_d: "Obliga a pavimentar más calles con asfalto",
    respuesta_correcta: "b",
    explicacion:
      "Los recorridos de menos de 1 km son los más contaminantes para un motor de combustión porque trabaja frío consumiendo el doble. Sustituirlos por movilidad activa limpia el aire y beneficia la salud.",
    fundamento_legal: "Manual de Referencia ANSV sobre movilidad urbana sostenible.",
    source: "MANUAL_ANSV",
    dificultad: "facil",
  },
  {
    type: "know",
    id: "cale-l05-454",
    nucleo_nombre: "Movilidad segura y sostenible",
    subtema: "seguridad pasiva complementaria cinturon y airbag",
    hecho_canonico_id: "l05-mov-24",
    pregunta:
      "¿Por qué el sistema de airbag se denomina SRS (Supplemental Restraint System o Sistema de Sujeción Suplementario) y exige llevar siempre el cinturón abrochado?",
    opcion_a: "Porque el airbag funciona solo como adorno de lujo",
    opcion_b:
      "Porque el airbag fue diseñado para funcionar exclusivamente en conjunto con el cinturón; si el ocupante no lleva cinturón, su cuerpo choca contra la bolsa en plena detonación explosiva sufriendo traumas mortales",
    opcion_c: "Porque el cinturón de seguridad se desabrocha automáticamente cuando sale el airbag",
    opcion_d: "Porque el airbag solo protege las piernas del conductor",
    respuesta_correcta: "b",
    explicacion:
      "El airbag no reemplaza al cinturón de seguridad. Si el cuerpo viaja hacia adelante sin la retención del cinturón, impacta el airbag inflándose a 300 km/h, lo que causa fracturas de cráneo y cuello.",
    fundamento_legal: "Manual de Referencia ANSV sobre cinemática del choque y retención pasiva.",
    source: "MANUAL_ANSV",
    dificultad: "media",
  },
  {
    type: "know",
    id: "cale-l05-455",
    nucleo_nombre: "Movilidad segura y sostenible",
    subtema: "regla de seguridad para estacionar en pendientes",
    hecho_canonico_id: "l05-mov-25",
    pregunta:
      "Al estacionar un automóvil mecánico en una calle con pendiente pronunciada (subida o bajada), ¿qué precauciones mecánicas redundantes deben aplicarse?",
    opcion_a: "Dejar la palanca de cambios en neutro y poner solo el freno de mano",
    opcion_b:
      "Aplicar firmemente el freno de estacionamiento, girar las ruedas delanteras hacia el andén (o calzada según sea bajada o subida) y dejar engranada la primera marcha (en subida) o reversa (en bajada)",
    opcion_c: "Apagar el motor y dejar las llaves pegadas al encendido",
    opcion_d: "Colocar el carro atravesado sobre los dos carriles",
    respuesta_correcta: "b",
    explicacion:
      "La combinación de freno de estacionamiento, cambio engranado como traba mecánica del motor y giro de llantas contra el cordón del andén garantiza que el carro no ruede si falla el cable del freno de mano.",
    fundamento_legal: "Ley 769 de 2002, Art. 77; Manual de Referencia ANSV.",
    source: "LEY_769",
    dificultad: "media",
  },

  // ==========================================
  // NORMAS DE TRANSITO (15 preguntas: cale-l05-456 a 470)
  // ==========================================
  {
    type: "know",
    id: "cale-l05-456",
    nucleo_nombre: "Normas de transito",
    subtema: "clasificacion de multas ley 769 tipo a a e",
    hecho_canonico_id: "l05-nor-01",
    pregunta:
      "Bajo el artículo 131 de la Ley 769 de 2002, ¿cuántos salarios mínimos diarios legales vigentes (SMDLV o UVT equivalente) sancionan las infracciones clasificadas en el Tipo C y en el Tipo D?",
    opcion_a: "Tipo C: 5 SMDLV; Tipo D: 10 SMDLV",
    opcion_b: "Tipo C: 15 SMDLV; Tipo D: 30 SMDLV",
    opcion_c: "Tipo C: 20 SMDLV; Tipo D: 45 SMDLV",
    opcion_d: "Tipo C: 1 SMDLV; Tipo D: 2 SMDLV",
    respuesta_correcta: "b",
    explicacion:
      "El Código de Tránsito gradúa las multas: Tipo A (4 SMDLV), Tipo B (8 SMDLV), Tipo C (15 SMDLV), Tipo D (30 SMDLV) y Tipo E (45 SMDLV). Las de tipo C y D son las más comunes y graves para automotores.",
    fundamento_legal: "Ley 769 de 2002, Art. 131.",
    source: "LEY_769",
    dificultad: "media",
  },
  {
    type: "know",
    id: "cale-l05-457",
    nucleo_nombre: "Normas de transito",
    subtema: "infraccion d04 pasarse semaforo en rojo o pare",
    hecho_canonico_id: "l05-nor-02",
    pregunta:
      "¿A qué categoría de infracción y sanción económica corresponde no detenerse ante una luz roja o amarilla de semáforo o una señal de PARE según el Código Nacional de Tránsito?",
    opcion_a: "Infracción Tipo A sancionada con 4 SMDLV",
    opcion_b: "Infracción Tipo D (D.04) sancionada con multa de treinta (30) SMDLV",
    opcion_c: "Infracción leve de llamado de atención verbal",
    opcion_d: "Infracción Tipo B sancionada con 8 SMDLV",
    respuesta_correcta: "b",
    explicacion:
      "Pasarse un semáforo en rojo o una señal de PARE es la infracción D.04, una de las conductas de mayor letalidad urbana, castigada con 30 salarios mínimos diarios legales vigentes.",
    fundamento_legal: "Ley 769 de 2002, Art. 131, infracción D.04.",
    source: "LEY_769",
    dificultad: "media",
  },
  {
    type: "know",
    id: "cale-l05-458",
    nucleo_nombre: "Normas de transito",
    subtema: "infraccion d02 conducir sin soat vigente",
    hecho_canonico_id: "l05-nor-03",
    pregunta:
      "¿Qué sanciones acarrea transitar en un vehículo automotor sin portar el Seguro Obligatorio de Accidentes de Tránsito (SOAT) vigente?",
    opcion_a: "Multa de 4 SMDLV sin inmovilización",
    opcion_b:
      "Multa de treinta (30) SMDLV (infracción D.02) y la inmovilización preventiva inmediata del vehículo",
    opcion_c: "Cancelación definitiva de la cédula de ciudadanía",
    opcion_d: "Tres días de arresto en estación de policía",
    respuesta_correcta: "b",
    explicacion:
      "Circular sin SOAT vigente deja desprotegidas a posibles víctimas y constituye la infracción D.02: multa de 30 SMDLV e inmovilización obligatoria del automotor en parqueadero oficial (grúa y patios).",
    fundamento_legal: "Ley 769 de 2002, Art. 131, infracción D.02; Art. 135.",
    source: "LEY_769",
    dificultad: "facil",
  },
  {
    type: "know",
    id: "cale-l05-459",
    nucleo_nombre: "Normas de transito",
    subtema: "infraccion c35 conducir sin revision tecnico mecanica",
    hecho_canonico_id: "l05-nor-04",
    pregunta:
      "¿Qué sanción contempla la Ley 769 de 2002 por no realizar o no portar la Revisión Técnico-Mecánica y de emisiones contaminantes en el plazo legal (infracción C.35)?",
    opcion_a: "Multa de quince (15) SMDLV y la inmovilización del vehículo",
    opcion_b: "Una amonestación escrita con plazo de un mes",
    opcion_c: "Multa de 2 SMDLV sin grúa ni patios",
    opcion_d: "Prisión de 6 meses en centro carcelario",
    respuesta_correcta: "a",
    explicacion:
      "La infracción C.35 castiga el incumplimiento de la RTM con 15 salarios mínimos diarios legales vigentes e inmovilización inmediata del automotor por representar riesgo mecánico y ambiental.",
    fundamento_legal: "Ley 769 de 2002, Art. 131, infracción C.35.",
    source: "LEY_769",
    dificultad: "facil",
  },
  {
    type: "know",
    id: "cale-l05-460",
    nucleo_nombre: "Normas de transito",
    subtema: "infraccion c38 uso de celular al volante",
    hecho_canonico_id: "l05-nor-05",
    pregunta:
      "¿Cuál es la sanción por utilizar sistemas de comunicación móvil o teléfonos celulares sostenidos con las manos mientras se conduce un automotor (infracción C.38)?",
    opcion_a: "Multa de quince (15) salarios mínimos diarios legales vigentes (SMDLV)",
    opcion_b: "Retención del teléfono celular por tres meses",
    opcion_c: "Multa de 1 SMDLV",
    opcion_d: "Suspensión de por vida de la línea telefónica",
    respuesta_correcta: "a",
    explicacion:
      "Manipular el celular al volante constituye la infracción C.38, penalizada con 15 SMDLV. Solo se autoriza la comunicación mediante sistemas integrados de manos libres que no desvíen la vista ni las manos.",
    fundamento_legal: "Ley 769 de 2002, Art. 131, infracción C.38.",
    source: "LEY_769",
    dificultad: "facil",
  },
  {
    type: "know",
    id: "cale-l05-461",
    nucleo_nombre: "Normas de transito",
    subtema: "causales de inmovilizacion del vehiculo art 135",
    hecho_canonico_id: "l05-nor-06",
    pregunta:
      "De acuerdo con el artículo 135 del Código Nacional de Tránsito, ¿en cuál de los siguientes casos la autoridad de tránsito debe inmovilizar preventivamente el vehículo?",
    opcion_a: "Por llevar el carro con la pintura sucia de barro",
    opcion_b:
      "Conducir en estado de embriaguez, sin portar SOAT o RTM vigentes, con licencia vencida o adulterada, o por presentar fallas mecánicas notorias o llantas lisas",
    opcion_c: "Por no tener instalada una antena de radio moderna",
    opcion_d: "Por transitar un día soleado sin aire acondicionado",
    respuesta_correcta: "b",
    explicacion:
      "La inmovilización consiste en retirar el automotor de circulación y trasladarlo a patios oficiales cuando continuar rodando represente un peligro inminente para la seguridad pública o viole requisitos legales esenciales.",
    fundamento_legal: "Ley 769 de 2002, Art. 135; Ley 1696 de 2013.",
    source: "LEY_769",
    dificultad: "facil",
  },
  {
    type: "know",
    id: "cale-l05-462",
    nucleo_nombre: "Normas de transito",
    subtema: "normas de casco para motociclistas resolucion 23385",
    hecho_canonico_id: "l05-nor-07",
    pregunta:
      "Según la Resolución 23385 de 2020 del Ministerio de Transporte, ¿cuáles son las tres condiciones obligatorias de uso del casco protector en motocicleta?",
    opcion_a: "Debe ser de color verde, llevar luces LED y tener visera de béisbol",
    opcion_b:
      "La cabeza debe estar totalmente inmersa en el casco, el sistema de retención o broche debe estar firmemente asegurado bajo la mandíbula sin correas rotas y no se deben interponer celulares entre el casco y la cabeza",
    opcion_c: "Basta con llevarlo puesto sobre la coronilla sin abrochar",
    opcion_d: "El casco es obligatorio únicamente para el acompañante",
    respuesta_correcta: "b",
    explicacion:
      "La Resolución 23385 establece que un casco sin abrochar o de talla incorrecta sale expulsado en la primera milésima de segundo del choque, dejando el cráneo desprotegido. Tampoco se permite alojar teléfonos adentro.",
    fundamento_legal:
      "Resolución 23385 de 2020 del Ministerio de Transporte; Ley 769 de 2002, Art. 96.",
    source: "RESOLUCION_CALE",
    dificultad: "media",
  },
  {
    type: "know",
    id: "cale-l05-463",
    nucleo_nombre: "Normas de transito",
    subtema: "prohibicion de transportar menores de 10 anos en motocicleta",
    hecho_canonico_id: "l05-nor-08",
    pregunta:
      "Bajo la legislación de tránsito colombiana, ¿a partir de qué edad está permitido transportar a un menor de edad como parrillero o acompañante en una motocicleta?",
    opcion_a: "Desde los dos años con casco de bicicleta",
    opcion_b: "Solo a partir de los diez (10) años cumplidos de edad",
    opcion_c: "Desde los cinco años si va sentado adelante sobre el tanque",
    opcion_d: "No existe límite de edad si va acompañado por sus padres",
    respuesta_correcta: "b",
    explicacion:
      "El Código de Tránsito y las regulaciones locales prohíben transportar a menores de 10 años en motocicletas por falta de desarrollo psicomotor para sujetarse con firmeza y alta tasa de letalidad en caídas.",
    fundamento_legal: "Ley 769 de 2002, Art. 96, numeral 4; Código de la Infancia y Adolescencia.",
    source: "LEY_769",
    dificultad: "facil",
  },
  {
    type: "know",
    id: "cale-l05-464",
    nucleo_nombre: "Normas de transito",
    subtema: "chaleco reflectivo obligatorio para motociclistas",
    hecho_canonico_id: "l05-nor-09",
    pregunta:
      "¿En qué horario es obligatorio para conductores y acompañantes de motocicletas portar chaleco o prenda retrorreflectiva según el artículo 94 de la Ley 769?",
    opcion_a: "Únicamente después de la medianoche",
    opcion_b:
      "Entre las 18:00 horas (6:00 p.m.) y las 06:00 horas (6:00 a.m.) del día siguiente, o cuando la visibilidad sea escasa",
    opcion_c: "Exclusivamente los días domingos",
    opcion_d: "Solo cuando llueva fuertemente al mediodía",
    respuesta_correcta: "b",
    explicacion:
      "El porte de prendas con material retrorreflectivo entre las 18:00 y las 06:00 horas asegura que el motociclista sea detectado a gran distancia por los faros de los automotores en condiciones de oscuridad.",
    fundamento_legal: "Ley 769 de 2002, Art. 94 y Art. 131, infracción C.24.",
    source: "LEY_769",
    dificultad: "facil",
  },
  {
    type: "know",
    id: "cale-l05-465",
    nucleo_nombre: "Normas de transito",
    subtema: "luces de motocicleta encendidas las 24 horas",
    hecho_canonico_id: "l05-nor-10",
    pregunta:
      "¿Qué norma rige para el encendido de luces en las motocicletas mientras transitan por las vías colombianas?",
    opcion_a:
      "Deben circular obligatoriamente con la luz baja delantera encendida permanentemente las veinticuatro (24) horas del día, incluso bajo luz solar plena",
    opcion_b: "Solo deben encender las luces de noche después de las 20:00 horas",
    opcion_c: "Solo deben encender las luces en autopistas con peaje",
    opcion_d: "Las luces delanteras son opcionales en el perímetro urbano",
    respuesta_correcta: "a",
    explicacion:
      "La Ley 769 (Art. 96) exige a las motocicletas rodar con farola delantera encendida de día y de noche. Esto incrementa el contraste visual y permite a los conductores de autos verlas en sus retrovisores.",
    fundamento_legal: "Ley 769 de 2002, Art. 96; Resolución 20253040037125.",
    source: "LEY_769",
    dificultad: "facil",
  },
  {
    type: "know",
    id: "cale-l05-466",
    nucleo_nombre: "Normas de transito",
    subtema: "estructura oficial del examen teorico cale",
    hecho_canonico_id: "l05-nor-11",
    pregunta:
      "De acuerdo con la reglamentación oficial del Ministerio de Transporte para los Centros de Apoyo Logístico de Evaluación (CALE), ¿cuántas preguntas componen el examen teórico y en qué bloques se dividen?",
    opcion_a: "10 preguntas de selección múltiple sobre mecánica",
    opcion_b:
      "Cuarenta (40) preguntas en total: doce (12) preguntas actitudinales y veintiocho (28) preguntas de conocimientos específicos sobre movilidad segura, normas, señales y vehículo",
    opcion_c: "Cien preguntas orales frente a un jurado militar",
    opcion_d: "Veinte preguntas sobre primeros auxilios únicamente",
    respuesta_correcta: "b",
    explicacion:
      "La Resolución del Ministerio de Transporte estructura la prueba teórica CALE en 40 preguntas: 12 actitudinales que miden juicio ético y 28 de conocimientos técnicos y normativos sobre seguridad vial.",
    fundamento_legal: "Resolución 20253040037125 (Anexo Técnico CALE); Ministerio de Transporte.",
    source: "RESOLUCION_CALE",
    dificultad: "media",
  },
  {
    type: "know",
    id: "cale-l05-467",
    nucleo_nombre: "Normas de transito",
    subtema: "tiempo limite del examen teorico cale",
    hecho_canonico_id: "l05-nor-12",
    pregunta:
      "¿Cuál es el tiempo máximo oficial concedido al aspirante para resolver el examen teórico en la plataforma tecnológica del CALE?",
    opcion_a: "15 minutos cronometrados",
    opcion_b: "Setenta (70) minutos como límite máximo de duración",
    opcion_c: "Tres horas continuas",
    opcion_d: "Tiempo libre sin límite alguno",
    respuesta_correcta: "b",
    explicacion:
      "La norma técnica CALE estipula un lapso de 70 minutos para responder las 40 preguntas del examen, permitiendo un promedio de casi dos minutos por pregunta para leer y razonar con calma.",
    fundamento_legal: "Resolución 20253040037125, Anexo 60; Ministerio de Transporte.",
    source: "RESOLUCION_CALE",
    dificultad: "facil",
  },
  {
    type: "know",
    id: "cale-l05-468",
    nucleo_nombre: "Normas de transito",
    subtema: "criterio de aprobacion independiente 80 por ciento cale",
    hecho_canonico_id: "l05-nor-13",
    pregunta:
      "¿Cuál es el criterio oficial de calificación para considerar APROBADO el examen teórico en el CALE?",
    opcion_a: "Obtener un puntaje global del 50 % sumando todas las respuestas",
    opcion_b:
      "Aprobar de manera INDEPENDIENTE con un mínimo del 80 % de aciertos tanto en el bloque actitudinal como en el bloque de conocimientos específicos",
    opcion_c: "Aprobar solo el bloque de señales de tránsito sin importar las demás",
    opcion_d: "Responder correctamente las primeras 10 preguntas del examen",
    respuesta_correcta: "b",
    explicacion:
      "El modelo pedagógico CALE exige suficiencia ética y técnica: el aspirante debe alcanzar al menos el 80 % en actitudes y al menos el 80 % en conocimientos por separado para obtener la certificación.",
    fundamento_legal: "Resolución 20253040037125; Manual del Examen Teórico CALE.",
    source: "RESOLUCION_CALE",
    dificultad: "media",
  },
  {
    type: "know",
    id: "cale-l05-469",
    nucleo_nombre: "Normas de transito",
    subtema: "sancion maxima por negarse a la prueba de alcoholemia",
    hecho_canonico_id: "l05-nor-14",
    pregunta:
      "Bajo la Ley 1696 de 2013, ¿qué sanciones se aplican al conductor que se niegue injustificadamente a realizarse la prueba de alcoholemia solicitada por la autoridad?",
    opcion_a: "Una simple multa de 5 SMDLV sin tocar la licencia",
    opcion_b:
      "Multa máxima de hasta 1.440 SMDLV, cancelación definitiva de la licencia de conducción, inmovilización del vehículo por 20 días hábiles y 50 horas de trabajo comunitario",
    opcion_c: "Un llamado de atención pedagógico por escrito",
    opcion_d: "Suspensión de la cédula por un fin de semana",
    respuesta_correcta: "b",
    explicacion:
      "La Ley 1696 castiga la negativa a la prueba con la máxima severidad del régimen (equivalente o superior al Tercer Grado reincidente): cancelación de licencia y multas superiores a cien millones de pesos.",
    fundamento_legal: "Ley 1696 de 2013, Art. 1, parágrafo 3; Ley 769 de 2002, Art. 152.",
    source: "LEY_1696",
    dificultad: "media",
  },
  {
    type: "know",
    id: "cale-l05-470",
    nucleo_nombre: "Normas de transito",
    subtema: "infracciones de peatones tipo a",
    hecho_canonico_id: "l05-nor-15",
    pregunta:
      "¿Los peatones pueden ser multados en Colombia según el Código Nacional de Tránsito y con qué sanción?",
    opcion_a: "No, los peatones jamás pueden ser sancionados bajo ninguna circunstancia",
    opcion_b:
      "Sí, pueden ser sancionados con multas Tipo A (4 SMDLV) por invadir calzadas rápidas, cruzar vías arterias fuera de puentes o pasos peatonales o actuar temerariamente",
    opcion_c: "Solo pueden ser sancionados si caminan de noche",
    opcion_d: "Se les decomisan los zapatos por orden policial",
    respuesta_correcta: "b",
    explicacion:
      "El artículo 131 lista las infracciones Tipo A aplicables a peatones que no utilizan puentes peatonales, transitan por autopistas prohibidas o desobedecen las señales de tránsito.",
    fundamento_legal: "Ley 769 de 2002, Art. 58 y Art. 131, infracciones A.01 a A.12.",
    source: "LEY_769",
    dificultad: "facil",
  },

  // ==========================================
  // SENALIZACION VIAL E INFRAESTRUCTURA (15 preguntas: cale-l05-471 a 485)
  // ==========================================
  {
    type: "know",
    id: "cale-l05-471",
    nucleo_nombre: "Senalizacion vial e infraestructura",
    subtema: "cruz de san andres en cruces ferreos",
    hecho_canonico_id: "l05-sen-01",
    pregunta:
      "¿Qué significa la señal reglamentaria e informativa en forma de aspa o 'X' conocida como Cruz de San Andrés (SR-54)?",
    opcion_a: "Intersección de cuatro caminos sin semáforo",
    opcion_b:
      "Cruce ferroviario a nivel sin barreras, advirtiendo detención obligatoria total y máxima atención al paso inminente de trenes",
    opcion_c: "Puesto de primeros auxilios de la Cruz Roja",
    opcion_d: "Zona de aterrizaje de helicópteros de emergencia",
    respuesta_correcta: "b",
    explicacion:
      "La Cruz de San Andrés es el símbolo internacional que marca el cruce directo a nivel con una línea de ferrocarril, exigiendo detenerse y mirar a ambos lados antes de cruzar.",
    fundamento_legal: "Manual de Señalización Vial 2024, Señal SR-54; Ley 769 de 2002, Art. 81.",
    source: "MANUAL_SENALIZACION",
    dificultad: "facil",
  },
  {
    type: "know",
    id: "cale-l05-472",
    nucleo_nombre: "Senalizacion vial e infraestructura",
    subtema: "senal sr-31 altura maxima permitida galibo",
    hecho_canonico_id: "l05-sen-02",
    pregunta:
      "¿Qué indica la señal reglamentaria SR-31 que muestra una cifra en metros entre dos flechas verticales que apuntan hacia adentro?",
    opcion_a: "Distancia mínima entre vehículos en marcha",
    opcion_b:
      "Altura máxima permitida (gálibo) para que un vehículo y su carga puedan pasar bajo una estructura, puente o túnel sin colisionar",
    opcion_c: "Profundidad de la zanja lateral de drenaje",
    opcion_d: "Altitud en metros sobre el nivel del mar",
    respuesta_correcta: "b",
    explicacion:
      "La señal SR-31 fija la cota límite vertical de paso. Si la altura del automotor o su carga supera la cifra señalada, impactará contra la losa del puente o túnel con riesgo de colapso estructural.",
    fundamento_legal: "Manual de Señalización Vial 2024, Señal Reglamentaria SR-31.",
    source: "MANUAL_SENALIZACION",
    dificultad: "facil",
  },
  {
    type: "know",
    id: "cale-l05-473",
    nucleo_nombre: "Senalizacion vial e infraestructura",
    subtema: "senal sr-33 peso maximo total permitido",
    hecho_canonico_id: "l05-sen-03",
    pregunta:
      "¿Qué restricción establece la señal reglamentaria circular con orla roja que muestra una cifra seguida de la letra 't' (SR-33)?",
    opcion_a: "Tiempo máximo de estacionamiento en minutos",
    opcion_b:
      "Peso bruto vehicular máximo total permitido (en toneladas) autorizado para transitar sobre esa vía o puente",
    opcion_c: "Temperatura máxima del pavimento",
    opcion_d: "Límite de velocidad para camiones cisternas",
    respuesta_correcta: "b",
    explicacion:
      "La señal SR-33 restringe el paso a automotores cuyo peso total combinado (vehículo más carga) supere las toneladas indicadas, protegiendo puentes antiguos o pavimentos frágiles.",
    fundamento_legal: "Manual de Señalización Vial 2024, Señal Reglamentaria SR-33.",
    source: "MANUAL_SENALIZACION",
    dificultad: "facil",
  },
  {
    type: "know",
    id: "cale-l05-474",
    nucleo_nombre: "Senalizacion vial e infraestructura",
    subtema: "delineadores de curva horizontal chevrones sp-75",
    hecho_canonico_id: "l05-sen-04",
    pregunta:
      "¿Qué función cumplen los paneles rectangulares con flechas negras en ángulo sobre fondo amarillo colocados en batería en el exterior de una curva (chevrones SP-75)?",
    opcion_a: "Prohibir el paso hacia la berma",
    opcion_b:
      "Delinear el trazado geométrico, sentido y agudeza de una curva horizontal peligrosa, advirtiendo al conductor de noche o bajo lluvia por dónde discurre la carretera",
    opcion_c: "Indicar zonas habilitadas para carreras de velocidad",
    opcion_d: "Servir de paneles publicitarios para estaciones de gasolina",
    respuesta_correcta: "b",
    explicacion:
      "Los chevrones guían la trayectoria óptica del conductor a lo largo de una curva cerrada o engañosa, marcando con exactitud la dirección del radio de giro.",
    fundamento_legal: "Manual de Señalización Vial 2024, Sección Delineadores de Curva SP-75.",
    source: "MANUAL_SENALIZACION",
    dificultad: "facil",
  },
  {
    type: "know",
    id: "cale-l05-475",
    nucleo_nombre: "Senalizacion vial e infraestructura",
    subtema: "postes de referencia kilometrica pr",
    hecho_canonico_id: "l05-sen-05",
    pregunta:
      "En las carreteras nacionales de Colombia, ¿qué información suministran los pequeños postes metálicos o de concreto marcados como 'PR' con números?",
    opcion_a: "El precio del peaje más próximo en pesos",
    opcion_b:
      "El Poste de Referencia kilométrica y la ruta nacional, permitiendo geolocalizar con total precisión el lugar exacto en caso de siniestro o emergencia médica ante el 123 o #767",
    opcion_c: "La presión de inflado obligatoria para las llantas en esa montaña",
    opcion_d: "La cantidad de personas que viven en el municipio vecino",
    respuesta_correcta: "b",
    explicacion:
      "Los postes PR (Punto de Referencia) indican la ruta, tramo y kilómetro exacto. Dar el número de PR a los socorristas permite que las ambulancias lleguen al lugar sin perderse.",
    fundamento_legal: "Manual de Señalización Vial 2024, Sección Postes de Kilometraje.",
    source: "MANUAL_SENALIZACION",
    dificultad: "facil",
  },
  {
    type: "know",
    id: "cale-l05-476",
    nucleo_nombre: "Senalizacion vial e infraestructura",
    subtema: "lechos o rampas de frenado de emergencia",
    hecho_canonico_id: "l05-sen-06",
    pregunta:
      "¿Qué es una rampa o lecho de frenado de emergencia en carreteras de cordillera y cómo se identifica en el pavimento?",
    opcion_a: "Un parqueadero turístico para tomar café",
    opcion_b:
      "Una vía de escape lateral con una gruesa capa de grava suelta en ascenso, precedida de demarcación en damero rojo y blanco, diseñada para detener de forma segura a vehículos pesados sin frenos",
    opcion_c: "Una pista de aterrizaje para avionetas fumigadoras",
    opcion_d: "Un lavadero mecánico automático de vehículos",
    respuesta_correcta: "b",
    explicacion:
      "Los lechos de escape disipan la energía de camiones sin frenos al hundir sus ruedas en gravilla o grava profunda en rampa ascendente, salvando la vida de los ocupantes y de los demás conductores.",
    fundamento_legal:
      "Manual de Señalización Vial 2024; Manual de Diseño Geométrico de Carreteras INVIAS.",
    source: "MANUAL_SENALIZACION",
    dificultad: "media",
  },
  {
    type: "know",
    id: "cale-l05-477",
    nucleo_nombre: "Senalizacion vial e infraestructura",
    subtema: "amortiguadores de impacto en bifurcaciones",
    hecho_canonico_id: "l05-sen-07",
    pregunta:
      "¿Qué función de seguridad vial desempeñan los amortiguadores de impacto instalados en las puntas de bifurcación de autopistas (isletas de divergencia)?",
    opcion_a: "Servir de soporte para vallas publicitarias gigantes",
    opcion_b:
      "Deformarse y colapsar progresivamente al ser impactados frontalmente por un vehículo, desacelerándolo suavemente y evitando que choque contra muros rígidos de concreto o pilares",
    opcion_c: "Recargar energía eléctrica solar para el alumbrado",
    opcion_d: "Impedir que el agua de lluvia caiga sobre la autopista",
    respuesta_correcta: "b",
    explicacion:
      "Los atenuadores de impacto absorben la energía destructiva de un vehículo que sale de la calzada, reduciendo drásticamente las desaceleraciones mortales para los pasajeros.",
    fundamento_legal: "Manual de Señalización Vial 2024, Sección Sistemas de Contención Vehicular.",
    source: "MANUAL_SENALIZACION",
    dificultad: "media",
  },
  {
    type: "know",
    id: "cale-l05-478",
    nucleo_nombre: "Senalizacion vial e infraestructura",
    subtema: "senal sp-50 semovientes en la via",
    hecho_canonico_id: "l05-sen-08",
    pregunta:
      "¿Qué advierte la señal preventiva SP-50 que muestra la silueta de una vaca sobre fondo amarillo?",
    opcion_a: "Finca de venta de leche y quesos artesanales",
    opcion_b:
      "Proximidad de un sector de la vía donde es habitual el cruce o presencia de ganado o semovientes sobre la calzada, exigiendo moderar la marcha",
    opcion_c: "Zona habilitada para el pastoreo libre de animales sobre el asfalto",
    opcion_d: "Prohibición de transportar carne fresca en camiones",
    respuesta_correcta: "b",
    explicacion:
      "La señal SP-50 previene al conductor sobre sectores ganaderos donde reses u otros animales domésticos pueden ingresar a la vía sin aviso, especialmente en curvas o de noche.",
    fundamento_legal: "Manual de Señalización Vial 2024, Señal Preventiva SP-50.",
    source: "MANUAL_SENALIZACION",
    dificultad: "facil",
  },
  {
    type: "know",
    id: "cale-l05-479",
    nucleo_nombre: "Senalizacion vial e infraestructura",
    subtema: "senal sp-51 fauna silvestre",
    hecho_canonico_id: "l05-sen-09",
    pregunta:
      "¿Qué indica la señal preventiva SP-51 que muestra la silueta de un animal salvaje (como un venado o danta) sobre rombo amarillo?",
    opcion_a: "Reserva zoológica con entrada turística de pago",
    opcion_b:
      "Corredor biológico o tramo con cruce frecuente de fauna silvestre, alertando a reducir la velocidad para evitar el atropello de especies protegidas y siniestros por esquive",
    opcion_c: "Permiso para cacería deportiva al costado del camino",
    opcion_d: "Peligro de caída de ramas secas de los árboles",
    respuesta_correcta: "b",
    explicacion:
      "La señal SP-51 protege la biodiversidad y la vida humana en carreteras que cruzan parques naturales o bosques, previniendo impactos violentos contra grandes animales silvestres.",
    fundamento_legal: "Manual de Señalización Vial 2024, Señal Preventiva SP-51.",
    source: "MANUAL_SENALIZACION",
    dificultad: "facil",
  },
  {
    type: "know",
    id: "cale-l05-480",
    nucleo_nombre: "Senalizacion vial e infraestructura",
    subtema: "barreras rigidas de concreto tipo new jersey",
    hecho_canonico_id: "l05-sen-10",
    pregunta:
      "¿Cuál es el diseño funcional de las barreras centrales de concreto tipo 'New Jersey' instaladas en separadores de autopistas?",
    opcion_a: "Son muros rectos decorativos para colgar jardines",
    opcion_b:
      "Su base angulada redirige la rueda del vehículo hacia la calzada cuando se produce un roce lateral a bajo ángulo, evitando que salte al carril contrario de flujo opuesto",
    opcion_c: "Sirven para que los peatones caminen por encima de ellas",
    opcion_d: "Están diseñadas para destruirse al primer contacto",
    respuesta_correcta: "b",
    explicacion:
      "El perfil curvo inferior de la barrera New Jersey eleva la llanta disipando la energía y devolviendo el automóvil a su carril, previniendo colisiones frontales en autopistas de doble calzada.",
    fundamento_legal: "Manual de Señalización Vial 2024, Capítulo Sistemas de Contención.",
    source: "MANUAL_SENALIZACION",
    dificultad: "media",
  },
  {
    type: "know",
    id: "cale-l05-481",
    nucleo_nombre: "Senalizacion vial e infraestructura",
    subtema: "senales informativas verdes de salida de emergencia en tuneles",
    hecho_canonico_id: "l05-sen-11",
    pregunta:
      "¿Qué indican las señales rectangulares verdes con silueta humana blanca corriendo hacia una puerta y una flecha con distancia en metros dentro de un túnel?",
    opcion_a: "La distancia a la entrada principal del túnel para vehículos",
    opcion_b:
      "La dirección y distancia en metros hacia la salida peatonal de emergencia o galería de evacuación segura más cercana en caso de fuego o humo",
    opcion_c: "Una pista atlética bajo tierra",
    opcion_d: "La ubicación de un restaurante de comidas rápidas",
    respuesta_correcta: "b",
    explicacion:
      "Estas señales de evacuación guían a los ocupantes a pie hacia refugios o túneles de escape presurizados a prueba de humo, salvando vidas en conflagraciones subterráneas.",
    fundamento_legal: "Manual de Señalización Vial 2024, Sección Señalización de Túneles.",
    source: "MANUAL_SENALIZACION",
    dificultad: "facil",
  },
  {
    type: "know",
    id: "cale-l05-482",
    nucleo_nombre: "Senalizacion vial e infraestructura",
    subtema: "senal sr-32 ancho maximo permitido",
    hecho_canonico_id: "l05-sen-12",
    pregunta:
      "¿Qué prohíbe la señal reglamentaria SR-32 que muestra una cifra en metros entre dos flechas horizontales que apuntan hacia adentro?",
    opcion_a: "La velocidad mínima de la calzada",
    opcion_b:
      "El paso de automotores cuyo ancho total (incluyendo carrocería, espejos y carga) supere la dimensión especificada en la señal",
    opcion_c: "La longitud total del vehículo con remolque",
    opcion_d: "El grosor de los neumáticos permitidos",
    respuesta_correcta: "b",
    explicacion:
      "La señal SR-32 advierte un angostamiento crítico de la estructura vial (puentes antiguos, pasos urbanos estrechos), impidiendo el ingreso de vehículos que queden atascados entre los muros.",
    fundamento_legal: "Manual de Señalización Vial 2024, Señal Reglamentaria SR-32.",
    source: "MANUAL_SENALIZACION",
    dificultad: "facil",
  },
  {
    type: "know",
    id: "cale-l05-483",
    nucleo_nombre: "Senalizacion vial e infraestructura",
    subtema: "hitos de arista en los bordes de carretera",
    hecho_canonico_id: "l05-sen-13",
    pregunta:
      "¿Qué función de seguridad cumplen los pequeños postes verticales reflectivos ('hitos de arista') clavados cada ciertos metros a los costados de las carreteras?",
    opcion_a: "Marcar zonas de estacionamiento nocturno gratuito",
    opcion_b:
      "Delinear el borde exterior continuo de la plataforma vial de noche o en niebla cerrada mediante sus captafaros retrorreflectivos, evitando salidas de carretera",
    opcion_c: "Servir de amarre para cables eléctricos de alta tensión",
    opcion_d: "Medir la velocidad del viento en la montaña",
    respuesta_correcta: "b",
    explicacion:
      "Los hitos de arista guían la visión periférica en tramos oscuros o sinuosos, marcando la trayectoria exacta de los límites del asfalto cuando las líneas pintadas están sucias o mojadas.",
    fundamento_legal: "Manual de Señalización Vial 2024, Sección Dispositivos de Delineación.",
    source: "MANUAL_SENALIZACION",
    dificultad: "facil",
  },
  {
    type: "know",
    id: "cale-l05-484",
    nucleo_nombre: "Senalizacion vial e infraestructura",
    subtema: "nichos sos en autopistas y tuneles",
    hecho_canonico_id: "l05-sen-14",
    pregunta:
      "¿Qué equipamiento de emergencia contienen los nichos o puestos 'SOS' señalizados en autopistas concesionadas y túneles?",
    opcion_a: "Herramientas de pintura para embellecer los carros",
    opcion_b:
      "Un teléfono de intercomunicación directa con el centro de control vial de la concesión y un extintor de incendios presurizado listo para uso",
    opcion_c: "Venta de bebidas y alimentos mecánicos",
    opcion_d: "Camas de descanso para conductores fatigados",
    respuesta_correcta: "b",
    explicacion:
      "Los postes o nichos SOS comunican al usuario al instante con la central de tráfico (sin depender de señal de celular) y brindan extintores portátiles para sofocar conatos de fuego incipientes.",
    fundamento_legal:
      "Manual de Señalización Vial 2024; Manual de Operaciones de Concesiones Viales.",
    source: "MANUAL_SENALIZACION",
    dificultad: "facil",
  },
  {
    type: "know",
    id: "cale-l05-485",
    nucleo_nombre: "Senalizacion vial e infraestructura",
    subtema: "defensas metalicas laterales guardavias",
    hecho_canonico_id: "l05-sen-15",
    pregunta:
      "¿Cuál es el propósito de instalación de las barandas metálicas onduladas (guardavías o defensas metálicas) en las orillas de carreteras de montaña?",
    opcion_a: "Evitar que el ganado coma el pasto de la berma",
    opcion_b:
      "Contener y redireccionar a vehículos que pierdan el control, absorbiendo energía para evitar que se precipiten por abismos, caigan a ríos o choquen contra rocas rígidas",
    opcion_c: "Servir de soporte para líneas telefónicas",
    opcion_d: "Reducir el viento que golpea las puertas del carro",
    respuesta_correcta: "b",
    explicacion:
      "Los guardavías de acero canalizan el impacto deformándose elásticamente, reteniendo el carro sobre la corona de la vía e impidiendo caídas fatales por despeñaderos.",
    fundamento_legal: "Manual de Señalización Vial 2024, Sección Sistemas de Contención Lateral.",
    source: "MANUAL_SENALIZACION",
    dificultad: "facil",
  },

  // ==========================================
  // EL VEHICULO (15 preguntas: cale-l05-486 a 500)
  // ==========================================
  {
    type: "know",
    id: "cale-l05-486",
    nucleo_nombre: "El vehiculo",
    subtema: "codigo de colores de testigos del tablero",
    hecho_canonico_id: "l05-veh-01",
    pregunta:
      "En el código internacional de colores del cuadro de instrumentos (tablero), ¿qué gravedad representa el encendido de un testigo de color ROJO durante la marcha?",
    opcion_a: "Información inocua sobre una función de confort encendida",
    opcion_b:
      "Falla crítica o anomalía de máxima gravedad que exige detener el vehículo de inmediato en un lugar seguro y apagar el motor para no destruir componentes o poner en riesgo la vida",
    opcion_c: "Aviso preventivo de mantenimiento programado para el próximo mes",
    opcion_d: "Que el combustible está en nivel óptimo de rendimiento",
    respuesta_correcta: "b",
    explicacion:
      "El color rojo en el tablero señala peligro vital o daño mecánico inminente (presión de aceite cero, sobrecalentamiento, falla de frenos, alternador o cinturón desabrochado).",
    fundamento_legal: "Manual de Referencia ANSV sobre instrumental y alertas de a bordo.",
    source: "MANUAL_ANSV",
    dificultad: "facil",
  },
  {
    type: "know",
    id: "cale-l05-487",
    nucleo_nombre: "El vehiculo",
    subtema: "testigo amarillo o ambar en el tablero",
    hecho_canonico_id: "l05-veh-02",
    pregunta:
      "¿Qué significa el encendido de un testigo de color AMARILLO o ÁMBAR (como el Check Engine, ABS o ESP) en el tablero?",
    opcion_a: "Peligro de explosión instantánea en los siguientes diez segundos",
    opcion_b:
      "Advertencia o anomalía en un sistema auxiliar que requiere precaución, revisión técnica pronta en taller y conducción moderada, permitiendo continuar la marcha con cuidado",
    opcion_c: "Que las cuatro llantas están infladas al máximo",
    opcion_d: "Que la batería del celular del conductor está llena",
    respuesta_correcta: "b",
    explicacion:
      "Los testigos ámbar advierten fallos que no impiden rodar de inmediato pero reducen la seguridad (desconexión de ABS o control de tracción) o degradan el motor (inyección/Check Engine).",
    fundamento_legal: "Manual de Referencia ANSV sobre diagnóstico instrumental.",
    source: "MANUAL_ANSV",
    dificultad: "facil",
  },
  {
    type: "know",
    id: "cale-l05-488",
    nucleo_nombre: "El vehiculo",
    subtema: "testigo rojo de presion de aceite de motor",
    hecho_canonico_id: "l05-veh-03",
    pregunta:
      "Durante la marcha se enciende el testigo rojo con el pictograma de una aceitera o lámpara de Aladino goteando. ¿Qué anomalía señala y qué debe hacer?",
    opcion_a: "Falta de líquido limpiaparabrisas; puede ignorarse hasta el fin de semana",
    opcion_b:
      "Pérdida crítica de presión en el circuito de lubricación del motor; debe detenerse de inmediato en sitio seguro y apagar el motor al instante para no fundirlo irreversiblemente",
    opcion_c: "Aviso de que el carro tiene combustible de alta calidad",
    opcion_d: "Que la radio tiene sintonizada una emisora digital",
    respuesta_correcta: "b",
    explicacion:
      "Sin presión de aceite el metal de las bielas choca con el cigüeñal sin película protectora. En menos de 60 segundos el motor se funde y queda inservible. Apagar el motor es imperativo.",
    fundamento_legal: "Manual de Referencia ANSV sobre lubricación y alertas críticas.",
    source: "MANUAL_ANSV",
    dificultad: "facil",
  },
  {
    type: "know",
    id: "cale-l05-489",
    nucleo_nombre: "El vehiculo",
    subtema: "posiciones de caja de cambios automatica",
    hecho_canonico_id: "l05-veh-04",
    pregunta:
      "En una caja de velocidades automática, ¿qué significan las letras estándar 'P - R - N - D' en el selector de marchas?",
    opcion_a: "Potencia, Rapidez, Normal, Doble tracción",
    opcion_b:
      "Park (estacionamiento con bloqueo de transmisión), Reverse (marcha atrás), Neutral (punto muerto) y Drive (conducción hacia adelante)",
    opcion_c: "Peligro, Retorno, Nieve, Descenso",
    opcion_d: "Parada, Reposo, Noche, Día",
    respuesta_correcta: "b",
    explicacion:
      "La posición P bloquea mecánicamente el eje secundario para evitar que el carro ruede estacionado; R es reversa; N desconecta el motor de las ruedas y D gestiona las marchas hacia adelante.",
    fundamento_legal: "Manual de Referencia ANSV sobre operación de transmisiones automáticas.",
    source: "MANUAL_ANSV",
    dificultad: "facil",
  },
  {
    type: "know",
    id: "cale-l05-490",
    nucleo_nombre: "El vehiculo",
    subtema: "freno motor en transmision automatica en descenso",
    hecho_canonico_id: "l05-veh-05",
    pregunta:
      "Al descender una pendiente prolongada de montaña con un carro automático, ¿por qué no debe dejarse la palanca solo en 'D' o en 'N'?",
    opcion_a:
      "Porque en 'D' el carro sube cambios buscando velocidad y obliga a frenar continuamente sobrecalentando los frenos; se debe seleccionar el modo manual/secuencial o marchas bajas (L, 3, 2, 1) para activar el freno motor",
    opcion_b: "Porque la palanca se parte si no se cambia cada cinco minutos",
    opcion_c: "Porque la batería se descarga en neutro",
    opcion_d: "Porque los automáticos no pueden descender montañas",
    respuesta_correcta: "a",
    explicacion:
      "En 'Drive' la caja automática engrana marchas altas para ahorrar, perdiendo retención y embalando el carro. Seleccionar relaciones bajas fijas usa la compresión del motor para retener la marcha.",
    fundamento_legal:
      "Manual de Referencia ANSV sobre técnicas de conducción en vehículos automáticos.",
    source: "MANUAL_ANSV",
    dificultad: "media",
  },
  {
    type: "know",
    id: "cale-l05-491",
    nucleo_nombre: "El vehiculo",
    subtema: "frenado regenerativo en vehiculos electricos e hibridos",
    hecho_canonico_id: "l05-veh-06",
    pregunta:
      "¿Cómo funciona el sistema de 'frenado regenerativo' presente en vehículos híbridos y 100 % eléctricos?",
    opcion_a: "Expulsa aire comprimido por debajo del chasis para frenar el automóvil",
    opcion_b:
      "Invierte el funcionamiento del motor eléctrico para actuar como generador en desaceleraciones y frenadas, reteniendo el carro y transformando la energía cinética en electricidad para recargar la batería",
    opcion_c: "Cambia automáticamente las pastillas de freno usadas por nuevas",
    opcion_d: "Enfría los neumáticos con chorros de agua",
    respuesta_correcta: "b",
    explicacion:
      "El freno regenerativo ralentiza el vehículo aprovechando la resistencia electromagnética del motor/generador, recargando las celdas de batería y reduciendo en más del 80 % el desgaste de pastillas de freno.",
    fundamento_legal: "Manual de Referencia ANSV sobre nuevas tecnologías de propulsión eléctrica.",
    source: "MANUAL_ANSV",
    dificultad: "media",
  },
  {
    type: "know",
    id: "cale-l05-492",
    nucleo_nombre: "El vehiculo",
    subtema: "optica de los espejos convexos exteriores",
    hecho_canonico_id: "l05-veh-07",
    pregunta:
      "¿Qué particularidad óptica presentan los espejos retrovisores exteriores convexos ('curvos') y qué advertencia debe recordar el conductor?",
    opcion_a: "Hacen que los vehículos se vean más grandes y más cerca de lo que están",
    opcion_b:
      "Amplían el campo de visión reduciendo los ángulos ciegos, pero hacen que los vehículos reflejados se vean más pequeños y parezcan estar más lejos de lo que en realidad están",
    opcion_c: "Invierten la imagen mostrando los carros de cabeza",
    opcion_d: "Solo funcionan cuando el carro viaja en reversa",
    respuesta_correcta: "b",
    explicacion:
      "La curvatura convexa abre el panorama hacia los laterales, pero reduce la imagen óptica. Muchos conductores cambian de carril confiados creyendo que el carro de atrás está lejos cuando está pegado.",
    fundamento_legal: "Manual de Referencia ANSV sobre campos visuales y retrovisores.",
    source: "MANUAL_ANSV",
    dificultad: "media",
  },
  {
    type: "know",
    id: "cale-l05-493",
    nucleo_nombre: "El vehiculo",
    subtema: "parabrisas laminado de seguridad",
    hecho_canonico_id: "l05-veh-08",
    pregunta:
      "¿Cómo está construido el vidrio panorámico (parabrisas) delantero laminado de los automóviles y cuál es su ventaja de seguridad en un choque?",
    opcion_a: "Es una sola lámina de vidrio común que estalla en lanzas afiladas",
    opcion_b:
      "Está compuesto por dos capas de vidrio unidas por una lámina intermedia de polivinil butiral (PVB); si se rompe, las astillas quedan adheridas al plástico evitando cortes faciales y penetración de objetos",
    opcion_c: "Es de acrílico flexible inflable",
    opcion_d: "Es de metal transparente antibalas",
    respuesta_correcta: "b",
    explicacion:
      "El vidrio laminado evita que piedras desprendidas en carretera perforen el habitáculo y retiene a los ocupantes dentro de la cabina impidiendo que salgan eyectados por el cristal frontal.",
    fundamento_legal:
      "Resolución 20253040037125; Normas Técnicas Colombianas NTC de Vidrios de Seguridad.",
    source: "RESOLUCION_CALE",
    dificultad: "media",
  },
  {
    type: "know",
    id: "cale-l05-494",
    nucleo_nombre: "El vehiculo",
    subtema: "vidrios templados laterales",
    hecho_canonico_id: "l05-veh-09",
    pregunta:
      "¿Por qué los vidrios laterales de las puertas son de cristal 'templado' en lugar de vidrio común?",
    opcion_a: "Porque mantienen caliente la temperatura interior de la cabina",
    opcion_b:
      "Porque al recibir un impacto se fragmentan instantáneamente en miles de pequeños trozos granulares sin bordes cortantes, y pueden romperse desde adentro con un martillo de emergencia para evacuar",
    opcion_c: "Porque no dejan pasar el sonido de la música",
    opcion_d: "Porque son inmunes a los rayones de ramas",
    respuesta_correcta: "b",
    explicacion:
      "El tratamiento térmico del vidrio templado elimina el riesgo de astillas cortantes que causen mutilaciones en un impacto lateral, y facilita la salida de los ocupantes tras una inmersión o volcamiento.",
    fundamento_legal: "Manual de Referencia ANSV sobre elementos de seguridad pasiva vehicular.",
    source: "MANUAL_ANSV",
    dificultad: "facil",
  },
  {
    type: "know",
    id: "cale-l05-495",
    nucleo_nombre: "El vehiculo",
    subtema: "inspeccion del manometro del extintor",
    hecho_canonico_id: "l05-veh-10",
    pregunta:
      "Al revisar el extintor de incendios de su vehículo según el artículo 30 de la Ley 769, ¿qué indica que se encuentra en óptimas condiciones de presión para operar?",
    opcion_a:
      "La aguja del manómetro debe ubicarse firmemente dentro de la franja o zona de color VERDE",
    opcion_b: "La aguja debe marcar cero en la zona roja de descarga",
    opcion_c: "El cilindro debe sonar hueco al golpearlo con una piedra",
    opcion_d: "El pasador metálico de seguridad debe haber sido retirado previamente",
    respuesta_correcta: "a",
    explicacion:
      "La aguja en la zona verde confirma que el gas propelente mantiene la presión calibrada de fábrica para expulsar el polvo químico con fuerza y sofocar las llamas con eficacia.",
    fundamento_legal: "Ley 769 de 2002, Art. 30; Norma Técnica Colombiana NTC 2885.",
    source: "LEY_769",
    dificultad: "facil",
  },
  {
    type: "know",
    id: "cale-l05-496",
    nucleo_nombre: "El vehiculo",
    subtema: "vigencia y mantenimiento del extintor",
    hecho_canonico_id: "l05-veh-11",
    pregunta:
      "¿Con qué frecuencia exige la norma colombiana la revisión y recarga técnica del extintor de incendios del automotor?",
    opcion_a: "Cada diez años sin importar el estado",
    opcion_b:
      "Anualmente (cada año) o de forma inmediata después de haber sido accionado, aun parcialmente",
    opcion_c: "Únicamente cuando se vence la cédula del conductor",
    opcion_d: "Solo si se moja con agua de lluvia",
    respuesta_correcta: "b",
    explicacion:
      "Los sellos de las válvulas pierden microfugas de presión y el polvo químico se compacta con las vibraciones del vehículo. La recarga y certificación anual garantizan que funcione ante un conato.",
    fundamento_legal: "Ley 769 de 2002, Art. 30; NTC 2885; Manual de Inspección Técnico-Mecánica.",
    source: "LEY_769",
    dificultad: "facil",
  },
  {
    type: "know",
    id: "cale-l05-497",
    nucleo_nombre: "El vehiculo",
    subtema: "control electronico de estabilidad esp esc",
    hecho_canonico_id: "l05-veh-12",
    pregunta:
      "¿Cómo actúa el Control Electrónico de Estabilidad (ESP o ESC) para salvar la vida del conductor ante una maniobra brusca de esquive?",
    opcion_a: "Apaga el motor y bloquea las cuatro ruedas al mismo tiempo",
    opcion_b:
      "Detecta si la trayectoria real del vehículo no coincide con el ángulo del timón, y frena selectiva e individualmente la rueda adecuada para corregir el derrape y devolver el carro al rumbo deseado",
    opcion_c: "Despliega automáticamente las bolsas de aire laterales",
    opcion_d: "Aumenta la aceleración a fondo para que el derrape sea parejo",
    respuesta_correcta: "b",
    explicacion:
      "El ESP monitorea 25 veces por segundo sensores de timón y guiñada. Si el carro patina frenará una rueda específica (por ejemplo la trasera interior en un subviraje), evitando el trompo o volcamiento.",
    fundamento_legal: "Resolución 20253040037125; Manual de Referencia ANSV sobre sistemas ADAS.",
    source: "RESOLUCION_CALE",
    dificultad: "media",
  },
  {
    type: "know",
    id: "cale-l05-498",
    nucleo_nombre: "El vehiculo",
    subtema: "testigo de presion de neumaticos tpms",
    hecho_canonico_id: "l05-veh-13",
    pregunta:
      "Si en el tablero de instrumentos se enciende un testigo amarillo en forma de neumático desinflado con un signo de admiración adentro (!), ¿qué anomalía informa el sistema TPMS?",
    opcion_a: "Falla en los frenos traseros de disco",
    opcion_b:
      "Pérdida anormal de presión de inflado en uno o más neumáticos por pinchazo o fuga lenta de aire",
    opcion_c: "Que la calle tiene demasiados baches y huecos",
    opcion_d: "Que se debe cambiar la marca de las llantas",
    respuesta_correcta: "b",
    explicacion:
      "El sistema TPMS (Tire Pressure Monitoring System) monitorea en tiempo real la presión de aire de las ruedas, alertando al conductor antes de que la llanta baja se desintegre o provoque un siniestro.",
    fundamento_legal: "Manual de Referencia ANSV sobre tecnologías de monitoreo vehicular.",
    source: "MANUAL_ANSV",
    dificultad: "facil",
  },
  {
    type: "know",
    id: "cale-l05-499",
    nucleo_nombre: "El vehiculo",
    subtema: "freno de mano electronico epb",
    hecho_canonico_id: "l05-veh-14",
    pregunta:
      "En vehículos equipados con freno de estacionamiento eléctrico (botón EPB con la letra P), ¿cómo opera técnicamente el bloqueo de ruedas?",
    opcion_a: "Mediante un ancla que cae al asfalto",
    opcion_b:
      "Mediante servomotores eléctricos integrados en las mordazas (cálipers) de las ruedas traseras que presionan firmemente las pastillas contra los discos de freno",
    opcion_c: "Cortando el flujo de gasolina hacia los inyectores",
    opcion_d: "Bloqueando la dirección en posición recta únicamente",
    respuesta_correcta: "b",
    explicacion:
      "El freno EPB sustituye la palanca y guayas mecánicas tradicionales por actuadores electromecánicos en las ruedas traseras, activando la inmovilización segura con solo halar el pulsador.",
    fundamento_legal:
      "Manual de Referencia ANSV sobre evolución de sistemas de retención y frenos.",
    source: "MANUAL_ANSV",
    dificultad: "facil",
  },
  {
    type: "know",
    id: "cale-l05-499-b",
    nucleo_nombre: "El vehiculo",
    subtema: "anclajes isofix latch para sillas de ninos",
    hecho_canonico_id: "l05-veh-15",
    pregunta:
      "¿Cuál es la ventaja de seguridad de fijar una silla de retención infantil mediante anclajes rígidos tipo ISOFIX o LATCH en lugar de usar solo el cinturón del carro?",
    opcion_a: "Que la silla se puede desarmar más rápido para limpiarla",
    opcion_b:
      "Conecta la silla infantil directamente a puntos estructurales soldados al chasis del vehículo, eliminando errores de instalación y reduciendo el movimiento y desplazamiento de la silla en un impacto",
    opcion_c: "Permite que el niño viaje sin abrocharse el arnés interno de la silla",
    opcion_d: "Permite colocar la silla sobre el techo del automóvil",
    respuesta_correcta: "b",
    explicacion:
      "El sistema ISOFIX/LATCH ancla mecánicamente la silla infantil al chasis, eliminando la holgura y la mala colocación típica de amarrar con cinturón, protegiendo con máxima solidez la vida de los niños.",
    fundamento_legal:
      "Resolución 20253040037125; Reglamento Técnico de Sistemas de Retención Infantil.",
    source: "RESOLUCION_CALE",
    dificultad: "facil",
  },
];

const targetOptions = ["a", "b", "c", "d"];
items.forEach((item, idx) => {
  const target = targetOptions[idx % 4];
  const current = item.type === "att" ? item.respuesta_recomendada : item.respuesta_correcta;
  if (current !== target) {
    const temp = item[`opcion_${target}`];
    item[`opcion_${target}`] = item[`opcion_${current}`];
    item[`opcion_${current}`] = temp;
    if (item.type === "att") {
      item.respuesta_recomendada = target;
    } else {
      item.respuesta_correcta = target;
    }
  }
});

function serializeLot(items, loteName) {
  const lines = [];
  lines.push("/* eslint-disable @typescript-eslint/no-require-imports */");
  lines.push("");
  lines.push("const {");
  lines.push("  createAttitudeQuestion: att,");
  lines.push("  createKnowledgeQuestion: know,");
  lines.push("  SOURCES,");
  lines.push('} = require("../schema");');
  lines.push("");
  lines.push(`const LOTE = ${JSON.stringify(loteName)};`);
  lines.push("");
  lines.push("module.exports = {");
  lines.push(`  lote: LOTE,`);
  lines.push("  version: 2,");
  lines.push(
    '  descripcion: "Lote 05 del banco CALE editorial - Protocolo PAS, primeros auxilios, sanciones e inmovilizacion, normas de motociclistas, tuneles, cruces ferreos y tablero.",'
  );
  lines.push("  items: [");

  items.forEach((item) => {
    if (item.type === "att") {
      lines.push("    att({");
      lines.push(`      id: ${JSON.stringify(item.id)},`);
      lines.push(`      lote: LOTE,`);
      lines.push(`      subtema: ${JSON.stringify(item.subtema)},`);
      lines.push(`      hecho_canonico_id: ${JSON.stringify(item.hecho_canonico_id)},`);
      lines.push(`      pregunta: ${JSON.stringify(item.pregunta)},`);
      lines.push(`      sentido_clave: "seleccion",`);
      lines.push(`      opcion_a: ${JSON.stringify(item.opcion_a)},`);
      lines.push(`      opcion_b: ${JSON.stringify(item.opcion_b)},`);
      lines.push(`      opcion_c: ${JSON.stringify(item.opcion_c)},`);
      lines.push(`      opcion_d: ${JSON.stringify(item.opcion_d)},`);
      lines.push(`      respuesta_recomendada: ${JSON.stringify(item.respuesta_recomendada)},`);
      lines.push(`      explicacion: ${JSON.stringify(item.explicacion)},`);
      lines.push(`      fundamento_legal: ${JSON.stringify(item.fundamento_legal)},`);
      lines.push(`      source: SOURCES.${item.source},`);
      lines.push(`      dificultad: ${JSON.stringify(item.dificultad)},`);
      lines.push("    }),");
    } else {
      lines.push("    know({");
      lines.push(`      id: ${JSON.stringify(item.id)},`);
      lines.push(`      lote: LOTE,`);
      lines.push(`      nucleo_nombre: ${JSON.stringify(item.nucleo_nombre)},`);
      lines.push(`      subtema: ${JSON.stringify(item.subtema)},`);
      lines.push(`      hecho_canonico_id: ${JSON.stringify(item.hecho_canonico_id)},`);
      lines.push(`      pregunta: ${JSON.stringify(item.pregunta)},`);
      lines.push(`      opcion_a: ${JSON.stringify(item.opcion_a)},`);
      lines.push(`      opcion_b: ${JSON.stringify(item.opcion_b)},`);
      lines.push(`      opcion_c: ${JSON.stringify(item.opcion_c)},`);
      lines.push(`      opcion_d: ${JSON.stringify(item.opcion_d)},`);
      lines.push(`      respuesta_correcta: ${JSON.stringify(item.respuesta_correcta)},`);
      lines.push(`      explicacion: ${JSON.stringify(item.explicacion)},`);
      lines.push(`      fundamento_legal: ${JSON.stringify(item.fundamento_legal)},`);
      lines.push(`      source: SOURCES.${item.source},`);
      lines.push(`      dificultad: ${JSON.stringify(item.dificultad)},`);
      lines.push("    }),");
    }
  });

  lines.push("  ],");
  lines.push("};");
  lines.push("");

  return lines.join("\n");
}

const targetPath = path.resolve(__dirname, "../../data/cale/lotes/lote-05.js");
fs.writeFileSync(targetPath, serializeLot(items, "lote-05"), "utf8");
console.log(`Lote 05 generado con ${items.length} preguntas en ${targetPath}`);
