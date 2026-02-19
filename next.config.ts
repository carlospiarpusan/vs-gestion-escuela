/**
 * ============================================================
 * Configuración de Next.js - next.config.ts
 * ============================================================
 *
 * Archivo principal de configuración del framework Next.js.
 * Incluye headers de seguridad HTTP para proteger contra
 * ataques comunes (clickjacking, XSS, MIME sniffing, etc.).
 *
 * Los headers se aplican a TODAS las rutas de la aplicación.
 *
 * Documentación: https://nextjs.org/docs/app/api-reference/config/next-config-js
 * ============================================================
 */

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Headers de seguridad HTTP.
   * Se aplican automáticamente a todas las respuestas del servidor.
   */
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://va.vercel-scripts.com; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self' data:;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
