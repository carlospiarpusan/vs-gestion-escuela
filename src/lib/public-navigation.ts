export const PUBLIC_NAV_LINKS = [
  { label: "Plataforma", href: "#product-tour" },
  { label: "Implementación", href: "#how-it-works" },
  { label: "Planes", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
] as const;

export const PUBLIC_FOOTER_LINKS = {
  Producto: [
    { label: "Funciones disponibles", href: "#features" },
    { label: "Explorar la plataforma", href: "#product-tour" },
    { label: "Cómo funciona", href: "#how-it-works" },
    { label: "Preguntas frecuentes", href: "#faq" },
    { label: "Planes", href: "#pricing" },
  ],
  Acceso: [
    { label: "Crear cuenta", href: "/registro" },
    { label: "Iniciar sesión", href: "/login" },
  ],
  Legal: [
    { label: "Política de privacidad", href: "/privacidad" },
    { label: "Términos y condiciones", href: "/terminos" },
    { label: "Eliminar cuenta y datos", href: "/eliminar-cuenta" },
  ],
} as const;
