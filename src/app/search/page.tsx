import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, MapPin, Search, Star } from "lucide-react";
import { saveBusiness, saveSearch } from "@/app/actions";
import { SiteHeader } from "@/components/site-header";
import { SearchAutocomplete } from "@/components/search-autocomplete";
import { categories } from "@/lib/categories";
import { createPublicSupabaseClient } from "@/lib/supabase";

export const metadata: Metadata = {
  title: "Search local businesses",
  description: "Search businesses and services across South Africa.",
  robots: { index: false, follow: true },
};

type SearchPageProps = {
  searchParams: Promise<{
    q?: string;
    location?: string;
    category?: string;
    verified?: string;
    open?: string;
    sort?: string;
    page?: string;
    error?: string;
  }>;
};

const pageSize = 20;

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const q = (params.q ?? "").slice(0, 100);
  const location = (params.location ?? "").slice(0, 100);
  const categorySlug = categories.some((item) => item.slug === params.category) ? params.category! : "";
  const category = categories.find((item) => item.slug === categorySlug);
  const verified = params.verified === "on";
  const openNow = params.open === "on";
  const sort = ["relevance", "newest", "rating"].includes(params.sort ?? "") ? params.sort! : "relevance";
  const page = Math.max(0, Math.min(10000, Number.parseInt(params.page ?? "0", 10) || 0));
  const supabase = createPublicSupabaseClient();
  let businesses: {
    id: string;
    name: string;
    slug: string;
    short_description: string;
    verification_status: string;
    city: string | null;
    province: string | null;
    category_name: string | null;
    logo_path: string | null;
    rating_average: number;
    review_count: number;
    is_open: boolean;
    is_sponsored: boolean;
  }[] = [];
  let searchError = false;

  if (supabase) {
    const { data, error } = await supabase.rpc("search_businesses_filtered", {
      search_query: q,
      location_query: location,
      category_slug: categorySlug || null,
      result_limit: pageSize,
      result_offset: page * pageSize,
      verified_only: verified,
      open_now: openNow,
      sort_by: sort,
    });
    if (error) {
      console.error("Business search failed:", error.message);
      searchError = true;
    } else {
      businesses = data ?? [];
    }
  }

  const query = new URLSearchParams();
  if (q) query.set("q", q);
  if (location) query.set("location", location);
  if (categorySlug) query.set("category", categorySlug);
  if (verified) query.set("verified", "on");
  if (openNow) query.set("open", "on");
  if (sort !== "relevance") query.set("sort", sort);
  const pageHref = (target: number) => {
    const next = new URLSearchParams(query);
    if (target > 0) next.set("page", String(target));
    else next.delete("page");
    return `/search${next.size ? `?${next.toString()}` : ""}`;
  };

  return (
    <main className="min-h-screen bg-[var(--canvas)]">
      <SiteHeader />
      <section className="container py-8 md:py-12">
        <div className="max-w-3xl">
          <p className="eyebrow mb-2">South African business directory</p>
          <h1 className="section-title">{category ? `${category.name} businesses` : "Find a local business"}</h1>
          <p className="section-copy">Search by service and location, then refine the results to find the right fit.</p>
        </div>
        <form action="/search" className="mt-6 grid gap-3 rounded-2xl border border-[var(--line)] bg-white p-4 shadow-sm lg:grid-cols-[1fr_1fr_0.8fr_auto]">
          <label className="flex min-h-11 items-center gap-3 rounded-lg border border-[var(--line)] px-3">
            <Search aria-hidden="true" className="shrink-0 text-[var(--green)]" size={18} />
            <span className="sr-only">Business or service</span>
            <SearchAutocomplete className="search-input min-w-0 flex-1 border-0 bg-transparent text-sm outline-none" defaultValue={q} label="Business or service" name="q" placeholder="Business, service or keyword" />
          </label>
          <label className="flex min-h-11 items-center gap-3 rounded-lg border border-[var(--line)] px-3">
            <MapPin aria-hidden="true" className="shrink-0 text-[var(--green)]" size={18} />
            <span className="sr-only">Location</span>
            <SearchAutocomplete className="search-input min-w-0 flex-1 border-0 bg-transparent text-sm outline-none" defaultValue={location} label="Location" name="location" placeholder="City, suburb or province" />
          </label>
          <label className="grid min-h-11 items-center">
            <span className="sr-only">Category</span>
            <select className="search-input h-11 rounded-lg border border-[var(--line)] bg-white px-3 text-sm" defaultValue={categorySlug} name="category">
              <option value="">All categories</option>
              {categories.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
            </select>
          </label>
          <button className="min-h-11 rounded-lg bg-[var(--green)] px-6 text-sm font-bold text-white hover:bg-[var(--green-dark)]" type="submit">Search</button>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[var(--line)] pt-3 text-sm text-[#526056] lg:col-span-4">
            <label className="flex items-center gap-2"><input className="accent-[var(--green)]" defaultChecked={verified} name="verified" type="checkbox" />Verified only</label>
            <label className="flex items-center gap-2"><input className="accent-[var(--green)]" defaultChecked={openNow} name="open" type="checkbox" />Open now</label>
            <label className="ml-auto flex items-center gap-2">Sort
              <select className="min-h-9 rounded-lg border border-[var(--line)] bg-white px-2" defaultValue={sort} name="sort">
                <option value="relevance">Relevance</option><option value="rating">Top rated</option><option value="newest">Newest</option>
              </select>
            </label>
          </div>
        </form>
        <details className="mt-3 rounded-xl border border-[var(--line)] bg-white px-4 py-3">
          <summary className="cursor-pointer text-sm font-bold text-[var(--green)]">Save these search filters</summary>
          <form action={saveSearch} className="mt-3 flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-xs font-semibold">Name this search<input className="min-h-10 rounded-lg border border-[var(--line)] px-3 text-sm" defaultValue={q || location ? `${q || "Businesses"}${location ? ` in ${location}` : ""}` : "My local search"} maxLength={100} name="label" required /></label>
            <input name="query" type="hidden" value={q} /><input name="location" type="hidden" value={location} /><input name="category" type="hidden" value={categorySlug} /><input name="sort" type="hidden" value={sort} />
            <input name="verified" type="hidden" value={verified ? "on" : ""} /><input name="open" type="hidden" value={openNow ? "on" : ""} />
            <button className="min-h-10 rounded-lg border border-[var(--line)] px-4 text-sm font-bold hover:border-[var(--green)]" type="submit">Save search</button>
          </form>
        </details>
        {params.error === "save-search" && <p role="alert" className="mt-3 text-sm text-red-700">Sign in to save searches, then try again.</p>}

        {!supabase || searchError ? (
          <EmptyState title={searchError ? "Search is temporarily unavailable" : "The directory is getting ready"}>
            {searchError ? "We couldn't load business results right now. Please try again shortly." : "Business listings will appear here once a Supabase project and directory data are configured."}
          </EmptyState>
        ) : businesses.length === 0 ? (
          <EmptyState title={q || location || categorySlug || verified || openNow ? "No businesses match these filters" : "No published businesses yet"}>
            Try a broader location or remove a filter. You can also check back as local businesses join the directory.
          </EmptyState>
        ) : (
          <>
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
              <p aria-live="polite" className="text-sm text-[var(--muted)]">Showing {page * pageSize + 1}–{page * pageSize + businesses.length} businesses{page > 0 ? ` · page ${page + 1}` : ""}</p>
              {(q || location || categorySlug || verified || openNow) && <Link className="text-sm font-semibold text-[var(--green)]" href="/search">Clear filters</Link>}
            </div>
            <section aria-label="Search results" className="mt-4 grid gap-3">
              {businesses.map((business) => <article className="business-card flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-start" key={business.id}>
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#edf6ef] text-xl font-extrabold text-[var(--green)]" aria-hidden="true">{business.name.slice(0, 1).toUpperCase()}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Link className="text-lg font-extrabold tracking-[-0.025em] hover:text-[var(--green)]" href={`/business/${business.slug}`}>{business.name}</Link>
                    {business.verification_status === "verified" && <span className="inline-flex items-center gap-1 text-xs font-bold text-[var(--green)]"><BadgeCheck aria-hidden="true" size={14} /> Verified</span>}
                    {business.is_sponsored && <span className="rounded-full bg-[#fff4d6] px-2.5 py-1 text-[11px] font-bold text-[#725100]">Sponsored</span>}
                    {business.is_open && <span className="rounded-full bg-[#e8f5ed] px-2.5 py-1 text-[11px] font-bold text-[#17633c]">Open now</span>}
                  </div>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[#65716b]">{business.short_description || "Local business"}</p>
                  <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#6e7971]">
                    {business.category_name && <span>{business.category_name}</span>}
                    {business.city && <span className="inline-flex items-center gap-1"><MapPin aria-hidden="true" size={13} />{[business.city, business.province].filter(Boolean).join(", ")}</span>}
                    {business.review_count > 0 && <span className="inline-flex items-center gap-1"><Star aria-hidden="true" className="fill-amber-400 text-amber-500" size={13} />{business.rating_average} ({business.review_count} reviews)</span>}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
                  <Link className="inline-flex min-h-10 items-center rounded-lg bg-[var(--green)] px-3 text-sm font-bold text-white hover:bg-[var(--green-dark)]" href={`/business/${business.slug}`}>View profile</Link>
                  <form action={saveBusiness}>
                    <input name="businessId" type="hidden" value={business.id} /><input name="slug" type="hidden" value={business.slug} />
                    <button className="min-h-10 rounded-lg border border-[var(--line)] px-3 text-sm font-semibold hover:border-[var(--green)]" type="submit">Save</button>
                  </form>
                </div>
              </article>)}
            </section>
            <nav aria-label="Search results pages" className="mt-7 flex justify-between">
              {page > 0 ? <Link className="rounded-lg border border-[var(--line)] bg-white px-4 py-2 text-sm font-bold" href={pageHref(page - 1)}>← Previous</Link> : <span />}
              {businesses.length === pageSize && <Link className="rounded-lg border border-[var(--line)] bg-white px-4 py-2 text-sm font-bold" href={pageHref(page + 1)}>Next →</Link>}
            </nav>
          </>
        )}
      </section>
    </main>
  );
}

function EmptyState({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="mt-10 rounded-2xl border border-dashed border-[#ccd8ce] bg-white px-6 py-12 text-center">
    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#edf6ef] text-[var(--green)]"><Search aria-hidden="true" size={21} /></div>
    <h2 className="mt-4 text-lg font-extrabold">{title}</h2><p className="mx-auto mt-2 max-w-[480px] text-sm leading-6 text-[#758078]">{children}</p>
  </div>;
}
