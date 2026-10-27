import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/info-page";

export const metadata: Metadata = {
  title: "List your business",
  description: "Add a South African business listing to ETS-Directory.",
};

export default function ListYourBusinessPage() {
  return (
    <InfoPage eyebrow="For local businesses" title="Help more people find your business">
      <p>Create an account to submit your listing for a human review. Once approved, you can update your business information, location, services, opening hours, and photos from your dashboard.</p>
      <p>Listings are reviewed before publication. Verification is a separate, manual process; sponsored placement is clearly labelled and does not imply an endorsement.</p>
      <div className="rounded-2xl border border-[var(--line)] bg-white p-5" id="claim">
        <h2 className="font-extrabold text-[var(--ink)]">Already have a business profile?</h2>
        <p className="mt-2 text-sm leading-6 text-[#758078]">Sign in, open the public profile, and request a claim review. Staff will verify your relationship before transferring ownership.</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link className="inline-flex rounded-lg bg-[var(--green)] px-4 py-2.5 text-sm font-bold text-white hover:bg-[var(--green-dark)]" href="/register">Create an account</Link>
        <Link className="inline-flex rounded-lg border border-[var(--line)] px-4 py-2.5 text-sm font-bold text-[var(--green)]" href="/login">Sign in</Link>
      </div>
      <Link className="inline-flex text-sm font-bold text-[var(--green)] hover:text-[var(--green-dark)]" href="/pricing">Review promotion plans <span aria-hidden="true" className="ml-1">→</span></Link>
    </InfoPage>
  );
}
