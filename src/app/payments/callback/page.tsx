import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/info-page";

export const metadata: Metadata = {
  title: "Payment processing",
  robots: { index: false, follow: false },
};

export default function PaymentCallbackPage() {
  return (
    <InfoPage eyebrow="Payment update" title="Your payment is being confirmed">
      <p>Paystack has returned you to ETS-Directory. A verified payment webhook will update your listing status; this page does not treat the redirect as proof of payment.</p>
      <p>Check your business dashboard in a moment. If the promotion does not appear, contact support and include your payment receipt reference—never send card details.</p>
      <Link className="inline-flex rounded-lg bg-[var(--green)] px-4 py-2.5 text-sm font-bold text-white" href="/dashboard">Open business dashboard</Link>
    </InfoPage>
  );
}
