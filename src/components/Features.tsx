"use client";

import {
  Users,
  Calendar,
  Car,
  ClipboardCheck,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, useMotionTemplate, useMotionValue, useSpring } from "framer-motion";
import { MouseEvent } from "react";

const features = [
  {
    icon: Users,
    title: "Alumnos",
    description: "Expedientes completos, pagos y progreso práctico.",
    className: "sm:col-span-2 md:col-span-2 md:row-span-2",
  },
  {
    icon: Calendar,
    title: "Agenda",
    description: "Calendario drag-and-drop para clases y exámenes.",
    className: "sm:col-span-1 md:col-span-1 md:row-span-1",
  },
  {
    icon: Car,
    title: "Flota",
    description: "Control de vehículos, ITV y seguros.",
    className: "sm:col-span-1 md:col-span-1 md:row-span-1",
  },
  {
    icon: BarChart3,
    title: "Finanzas",
    description: "Control de ingresos, gastos y facturación.",
    className: "sm:col-span-2 md:col-span-2 md:row-span-1",
  },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function FeatureCard({ feature, index }: { feature: any; index: number }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseX = useSpring(x, { stiffness: 500, damping: 100 });
  const mouseY = useSpring(y, { stiffness: 500, damping: 100 });

  function onMouseMove({ currentTarget, clientX, clientY }: MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    x.set(clientX - left);
    y.set(clientY - top);
  }

  const maskImage = useMotionTemplate`radial-gradient(240px at ${mouseX}px ${mouseY}px, white, transparent)`;
  const style = { maskImage, WebkitMaskImage: maskImage };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      onMouseMove={onMouseMove}
      className={cn(
        "group relative bg-white dark:bg-[#1d1d1f] rounded-3xl p-8 shadow-sm hover:shadow-xl transition-shadow duration-500 overflow-hidden border border-gray-100 dark:border-gray-800",
        feature.className
      )}
    >
      {/* Background Hover Effect */}
      <div className="pointer-events-none absolute inset-0 group-hover:bg-slate-50/50 dark:group-hover:bg-white/5 transition-colors duration-500" />

      {/* Spotlight Effect */}
      <motion.div
        className="pointer-events-none absolute -inset-px opacity-0 transition duration-300 group-hover:opacity-100"
        style={style}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10" />
      </motion.div>

      <div className="relative z-10 flex flex-col h-full justify-between">
        <div className="mb-8">
          <feature.icon className="w-10 h-10 text-blue-apple mb-4" />
          <h3 className="text-2xl font-semibold text-foreground mb-2">
            {feature.title}
          </h3>
          <p className="text-[17px] text-gray-500 leading-relaxed max-w-[90%]">
            {feature.description}
          </p>
        </div>

        <div className="flex items-center text-blue-apple font-medium text-sm group-hover:translate-x-1 transition-transform cursor-pointer">
          Saber más &rarr;
        </div>
      </div>
    </motion.div>
  );
}

export default function Features() {
  return (
    <section id="features" className="py-16 sm:py-24 md:py-32 bg-gray-50 dark:bg-black">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="text-center mb-12 sm:mb-16 md:mb-24">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-foreground mb-4"
          >
            Orden. Control.
            <br />
            <span className="text-gray-500">Todo en su sitio.</span>
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 auto-rows-[minmax(200px,auto)] sm:auto-rows-[minmax(240px,auto)]">
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
