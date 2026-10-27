import type { MetadataRoute } from "next";
import { createPublicSupabaseClient } from "@/lib/supabase";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
  const supabase = createPublicSupabaseClient();
  if (!supabase) return staticRoutes;

  const { data: businesses, error } = await supabase
    .from("businesses")
    .select("slug, updated_at")
    .eq("status", "published")
    .order("updated_at", { ascending: false })
    .limit(5000);
  if (error) {
    console.error("Published business sitemap entries could not be loaded:", error.message);
    return staticRoutes;
  }

  return [
    ...staticRoutes,
    ...(businesses ?? []).map((business) => ({
      url: `${baseUrl}/business/${business.slug}`,
      lastModified: new Date(business.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
