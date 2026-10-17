import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Features from "@/components/Features";

const ProductTour = dynamic(() => import("@/components/ProductTour"));
const HowItWorks = dynamic(() => import("@/components/HowItWorks"));
const Pricing = dynamic(() => import("@/components/Pricing"));
const CTA = dynamic(() => import("@/components/CTA"));
const Footer = dynamic(() => import("@/components/Footer"));
const FAQ = dynamic(() => import("@/components/public/FAQ"));
const TrustSection = dynamic(() => import("@/components/public/TrustSection"));
import { faqItems } from "@/lib/public-site-content";
import {
  buildPublicMetadata,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
  siteUrl,
} from "@/lib/site-metadata";

export const metadata: Metadata = buildPublicMetadata({
  title: "ConduSoft | Software para autoescuelas y CEA en Colombia",
  description: SITE_DESCRIPTION,
  path: "/",
  keywords: SITE_KEYWORDS,
});

export default function Home() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteUrl}#website`,
        url: siteUrl.toString(),
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        inLanguage: "es-CO",
        publisher: { "@id": `${siteUrl}#organization` },
      },
      {
        "@type": "Organization",
        "@id": `${siteUrl}#organization`,
        name: SITE_NAME,
        alternateName: "ConduSoft.co",
        url: siteUrl.toString(),
        logo: {
          "@type": "ImageObject",
          url: `${siteUrl}icon.png`,
        },
        sameAs: ["https://www.linkedin.com/company/condusoft", "https://facebook.com/condusoftco"],
        areaServed: {
          "@type": "Country",
          name: "Colombia",
        },
        knowsAbout: [
          "Software para autoescuelas",
          "Escuelas de conducción",
          "Gestión de alumnos",
          "Gestión financiera",
          "Gestión de flota",
          "Centros de Enseñanza Automovilística (CEA)",
          "Preparación CALE",
          "App oficial en Google Play",
          "Protección de datos",
          "Solicitudes ARCO",
          "Cumplimiento interno",
        ],
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${siteUrl}#software`,
        name: SITE_NAME,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        areaServed: "CO",
        brand: {
          "@type": "Brand",
          name: SITE_NAME,
        },
        description: SITE_DESCRIPTION,
        url: siteUrl.toString(),
      },
      {
        "@type": "FAQPage",
        "@id": `${siteUrl}#faq`,
        mainEntity: faqItems.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      },
    ],
  };

  return (
    <div className="apple-shell min-h-screen transition-colors duration-300">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />
      <main id="main-content">
        <Hero />
        <Features />
        <ProductTour />
        <HowItWorks />
        <TrustSection />
        <Pricing />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
