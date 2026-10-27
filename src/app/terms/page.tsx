import type { Metadata } from "next";
import { InfoPage } from "@/components/info-page";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "Terms of use template for ETS-Directory.",
  robots: { index: false, follow: true },
};

export default function TermsPage() {
  return (
    <InfoPage eyebrow="Legal information" title="Terms of use — draft template">
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">Draft only. These terms are not legally operative and must be reviewed by a qualified South African legal professional before launch.</p>
      <h2 className="text-lg font-extrabold text-[var(--ink)]">Directory information</h2>
      <p>Business information helps visitors discover and contact providers. Listings, reviews, and verification badges are subject to moderation and the service’s review process. Paid placements are labeled as sponsored and are not a quality guarantee or endorsement.</p>
      <h2 className="text-lg font-extrabold text-[var(--ink)]">Accounts and listings</h2>
      <p>Final terms must explain account eligibility, listing ownership, acceptable content, moderation, correction and removal requests, suspension, and dispute handling before accounts or submissions are enabled.</p>
      <h2 className="text-lg font-extrabold text-[var(--ink)]">Payments and contact</h2>
      <p>Where configured, promotion plans are prepaid for one month and do not automatically renew. Cancellation, refunds, consumer rights, liability, governing law, and support details must be completed and reviewed before launch.</p>
    </InfoPage>
  );
}
