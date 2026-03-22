import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-metadata";

export default function robots(): MetadataRoute.Robots {
  const rootUrl = siteUrl.toString().replace(/\/$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/registro", "/privacidad", "/terminos"],
        disallow: ["/dashboard/", "/api/", "/print/", "/auth/"],
      },
      {
        userAgent: "Googlebot",
        allow: ["/"],
        disallow: ["/api/", "/auth/"],
      },
    ],
    sitemap: `${rootUrl}/sitemap.xml`,
    host: rootUrl,
  };
}
