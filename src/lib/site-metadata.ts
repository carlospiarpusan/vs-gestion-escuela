import type { Metadata } from "next";

export const SITE_NAME = "Condusoft";
export const DEFAULT_SITE_URL = "https://condusoft.co";
export const SITE_SHARE_IMAGE_PATH = "/opengraph-image";
export const SITE_DESCRIPTION =
  "Condusoft es software para autoescuelas y centros de enseñanza automovilística (CEA) en Colombia. Gestiona alumnos, matrículas, clases, finanzas, flota, consentimiento de datos, solicitudes ARCO y cumplimiento interno desde una sola plataforma profesional.";
export const DEFAULT_GOOGLE_SITE_VERIFICATION =
  "google-site-verification=U3R7Q9uL_tC3jpUJV65oksAggtp0CEB9yACnUoAMSrg";

export const SITE_KEYWORDS = [
  "Condusoft",
  "software para autoescuelas",
  "software CEA Colombia",
  "centros de enseñanza automovilística",
  "gestión de escuelas de conducción",
  "plataforma para autoescuelas",
  "sistema de gestión automotriz",
  "control de alumnos autoescuela",
  "software administrativo CEA",
  "gestión financiera autoescuelas",
  "cumplimiento interno autoescuelas",
  "protección de datos autoescuelas colombia",
  "solicitudes ARCO autoescuelas",
  "consentimiento de datos CEA",
];

function normalizeUrl(value: string | undefined | null) {
  if (!value) return DEFAULT_SITE_URL;
  const trimmed = value.trim();
  if (!trimmed) return DEFAULT_SITE_URL;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return `https://${trimmed}`;
}

function normalizeGoogleVerification(value: string | undefined | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.startsWith("google-site-verification=")
    ? trimmed.replace(/^google-site-verification=/, "")
    : trimmed;
}

export function getSiteUrl() {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    DEFAULT_SITE_URL;

  return new URL(normalizeUrl(raw));
}

export const siteUrl = getSiteUrl();
export const googleSiteVerification = normalizeGoogleVerification(
  process.env.GOOGLE_SITE_VERIFICATION ||
    process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ||
    DEFAULT_GOOGLE_SITE_VERIFICATION
);

export function buildPublicMetadata({
  title,
  description,
  path,
  keywords = [],
}: {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
}): Metadata {
  return {
    title,
    description,
    keywords,
    category: "software",
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    alternates: {
      canonical: path,
    },
    openGraph: {
      title,
      description,
      url: path,
      siteName: SITE_NAME,
      locale: "es_CO",
      type: "website",
      images: [
        {
          url: SITE_SHARE_IMAGE_PATH,
          width: 1200,
          height: 630,
          alt: `${SITE_NAME} | Software para autoescuelas en Colombia`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [SITE_SHARE_IMAGE_PATH],
    },
  };
}
