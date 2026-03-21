import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import PerformanceVitals from "@/components/PerformanceVitals";
import { DeviceVariantProvider } from "@/contexts/DeviceVariantContext";
import { SITE_NAME, siteUrl } from "@/lib/site-metadata";
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
    default: `${SITE_NAME} | Software para autoescuelas en Colombia`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Software para autoescuelas y escuelas de conducción en Colombia. Controla alumnos, clases, ingresos, cartera, gastos, flota y operación diaria desde una sola plataforma.",
  applicationName: SITE_NAME,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: `${SITE_NAME} | Software para autoescuelas en Colombia`,
    description:
      "Plataforma para escuelas de conducción en Colombia con alumnos, agenda, finanzas, flota y operación diaria en un solo sistema.",
    url: "/",
    siteName: SITE_NAME,
    locale: "es_CO",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} | Software para autoescuelas en Colombia`,
    description:
      "Gestión de autoescuelas en Colombia con alumnos, agenda, ingresos, cartera, gastos y flota.",
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
