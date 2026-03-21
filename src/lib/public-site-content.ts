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

export const HOME_KEYWORDS = [
  "software para autoescuelas en Colombia",
  "software para escuelas de conducción",
  "gestión de autoescuelas",
  "plataforma para escuelas de conducción",
  "software CEA Colombia",
  "sistema para autoescuelas",
];

export const heroHighlights = [
  "Deja de perder dinero: Control absoluto sobre alumnos, clases y horas operativas.",
  "Dile adiós al caos financiero: Separa y domina tus ingresos, cartera y caja diaria.",
  "Protege tu flota: Gestión proactiva de vehículos y mantenimientos en un solo clic.",
];

export const availableFeatures: PublicFeatureArea[] = [
  {
    id: "operacion",
    eyebrow: "Tranquilidad Operativa",
    title: "Gestiona alumnos, agendas y clases sin el caos del papel",
    description:
      "Toma el control total de los expedientes, contratos, horarios e instructores. Olvídate de perseguir hojas sueltas.",
    outcome: "Visibilidad inmediata de cada alumno y cero dolores de cabeza administrativos.",
    modules: ["Alumnos", "Matrículas", "Clases", "Horas", "Exámenes", "Instructores"],
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
    title: "Escala sin miedo: Gestiona múltiples sedes",
    description:
      "Empieza organizando una escuela y expande tu dominio. Maneja infinitas sedes, alumnos y vehículos con la misma facilidad y control desde tu cuenta principal.",
    highlight: "Crecimiento Ilimitado",
  },
  {
    id: "roles",
    title: "Información inteligente para cada persona",
    description:
      "Protege tus datos financieros y operativos. Administradores, instructores y alumnos ven únicamente lo que necesitan, garantizando el orden y la privacidad.",
    highlight: "Control de Accesos",
  },
];

export const faqItems: PublicFaqItem[] = [
  {
    question: "¿Para qué tipo de autoescuela sirve AutoEscuela Pro?",
    answer:
      "Está pensado para escuelas de conducción en Colombia que necesitan controlar alumnos, clases, pagos, cartera, gastos, flota y operación diaria desde una sola plataforma.",
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
];

export const publicRoutes = ["/", "/login", "/registro", "/privacidad", "/terminos"] as const;
