import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createPublicSupabaseClient } from "@/lib/supabase";

const eventSchema = z.object({
  businessId: z.string().uuid(),
  eventType: z.enum(["profile_view", "website_click", "phone_click", "whatsapp_click", "directions_click"]),
  consent: z.literal(true),
});

export async function POST(request: NextRequest) {
  if (request.cookies.get("ets-analytics-consent")?.value !== "granted") {
    return NextResponse.json({ error: "Analytics consent is required." }, { status: 403 });
  }
  const origin = request.headers.get("origin");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (origin && appUrl) {
    try {
      if (new URL(origin).origin !== new URL(appUrl).origin) {
        return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
    }
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid event payload." }, { status: 400 });
  }
  const parsed = eventSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Invalid event payload." }, { status: 400 });

  const supabase = createPublicSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Analytics are unavailable." }, { status: 503 });

  const { error } = await supabase.from("listing_events").insert({
    business_id: parsed.data.businessId,
    event_type: parsed.data.eventType,
    source: "public_profile",
  });
  if (error) {
    console.error("Directory interaction could not be stored:", error.message);
    return NextResponse.json({ error: "Event could not be recorded." }, { status: 503 });
  }

  return NextResponse.json({ recorded: true }, { status: 201 });
}
