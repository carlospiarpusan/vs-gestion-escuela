type PublicTrustPoint = {
  id: string;
  title: string;
  description: string;
  highlight: string;
};

type PublicFaqItem = {
  question: string;
  answer: string;
};

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
