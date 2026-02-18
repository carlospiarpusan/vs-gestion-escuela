"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Integrate with Supabase auth
    console.log("Login:", { email, password });
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
            Inicia sesión en tu cuenta
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-medium text-[#1d1d1f] dark:text-[#f5f5f7] mb-1.5"
            >
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
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
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tu contraseña"
                required
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
            Iniciar Sesión
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
          <span className="text-xs text-[#86868b]">o</span>
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
        </div>

        {/* Register link */}
        <p className="text-center text-sm text-[#86868b]">
          ¿No tienes cuenta?{" "}
          <Link href="/registro" className="text-[#0071e3] hover:underline font-medium">
            Crear cuenta
          </Link>
        </p>
      </div>
    </div>
  );
}
