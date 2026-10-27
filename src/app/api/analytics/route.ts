import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createPublicSupabaseClient } from "@/lib/supabase";

const eventSchema = z.object({
  sessionId: z.string().uuid(),
  eventType: z.enum(["page_view", "search"]),
  pagePath: z.string().min(1).max(300).regex(/^\/(?!\/)[^?#]*$/),
  referrerDomain: z.string().max(253).regex(/^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(\.([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?))*$/).nullable(),
  deviceCategory: z.enum(["mobile", "tablet", "desktop"]),
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

  const { error } = await supabase.rpc("record_site_activity", {
    target_session_id: parsed.data.sessionId,
    target_event_type: parsed.data.eventType,
    target_page_path: parsed.data.pagePath,
    target_referrer_domain: parsed.data.referrerDomain,
    target_device_category: parsed.data.deviceCategory,
  });
  if (error) {
    console.error("Site activity could not be stored:", error.message);
    return NextResponse.json({ error: "Event could not be recorded." }, { status: 503 });
  }

  return NextResponse.json({ recorded: true }, { status: 201 });
}
