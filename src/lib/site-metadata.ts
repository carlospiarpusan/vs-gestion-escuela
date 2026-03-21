import type { Metadata } from "next";

export const SITE_NAME = "AutoEscuela Pro";
export const DEFAULT_SITE_URL = "https://vs-gestion-escuela.vercel.app";

function normalizeUrl(value: string | undefined | null) {
  if (!value) return DEFAULT_SITE_URL;
  const trimmed = value.trim();
  if (!trimmed) return DEFAULT_SITE_URL;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return `https://${trimmed}`;
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
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}
