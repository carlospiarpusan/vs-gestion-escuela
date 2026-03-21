import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-metadata";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/registro", "/privacidad", "/terminos"],
        disallow: ["/dashboard/", "/api/", "/print/"],
      },
    ],
    sitemap: `${siteUrl.toString().replace(/\/$/, "")}/sitemap.xml`,
  };
}
