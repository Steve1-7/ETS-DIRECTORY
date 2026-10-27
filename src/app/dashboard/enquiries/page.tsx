import { updateEnquiryStatus } from "@/app/actions";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";

type EnquiriesPageProps = {
  searchParams: Promise<{ error?: string; message?: string }>;
};

export default async function EnquiriesPage({ searchParams }: EnquiriesPageProps) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/login?error=not-configured");
  const [{ data: { user } }, params] = await Promise.all([supabase.auth.getUser(), searchParams]);
  if (!user) redirect("/login");
  const { data: businesses, error: businessError } = await supabase
    .from("businesses").select("id, name").eq("owner_id", user.id);
  if (businessError) {
    console.error("Enquiry business list could not be loaded:", businessError.message);
    return <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Enquiries are unavailable right now.</p>;
  }

  const businessIds = (businesses ?? []).map((business) => business.id);
  const { data: enquiries, error } = businessIds.length
    ? await supabase.from("enquiries").select("id, business_id, customer_name, customer_email, message, status, created_at").in("business_id", businessIds).order("created_at", { ascending: false }).limit(100)
    : { data: [], error: null };
  if (error) {
    console.error("Business enquiries could not be loaded:", error.message);
    return <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Enquiries are unavailable right now.</p>;
  }

  const names = new Map((businesses ?? []).map((business) => [business.id, business.name]));
  return (
    <section>
      <p className="eyebrow mb-2">Customer messages</p>
      <h1 className="section-title">Enquiries</h1>
      <p className="section-copy">Messages sent from your published business profiles.</p>
      {params.error && <p role="alert" className="mt-5 text-sm text-red-700">The enquiry status could not be updated.</p>}
      {params.message && <p aria-live="polite" className="mt-5 text-sm text-[var(--green)]">Enquiry status updated.</p>}
      {!enquiries?.length ? <p className="mt-6 rounded-xl border border-dashed border-[var(--line)] bg-white p-8 text-center text-sm text-[var(--muted)]">You don’t have any enquiries yet.</p> : (
        <div className="mt-6 grid gap-3">
          {enquiries.map((enquiry) => (
            <article className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm" key={enquiry.id}>
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-[var(--green)]">{names.get(enquiry.business_id)}</p>
                  <h2 className="mt-1 font-extrabold">{enquiry.customer_name}</h2>
                  <a className="mt-1 block text-sm text-[var(--muted)] underline" href={`mailto:${enquiry.customer_email}`}>{enquiry.customer_email}</a>
                </div>
                <time className="text-xs text-[var(--muted)]" dateTime={enquiry.created_at}>{new Date(enquiry.created_at).toLocaleDateString("en-ZA")}</time>
              </div>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[#4f5d53]">{enquiry.message}</p>
              <form action={updateEnquiryStatus} className="mt-4 flex flex-wrap items-center gap-2">
                <input name="enquiryId" type="hidden" value={enquiry.id} />
                <label className="sr-only" htmlFor={`status-${enquiry.id}`}>Enquiry status</label>
                <select className="min-h-10 rounded-lg border border-[var(--line)] bg-white px-3 text-sm" defaultValue={enquiry.status} id={`status-${enquiry.id}`} name="status">
                  {["new", "read", "replied", "closed", "spam"].map((status) => <option key={status} value={status} disabled={status === "new"}>{status.replace("_", " ")}</option>)}
                </select>
                <button className="min-h-10 rounded-lg border border-[var(--line)] px-3 text-sm font-bold hover:bg-[#f4f8f4]" type="submit">Update status</button>
              </form>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
