import type { MetadataRoute } from "next";
import { publicRoutes } from "@/lib/public-site-content";
import { siteUrl } from "@/lib/site-metadata";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return publicRoutes.map((path) => {
    let priority = 0.5;
    let changeFrequency: "weekly" | "monthly" | "yearly" = "monthly";

    if (path === "/") {
      priority = 1.0;
      changeFrequency = "weekly";
    } else if (path === "/registro" || path === "/login") {
      priority = 0.8;
      changeFrequency = "monthly";
    }

    return {
      url: new URL(path, siteUrl).toString(),
      lastModified: now,
      changeFrequency,
      priority,
    };
  });
}
