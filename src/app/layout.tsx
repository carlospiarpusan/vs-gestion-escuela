import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import PerformanceVitals from "@/components/PerformanceVitals";
import { DeviceVariantProvider } from "@/contexts/DeviceVariantContext";
import {
  googleSiteVerification,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_SHARE_IMAGE_PATH,
  siteUrl,
} from "@/lib/site-metadata";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: `${SITE_NAME} | Software líder para autoescuelas en Colombia (CEA)`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: siteUrl.toString() }],
  publisher: SITE_NAME,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  category: "software",
  verification: {
    google: googleSiteVerification ?? undefined,
  },
  robots: {
    index: true,
    follow: true,
    nocache: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  alternates: {
    canonical: "/",
    languages: {
      "es-CO": "/",
    },
  },
  openGraph: {
    title: `${SITE_NAME} | Gestión profesional de autoescuelas en Colombia`,
    description: SITE_DESCRIPTION,
    url: "/",
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
    title: `${SITE_NAME} | Software líder para autoescuelas en Colombia`,
    description: SITE_DESCRIPTION,
    images: [SITE_SHARE_IMAGE_PATH],
    creator: "@condusoft",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" data-device-variant="desktop">
      <head>
        <link rel="preconnect" href="https://va.vercel-scripts.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://vitals.vercel-insights.com" crossOrigin="anonymous" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        data-device-variant="desktop"
      >
        <DeviceVariantProvider initialVariant="desktop">
          {children}
          <PerformanceVitals />
          <Analytics />
          <SpeedInsights />
        </DeviceVariantProvider>
      </body>
    </html>
  );
}
