"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";

export default function RegistroPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    escuela: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Integrate with Supabase auth
    console.log("Registro:", formData);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-black px-6">
      {/* Back to home */}
      <div className="absolute top-6 left-6">
        <Link
          href="/"
          className="text-sm text-[#0071e3] hover:underline"
        >
          &larr; Volver al inicio
        </Link>
      </div>

      <div className="w-full max-w-sm animate-scale-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
            AutoEscuela<span className="gradient-text">Pro</span>
          </h1>
          <p className="text-[#86868b] mt-2 text-sm">
            Crea tu cuenta gratuita
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="nombre"
              className="block text-xs font-medium text-[#1d1d1f] dark:text-[#f5f5f7] mb-1.5"
            >
              Nombre completo
            </label>
            <input
              id="nombre"
              name="nombre"
              type="text"
              value={formData.nombre}
              onChange={handleChange}
              placeholder="Tu nombre"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-[#f5f5f7] dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-[#f5f5f7] text-sm placeholder:text-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-xs font-medium text-[#1d1d1f] dark:text-[#f5f5f7] mb-1.5"
            >
              Correo electrónico
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="tu@email.com"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-[#f5f5f7] dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-[#f5f5f7] text-sm placeholder:text-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label
              htmlFor="escuela"
              className="block text-xs font-medium text-[#1d1d1f] dark:text-[#f5f5f7] mb-1.5"
            >
              Nombre de tu autoescuela
            </label>
            <input
              id="escuela"
              name="escuela"
              type="text"
              value={formData.escuela}
              onChange={handleChange}
              placeholder="Mi Autoescuela"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-[#f5f5f7] dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-[#f5f5f7] text-sm placeholder:text-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-medium text-[#1d1d1f] dark:text-[#f5f5f7] mb-1.5"
            >
              Contraseña
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={handleChange}
                placeholder="Mínimo 8 caracteres"
                required
                minLength={8}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-[#f5f5f7] dark:bg-[#1d1d1f] text-[#1d1d1f] dark:text-[#f5f5f7] text-sm placeholder:text-[#86868b] focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent transition-all pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7] transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-[#0071e3] text-white py-3 rounded-xl text-sm font-medium hover:bg-[#0077ED] transition-all duration-300 hover:shadow-lg hover:shadow-[#0071e3]/20"
          >
            Crear cuenta
          </button>
        </form>

        {/* Terms */}
        <p className="text-xs text-[#86868b] text-center mt-4">
          Al registrarte, aceptas nuestros términos de servicio y política de privacidad.
        </p>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
          <span className="text-xs text-[#86868b]">o</span>
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
        </div>

        {/* Login link */}
        <p className="text-center text-sm text-[#86868b]">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="text-[#0071e3] hover:underline font-medium">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
