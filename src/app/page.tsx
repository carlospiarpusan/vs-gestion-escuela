import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import Pricing from "@/components/Pricing";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";
import FAQ from "@/components/public/FAQ";
import TrustSection from "@/components/public/TrustSection";
import { faqItems, HOME_KEYWORDS } from "@/lib/public-site-content";
import { buildPublicMetadata, SITE_NAME, siteUrl } from "@/lib/site-metadata";

export const metadata: Metadata = buildPublicMetadata({
  title: "Software para autoescuelas en Colombia",
  description:
    "Software para autoescuelas y escuelas de conducción en Colombia. Gestiona alumnos, matrículas, clases, ingresos, cartera, gastos, flota y sedes desde una sola plataforma.",
  path: "/",
  keywords: HOME_KEYWORDS,
});

export default function Home() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}#organization`,
        name: SITE_NAME,
        url: siteUrl.toString(),
        areaServed: "CO",
        knowsAbout: [
          "Software para autoescuelas",
          "Escuelas de conducción",
          "Gestión de alumnos",
          "Gestión financiera",
          "Gestión de flota",
        ],
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${siteUrl}#software`,
        name: SITE_NAME,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        areaServed: "CO",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "COP",
          description: "Demo guiada y evaluación comercial según la operación de la autoescuela.",
        },
        description:
          "Software para autoescuelas y escuelas de conducción en Colombia con alumnos, matrículas, clases, ingresos, cartera, gastos, flota y sedes.",
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
      <Hero />
      <Features />
      <HowItWorks />
      <TrustSection />
      <Pricing />
      <FAQ />
      <CTA />
      <Footer />
    </div>
  );
}
