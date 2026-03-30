import SectionIntro from "@/components/public/SectionIntro";
import { faqItems } from "@/lib/public-site-content";

export default function FAQ() {
  return (
    <section
      id="faq"
      className="bg-background scroll-mt-28 border-t border-[var(--surface-border)] py-16 sm:scroll-mt-32 sm:py-24 md:py-28"
    >
      <div className="mx-auto max-w-[980px] px-4 sm:px-6">
        <SectionIntro
          badge="Preguntas frecuentes"
          title="Respuestas claras para escuelas de conducción en Colombia"
          description="La home responde lo básico que suelen buscar los administradores antes de pedir una demo o crear su cuenta."
        />

        <div className="space-y-4">
          {faqItems.map((item) => (
            <details
              key={item.question}
              className="apple-panel-muted rounded-[26px] p-5 transition-colors open:border-[color:color-mix(in_srgb,var(--brand-400)_40%,var(--surface-border))]"
            >
              <summary className="text-foreground cursor-pointer list-none text-lg font-semibold">
                {item.question}
              </summary>
              <p className="apple-copy mt-4 text-sm leading-7 sm:text-[15px]">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
