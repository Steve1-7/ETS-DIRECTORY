import type { Metadata } from "next";
import Image from "next/image";
import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, Globe2, Mail, MapPin, MessageCircle, Phone, Star } from "lucide-react";
import { z } from "zod";
import { reportBusiness, saveBusiness, sendEnquiry, submitBusinessClaim, submitReview } from "@/app/actions";
import { AnalyticsConsentField } from "@/components/analytics-provider";
import { SiteHeader } from "@/components/site-header";
import { ProfileViewTracker, TrackedLink } from "@/components/tracked-link";
import { createPublicSupabaseClient } from "@/lib/supabase";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { safeHttpUrl, safeTelephoneUrl, safeWhatsAppUrl } from "@/lib/urls";

type Business = {
  id: string;
  name: string;
  slug: string;
  description: string;
  short_description: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  whatsapp: string | null;
  verification_status: string;
};
type Location = { city: string; province: string; suburb: string | null; address: string | null; service_area_description: string | null };
type Service = { id: string; name: string; description: string | null; price_information: string | null };
type Hours = { day_of_week: number; opening_time: string | null; closing_time: string | null; is_closed: boolean };
type Photo = { id: string; storage_path: string; alt_text: string };
type Review = { id: string; rating: number; title: string; body: string; created_at: string };
type ProfileResult =
  | { state: "not-configured" | "not-found" | "unavailable" }
  | { state: "ready"; business: Business; locations: Location[]; services: Service[]; categories: string[]; hours: Hours[]; photos: Photo[]; reviews: Review[]; rating: number; reviewCount: number };

const loadBusiness = cache(async (slug: string): Promise<ProfileResult> => {
  const supabase = createPublicSupabaseClient();
  if (!supabase) return { state: "not-configured" };

  const { data, error } = await supabase
    .from("businesses")
    .select("id, name, slug, description, short_description, phone, email, website, whatsapp, verification_status")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) {
    console.error("Business profile lookup failed:", error.message);
    return { state: "unavailable" };
  }
  if (!data) return { state: "not-found" };

  const [locationResult, serviceResult, categoryResult, hoursResult, mediaResult, reviewResult, ratingResult] = await Promise.all([
    supabase.from("business_locations").select("city, province, suburb, address, service_area_description").eq("business_id", data.id).order("created_at").limit(10),
    supabase.from("business_services").select("id, name, description, price_information").eq("business_id", data.id).order("created_at").limit(50),
    supabase.from("business_categories").select("categories(name)").eq("business_id", data.id),
    supabase.from("business_hours").select("day_of_week, opening_time, closing_time, is_closed").eq("business_id", data.id).order("day_of_week"),
    supabase.from("business_media").select("id, storage_path, alt_text").eq("business_id", data.id).order("sort_order").limit(20),
    supabase.from("business_reviews").select("id, rating, title, body, created_at").eq("business_id", data.id).eq("status", "approved").order("created_at", { ascending: false }).limit(20),
    supabase.rpc("get_business_rating", { target_business_id: data.id }),
  ]);

  const relatedErrors = [locationResult.error, serviceResult.error, categoryResult.error, hoursResult.error, mediaResult.error, reviewResult.error, ratingResult.error]
    .filter((error): error is NonNullable<typeof error> => error !== null);
  if (relatedErrors.length > 0) {
    console.error("Business profile details could not be loaded:", relatedErrors.map((error) => error.message).join("; "));
    return { state: "unavailable" };
  }

  const categoriesSchema = z.array(z.object({
    categories: z.union([
      z.object({ name: z.string() }),
      z.array(z.object({ name: z.string() })),
    ]).nullable().optional(),
  }));
  const categoryNames = categoriesSchema.parse(categoryResult.data ?? [])
    .flatMap(({ categories: relatedCategories }) => relatedCategories
      ? Array.isArray(relatedCategories)
        ? relatedCategories.map((category) => category.name)
        : [relatedCategories.name]
      : []);
  const rating = ratingResult.data?.[0];

  return {
    state: "ready",
    business: data,
    locations: locationResult.data ?? [],
    services: serviceResult.data ?? [],
    categories: categoryNames,
    hours: hoursResult.data ?? [],
    photos: mediaResult.data ?? [],
    reviews: reviewResult.data ?? [],
    rating: rating?.rating_average ?? 0,
    reviewCount: rating?.review_count ?? 0,
  };
});

type BusinessPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ enquiry?: string; review?: string; saved?: string; report?: string; claim?: string }>;
};

export async function generateMetadata({ params }: BusinessPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await loadBusiness(slug);
  if (result.state !== "ready") return { title: "Business profile" };

  const description = result.business.short_description || result.business.description.slice(0, 160);
  return {
    title: result.business.name,
    description,
    alternates: { canonical: `/business/${result.business.slug}` },
    openGraph: { title: result.business.name, description, type: "website" },
  };
}

export default async function BusinessPage({ params, searchParams }: BusinessPageProps) {
  const [, notices, result, serverSupabase] = await Promise.all([
    params,
    searchParams,
    params.then(({ slug: businessSlug }) => loadBusiness(businessSlug)),
    createServerSupabaseClient(),
  ]);

  if (result.state === "not-found") notFound();
  if (result.state !== "ready") {
    return <main className="min-h-screen bg-[var(--canvas)]"><SiteHeader /><section className="container py-16">
      <Link className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--green)]" href="/search"><ArrowLeft aria-hidden="true" size={16} /> Back to search</Link>
      <h1 className="mt-8 text-2xl font-extrabold">{result.state === "unavailable" ? "Business profile unavailable" : "The directory is getting ready"}</h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-[#758078]">{result.state === "unavailable" ? "We couldn't load this business profile right now. Please try again shortly." : "Business profiles will appear here when a Supabase project is configured."}</p>
    </section></main>;
  }

  const { business, categories, locations, services, hours, photos, reviews, rating, reviewCount } = result;
  const { data: { user } = { user: null } } = serverSupabase ? await serverSupabase.auth.getUser() : { data: { user: null } };
  const isSaved = user && serverSupabase
    ? await serverSupabase.from("saved_businesses").select("business_id").eq("user_id", user.id).eq("business_id", business.id).maybeSingle()
    : null;
  if (isSaved?.error) console.error("Saved business state could not be loaded:", isSaved.error.message);
  const websiteUrl = safeHttpUrl(business.website);
  const phoneUrl = safeTelephoneUrl(business.phone);
  const whatsappUrl = safeWhatsAppUrl(business.whatsapp);
  const emailUrl = business.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(business.email) ? `mailto:${business.email}` : null;
  const currentStatus = getCurrentOpeningStatus(hours);
  const supabase = createPublicSupabaseClient();
  const noticesList = Object.entries(notices).filter(([, value]) => value);
  const primaryLocation = locations[0];
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: business.name,
    url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/business/${business.slug}`,
    description: business.short_description || business.description.slice(0, 500),
    ...(phoneUrl ? { telephone: business.phone } : {}),
    ...(emailUrl ? { email: business.email } : {}),
    ...(websiteUrl ? { sameAs: [websiteUrl] } : {}),
    ...(primaryLocation ? {
      address: {
        "@type": "PostalAddress",
        ...(primaryLocation.address ? { streetAddress: primaryLocation.address } : {}),
        addressLocality: primaryLocation.city,
        addressRegion: primaryLocation.province,
        addressCountry: "ZA",
      },
    } : {}),
    ...(hours.length ? {
      openingHoursSpecification: hours.filter((item) => !item.is_closed && item.opening_time && item.closing_time).map((item) => ({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][item.day_of_week],
        opens: item.opening_time?.slice(0, 5),
        closes: item.closing_time?.slice(0, 5),
      })),
    } : {}),
    ...(reviewCount > 0 ? {
      aggregateRating: { "@type": "AggregateRating", ratingValue: rating, reviewCount },
    } : {}),
  };

  return (
    <main className="min-h-screen bg-[var(--canvas)] pb-20 md:pb-0">
      <SiteHeader />
      <ProfileViewTracker businessId={business.id} />
      <script dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} type="application/ld+json" />
      <div className="container py-7 md:py-10">
        <Link className="inline-flex items-center gap-2 text-sm font-semibold text-[#6b766e] hover:text-[var(--green)]" href="/search"><ArrowLeft aria-hidden="true" size={16} /> Back to search</Link>
        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
          <article className="min-w-0 rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm md:p-8">
            <header className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#edf6ef] text-2xl font-extrabold text-[var(--green)]" aria-hidden="true">{business.name.slice(0, 1).toUpperCase()}</div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-3xl font-extrabold tracking-[-0.045em]">{business.name}</h1>
                  {business.verification_status === "verified" && <span className="inline-flex items-center gap-1 rounded-full bg-[#edf6ef] px-2.5 py-1 text-xs font-bold text-[var(--green)]"><BadgeCheck aria-hidden="true" size={14} /> Verified</span>}
                </div>
                {business.short_description && <p className="mt-3 max-w-2xl text-base leading-7 text-[#637067]">{business.short_description}</p>}
                <div className="mt-3 flex flex-wrap gap-2">{categories.map((category) => <span className="rounded-full bg-[#f1f5f1] px-3 py-1 text-xs font-semibold text-[#57645a]" key={category}>{category}</span>)}</div>
                {reviewCount > 0 && <p className="mt-3 flex items-center gap-2 text-sm font-semibold"><Star aria-hidden="true" className="fill-amber-400 text-amber-500" size={16} />{rating} <span className="font-normal text-[var(--muted)]">({reviewCount} {reviewCount === 1 ? "review" : "reviews"})</span></p>}
              </div>
            </header>

            <div className="mt-7 flex flex-wrap gap-2 border-t border-[#edf0ed] pt-5">
              {phoneUrl && <TrackedLink businessId={business.id} eventType="phone_click" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--green)] px-4 text-sm font-bold text-white hover:bg-[var(--green-dark)]" href={phoneUrl}><Phone aria-hidden="true" size={15} /> Call</TrackedLink>}
              {whatsappUrl && <TrackedLink businessId={business.id} eventType="whatsapp_click" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#dce6de] px-4 text-sm font-bold text-[var(--green)] hover:bg-[#f4f8f4]" href={whatsappUrl} rel="noopener noreferrer" target="_blank"><MessageCircle aria-hidden="true" size={15} /> WhatsApp</TrackedLink>}
              {websiteUrl && <TrackedLink businessId={business.id} eventType="website_click" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#dce6de] px-4 text-sm font-bold text-[#506056] hover:bg-[#f4f8f4]" href={websiteUrl} rel="noopener noreferrer" target="_blank"><Globe2 aria-hidden="true" size={15} /> Website</TrackedLink>}
              <form action={saveBusiness}><input name="businessId" type="hidden" value={business.id} /><input name="slug" type="hidden" value={business.slug} /><input name="action" type="hidden" value={isSaved?.data ? "remove" : "add"} /><button className="inline-flex min-h-11 items-center rounded-lg border border-[#dce6de] px-4 text-sm font-bold text-[#506056] hover:bg-[#f4f8f4]" type="submit">{isSaved?.data ? "Saved · remove" : "Save business"}</button></form>
            </div>

            {noticesList.length > 0 && <div aria-live="polite" className="mt-5 space-y-2">{noticesList.map(([key, value]) => <Notice key={key} type={key} value={value ?? ""} />)}</div>}

            <div className="mt-7 grid gap-8 border-t border-[#edf0ed] pt-7 md:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-8">
                {business.description && <section><h2 className="text-lg font-extrabold">About</h2><p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#667168]">{business.description}</p></section>}
                {services.length > 0 && <section><h2 className="text-lg font-extrabold">Services</h2><ul className="mt-3 divide-y divide-[#edf0ed]">{services.map((service) => <li className="py-3" key={service.id}><h3 className="text-sm font-bold">{service.name}</h3>{service.description && <p className="mt-1 text-sm leading-6 text-[#748078]">{service.description}</p>}{service.price_information && <p className="mt-1 text-xs font-semibold text-[#59675e]">{service.price_information}</p>}</li>)}</ul></section>}
                {photos.length > 0 && supabase && <section><h2 className="text-lg font-extrabold">Photos</h2><ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">{photos.map((photo) => <li className="overflow-hidden rounded-xl border border-[var(--line)]" key={photo.id}><Image alt={photo.alt_text} className="aspect-[4/3] h-auto w-full object-cover" height={300} src={supabase.storage.from("business-media").getPublicUrl(photo.storage_path).data.publicUrl} unoptimized width={400} /></li>)}</ul></section>}
                <section id="reviews" className="scroll-mt-24">
                  <h2 className="text-lg font-extrabold">Customer reviews</h2>
                  {reviews.length > 0 ? <div className="mt-3 divide-y divide-[#edf0ed]">{reviews.map((review) => <article className="py-4" key={review.id}><p className="flex items-center gap-1 text-xs font-bold text-amber-600"><Star aria-hidden="true" className="fill-amber-400" size={14} />{review.rating}/5</p><h3 className="mt-1 font-bold">{review.title}</h3><p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#65716b]">{review.body}</p><time className="mt-2 block text-xs text-[var(--muted)]" dateTime={review.created_at}>{new Date(review.created_at).toLocaleDateString("en-ZA")}</time></article>)}</div> : <p className="mt-2 text-sm text-[var(--muted)]">No reviews yet. Share a helpful, honest experience.</p>}
                  {user ? <form action={submitReview} className="mt-5 grid gap-3 rounded-xl bg-[#f7faf7] p-4">
                    <input name="businessId" type="hidden" value={business.id} /><input name="slug" type="hidden" value={business.slug} />
                    <h3 className="text-sm font-extrabold">Write a review</h3>
                    <label className="grid gap-1 text-xs font-semibold">Rating<select className="min-h-10 rounded-lg border border-[var(--line)] bg-white px-2 text-sm" name="rating"><option value="5">5 — Excellent</option><option value="4">4 — Very good</option><option value="3">3 — Good</option><option value="2">2 — Poor</option><option value="1">1 — Very poor</option></select></label>
                    <label className="grid gap-1 text-xs font-semibold">Title<input className="min-h-10 rounded-lg border border-[var(--line)] bg-white px-3 text-sm" maxLength={120} minLength={3} name="title" required /></label>
                    <label className="grid gap-1 text-xs font-semibold">Your experience<textarea className="min-h-24 rounded-lg border border-[var(--line)] bg-white p-3 text-sm" maxLength={3000} minLength={10} name="body" required /></label>
                    <p className="text-xs leading-5 text-[var(--muted)]">Reviews are checked by moderators before publication. Do not include private information.</p>
                    <button className="min-h-10 w-fit rounded-lg bg-[var(--green)] px-4 text-sm font-bold text-white" type="submit">Submit review</button>
                  </form> : <p className="mt-4 text-sm"><Link className="font-bold text-[var(--green)]" href="/login">Sign in</Link> to write a review.</p>}
                </section>
              </div>

              <aside id="contact" className="scroll-mt-24 space-y-5">
                <section className="rounded-xl border border-[var(--line)] bg-[#fbfcfa] p-4">
                  <h2 className="flex items-center gap-2 font-extrabold"><MapPin aria-hidden="true" className="text-[var(--green)]" size={17} />Location & hours</h2>
                  {currentStatus && <p className={`mt-3 text-sm font-bold ${currentStatus.open ? "text-[var(--green)]" : "text-[#6f7771]"}`}>{currentStatus.label}</p>}
                  <ul className="mt-3 space-y-2">{locations.map((location, index) => {
                    const address = [location.address, location.suburb, location.city, location.province].filter(Boolean).join(", ");
                    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || `${location.city}, ${location.province}`)}`;
                    return <li className="text-sm leading-6 text-[#637067]" key={`${location.city}-${index}`}><p>{address}</p>{location.service_area_description && <p className="mt-1 text-xs text-[var(--muted)]">Service area: {location.service_area_description}</p>}<TrackedLink businessId={business.id} eventType="directions_click" className="mt-1 inline-block text-xs font-bold text-[var(--green)]" href={mapUrl} rel="noopener noreferrer" target="_blank">Get directions ↗</TrackedLink></li>;
                  })}</ul>
                  {hours.length > 0 && <ul className="mt-4 space-y-1 border-t border-[var(--line)] pt-3 text-xs">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => {
                    const item = hours.find((entry) => entry.day_of_week === index);
                    return <li className="flex justify-between gap-3" key={day}><span>{day}</span><span className="text-right text-[var(--muted)]">{!item ? "Hours not listed" : item.is_closed ? "Closed" : `${formatTime(item.opening_time)} – ${formatTime(item.closing_time)}`}</span></li>;
                  })}</ul>}
                </section>
                {emailUrl && <a className="flex items-center gap-2 text-sm text-[#637067] hover:text-[var(--green)]" href={emailUrl}><Mail aria-hidden="true" className="text-[var(--green)]" size={16} />{business.email}</a>}
                <form action={sendEnquiry} className="grid gap-3 rounded-xl border border-[var(--line)] bg-white p-4">
                  <input name="businessId" type="hidden" value={business.id} /><input name="slug" type="hidden" value={business.slug} />
                  <AnalyticsConsentField />
                  <h2 className="font-extrabold">Send an enquiry</h2>
                  <label className="grid gap-1 text-xs font-semibold">Your name<input autoComplete="name" className="min-h-10 rounded-lg border border-[var(--line)] px-3 text-sm" maxLength={120} name="name" required /></label>
                  <label className="grid gap-1 text-xs font-semibold">Email<input autoComplete="email" className="min-h-10 rounded-lg border border-[var(--line)] px-3 text-sm" maxLength={254} name="email" required type="email" /></label>
                  <label className="grid gap-1 text-xs font-semibold">Message<textarea className="min-h-24 rounded-lg border border-[var(--line)] p-3 text-sm" maxLength={5000} minLength={10} name="message" required /></label>
                  <label className="flex items-start gap-2 text-xs leading-5 text-[var(--muted)]"><input className="mt-1 accent-[var(--green)]" name="consent" required type="checkbox" />I agree to share my contact details and message with this business so they can reply.</label>
                  <button className="min-h-10 rounded-lg bg-[var(--green)] px-4 text-sm font-bold text-white" type="submit">Send enquiry</button>
                </form>
                <details className="rounded-xl border border-[var(--line)] bg-white p-4">
                  <summary className="cursor-pointer text-sm font-bold">Report this listing</summary>
                  <form action={reportBusiness} className="mt-3 grid gap-3">
                    <input name="businessId" type="hidden" value={business.id} /><input name="slug" type="hidden" value={business.slug} />
                    <label className="grid gap-1 text-xs font-semibold">Reason<select className="min-h-10 rounded-lg border border-[var(--line)] bg-white px-2 text-sm" name="reason"><option>Incorrect information</option><option>Business closed</option><option>Spam or misleading</option><option>Safety concern</option><option>Other</option></select></label>
                    <label className="grid gap-1 text-xs font-semibold">Details<textarea className="min-h-20 rounded-lg border border-[var(--line)] p-3 text-sm" maxLength={3000} name="description" /></label>
                    <button className="min-h-9 rounded-lg border border-[var(--line)] text-xs font-bold" type="submit">Send report</button>
                  </form>
                </details>
                {user && <details className="rounded-xl border border-[var(--line)] bg-white p-4">
                  <summary className="cursor-pointer text-sm font-bold">Claim this business profile</summary>
                  <form action={submitBusinessClaim} className="mt-3 grid gap-3">
                    <input name="businessId" type="hidden" value={business.id} /><input name="slug" type="hidden" value={business.slug} />
                    <label className="grid gap-1 text-xs font-semibold">Tell our team how you’re connected to this business<textarea className="min-h-24 rounded-lg border border-[var(--line)] p-3 text-sm" maxLength={3000} minLength={20} name="evidence" required /></label>
                    <p className="text-xs leading-5 text-[var(--muted)]">Claims are reviewed manually. Do not upload identity documents or confidential details here.</p>
                    <button className="min-h-9 rounded-lg border border-[var(--line)] text-xs font-bold" type="submit">Request ownership review</button>
                  </form>
                </details>}
                {!user && <p className="text-xs text-[var(--muted)]"><Link className="font-bold text-[var(--green)]" href="/login">Sign in</Link> to request a business claim review.</p>}
                <p className="text-xs leading-5 text-[var(--muted)]">A verification badge is separate from paid promotion and does not guarantee service quality.</p>
              </aside>
            </div>
          </article>
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-20 flex gap-2 border-t border-[var(--line)] bg-white/95 p-3 backdrop-blur md:hidden">
        {phoneUrl && <TrackedLink businessId={business.id} eventType="phone_click" className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--green)] text-sm font-bold text-white" href={phoneUrl}><Phone aria-hidden="true" size={15} />Call</TrackedLink>}
        {whatsappUrl && <TrackedLink businessId={business.id} eventType="whatsapp_click" className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-[#dce6de] text-sm font-bold text-[var(--green)]" href={whatsappUrl} rel="noopener noreferrer" target="_blank"><MessageCircle aria-hidden="true" size={15} />WhatsApp</TrackedLink>}
        <a className="flex min-h-11 flex-1 items-center justify-center rounded-lg border border-[#dce6de] text-sm font-bold text-[#506056]" href="#contact">Enquire</a>
      </div>
    </main>
  );
}

function Notice({ type, value }: { type: string; value: string }) {
  const messages: Record<string, Record<string, string>> = {
    enquiry: { sent: "Your enquiry has been sent.", invalid: "Check the form and try again.", unavailable: "Your enquiry could not be saved. Please try again." },
    review: { submitted: "Your review was received and is awaiting moderation.", invalid: "Check the review fields and try again.", unavailable: "Your review could not be submitted. You may already have reviewed this business." },
    saved: { added: "Business saved to your account.", removed: "Business removed from saved items.", error: "Your saved businesses could not be updated." },
    report: { submitted: "Thank you. The directory team will review this report.", invalid: "Check the report details and try again.", unavailable: "Your report could not be submitted. Please try again." },
    claim: { submitted: "Your claim has been submitted for staff review.", invalid: "Check the claim information and try again.", unavailable: "Your claim could not be submitted. You may already have a request in progress." },
  };
  const message = messages[type]?.[value] ?? "Your request could not be completed.";
  return <p className="rounded-lg border border-[#cfe5d4] bg-[#f0f8f1] p-3 text-sm text-[#315d3e]">{message}</p>;
}

function formatTime(value: string | null) {
  return value ? value.slice(0, 5) : "—";
}

function getCurrentOpeningStatus(hours: Hours[]) {
  if (!hours.length) return null;
  const parts = new Intl.DateTimeFormat("en-ZA", {
    timeZone: "Africa/Johannesburg",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const weekday = parts.find((part) => part.type === "weekday")?.value;
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
  const dayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday ?? "");
  const currentMinutes = hour * 60 + minute;
  const today = hours.find((item) => item.day_of_week === dayIndex);
  const previous = hours.find((item) => item.day_of_week === (dayIndex + 6) % 7);
  const timeToMinutes = (time: string | null) => time ? Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5)) : null;
  const todayOpen = timeToMinutes(today?.opening_time ?? null);
  const todayClose = timeToMinutes(today?.closing_time ?? null);
  const previousClose = timeToMinutes(previous?.closing_time ?? null);
  const previousOpen = timeToMinutes(previous?.opening_time ?? null);
  const open = Boolean(today && !today.is_closed && todayOpen !== null && todayClose !== null && (todayClose > todayOpen
    ? currentMinutes >= todayOpen && currentMinutes < todayClose
    : currentMinutes >= todayOpen))
    || Boolean(previous && !previous.is_closed && previousClose !== null && previousOpen !== null && previousClose < previousOpen && currentMinutes < previousClose);
  return { open, label: open ? "Open now" : "Currently closed" };
}
