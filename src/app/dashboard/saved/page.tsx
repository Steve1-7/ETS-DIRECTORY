import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { saveBusiness } from "@/app/actions";

export default async function SavedBusinessesPage() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/login?error=not-configured");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: saved, error } = await supabase
    .from("saved_businesses")
    .select("business_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Saved businesses could not be loaded:", error.message);
    return <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Saved businesses are unavailable right now.</p>;
  }

  const ids = (saved ?? []).map((item) => item.business_id);
  const { data: businesses, error: businessesError } = ids.length
    ? await supabase.from("businesses").select("id, name, slug, short_description").in("id", ids)
    : { data: [], error: null };
  if (businessesError) {
    console.error("Saved business profiles could not be loaded:", businessesError.message);
    return <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Saved businesses are unavailable right now.</p>;
  }

  return (
    <section>
      <p className="eyebrow mb-2">Your shortlist</p>
      <h1 className="section-title">Saved businesses</h1>
      <p className="section-copy">Keep useful local services close at hand.</p>
      {!businesses?.length ? <p className="mt-6 rounded-xl border border-dashed border-[var(--line)] bg-white p-8 text-center text-sm text-[var(--muted)]">You haven’t saved any businesses yet. Browse the <Link className="font-bold text-[var(--green)]" href="/search">directory</Link> to get started.</p> : (
        <div className="mt-6 grid gap-3">
          {businesses.map((business) => (
            <article className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm" key={business.id}>
              <div><Link className="font-extrabold hover:text-[var(--green)]" href={`/business/${business.slug}`}>{business.name}</Link><p className="mt-1 text-sm text-[var(--muted)]">{business.short_description}</p></div>
              <form action={saveBusiness}><input name="businessId" type="hidden" value={business.id} /><input name="slug" type="hidden" value={business.slug} /><input name="action" type="hidden" value="remove" /><button className="min-h-10 rounded-lg border border-[var(--line)] px-3 text-sm font-semibold" type="submit">Remove</button></form>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
