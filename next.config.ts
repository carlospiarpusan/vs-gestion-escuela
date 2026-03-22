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
import { CONTENT_SECURITY_POLICY } from "./src/lib/security-headers";

const nextConfig: NextConfig = {
  /**
   * Optimización de compilación y despliegue.
   * "standalone" reduce drásticamente el tamaño del bundle para Vercel o contenedores Docker.
   */
  output: "standalone",
  /**
   * Compresión gzip/brotli de respuestas HTTP.
   * Reduce el tamaño de transferencia ~70% en HTML, CSS, JS y JSON.
   * En Vercel esto se aplica automáticamente en el CDN, pero `compress: true`
   * garantiza compresión también en self-hosting (next start / Docker).
   */
  compress: true,
  /**
   * Headers HTTP de seguridad + cache de assets estáticos.
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
            value: CONTENT_SECURITY_POLICY,
          },
        ],
      },
      // Cache agresivo para assets estáticos (JS, CSS, fuentes, imágenes).
      // Next.js genera hashes en los nombres de archivo, así que immutable es seguro.
      {
        source: "/_next/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // Fuentes optimizadas por next/font — cache de 1 año.
      {
        source: "/fonts/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // Imágenes estáticas (favicon, OG images, etc.) — cache de 1 día con revalidación.
      {
        source: "/(.*\\.(?:ico|png|jpg|jpeg|svg|webp))",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
