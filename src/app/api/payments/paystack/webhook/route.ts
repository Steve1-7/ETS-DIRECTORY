import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

const payloadSchema = z.object({
  event: z.string(),
  data: z.object({
    reference: z.string().min(1).max(100),
    id: z.union([z.number().int().positive(), z.string().min(1).max(100)]),
    amount: z.number().int().positive(),
    currency: z.string().length(3),
  }),
});

export async function POST(request: NextRequest) {
  const secret = process.env.PAYSTACK_WEBHOOK_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || !supabaseUrl || !serviceRoleKey) {
    console.error("Paystack webhook is not configured.");
    return NextResponse.json({ error: "Webhook unavailable." }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature") ?? "";
  if (!/^[a-f0-9]{128}$/i.test(signature)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  const expected = createHmac("sha512", secret).update(rawBody).digest();
  const received = Buffer.from(signature, "hex");
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let rawPayload: unknown;
  try {
    rawPayload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }
  const parsed = payloadSchema.safeParse(rawPayload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
  }
  if (parsed.data.event !== "charge.success") {
    return NextResponse.json({ received: true });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await supabase.rpc("confirm_paystack_payment", {
    payment_reference: parsed.data.data.reference,
    transaction_id: String(parsed.data.data.id),
    confirmed_amount: parsed.data.data.amount,
    confirmed_currency: parsed.data.data.currency,
  });
  if (error) {
    console.error("Paystack payment webhook could not be applied:", error.message);
    return NextResponse.json({ error: "Payment update failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
