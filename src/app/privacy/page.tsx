import type { Metadata } from "next";
import { InfoPage } from "@/components/info-page";

export const metadata: Metadata = {
  title: "Privacy notice",
  description: "Privacy notice template for ETS-Directory.",
  robots: { index: false, follow: true },
};

export default function PrivacyPage() {
  return (
    <InfoPage eyebrow="Legal information" title="Privacy notice — draft template">
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">Draft only. This notice is not legal advice and must be reviewed by a qualified South African privacy professional before launch.</p>
      <h2 className="text-lg font-extrabold text-[var(--ink)]">Information and purpose</h2>
      <p>The directory processes account details, business listing information, reviews, saved listings/searches, and enquiries to provide its features. An enquiry and the visitor’s reply address are shared with the selected business after consent. If enabled, Resend delivers the business an email notification. Paystack handles promotion checkout when configured; payment-card details are not stored by ETS-Directory.</p>
      <p>Optional site analytics only run after you opt in. They record page paths (not query strings or search terms), searches, listing interactions, external referrer domains, broad device categories, and a temporary browser-session identifier. Analytics does not record IP addresses, names, account IDs, or full user-agent strings. Raw analytics events are automatically deleted after 30 days. Use the Privacy settings control on any page to change or withdraw your choice. The final notice and lawful basis must be reviewed by qualified South African counsel before launch.</p>
      <h2 className="text-lg font-extrabold text-[var(--ink)]">Your choices and rights</h2>
      <p>The final service must provide a clear way to request access, correction, deletion, or removal of an account, review, enquiry, or listing, and explain how to raise a privacy concern. Do not submit identity documents or confidential information through directory forms.</p>
      <h2 className="text-lg font-extrabold text-[var(--ink)]">Contact and updates</h2>
      <p>A verified privacy contact, complaint procedure, retention details for non-analytics information, and cross-border transfer details must be added and legally reviewed before this page becomes an operative privacy notice.</p>
    </InfoPage>
  );
}
