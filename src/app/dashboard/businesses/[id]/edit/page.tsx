import { notFound } from "next/navigation";
import Image from "next/image";
import { deleteBusinessPhoto, updateBusinessListing, uploadBusinessPhoto } from "@/app/actions";
import { createServerSupabaseClient } from "@/lib/supabase-server";

type EditBusinessPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
};

export default async function EditBusinessPage({ params, searchParams }: EditBusinessPageProps) {
  const [{ id }, query, supabase] = await Promise.all([params, searchParams, createServerSupabaseClient()]);
  if (!supabase) notFound();
  const { data: business, error } = await supabase.from("businesses")
    .select("id, name, short_description, description, email, phone, website, whatsapp")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("Business listing could not be loaded for editing:", error.message);
    notFound();
  }
  if (!business) notFound();

  const [servicesResult, hoursResult, mediaResult] = await Promise.all([
    supabase.from("business_services").select("name, description, price_information").eq("business_id", id).order("created_at"),
    supabase.from("business_hours").select("day_of_week, opening_time, closing_time, is_closed").eq("business_id", id).order("day_of_week"),
    supabase.from("business_media").select("id, storage_path, alt_text").eq("business_id", id).order("sort_order"),
  ]);
  const relatedErrors = [servicesResult.error, hoursResult.error, mediaResult.error]
    .filter((item): item is NonNullable<typeof item> => item !== null);
  if (relatedErrors.length) {
    console.error("Business profile details could not be loaded for editing:", relatedErrors.map((item) => item.message).join("; "));
    return <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Some profile details could not be loaded. Check that the latest directory migrations are applied.</p>;
  }

  const serviceLines = (servicesResult.data ?? []).map((service) => [service.name, service.description ?? "", service.price_information ?? ""].join(" | ")).join("\n");
  const hoursByDay = new Map((hoursResult.data ?? []).map((hours) => [hours.day_of_week, hours]));
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const { data: location, error: locationError } = await supabase.from("business_locations")
    .select("province, city, suburb, address, service_area_description")
    .eq("business_id", id)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (locationError) {
    console.error("Business location could not be loaded for editing:", locationError.message);
    return <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Business location details could not be loaded.</p>;
  }

  return (
    <section className="mx-auto max-w-3xl">
      <p className="eyebrow mb-2">Manage your listing</p>
      <h1 className="section-title">Edit business profile</h1>
      {query.error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{query.error === "hours" ? "Opening hours could not be saved. Check the time fields and try again." : query.error === "services" ? "Services could not be saved. Use one service per line, in the format Name | Description | Price information." : "The changes could not be saved. Check the details and try again."}</p>}
      {query.message && <p aria-live="polite" className="mt-5 rounded-xl border border-[#cfe5d4] bg-[#f0f8f1] p-4 text-sm text-[#315d3e]">Profile updates saved.</p>}
      <form action={updateBusinessListing} className="mt-6 grid gap-5 rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm md:p-7">
        <input name="businessId" type="hidden" value={business.id} />
        <Field label="Business name" name="name" value={business.name} required maxLength={160} />
        <Field label="Short introduction" name="shortDescription" value={business.short_description} maxLength={280} />
        <label className="grid gap-2 text-sm font-semibold">About the business<textarea className="search-input min-h-32 rounded-lg border border-[var(--line)] p-3" defaultValue={business.description} maxLength={10000} name="description" /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Public contact email" name="email" value={business.email ?? ""} type="email" maxLength={254} />
          <Field label="Phone number" name="phone" value={business.phone ?? ""} type="tel" maxLength={32} />
          <Field label="WhatsApp number" name="whatsapp" value={business.whatsapp ?? ""} type="tel" maxLength={32} />
          <Field label="Website" name="website" value={business.website ?? ""} type="url" maxLength={2048} />
        </div>
        <fieldset className="grid gap-4 rounded-xl border border-[var(--line)] p-4 sm:grid-cols-2">
          <legend className="px-1 text-sm font-bold">Location & service area</legend>
          <Field label="Province" name="province" value={location?.province ?? ""} required maxLength={100} />
          <Field label="City" name="city" value={location?.city ?? ""} required maxLength={100} />
          <Field label="Suburb" name="suburb" value={location?.suburb ?? ""} maxLength={100} />
          <Field label="Public address (optional)" name="address" value={location?.address ?? ""} maxLength={300} />
          <label className="grid gap-2 text-sm font-semibold sm:col-span-2">Service-area description<textarea className="search-input min-h-20 rounded-lg border border-[var(--line)] p-3" defaultValue={location?.service_area_description ?? ""} maxLength={500} name="serviceArea" /></label>
        </fieldset>
        <label className="grid gap-2 text-sm font-semibold">Services
          <textarea className="search-input min-h-32 rounded-lg border border-[var(--line)] p-3 font-normal" defaultValue={serviceLines} name="services" placeholder={"Emergency plumbing | 24-hour callouts | Contact for a quote"} />
          <span className="text-xs font-normal text-[var(--muted)]">One service per line: Name | Description | Price information. Leave blank to remove all services.</span>
        </label>
        <fieldset className="grid gap-3">
          <legend className="text-sm font-bold">Opening hours <span className="font-normal text-[var(--muted)]">(South African time)</span></legend>
          {days.map((day, dayOfWeek) => {
            const value = hoursByDay.get(dayOfWeek);
            return <div className="grid grid-cols-[minmax(82px,1fr)_1fr_1fr_auto] items-center gap-2" key={day}>
              <span className="text-xs font-semibold sm:text-sm">{day}</span>
              <input aria-label={`${day} opening time`} className="min-h-10 min-w-0 rounded-lg border border-[var(--line)] px-2 text-xs" defaultValue={value?.opening_time?.slice(0, 5) ?? ""} disabled={value?.is_closed} name={`${day.slice(0, 3).toLowerCase()}_open`} type="time" />
              <input aria-label={`${day} closing time`} className="min-h-10 min-w-0 rounded-lg border border-[var(--line)] px-2 text-xs" defaultValue={value?.closing_time?.slice(0, 5) ?? ""} disabled={value?.is_closed} name={`${day.slice(0, 3).toLowerCase()}_close`} type="time" />
              <label className="flex items-center gap-1 text-xs"><input className="accent-[var(--green)]" defaultChecked={value?.is_closed ?? false} name={`${day.slice(0, 3).toLowerCase()}_closed`} type="checkbox" />Closed</label>
            </div>;
          })}
        </fieldset>
        <button className="min-h-11 w-fit rounded-lg bg-[var(--green)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--green-dark)]" type="submit">Save profile</button>
      </form>
      <section className="mt-6 rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm md:p-7">
        <h2 className="text-lg font-extrabold">Business photos</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">JPG, PNG, or WebP up to 5 MB per image. Add useful alt text for accessibility.</p>
        {query.error === "photo" && <p role="alert" className="mt-3 text-sm text-red-700">The photo could not be uploaded or removed.</p>}
        <form action={uploadBusinessPhoto} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <input name="businessId" type="hidden" value={business.id} />
          <label className="grid gap-1 text-xs font-semibold">Photo<input accept="image/jpeg,image/png,image/webp" className="min-h-10 rounded-lg border border-[var(--line)] p-2 text-sm" name="photo" required type="file" /></label>
          <Field label="Describe the photo" name="altText" required maxLength={200} />
          <button className="min-h-10 self-end rounded-lg bg-[var(--green)] px-4 py-2 text-sm font-bold text-white" type="submit">Upload</button>
        </form>
        {(mediaResult.data ?? []).length > 0 && <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(mediaResult.data ?? []).map((media) => {
            const imageUrl = supabase.storage.from("business-media").getPublicUrl(media.storage_path).data.publicUrl;
            return <li className="overflow-hidden rounded-xl border border-[var(--line)]" key={media.id}>
              <Image alt={media.alt_text} className="h-40 w-full object-cover" height={320} src={imageUrl} unoptimized width={480} />
              <div className="flex items-center justify-between gap-2 p-3"><p className="truncate text-xs text-[var(--muted)]">{media.alt_text}</p><form action={deleteBusinessPhoto}><input name="businessId" type="hidden" value={business.id} /><input name="mediaId" type="hidden" value={media.id} /><button className="text-xs font-bold text-red-700" type="submit">Remove</button></form></div>
            </li>;
          })}
        </ul>}
      </section>
    </section>
  );
}

function Field({ label, name, value = "", type = "text", required = false, maxLength }: { label: string; name: string; value?: string; type?: string; required?: boolean; maxLength?: number }) {
  return <label className="grid gap-2 text-sm font-semibold">{label}<input className="search-input min-h-11 rounded-lg border border-[var(--line)] px-3" defaultValue={value} maxLength={maxLength} name={name} required={required} type={type} /></label>;
}
