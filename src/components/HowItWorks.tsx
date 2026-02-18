"use client";

const steps = [
  {
    number: "01",
    title: "Crea tu cuenta",
    description:
      "Regístrate en menos de un minuto. Sin tarjeta de crédito, sin compromisos.",
  },
  {
    number: "02",
    title: "Configura tu escuela",
    description:
      "Añade tus instructores, vehículos y personaliza la plataforma a tu medida.",
  },
  {
    number: "03",
    title: "Empieza a gestionar",
    description:
      "Registra alumnos, planifica clases y lleva el control total de tu autoescuela.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-white dark:bg-black">
      <div className="max-w-[980px] mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7] mb-4">
            Empieza en minutos.
          </h2>
          <p className="text-xl text-[#86868b] max-w-2xl mx-auto">
            Sin complicaciones. Sin curva de aprendizaje. Tan simple como debería ser.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
          {steps.map((step, index) => (
            <div key={step.number} className="text-center relative">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-[1px] bg-gradient-to-r from-[#0071e3]/30 to-transparent" />
              )}
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#0071e3]/10 mb-6">
                <span className="text-2xl font-bold gradient-text">
                  {step.number}
                </span>
              </div>
              <h3 className="text-2xl font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] mb-3">
                {step.title}
              </h3>
              <p className="text-[#86868b] leading-relaxed max-w-xs mx-auto">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
