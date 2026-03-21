export const PUBLIC_NAV_LINKS = [
  { label: "Funciones", href: "#features" },
  { label: "Implementación", href: "#how-it-works" },
  { label: "FAQ", href: "#faq" },
  { label: "Planes", href: "#pricing" },
] as const;

export const PUBLIC_FOOTER_LINKS = {
  Producto: [
    { label: "Funciones disponibles", href: "#features" },
    { label: "Próximamente", href: "#features" },
    { label: "Cómo funciona", href: "#how-it-works" },
    { label: "Preguntas frecuentes", href: "#faq" },
    { label: "Planes", href: "#pricing" },
  ],
  Acceso: [
    { label: "Crear cuenta", href: "/registro" },
    { label: "Iniciar sesión", href: "/login" },
    { label: "Solicitar acompañamiento", href: "#contacto" },
  ],
  Legal: [
    { label: "Política de privacidad", href: "/privacidad" },
    { label: "Términos y condiciones", href: "/terminos" },
  ],
} as const;
