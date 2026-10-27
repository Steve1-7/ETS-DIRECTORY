import Link from "next/link";
import { redirect } from "next/navigation";
import { deleteSavedSearch } from "@/app/actions";
import { createServerSupabaseClient } from "@/lib/supabase-server";

type SavedSearchesPageProps = {
  searchParams: Promise<{ error?: string; message?: string }>;
};

export default async function SavedSearchesPage({ searchParams }: SavedSearchesPageProps) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/login?error=not-configured");
  const [{ data: { user } }, query] = await Promise.all([supabase.auth.getUser(), searchParams]);
  if (!user) redirect("/login");
  const { data: searches, error } = await supabase.from("saved_searches")
    .select("id, label, query, location, category_slug, verified_only, open_now, sort_by")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Saved searches could not be loaded:", error.message);
    return <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Saved searches are unavailable right now.</p>;
  }

  return (
    <section>
      <p className="eyebrow mb-2">Search shortcuts</p><h1 className="section-title">Saved searches</h1>
      <p className="section-copy">Return to useful search filters in one tap.</p>
      {query.message && <p aria-live="polite" className="mt-4 text-sm text-[var(--green)]">{query.message === "saved" ? "Search saved." : "Saved search removed."}</p>}
      {query.error && <p role="alert" className="mt-4 text-sm text-red-700">The saved search could not be changed.</p>}
      {!searches?.length ? <p className="mt-6 rounded-xl border border-dashed border-[var(--line)] bg-white p-8 text-center text-sm text-[var(--muted)]">No saved searches yet. Explore the <Link className="font-bold text-[var(--green)]" href="/search">directory</Link> and save your filters.</p> : (
        <div className="mt-6 grid gap-3">{searches.map((search) => {
          const params = new URLSearchParams();
          if (search.query) params.set("q", search.query);
          if (search.location) params.set("location", search.location);
          if (search.category_slug) params.set("category", search.category_slug);
          if (search.verified_only) params.set("verified", "on");
          if (search.open_now) params.set("open", "on");
          if (search.sort_by !== "relevance") params.set("sort", search.sort_by);
          return <article className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm" key={search.id}>
            <div><h2 className="font-bold">{search.label}</h2><p className="mt-1 text-xs text-[var(--muted)]">{[search.query, search.location, search.category_slug].filter(Boolean).join(" · ") || "All directory listings"}</p></div>
            <div className="flex items-center gap-3"><Link className="text-sm font-bold text-[var(--green)]" href={`/search${params.size ? `?${params.toString()}` : ""}`}>Search</Link><form action={deleteSavedSearch}><input name="savedSearchId" type="hidden" value={search.id} /><button className="text-sm font-semibold text-[#65716b]" type="submit">Remove</button></form></div>
          </article>;
        })}</div>
      )}
    </section>
  );
}
