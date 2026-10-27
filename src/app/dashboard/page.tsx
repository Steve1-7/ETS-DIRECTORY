import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createPromotionCheckout, requestVerification } from "@/app/actions";
import { createServerSupabaseClient } from "@/lib/supabase-server";

type DashboardPageProps = {
  searchParams: Promise<{ message?: string; error?: string }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/login?error=not-configured");
  const [{ data: { user } }, params] = await Promise.all([supabase.auth.getUser(), searchParams]);
  if (!user) redirect("/login");
  const { data: businesses, error } = await supabase
    .from("businesses")
    .select("id, name, slug, status, verification_status, updated_at")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Business dashboard listings could not be loaded:", error.message);
    return <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Your listings could not be loaded. Please refresh and try again.</p>;
  }
  const businessIds = (businesses ?? []).map((business) => business.id);
  const { data: subscriptions, error: subscriptionsError } = businessIds.length
    ? await supabase.from("subscriptions").select("business_id, status, current_period_end").in("business_id", businessIds).eq("status", "active")
    : { data: [], error: null };
  if (subscriptionsError) {
    console.error("Business promotion status could not be loaded:", subscriptionsError.message);
    return <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Your promotion status could not be loaded.</p>;
  }
  const { data: analytics, error: analyticsError } = await supabase.rpc("owner_listing_analytics", {
    window_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  });
  if (analyticsError) {
    console.error("Business analytics could not be loaded:", analyticsError.message);
    return <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Business analytics are unavailable. Check that the latest directory migrations are applied.</p>;
  }
  const { data: promotionPlans, error: plansError } = await supabase.from("subscription_plans")
    .select("slug, name, price_minor_units, currency_code")
    .in("slug", ["featured", "premium"])
    .eq("is_active", true)
    .order("price_minor_units");
  if (plansError) {
    console.error("Promotion plans could not be loaded:", plansError.message);
    return <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Promotion plans are unavailable right now.</p>;
  }
  const analyticsEvents = z.array(z.object({
    event_type: z.string(),
    event_count: z.number().int().nonnegative(),
  })).parse(analytics ?? []);
  const now = Date.now();
  const promotedIds = new Set((subscriptions ?? []).filter((subscription) => subscription.current_period_end && new Date(subscription.current_period_end).getTime() > now).map((subscription) => subscription.business_id));
  const profileViews = analyticsEvents.filter((event) => event.event_type === "profile_view").reduce((total, event) => total + event.event_count, 0);
  const contactClicks = analyticsEvents.filter((event) => ["phone_click", "whatsapp_click", "website_click", "directions_click", "enquiry"].includes(event.event_type)).reduce((total, event) => total + event.event_count, 0);

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Your account</p>
          <h1 className="section-title">Business dashboard</h1>
          <p className="section-copy">Manage listings, enquiries, and your saved places.</p>
        </div>
        <Link className="rounded-lg bg-[var(--green)] px-4 py-2.5 text-sm font-bold text-white hover:bg-[var(--green-dark)]" href="/dashboard/new">Add a listing</Link>
      </div>
      {params.message && <p aria-live="polite" className="mt-5 rounded-xl border border-[#cfe5d4] bg-[#f0f8f1] p-4 text-sm text-[#315d3e]">{params.message === "submitted" ? "Your listing is in the review queue." : params.message === "verification-submitted" ? "Your verification request is in the review queue." : "Your changes have been saved."}</p>}
      {params.error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{params.error === "payment-config" ? "Online promotion payments are not configured. Please try again later." : "That action could not be completed. Please contact support if the issue continues."}</p>}
      <p className="mt-6 text-xs text-[var(--muted)]">Performance for the last 30 days. Counts contain no visitor identity or device data.</p>
      <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Metric label="Your listings" value={businesses?.length ?? 0} />
        <Metric label="Published" value={businesses?.filter((business) => business.status === "published").length ?? 0} />
        <Metric label="In review" value={businesses?.filter((business) => business.status === "pending_review").length ?? 0} />
        <Metric label="Profile views" value={profileViews} />
        <Metric label="Contact actions" value={contactClicks} />
      </div>
      <div className="mt-8 rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-extrabold">Your business listings</h2>
        {!businesses?.length ? (
          <div className="mt-4 rounded-xl bg-[#f7faf7] p-6 text-center">
            <p className="font-semibold">You haven’t added a business yet.</p>
            <p className="mt-2 text-sm text-[var(--muted)]">Create a listing and submit it for review.</p>
            <Link className="mt-4 inline-flex font-bold text-[var(--green)]" href="/dashboard/new">Add your first business →</Link>
          </div>
        ) : (
          <div className="mt-4 divide-y divide-[var(--line)]">
            {businesses.map((business) => (
              <article className="flex flex-wrap items-center justify-between gap-3 py-4" key={business.id}>
                <div>
                  <h3 className="font-bold">{business.name}</h3>
                  <p className="mt-1 text-xs capitalize text-[var(--muted)]">{business.status.replaceAll("_", " ")} · {business.verification_status}</p>
                </div>
                <div className="flex gap-3 text-sm font-semibold">
                  {business.status === "published" && <Link className="text-[var(--green)]" href={`/business/${business.slug}`}>View profile</Link>}
                  <Link className="text-[#546259] hover:text-[var(--green)]" href={`/dashboard/businesses/${business.id}/edit`}>Edit</Link>
                </div>
                {business.status === "published" && business.verification_status === "unverified" && <form action={requestVerification} className="basis-full flex flex-wrap items-center gap-2 pt-2">
                  <input name="businessId" type="hidden" value={business.id} />
                  <label className="sr-only" htmlFor={`verification-${business.id}`}>Verification method</label>
                  <select className="min-h-9 rounded-lg border border-[var(--line)] bg-white px-2 text-xs" id={`verification-${business.id}`} name="method">
                    <option value="email">Email confirmation</option><option value="phone">Phone confirmation</option><option value="document">Document review</option><option value="in_person">In-person review</option>
                  </select>
                  <button className="text-xs font-bold text-[var(--green)]" type="submit">Request verification</button>
                </form>}
                {business.status === "published" && (promotedIds.has(business.id)
                  ? <p className="basis-full pt-2 text-xs font-bold text-[#725100]">Sponsored promotion active</p>
                  : promotionPlans?.length ? <form action={createPromotionCheckout} className="basis-full flex flex-wrap items-center gap-2 pt-2">
                    <input name="businessId" type="hidden" value={business.id} />
                    <label className="sr-only" htmlFor={`plan-${business.id}`}>Promotion plan</label>
                    <select className="min-h-9 rounded-lg border border-[var(--line)] bg-white px-2 text-xs" id={`plan-${business.id}`} name="plan">
                      {promotionPlans.map((plan) => <option key={plan.slug} value={plan.slug}>{plan.name} — {new Intl.NumberFormat("en-ZA", { style: "currency", currency: plan.currency_code }).format(plan.price_minor_units / 100)} for one month</option>)}
                    </select>
                    <button className="text-xs font-bold text-[var(--green)]" type="submit">Promote listing</button>
                    <span className="text-xs text-[var(--muted)]">One-time payment, no automatic renewal.</span>
                  </form> : null)}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <article className="rounded-xl border border-[var(--line)] bg-white p-4 shadow-sm"><p className="text-sm text-[var(--muted)]">{label}</p><p className="mt-2 text-2xl font-extrabold">{value}</p></article>;
}
