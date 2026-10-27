import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createPublicSupabaseClient } from "@/lib/supabase";

const parametersSchema = z.object({
  field: z.enum(["q", "location"]),
  q: z.string().trim().min(2).max(80),
});

export async function GET(request: NextRequest) {
  const parsed = parametersSchema.safeParse({
    field: request.nextUrl.searchParams.get("field"),
    q: request.nextUrl.searchParams.get("q"),
  });
  if (!parsed.success) return NextResponse.json({ error: "Invalid suggestion query." }, { status: 400 });

  const supabase = createPublicSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Search is not configured." }, { status: 503 });

  const pattern = `${parsed.data.q.replace(/[\\%_]/g, "\\$&")}%`;
  if (parsed.data.field === "q") {
    const { data, error } = await supabase.from("businesses")
      .select("name")
      .eq("status", "published")
      .ilike("name", pattern)
      .order("name")
      .limit(8);
    if (error) {
      console.error("Business name suggestions failed:", error.message);
      return NextResponse.json({ error: "Suggestions unavailable." }, { status: 503 });
    }
    return NextResponse.json([...new Set((data ?? []).map((business) => business.name))]);
  }

  const { data, error } = await supabase.from("business_locations")
    .select("city, province")
    .ilike("city", pattern)
    .order("city")
    .limit(30);
  if (error) {
    console.error("Location suggestions failed:", error.message);
    return NextResponse.json({ error: "Suggestions unavailable." }, { status: 503 });
  }

  return NextResponse.json([...new Set((data ?? []).map((item) => item.city))].slice(0, 8));
}
