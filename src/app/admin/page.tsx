import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import { moderateBusiness, moderateClaim, moderateDataSubjectRequest, moderateReport, moderateReview, moderateVerification } from "@/app/actions";
import { createServerSupabaseClient } from "@/lib/supabase-server";

const siteActivitySchema = z.array(z.object({
  metric: z.string(),
  dimension: z.string(),
  event_count: z.number().int().nonnegative(),
  visitor_sessions: z.number().int().nonnegative(),
}));

type AdminPageProps = {
  searchParams: Promise<{ error?: string; message?: string }>;
};

export const dynamic = "force-dynamic";

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/admin/login?error=not-configured");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const [{ data: profile, error: profileError }, params] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).single(),
    searchParams,
  ]);
  if (profileError) {
    console.error("Moderation permission could not be checked:", profileError.message);
    redirect("/admin/login?error=permissions");
  }
  if (!profile || !["moderator", "admin"].includes(profile.role)) redirect("/admin/login?error=forbidden");

  const activityWindowStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [businessResult, reviewResult, claimResult, reportResult, verificationResult, dataRequestResult, activityResult] = await Promise.all([
    supabase.from("businesses").select("id, name, slug, short_description, status").eq("status", "pending_review").order("created_at").limit(50),
    supabase.from("business_reviews").select("id, business_id, author_id, rating, title, body, created_at").eq("status", "pending").order("created_at").limit(50),
    supabase.from("business_claim_requests").select("id, business_id, requester_id, evidence, created_at").eq("status", "pending").order("created_at").limit(50),
    supabase.from("moderation_reports").select("id, business_id, reason, description, status, created_at").in("status", ["pending", "reviewing"]).order("created_at").limit(50),
    supabase.from("verification_requests").select("id, business_id, user_id, verification_method, created_at").eq("status", "pending").order("created_at").limit(50),
    supabase.from("data_subject_requests").select("id, requester_id, request_type, details, status, created_at").in("status", ["pending", "reviewing"]).order("created_at").limit(50),
    supabase.rpc("admin_site_activity_analytics", { window_start: activityWindowStart }),
  ]);
  const errors = [businessResult.error, reviewResult.error, claimResult.error, reportResult.error, verificationResult.error, dataRequestResult.error]
    .filter((error): error is NonNullable<typeof error> => error !== null);
  if (errors.length) {
    console.error("Moderation queues could not be loaded:", errors.map((error) => error.message).join("; "));
    return <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Moderation queues are unavailable. Check your database migrations and permissions.</p>;
  }
  if (activityResult.error) console.error("Site analytics could not be loaded:", activityResult.error.message);
  const activity = activityResult.error ? [] : siteActivitySchema.parse(activityResult.data ?? []);

  return (
    <section className="space-y-8">
      <div>
        <p className="eyebrow mb-2">Staff tools</p>
        <h1 className="section-title">Admin dashboard</h1>
        <p className="section-copy">Site activity and moderation queues for the last 30 days.</p>
        {params.error && <p role="alert" className="mt-4 text-sm text-red-700">That moderation action could not be completed.</p>}
        {params.message && <p aria-live="polite" className="mt-4 text-sm text-[var(--green)]">Moderation decision saved.</p>}
      </div>
      {activityResult.error ? (
        <section role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Site analytics are unavailable. Apply the latest database migration and check staff permissions.
        </section>
      ) : <SiteAnalytics rows={activity} />}
      <h2 className="section-title">Moderation queue</h2>
      <Queue title={`Listings awaiting review (${businessResult.data?.length ?? 0})`}>
        {(businessResult.data ?? []).map((business) => <article className="border-t border-[var(--line)] py-4" key={business.id}>
          <h3 className="font-bold">{business.name}</h3><p className="mt-1 text-sm text-[var(--muted)]">{business.short_description}</p>
          <form action={moderateBusiness} className="mt-3 flex flex-wrap gap-2">
            <input name="businessId" type="hidden" value={business.id} />
            <DecisionButton value="published" label="Approve & publish" />
            <DecisionButton value="changes_requested" label="Request changes" />
            <DecisionButton value="rejected" label="Reject" />
          </form>
        </article>)}
      </Queue>
      <Queue title={`Reviews awaiting moderation (${reviewResult.data?.length ?? 0})`}>
        {(reviewResult.data ?? []).map((review) => <article className="border-t border-[var(--line)] py-4" key={review.id}>
          <Link className="text-xs font-bold text-[var(--green)]" href={`/business/${review.business_id}`}>Business ID: {review.business_id}</Link>
          <p className="mt-1 font-bold">{review.title} · {review.rating}/5</p><p className="mt-1 text-sm text-[var(--muted)]">{review.body}</p>
          <ModerationForm action={moderateReview} idName="reviewId" id={review.id} />
        </article>)}
      </Queue>
      <Queue title={`Ownership claims awaiting review (${claimResult.data?.length ?? 0})`}>
        {(claimResult.data ?? []).map((claim) => <article className="border-t border-[var(--line)] py-4" key={claim.id}>
          <p className="text-xs text-[var(--muted)]">Business {claim.business_id} · User {claim.requester_id}</p><p className="mt-2 whitespace-pre-wrap text-sm">{claim.evidence}</p>
          <form action={moderateClaim} className="mt-3 flex flex-wrap gap-2"><input name="claimId" type="hidden" value={claim.id} /><DecisionButton value="approved" label="Approve claim" /><DecisionButton value="changes_requested" label="Request evidence" /><DecisionButton value="rejected" label="Reject claim" /></form>
        </article>)}
      </Queue>
      <Queue title={`Verification requests awaiting review (${verificationResult.data?.length ?? 0})`}>
        {(verificationResult.data ?? []).map((request) => <article className="border-t border-[var(--line)] py-4" key={request.id}>
          <p className="text-sm">Business {request.business_id} · {request.verification_method}</p><p className="mt-1 text-xs text-[var(--muted)]">Requester {request.user_id}</p>
          <form action={moderateVerification} className="mt-3 flex flex-wrap gap-2"><input name="requestId" type="hidden" value={request.id} /><DecisionButton value="approved" label="Verify business" name="decision" /><DecisionButton value="rejected" label="Reject verification" name="decision" /></form>
        </article>)}
      </Queue>
      <Queue title={`Reports awaiting review (${reportResult.data?.length ?? 0})`}>
        {(reportResult.data ?? []).map((report) => <article className="border-t border-[var(--line)] py-4" key={report.id}>
          <p className="font-bold">{report.reason} · business {report.business_id}</p><p className="mt-1 whitespace-pre-wrap text-sm text-[var(--muted)]">{report.description}</p>
          <form action={moderateReport} className="mt-3 flex flex-wrap gap-2"><input name="reportId" type="hidden" value={report.id} /><DecisionButton value="reviewing" label="Mark reviewing" /><DecisionButton value="resolved" label="Resolve" /><DecisionButton value="dismissed" label="Dismiss" /></form>
        </article>)}
      </Queue>
      <Queue title={`Privacy and deletion requests (${dataRequestResult.data?.length ?? 0})`}>
        {(dataRequestResult.data ?? []).map((request) => <article className="border-t border-[var(--line)] py-4" key={request.id}>
          <p className="font-bold capitalize">{request.request_type.replace("_", " ")} · account {request.requester_id}</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--muted)]">{request.details}</p>
          <form action={moderateDataSubjectRequest} className="mt-3 flex flex-wrap gap-2"><input name="requestId" type="hidden" value={request.id} /><DecisionButton value="reviewing" label="Mark reviewing" /><DecisionButton value="resolved" label="Mark resolved" /><DecisionButton value="dismissed" label="Dismiss" /></form>
        </article>)}
      </Queue>
    </section>
  );
}

function SiteAnalytics({ rows }: { rows: z.infer<typeof siteActivitySchema> }) {
  const count = (metric: string, dimension: string) =>
    rows.find((row) => row.metric === metric && row.dimension === dimension)?.event_count ?? 0;
  const sessions = count("summary", "visitor_sessions");
  const pageViews = count("summary", "page_views");
  const searches = count("summary", "searches");
  const interactions = count("summary", "listing_interactions");
  const daily = rows.filter((row) => row.metric === "daily").sort((a, b) => a.dimension.localeCompare(b.dimension)).slice(-14);
  const dailyPeak = Math.max(1, ...daily.map((row) => row.event_count));
  const pages = rows.filter((row) => row.metric === "page").sort((a, b) => b.event_count - a.event_count).slice(0, 10);
  const referrers = rows.filter((row) => row.metric === "referrer").sort((a, b) => b.event_count - a.event_count).slice(0, 8);
  const devices = rows.filter((row) => row.metric === "device").sort((a, b) => b.event_count - a.event_count);
  const listingEvents = rows.filter((row) => row.metric === "listing_event").sort((a, b) => b.event_count - a.event_count);

  return (
    <section aria-labelledby="analytics-title" className="space-y-5">
      <div>
        <h2 id="analytics-title" className="text-xl font-extrabold">Site-wide analytics</h2>
        <p className="mt-1 text-xs text-[var(--muted)]">Opt-in analytics · last 30 days · visitor counts are temporary browser sessions, not identified people.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="Visitor sessions" value={sessions} />
        <Metric label="Page views" value={pageViews} />
        <Metric label="Searches" value={searches} />
        <Metric label="Listing interactions" value={interactions} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <AnalyticsPanel title="Daily page views · last 14 days">
          {daily.length ? <div className="flex h-44 items-end gap-2 border-b border-[var(--line)] px-1">
            {daily.map((day) => <div className="flex h-full flex-1 flex-col items-center justify-end gap-1" key={day.dimension} title={`${day.dimension}: ${day.event_count} page views, ${day.visitor_sessions} sessions`}>
              <span className="text-[10px] text-[var(--muted)]">{day.event_count}</span>
              <div aria-hidden="true" className="w-full max-w-8 rounded-t bg-[var(--green)]" style={{ height: `${Math.max(3, (day.event_count / dailyPeak) * 112)}px` }} />
              <span className="text-[9px] text-[var(--muted)]">{day.dimension.slice(5)}</span>
            </div>)}
          </div> : <EmptyAnalytics />}
        </AnalyticsPanel>
        <AnalyticsPanel title="Popular pages">
          {pages.length ? <AnalyticsRows rows={pages} /> : <EmptyAnalytics />}
        </AnalyticsPanel>
        <AnalyticsPanel title="Referrer domains">
          {referrers.length ? <AnalyticsRows rows={referrers} /> : <EmptyAnalytics />}
        </AnalyticsPanel>
        <AnalyticsPanel title="Device categories">
          {devices.length ? <AnalyticsRows rows={devices} /> : <EmptyAnalytics />}
        </AnalyticsPanel>
        <AnalyticsPanel title="Listing interactions">
          {listingEvents.length ? <AnalyticsRows rows={listingEvents} showSessions={false} /> : <EmptyAnalytics />}
        </AnalyticsPanel>
      </div>
    </section>
  );
}

function AnalyticsPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
    <h3 className="font-extrabold">{title}</h3>
    <div className="mt-4">{children}</div>
  </section>;
}

function AnalyticsRows({ rows, showSessions = true }: { rows: z.infer<typeof siteActivitySchema>; showSessions?: boolean }) {
  return <ul className="divide-y divide-[var(--line)]">
    {rows.map((row) => <li className="flex items-center justify-between gap-3 py-2 text-sm" key={`${row.metric}-${row.dimension}`}>
      <span className="min-w-0 break-all text-[var(--muted)]">{row.dimension.replaceAll("_", " ")}</span>
      <span className="shrink-0 font-bold">{row.event_count}{showSessions && <span className="font-normal text-[var(--muted)]"> · {row.visitor_sessions} sessions</span>}</span>
    </li>)}
  </ul>;
}

function EmptyAnalytics() {
  return <p className="py-4 text-sm text-[var(--muted)]">No consented activity recorded in this period.</p>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-[var(--line)] bg-white p-4 shadow-sm">
    <p className="text-xs font-semibold text-[var(--muted)]">{label}</p>
    <p className="mt-2 text-2xl font-extrabold">{value.toLocaleString()}</p>
  </div>;
}

function Queue({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm"><h2 className="text-lg font-extrabold">{title}</h2>{children}</section>;
}

function DecisionButton({ value, label, name = "status" }: { value: string; label: string; name?: string }) {
  return <button className="min-h-9 rounded-lg border border-[var(--line)] px-3 text-xs font-bold hover:border-[var(--green)] hover:text-[var(--green)]" name={name} type="submit" value={value}>{label}</button>;
}

function ModerationForm({ action, idName, id }: { action: (formData: FormData) => Promise<void>; idName: string; id: string }) {
  return <form action={action} className="mt-3 flex flex-wrap gap-2"><input name={idName} type="hidden" value={id} /><DecisionButton value="approved" label="Approve" /><DecisionButton value="rejected" label="Reject" /><DecisionButton value="changes_requested" label="Request changes" /></form>;
}
