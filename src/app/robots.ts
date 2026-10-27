import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/dashboard/", "/login", "/register", "/search", "/list-your-business", "/api/", "/payments/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
