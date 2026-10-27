import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

const consentSchema = z.object({ consent: z.enum(["granted", "denied"]) });

export async function POST(request: NextRequest) {
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
    return NextResponse.json({ error: "Invalid consent choice." }, { status: 400 });
  }
  const parsed = consentSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Invalid consent choice." }, { status: 400 });

  const response = NextResponse.json({ saved: true });
  response.cookies.set("ets-analytics-consent", parsed.data.consent, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
