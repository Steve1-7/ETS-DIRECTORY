import Link from "next/link";
import { createBusinessListing } from "@/app/actions";
import { categories } from "@/lib/categories";

type NewListingPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function NewListingPage({ searchParams }: NewListingPageProps) {
  const { error } = await searchParams;
  return (
    <section className="mx-auto max-w-3xl">
      <p className="eyebrow mb-2">Get discovered</p>
      <h1 className="section-title">Add your business</h1>
      <p className="section-copy">Listings are reviewed before they appear in the public directory.</p>
      {error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error === "not-configured" ? "Directory services are not configured." : "Some information could not be saved. Check your entries and try again."}</p>}
      <form action={createBusinessListing} className="mt-6 grid gap-5 rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm md:p-7">
        <Field label="Business name" name="name" required maxLength={160} />
        <Field label="Short introduction" name="shortDescription" required maxLength={280} />
        <label className="grid gap-2 text-sm font-semibold">About the business
          <textarea className="search-input min-h-32 rounded-lg border border-[var(--line)] p-3" maxLength={10000} name="description" />
        </label>
        <label className="grid gap-2 text-sm font-semibold">Category
          <select className="search-input min-h-11 rounded-lg border border-[var(--line)] bg-white px-3" name="category" required>
            <option value="">Choose a category</option>
            {categories.map((category) => <option key={category.slug} value={category.slug}>{category.name}</option>)}
          </select>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Province" name="province" required maxLength={100} />
          <Field label="City" name="city" required maxLength={100} />
          <Field label="Suburb (optional)" name="suburb" maxLength={100} />
          <Field label="Public contact email" name="email" type="email" maxLength={254} />
          <Field label="Phone number" name="phone" type="tel" maxLength={32} />
          <Field label="WhatsApp number" name="whatsapp" type="tel" maxLength={32} />
          <Field label="Website" name="website" type="url" maxLength={2048} />
        </div>
        <p className="text-xs leading-5 text-[var(--muted)]">Do not include private home addresses or sensitive personal information. By submitting, you confirm you are authorized to represent this business. Review and privacy terms apply.</p>
        <div className="flex flex-wrap items-center gap-4">
          <button className="min-h-11 rounded-lg bg-[var(--green)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--green-dark)]" type="submit">Submit for review</button>
          <Link className="text-sm font-semibold text-[var(--muted)]" href="/dashboard">Cancel</Link>
        </div>
      </form>
    </section>
  );
}

function Field({ label, name, type = "text", required = false, maxLength }: { label: string; name: string; type?: string; required?: boolean; maxLength?: number }) {
  return <label className="grid gap-2 text-sm font-semibold">{label}<input className="search-input min-h-11 rounded-lg border border-[var(--line)] px-3" maxLength={maxLength} name={name} required={required} type={type} /></label>;
}
