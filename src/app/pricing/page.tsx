import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { InfoPage } from "@/components/info-page";

export const metadata: Metadata = {
  title: "Plans and pricing",
  description: "Explore proposed ETS-Directory business listing plans.",
};

const plans = [
  { name: "Free", price: "R0", features: ["Business profile and contact links", "Services, location, photos and hours", "Enquiries and basic performance metrics"] },
  { name: "Featured", price: "R199", features: ["One-month sponsored search placement", "Clearly labelled as sponsored", "No automatic renewal"] },
  { name: "Premium", price: "R399", features: ["One-month priority sponsored placement", "Clearly labelled as sponsored", "No automatic renewal"] },
];

export default function PricingPage() {
  return (
    <InfoPage eyebrow="For local businesses" title="Simple plans to help you get discovered">
      <p>Directory profiles are free. Optional sponsored plans are priced in South African Rand and are offered for one month at a time, with no automatic renewal. Sponsored businesses are labelled and are not endorsed by ETS-Directory.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {plans.map((plan) => (
          <article className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm" key={plan.name}>
            <h2 className="font-extrabold">{plan.name}</h2>
            <p className="mt-2 text-3xl font-extrabold tracking-tight text-[var(--green)]">{plan.price}<span className="ml-1 text-sm font-semibold text-[#758078]">/ month</span></p>
            <ul className="mt-4 space-y-2">
              {plan.features.map((feature) => <li className="flex gap-2 text-sm text-[#637067]" key={feature}><Check aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--green)]" size={15} />{feature}</li>)}
            </ul>
          </article>
        ))}
      </div>
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Promotions are prepaid for one month and do not renew automatically. Paystack checkout requires merchant credentials and a verified webhook endpoint. Where payments are not configured, sponsored promotion is unavailable; listing and verification remain separate.</p>
      <Link className="inline-flex text-sm font-bold text-[var(--green)] hover:text-[var(--green-dark)]" href="/list-your-business">List your business <span aria-hidden="true" className="ml-1">→</span></Link>
    </InfoPage>
  );
}
