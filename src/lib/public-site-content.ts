export type PublicFeatureArea = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  outcome: string;
  modules: string[];
};

export type PublicUpcomingArea = {
  id: string;
  title: string;
  description: string;
  note: string;
};

export type PublicTrustPoint = {
  id: string;
  title: string;
  description: string;
  highlight: string;
};

export type PublicFaqItem = {
  question: string;
  answer: string;
};

export type PublicCapabilityGroup = {
  id: string;
  title: string;
  description: string;
  modules: string[];
};

export const HOME_KEYWORDS = [
  "ConduSoft",
  "ConduSoft.co",
  "software para autoescuelas en Colombia",
  "software para escuelas de conducción",
  "CEA Colombia",
  "preparación CALE",
  "app oficial en Google Play",
  "software CEA",
  "centro de enseñanza automovilística",
  "gestión de autoescuelas",
  "plataforma para escuelas de conducción",
  "sistema para autoescuelas",
  "software para centros de enseñanza automovilística",
  "cumplimiento interno autoescuelas",
  "protección de datos autoescuelas colombia",
  "ARCO habeas data autoescuelas",
];

export const heroHighlights = [
  "ConduSoft centraliza alumnos, matrículas y horas operativas en una sola vista.",
  "Separa ingresos, cartera, caja diaria y gastos para entender la realidad financiera de tu escuela.",
  "Controla vehículos, mantenimientos, sedes y automatización sin depender de hojas sueltas o chats.",
  "Documenta consentimiento, ARCO, retención, backups, incidentes y evidencia interna desde el mismo sistema.",
];

export const availableFeatures: PublicFeatureArea[] = [
  {
    id: "operacion",
    eyebrow: "Tranquilidad Operativa",
    title: "Gestiona alumnos, matrículas y horas sin el caos del papel",
    description:
      "Toma el control total de los expedientes, contratos, horarios e instructores. Olvídate de perseguir hojas sueltas.",
    outcome: "Visibilidad inmediata de cada alumno y cero dolores de cabeza administrativos.",
    modules: ["Alumnos", "Matrículas", "Horas", "Exámenes", "Instructores"],
  },
  {
    id: "cale",
    eyebrow: "Preparación CALE",
    title: "Refuerza la evaluación CALE con app móvil",
    description:
      "Acompaña a tus alumnos con práctica desde el celular y comunica que tu CEA usa una app oficial en Google Play.",
    outcome:
      "Más claridad para el alumno y un argumento comercial real al momento de vender la formación.",
    modules: ["Evaluación CALE", "App Google Play", "Práctica móvil", "Alumnos"],
  },
  {
    id: "finanzas",
    eyebrow: "Control Financiero",
    title: "Conoce el estado real de tu dinero, sin mezclar cuentas",
    description:
      "Visualiza tu caja diaria, haz seguimiento impecable de cartera y domina los egresos. Por fin verás la rentabilidad real.",
    outcome: "Cierra cada día con la confianza de que cada peso está justificado y conciliado.",
    modules: ["Ingresos", "Cartera", "Caja diaria", "Gastos", "Informes"],
  },
  {
    id: "flota",
    eyebrow: "Protección de Flota",
    title: "La inteligencia de tus vehículos a la vista en tiempo real",
    description:
      "Asegura la operatividad de tus carros y motos. Controla su disponibilidad, prevén mantenimientos y organiza cada sede estratégicamente.",
    outcome: "Elimina la improvisación: menos vehículos parados significa más clases facturadas.",
    modules: ["Vehículos", "Mantenimiento", "Bitácora", "Sedes", "Administrativos"],
  },
  {
    id: "automatizacion",
    eyebrow: "Automatización",
    title: "Deja que el sistema haga el trabajo pesado por ti",
    description:
      "Sistematiza procesos repetitivos: envía facturas automáticamente, importa documentos sin esfuerzo y exporta analíticas al instante.",
    outcome:
      "Tu equipo dejará de ser esclavo de las labores mecánicas y se centrará en hacer crecer tu escuela.",
    modules: ["Correo de facturas", "Importaciones", "Exportaciones", "Automatización"],
  },
  {
    id: "cumplimiento",
    eyebrow: "Cumplimiento Interno",
    title: "Centraliza protección de datos, evidencia documental y gobierno operativo",
    description:
      "Lleva responsable del tratamiento, política vigente, solicitudes ARCO, backups, incidentes, retención y evidencia por escuela sin sacar la trazabilidad a hojas aparte.",
    outcome:
      "Más orden para auditorías internas y más confianza para operar con trazabilidad documental real.",
    modules: ["Cumplimiento", "Consentimiento", "ARCO", "Backups", "Incidentes", "Retención"],
  },
];

export const platformCapabilityGroups: PublicCapabilityGroup[] = [
  {
    id: "operacion-academica",
    title: "Operación académica y seguimiento del alumno",
    description:
      "La plataforma organiza el recorrido diario de la escuela desde el registro del alumno hasta sus horas y evaluaciones.",
    modules: ["Alumnos", "Matrículas", "Horas", "Exámenes", "Instructores"],
  },
  {
    id: "finanzas",
    title: "Finanzas separadas y lectura clara del recaudo",
    description:
      "ConduSoft separa ingresos, cartera, caja diaria, gastos e informes para que la escuela entienda qué se cobró, qué falta y qué está presionando el resultado.",
    modules: ["Ingresos", "Cartera", "Caja diaria", "Gastos", "Informes", "Suscripciones"],
  },
  {
    id: "flota-estructura",
    title: "Flota, sedes y estructura operativa",
    description:
      "La escuela puede mantener visible la disponibilidad de vehículos, el mantenimiento, la bitácora y la estructura de sedes y personal.",
    modules: ["Vehículos", "Mantenimiento", "Bitácora", "Sedes", "Administrativos"],
  },
  {
    id: "cale-movil",
    title: "Evaluación CALE y práctica móvil para alumnos",
    description:
      "La propuesta pública incluye preparación para evaluación CALE, práctica desde el celular y una app oficial disponible en Google Play para alumnos.",
    modules: ["Evaluación CALE", "Simulacros", "Analítica CALE", "App oficial en Google Play"],
  },
  {
    id: "cumplimiento",
    title: "Cumplimiento, contratos y trazabilidad interna",
    description:
      "También centraliza contratos, permisos, solicitudes ARCO y evidencia operativa para que la escuela mantenga trazabilidad sin sacar procesos a otras hojas.",
    modules: ["Contratos", "Permisos", "Cumplimiento", "Solicitudes ARCO", "Consentimiento"],
  },
  {
    id: "automatizacion",
    title: "Automatización documental y tareas repetitivas",
    description:
      "La plataforma ya cubre correo de facturas, importaciones, exportaciones y flujos automáticos para reducir trabajo manual del equipo.",
    modules: ["Correo de facturas", "Importaciones", "Exportaciones", "Automatización"],
  },
];

export const upcomingFeatures: PublicUpcomingArea[] = [
  {
    id: "automation",
    title: "Automatizaciones operativas más amplias",
    description:
      "Seguimientos y tareas repetitivas más allá del correo de facturas, con más acciones guiadas por módulo.",
    note: "Próximamente",
  },
  {
    id: "analytics",
    title: "Analítica ejecutiva más profunda",
    description:
      "Más comparativos, alertas y lecturas gerenciales sobre cartera, recaudo, gasto y rendimiento operativo.",
    note: "Próximamente",
  },
  {
    id: "workflow",
    title: "Flujos extendidos de seguimiento",
    description:
      "Más soporte para recorridos internos de seguimiento y control sin abrir procesos paralelos fuera del sistema.",
    note: "Próximamente",
  },
];

export const trustPoints: PublicTrustPoint[] = [
  {
    id: "colombia",
    title: "El idioma de tu negocio, diseñado para Colombia",
    description:
      "No adaptamos un sistema genérico. Construimos una solución basada exclusivamente en las prioridades, regulaciones y urgencias de las escuelas de conducción colombianas.",
    highlight: "Hecho a tu medida",
  },
  {
    id: "multisede",
    title: "Crece con más sedes cuando las necesites",
    description:
      "Empieza organizando una escuela y amplía la estructura con más sedes, alumnos y vehículos desde una misma cuenta principal.",
    highlight: "Crecimiento con orden",
  },
  {
    id: "roles",
    title: "Información inteligente para cada persona",
    description:
      "Protege tus datos financieros y operativos. Administradores, instructores y alumnos ven únicamente lo que necesitan, garantizando el orden y la privacidad.",
    highlight: "Control de Accesos",
  },
  {
    id: "compliance",
    title: "Cumplimiento interno con evidencia visible",
    description:
      "ConduSoft ya incorpora consentimiento, solicitudes ARCO, bitácora de incidentes, backups, retención y paquete de evidencia documental por escuela.",
    highlight: "Protección de Datos",
  },
];

export const faqItems: PublicFaqItem[] = [
  {
    question: "¿Para qué tipo de autoescuela sirve ConduSoft?",
    answer:
      "ConduSoft está pensado para autoescuelas, CEA y escuelas de conducción en Colombia que necesitan controlar alumnos, horas, pagos, cartera, gastos, flota y operación diaria desde una sola plataforma.",
  },
  {
    question: "¿ConduSoft ayuda con preparación CALE?",
    answer:
      "Sí. La propuesta pública incluye preparación para la evaluación CALE y una app oficial en Google Play para que los alumnos practiquen desde el celular.",
  },
  {
    question: "¿Funciona para varias sedes?",
    answer:
      "Sí. La plataforma ya contempla estructura por escuela y sedes, con usuarios y operación distribuidos según el rol.",
  },
  {
    question: "¿Qué controla hoy en pagos y finanzas?",
    answer:
      "Ya cubre ingresos, abonos, cartera, caja diaria, gastos, facturas por correo, cuentas por pagar e informes operativos.",
  },
  {
    question: "¿Sirve para operar en Colombia?",
    answer:
      "Sí. El foco del producto, su lenguaje comercial y los flujos visibles de la plataforma están orientados a autoescuelas y escuelas de conducción en Colombia.",
  },
  {
    question: "¿Qué cubre ConduSoft en protección de datos y cumplimiento interno?",
    answer:
      "ConduSoft ya permite organizar consentimiento de datos, solicitudes ARCO, responsables, backups, incidentes, políticas de retención y evidencia documental por escuela dentro del sistema.",
  },
  {
    question: "¿ConduSoft reemplaza SICOV, RUNT o la facturación electrónica?",
    answer:
      "No. ConduSoft ayuda a ordenar la operación y el cumplimiento interno de la escuela, pero no sustituye trámites, reportes o integraciones oficiales externas como SICOV, RUNT o DIAN.",
  },
];

export const publicRoutes = [
  "/",
  "/login",
  "/registro",
  "/privacidad",
  "/terminos",
  "/arco",
  "/eliminar-cuenta",
] as const;
