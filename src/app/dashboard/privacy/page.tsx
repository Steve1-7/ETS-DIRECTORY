import { submitDataSubjectRequest } from "@/app/actions";
import { createServerSupabaseClient } from "@/lib/supabase-server";

type PrivacyRequestsPageProps = {
  searchParams: Promise<{ error?: string; message?: string }>;
};

export default async function PrivacyRequestsPage({ searchParams }: PrivacyRequestsPageProps) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return <p role="alert" className="text-sm text-red-700">Account services are unavailable.</p>;
  const [{ data: { user } }, query] = await Promise.all([supabase.auth.getUser(), searchParams]);
  if (!user) return <p role="alert" className="text-sm text-red-700">Sign in to manage your privacy requests.</p>;
  const { data: requests, error } = await supabase.from("data_subject_requests")
    .select("id, request_type, details, status, created_at")
    .eq("requester_id", user.id)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Privacy requests could not be loaded:", error.message);
    return <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Privacy requests are unavailable right now.</p>;
  }

  return (
    <section className="mx-auto max-w-3xl">
      <p className="eyebrow mb-2">Your data and choices</p><h1 className="section-title">Privacy requests</h1>
      <p className="section-copy">Request a copy or correction of your data, or ask us to review a deletion/listing-removal request. Deletion requests are reviewed manually to protect business ownership records and comply with applicable retention obligations.</p>
      {query.message && <p aria-live="polite" className="mt-5 rounded-xl border border-[#cfe5d4] bg-[#f0f8f1] p-4 text-sm text-[#315d3e]">Your request was submitted for review.</p>}
      {query.error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">The request could not be submitted. Check the details and try again.</p>}
      <form action={submitDataSubjectRequest} className="mt-6 grid gap-4 rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
        <label className="grid gap-2 text-sm font-semibold">Request type
          <select className="min-h-11 rounded-lg border border-[var(--line)] bg-white px-3" name="requestType"><option value="access">Access my data</option><option value="correction">Correct my data</option><option value="deletion">Delete my account/data</option><option value="listing_removal">Remove a business listing</option></select>
        </label>
        <label className="grid gap-2 text-sm font-semibold">Details<textarea className="min-h-28 rounded-lg border border-[var(--line)] p-3" maxLength={3000} minLength={10} name="details" required /></label>
        <button className="min-h-11 w-fit rounded-lg bg-[var(--green)] px-4 text-sm font-bold text-white" type="submit">Submit privacy request</button>
      </form>
      <h2 className="mt-8 text-lg font-extrabold">Your requests</h2>
      {!requests?.length ? <p className="mt-3 text-sm text-[var(--muted)]">No requests submitted.</p> : <ul className="mt-3 divide-y divide-[var(--line)] rounded-2xl border border-[var(--line)] bg-white px-5">
        {requests.map((request) => <li className="py-4" key={request.id}><p className="font-bold capitalize">{request.request_type.replace("_", " ")} · {request.status}</p><p className="mt-1 whitespace-pre-wrap text-sm text-[var(--muted)]">{request.details}</p><time className="mt-2 block text-xs text-[var(--muted)]" dateTime={request.created_at}>{new Date(request.created_at).toLocaleDateString("en-ZA")}</time></li>)}
      </ul>}
    </section>
  );
}
