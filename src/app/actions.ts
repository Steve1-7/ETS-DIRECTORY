"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { categories } from "@/lib/categories";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { safeHttpUrl } from "@/lib/urls";

const emailSchema = z.string().trim().email().max(254);
const passwordSchema = z.string().min(8).max(128);
const websiteSchema = z.union([
  z.string().trim().url().max(2048).refine((value) => safeHttpUrl(value) !== null),
  z.literal(""),
]);

function getText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function requireUser() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    redirect("/login?error=not-configured");
  }
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    redirect("/login?error=sign-in");
  }

  return { supabase, user: data.user };
}

async function requireStaff() {
  const { supabase, user } = await requireUser();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("Staff permission could not be checked:", error.message);
    redirect("/dashboard?error=permissions");
  }
  if (!profile || !["moderator", "admin"].includes(profile.role)) {
    redirect("/dashboard?error=forbidden");
  }

  return { supabase, user };
}

export async function signIn(formData: FormData) {
  const parsed = z.object({
    email: emailSchema,
    password: passwordSchema,
  }).safeParse({
    email: getText(formData, "email"),
    password: getText(formData, "password"),
  });

  if (!parsed.success) {
    redirect("/login?error=invalid");
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    redirect("/login?error=not-configured");
  }

  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    console.error("Sign-in failed:", error.message);
    redirect("/login?error=sign-in");
  }

  redirect("/dashboard");
}

export async function signInAdmin(formData: FormData) {
  const parsed = z.object({
    email: emailSchema,
    password: passwordSchema,
  }).safeParse({
    email: getText(formData, "email"),
    password: getText(formData, "password"),
  });

  if (!parsed.success) {
    redirect("/admin/login?error=invalid");
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    redirect("/admin/login?error=not-configured");
  }

  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    if (error) console.error("Admin sign-in failed:", error.message);
    redirect("/admin/login?error=sign-in");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  if (profileError) {
    console.error("Admin permission could not be checked:", profileError.message);
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) console.error("Unauthorized admin sign-in could not be cleared:", signOutError.message);
    redirect("/admin/login?error=permissions");
  }

  if (!profile || !["moderator", "admin"].includes(profile.role)) {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) console.error("Unauthorized admin sign-in could not be cleared:", signOutError.message);
    redirect("/admin/login?error=forbidden");
  }

  redirect("/admin");
}

async function startGoogleSignIn(destination: "/dashboard" | "/admin") {
  const loginPath = destination === "/admin" ? "/admin/login" : "/login";
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    redirect(`${loginPath}?error=not-configured`);
  }

  const callbackUrl = new URL("/auth/callback", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");
  callbackUrl.searchParams.set("next", destination);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callbackUrl.toString() },
  });

  if (error || !data.url) {
    if (error) console.error("Google sign-in could not be started:", error.message);
    else console.error("Google sign-in did not return an authorization URL.");
    redirect(`${loginPath}?error=google`);
  }

  redirect(data.url);
}

export async function signInWithGoogle() {
  await startGoogleSignIn("/dashboard");
}

export async function signInAdminWithGoogle() {
  await startGoogleSignIn("/admin");
}

export async function signUp(formData: FormData) {
  const parsed = z.object({
    fullName: z.string().trim().min(2).max(120),
    email: emailSchema,
    password: passwordSchema,
  }).safeParse({
    fullName: getText(formData, "fullName"),
    email: getText(formData, "email"),
    password: getText(formData, "password"),
  });

  if (!parsed.success) {
    redirect("/register?error=invalid");
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    redirect("/register?error=not-configured");
  }

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/callback`,
    },
  });

  if (error) {
    console.error("Account registration failed:", error.message);
    redirect("/register?error=registration");
  }

  if (!data.session) {
    redirect("/login?message=confirm-email");
  }

  redirect("/dashboard");
}

export async function signOut() {
  const { supabase } = await requireUser();
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Sign-out failed:", error.message);
    redirect("/dashboard?error=sign-out");
  }

  redirect("/");
}

export async function createBusinessListing(formData: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = z.object({
    name: z.string().trim().min(2).max(160),
    shortDescription: z.string().trim().max(280),
    description: z.string().trim().max(10000),
    category: z.enum(categories.map((category) => category.slug) as [string, ...string[]]),
    province: z.string().trim().min(2).max(100),
    city: z.string().trim().min(2).max(100),
    suburb: z.string().trim().max(100),
    email: z.union([emailSchema, z.literal("")]),
    phone: z.string().trim().max(32),
    website: websiteSchema,
    whatsapp: z.string().trim().max(32),
  }).safeParse({
    name: getText(formData, "name"),
    shortDescription: getText(formData, "shortDescription"),
    description: getText(formData, "description"),
    category: getText(formData, "category"),
    province: getText(formData, "province"),
    city: getText(formData, "city"),
    suburb: getText(formData, "suburb"),
    email: getText(formData, "email"),
    phone: getText(formData, "phone"),
    website: getText(formData, "website"),
    whatsapp: getText(formData, "whatsapp"),
  });

  if (!parsed.success) {
    redirect("/dashboard/new?error=invalid");
  }

  const slugBase = parsed.data.name.toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 140);
  const slug = `${slugBase || "business"}-${crypto.randomUUID().slice(0, 8)}`;

  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .insert({
      owner_id: user.id,
      name: parsed.data.name,
      slug,
      short_description: parsed.data.shortDescription,
      description: parsed.data.description,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      website: parsed.data.website || null,
      whatsapp: parsed.data.whatsapp || null,
      status: "draft",
    })
    .select("id")
    .single();

  if (businessError) {
    console.error("Business listing draft could not be created:", businessError.message);
    redirect("/dashboard/new?error=save");
  }

  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", parsed.data.category)
    .eq("is_active", true)
    .single();

  if (categoryError) {
    console.error("Business listing category could not be loaded:", categoryError.message);
    redirect("/dashboard/new?error=details");
  }

  const [categoryResult, locationResult] = await Promise.all([
    supabase.from("business_categories").insert({ business_id: business.id, category_id: category.id }),
    supabase.from("business_locations").insert({
      business_id: business.id,
      province: parsed.data.province,
      city: parsed.data.city,
      suburb: parsed.data.suburb || null,
    }),
  ]);

  if (categoryResult.error || locationResult.error) {
    console.error("Business listing details could not be saved:", categoryResult.error?.message, locationResult.error?.message);
    redirect("/dashboard/new?error=details");
  }

  const { error: submitError } = await supabase.rpc("submit_business_listing", {
    listing_id: business.id,
  });

  if (submitError) {
    console.error("Business listing could not be submitted for review:", submitError.message);
    redirect("/dashboard/new?error=submit");
  }

  revalidatePath("/dashboard");
  redirect("/dashboard?message=submitted");
}

export async function sendEnquiry(formData: FormData) {
  const businessId = getText(formData, "businessId");
  const slug = getText(formData, "slug");
  const parsed = z.object({
    businessId: z.string().uuid(),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    name: z.string().trim().min(1).max(120),
    email: emailSchema,
    message: z.string().trim().min(10).max(5000),
    consent: z.literal("on"),
  }).safeParse({
    businessId,
    slug,
    name: getText(formData, "name"),
    email: getText(formData, "email"),
    message: getText(formData, "message"),
    consent: getText(formData, "consent"),
  });

  if (!parsed.success) {
    redirect(`/business/${encodeURIComponent(slug)}?enquiry=invalid#contact`);
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    redirect(`/business/${encodeURIComponent(slug)}?enquiry=unavailable#contact`);
  }

  const { error } = await supabase.from("enquiries").insert({
    business_id: parsed.data.businessId,
    customer_name: parsed.data.name,
    customer_email: parsed.data.email,
    message: parsed.data.message,
    consent_status: true,
  });

  if (error) {
    console.error("Business enquiry could not be saved:", error.message);
    redirect(`/business/${encodeURIComponent(slug)}?enquiry=unavailable#contact`);
  }

  const consentCookie = await cookies();
  if (getText(formData, "analyticsConsent") === "granted" && consentCookie.get("ets-analytics-consent")?.value === "granted") {
    const { error: eventError } = await supabase.from("listing_events").insert({
      business_id: parsed.data.businessId,
      event_type: "enquiry",
      source: "public_profile",
    });
    if (eventError) console.error("Business enquiry analytics could not be recorded:", eventError.message);
  }

  const { data: business, error: businessError } = await supabase.from("businesses")
    .select("name, email")
    .eq("id", parsed.data.businessId)
    .eq("status", "published")
    .maybeSingle();
  if (businessError) {
    console.error("Enquiry notification recipient could not be loaded:", businessError.message);
  } else if (business?.email && process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL) {
    try {
      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL,
          to: business.email,
          subject: `New enquiry for ${business.name}`,
          text: `A visitor sent an enquiry for ${business.name}.\n\nFrom: ${parsed.data.name}\nEmail: ${parsed.data.email}\n\n${parsed.data.message}\n\nReply directly to the visitor using their email address.`,
        }),
        cache: "no-store",
      });
      if (!emailResponse.ok) {
        console.error("Enquiry notification email could not be sent:", emailResponse.status, await emailResponse.text());
      }
    } catch (error) {
      console.error("Enquiry notification request failed:", error);
    }
  }

  revalidatePath("/dashboard/enquiries");
  redirect(`/business/${encodeURIComponent(slug)}?enquiry=sent#contact`);
}

export async function submitReview(formData: FormData) {
  const { supabase, user } = await requireUser();
  const slug = getText(formData, "slug");
  const parsed = z.object({
    businessId: z.string().uuid(),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    rating: z.coerce.number().int().min(1).max(5),
    title: z.string().trim().min(3).max(120),
    body: z.string().trim().min(10).max(3000),
  }).safeParse({
    businessId: getText(formData, "businessId"),
    slug,
    rating: getText(formData, "rating"),
    title: getText(formData, "title"),
    body: getText(formData, "body"),
  });

  if (!parsed.success) {
    redirect(`/business/${encodeURIComponent(slug)}?review=invalid#reviews`);
  }

  const { error } = await supabase.from("business_reviews").insert({
    business_id: parsed.data.businessId,
    author_id: user.id,
    rating: parsed.data.rating,
    title: parsed.data.title,
    body: parsed.data.body,
    status: "pending",
  });

  if (error) {
    console.error("Business review could not be submitted:", error.message);
    redirect(`/business/${encodeURIComponent(slug)}?review=unavailable#reviews`);
  }

  revalidatePath(`/business/${slug}`);
  redirect(`/business/${encodeURIComponent(slug)}?review=submitted#reviews`);
}

export async function saveBusiness(formData: FormData) {
  const { supabase, user } = await requireUser();
  const businessId = getText(formData, "businessId");
  const slug = getText(formData, "slug");
  const action = getText(formData, "action");
  if (!z.string().uuid().safeParse(businessId).success || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    redirect("/search?error=invalid");
  }

  const result = action === "remove"
    ? await supabase.from("saved_businesses").delete().eq("user_id", user.id).eq("business_id", businessId)
    : await supabase.from("saved_businesses").upsert({ user_id: user.id, business_id: businessId });

  if (result.error) {
    console.error("Saved business could not be updated:", result.error.message);
    redirect(`/business/${encodeURIComponent(slug)}?saved=error`);
  }

  revalidatePath("/dashboard/saved");
  revalidatePath(`/business/${slug}`);
  redirect(`/business/${encodeURIComponent(slug)}?saved=${action === "remove" ? "removed" : "added"}`);
}

export async function reportBusiness(formData: FormData) {
  const businessId = getText(formData, "businessId");
  const slug = getText(formData, "slug");
  const parsed = z.object({
    businessId: z.string().uuid(),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    reason: z.string().trim().min(2).max(100),
    description: z.string().trim().max(3000),
  }).safeParse({
    businessId,
    slug,
    reason: getText(formData, "reason"),
    description: getText(formData, "description"),
  });

  if (!parsed.success) {
    redirect(`/business/${encodeURIComponent(slug)}?report=invalid`);
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    redirect(`/business/${encodeURIComponent(slug)}?report=unavailable`);
  }

  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("moderation_reports").insert({
    business_id: parsed.data.businessId,
    reporter_id: user?.id ?? null,
    reason: parsed.data.reason,
    description: parsed.data.description || null,
  });

  if (error) {
    console.error("Business report could not be saved:", error.message);
    redirect(`/business/${encodeURIComponent(slug)}?report=unavailable`);
  }

  redirect(`/business/${encodeURIComponent(slug)}?report=submitted`);
}

export async function submitBusinessClaim(formData: FormData) {
  const { supabase, user } = await requireUser();
  const slug = getText(formData, "slug");
  const parsed = z.object({
    businessId: z.string().uuid(),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    evidence: z.string().trim().min(20).max(3000),
  }).safeParse({
    businessId: getText(formData, "businessId"),
    slug,
    evidence: getText(formData, "evidence"),
  });

  if (!parsed.success) {
    redirect(`/business/${encodeURIComponent(slug)}?claim=invalid`);
  }

  const { error } = await supabase.from("business_claim_requests").insert({
    business_id: parsed.data.businessId,
    requester_id: user.id,
    evidence: parsed.data.evidence,
  });

  if (error) {
    console.error("Business ownership claim could not be submitted:", error.message);
    redirect(`/business/${encodeURIComponent(slug)}?claim=unavailable`);
  }

  redirect(`/business/${encodeURIComponent(slug)}?claim=submitted`);
}

export async function updateBusinessListing(formData: FormData) {
  const { supabase } = await requireUser();
  const businessId = getText(formData, "businessId");
  const parsed = z.object({
    businessId: z.string().uuid(),
    name: z.string().trim().min(2).max(160),
    shortDescription: z.string().trim().max(280),
    description: z.string().trim().max(10000),
    email: z.union([emailSchema, z.literal("")]),
    phone: z.string().trim().max(32),
    website: websiteSchema,
    whatsapp: z.string().trim().max(32),
    province: z.string().trim().min(2).max(100),
    city: z.string().trim().min(2).max(100),
    suburb: z.string().trim().max(100),
    address: z.string().trim().max(300),
    serviceArea: z.string().trim().max(500),
    services: z.string().max(60000),
  }).safeParse({
    businessId,
    name: getText(formData, "name"),
    shortDescription: getText(formData, "shortDescription"),
    description: getText(formData, "description"),
    email: getText(formData, "email"),
    phone: getText(formData, "phone"),
    website: getText(formData, "website"),
    whatsapp: getText(formData, "whatsapp"),
    province: getText(formData, "province"),
    city: getText(formData, "city"),
    suburb: getText(formData, "suburb"),
    address: getText(formData, "address"),
    serviceArea: getText(formData, "serviceArea"),
    services: getText(formData, "services"),
  });

  if (!parsed.success) {
    redirect(`/dashboard/businesses/${encodeURIComponent(businessId)}/edit?error=invalid`);
  }

  const services = parsed.data.services.split(/\r?\n/)
    .map((line) => line.split("|").map((part) => part.trim()))
    .filter((parts) => parts.some(Boolean))
    .map(([name = "", description = "", price_information = ""]) => ({
      name,
      description,
      price_information,
    }));
  if (services.length > 50 || services.some((service) => service.name.length < 1 || service.name.length > 120 || service.description.length > 1000 || service.price_information.length > 200)) {
    redirect(`/dashboard/businesses/${encodeURIComponent(businessId)}/edit?error=services`);
  }

  const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const hours: {
    day_of_week: number;
    is_closed: boolean;
    opening_time: string | null;
    closing_time: string | null;
  }[] = [];
  for (const [dayOfWeek, day] of days.entries()) {
    const isClosed = getText(formData, `${day}_closed`) === "on";
    const opening = getText(formData, `${day}_open`);
    const closing = getText(formData, `${day}_close`);
    if (isClosed) {
      hours.push({ day_of_week: dayOfWeek, is_closed: true, opening_time: null, closing_time: null });
      continue;
    }
    if (!opening && !closing) continue;
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(opening) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(closing)) {
      redirect(`/dashboard/businesses/${encodeURIComponent(businessId)}/edit?error=hours`);
    }
    hours.push({ day_of_week: dayOfWeek, is_closed: false, opening_time: opening, closing_time: closing });
  }

  const { error } = await supabase.rpc("update_business_profile", {
    listing_id: parsed.data.businessId,
    profile_data: {
      name: parsed.data.name,
      short_description: parsed.data.shortDescription,
      description: parsed.data.description,
      email: parsed.data.email,
      phone: parsed.data.phone,
      website: parsed.data.website,
      whatsapp: parsed.data.whatsapp,
    },
    service_data: services,
    hours_data: hours,
    location_data: {
      province: parsed.data.province,
      city: parsed.data.city,
      suburb: parsed.data.suburb,
      address: parsed.data.address,
      service_area_description: parsed.data.serviceArea,
    },
  });
  if (error) {
    console.error("Business profile could not be updated:", error.message);
    redirect(`/dashboard/businesses/${encodeURIComponent(businessId)}/edit?error=save`);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard?message=updated");
}

export async function updateEnquiryStatus(formData: FormData) {
  const { supabase } = await requireUser();
  const parsed = z.object({
    enquiryId: z.string().uuid(),
    status: z.enum(["read", "replied", "closed", "spam"]),
  }).safeParse({
    enquiryId: getText(formData, "enquiryId"),
    status: getText(formData, "status"),
  });
  if (!parsed.success) {
    redirect("/dashboard/enquiries?error=invalid");
  }

  const { error } = await supabase.from("enquiries")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.enquiryId);
  if (error) {
    console.error("Enquiry status could not be updated:", error.message);
    redirect("/dashboard/enquiries?error=save");
  }

  revalidatePath("/dashboard/enquiries");
  redirect("/dashboard/enquiries?message=updated");
}

export async function moderateBusiness(formData: FormData) {
  const { supabase, user } = await requireStaff();
  const parsed = z.object({
    businessId: z.string().uuid(),
    status: z.enum(["published", "changes_requested", "rejected", "suspended"]),
  }).safeParse({
    businessId: getText(formData, "businessId"),
    status: getText(formData, "status"),
  });
  if (!parsed.success) {
    redirect("/admin?error=invalid");
  }

  const { error } = await supabase.from("businesses").update({
    status: parsed.data.status,
    published_at: parsed.data.status === "published" ? new Date().toISOString() : null,
  }).eq("id", parsed.data.businessId);
  if (error) {
    console.error("Business listing could not be moderated:", error.message);
    redirect("/admin?error=moderation");
  }

  const { error: auditError } = await supabase.from("audit_logs").insert({
    actor_id: user.id,
    action: `listing_${parsed.data.status}`,
    entity_type: "business",
    entity_id: parsed.data.businessId,
  });
  if (auditError) {
    console.error("Listing moderation audit record could not be saved:", auditError.message);
  }

  revalidatePath("/admin");
  revalidatePath("/search");
  redirect("/admin?message=updated");
}

export async function moderateReview(formData: FormData) {
  const { supabase, user } = await requireStaff();
  const parsed = z.object({
    reviewId: z.string().uuid(),
    status: z.enum(["approved", "rejected", "changes_requested"]),
  }).safeParse({
    reviewId: getText(formData, "reviewId"),
    status: getText(formData, "status"),
  });
  if (!parsed.success) {
    redirect("/admin?error=invalid");
  }

  const { error } = await supabase.from("business_reviews")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.reviewId);
  if (error) {
    console.error("Review could not be moderated:", error.message);
    redirect("/admin?error=moderation");
  }

  const { error: auditError } = await supabase.from("audit_logs").insert({
    actor_id: user.id,
    action: `review_${parsed.data.status}`,
    entity_type: "business_review",
    entity_id: parsed.data.reviewId,
  });
  if (auditError) {
    console.error("Review moderation audit record could not be saved:", auditError.message);
  }

  revalidatePath("/admin");
  redirect("/admin?message=updated");
}

export async function moderateClaim(formData: FormData) {
  const { supabase } = await requireStaff();
  const parsed = z.object({
    claimId: z.string().uuid(),
    status: z.enum(["approved", "rejected", "changes_requested"]),
  }).safeParse({
    claimId: getText(formData, "claimId"),
    status: getText(formData, "status"),
  });
  if (!parsed.success) {
    redirect("/admin?error=invalid");
  }

  const { error } = await supabase.rpc("review_business_claim", {
    claim_id: parsed.data.claimId,
    decision: parsed.data.status,
  });
  if (error) {
    console.error("Business claim could not be reviewed:", error.message);
    redirect("/admin?error=moderation");
  }

  revalidatePath("/admin");
  redirect("/admin?message=updated");
}

export async function moderateReport(formData: FormData) {
  const { supabase, user } = await requireStaff();
  const parsed = z.object({
    reportId: z.string().uuid(),
    status: z.enum(["reviewing", "resolved", "dismissed"]),
  }).safeParse({
    reportId: getText(formData, "reportId"),
    status: getText(formData, "status"),
  });
  if (!parsed.success) {
    redirect("/admin?error=invalid");
  }

  const { error } = await supabase.from("moderation_reports").update({
    status: parsed.data.status,
    reviewed_by: user.id,
    reviewed_at: new Date().toISOString(),
  }).eq("id", parsed.data.reportId);
  if (error) {
    console.error("Directory report could not be moderated:", error.message);
    redirect("/admin?error=moderation");
  }

  const { error: auditError } = await supabase.from("audit_logs").insert({
    actor_id: user.id,
    action: `report_${parsed.data.status}`,
    entity_type: "moderation_report",
    entity_id: parsed.data.reportId,
  });
  if (auditError) {
    console.error("Report moderation audit record could not be saved:", auditError.message);
  }

  revalidatePath("/admin");
  redirect("/admin?message=updated");
}

export async function moderateVerification(formData: FormData) {
  const { supabase } = await requireStaff();
  const parsed = z.object({
    requestId: z.string().uuid(),
    decision: z.enum(["approved", "rejected"]),
  }).safeParse({
    requestId: getText(formData, "requestId"),
    decision: getText(formData, "decision"),
  });
  if (!parsed.success) {
    redirect("/admin?error=invalid");
  }

  const { error } = await supabase.rpc("review_verification_request", {
    request_id: parsed.data.requestId,
    decision: parsed.data.decision,
  });
  if (error) {
    console.error("Verification request could not be reviewed:", error.message);
    redirect("/admin?error=moderation");
  }

  revalidatePath("/admin");
  redirect("/admin?message=updated");
}

export async function requestVerification(formData: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = z.object({
    businessId: z.string().uuid(),
    method: z.enum(["email", "phone", "document", "in_person"]),
  }).safeParse({
    businessId: getText(formData, "businessId"),
    method: getText(formData, "method"),
  });
  if (!parsed.success) {
    redirect("/dashboard?error=invalid");
  }

  const { error } = await supabase.from("verification_requests").insert({
    business_id: parsed.data.businessId,
    user_id: user.id,
    verification_method: parsed.data.method,
    status: "pending",
  });
  if (error) {
    console.error("Business verification request could not be submitted:", error.message);
    redirect("/dashboard?error=verification");
  }

  revalidatePath("/dashboard");
  redirect("/dashboard?message=verification-submitted");
}

export async function uploadBusinessPhoto(formData: FormData) {
  const { supabase, user } = await requireUser();
  const businessId = getText(formData, "businessId");
  const altText = getText(formData, "altText");
  const file = formData.get("photo");

  if (!z.string().uuid().safeParse(businessId).success || !(file instanceof File) || file.size === 0 || file.size > 5 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type) || altText.length < 3 || altText.length > 200) {
    redirect(`/dashboard/businesses/${encodeURIComponent(businessId)}/edit?error=photo`);
  }
  if (!isValidImageSignature(file.type, new Uint8Array(await file.slice(0, 12).arrayBuffer()))) {
    redirect(`/dashboard/businesses/${encodeURIComponent(businessId)}/edit?error=photo`);
  }

  const { data: business, error: businessError } = await supabase.from("businesses")
    .select("id")
    .eq("id", businessId)
    .eq("owner_id", user.id)
    .single();
  if (businessError || !business) {
    if (businessError) console.error("Business photo ownership check failed:", businessError.message);
    redirect("/dashboard?error=permissions");
  }

  const extension = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
  const storagePath = `${user.id}/${businessId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from("business-media").upload(storagePath, file, {
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) {
    console.error("Business photo upload failed:", uploadError.message);
    redirect(`/dashboard/businesses/${encodeURIComponent(businessId)}/edit?error=photo`);
  }

  const { error: mediaError } = await supabase.from("business_media").insert({
    business_id: businessId,
    storage_path: storagePath,
    media_type: "image",
    alt_text: altText,
  });
  if (mediaError) {
    const { error: cleanupError } = await supabase.storage.from("business-media").remove([storagePath]);
    console.error("Business photo metadata could not be saved:", mediaError.message);
    if (cleanupError) console.error("Orphaned business photo cleanup failed:", cleanupError.message);
    redirect(`/dashboard/businesses/${encodeURIComponent(businessId)}/edit?error=photo`);
  }

  revalidatePath("/dashboard");
  redirect(`/dashboard/businesses/${encodeURIComponent(businessId)}/edit?message=photo`);
}

export async function deleteBusinessPhoto(formData: FormData) {
  const { supabase } = await requireUser();
  const businessId = getText(formData, "businessId");
  const mediaId = getText(formData, "mediaId");
  if (!z.string().uuid().safeParse(businessId).success || !z.string().uuid().safeParse(mediaId).success) {
    redirect("/dashboard?error=invalid");
  }

  const { data: media, error: mediaError } = await supabase.from("business_media")
    .select("storage_path")
    .eq("id", mediaId)
    .eq("business_id", businessId)
    .single();
  if (mediaError || !media) {
    if (mediaError) console.error("Business photo could not be loaded for removal:", mediaError.message);
    redirect(`/dashboard/businesses/${encodeURIComponent(businessId)}/edit?error=photo`);
  }

  const { error: deleteError } = await supabase.from("business_media").delete()
    .eq("id", mediaId)
    .eq("business_id", businessId);
  if (deleteError) {
    console.error("Business photo could not be removed:", deleteError.message);
    redirect(`/dashboard/businesses/${encodeURIComponent(businessId)}/edit?error=photo`);
  }

  const { error: storageError } = await supabase.storage.from("business-media").remove([media.storage_path]);
  if (storageError) {
    console.error("Business photo storage cleanup failed:", storageError.message);
    redirect(`/dashboard/businesses/${encodeURIComponent(businessId)}/edit?error=photo-cleanup`);
  }

  revalidatePath("/dashboard");
  redirect(`/dashboard/businesses/${encodeURIComponent(businessId)}/edit?message=photo-removed`);
}

function isValidImageSignature(contentType: string, bytes: Uint8Array) {
  if (contentType === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (contentType === "image/png") {
    return bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => bytes[index] === byte);
  }
  return contentType === "image/webp"
    && bytes.length >= 12
    && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF"
    && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
}

export async function createPromotionCheckout(formData: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = z.object({
    businessId: z.string().uuid(),
    plan: z.enum(["featured", "premium"]),
  }).safeParse({
    businessId: getText(formData, "businessId"),
    plan: getText(formData, "plan"),
  });
  if (!parsed.success) redirect("/dashboard?error=payment");

  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret || !user.email) {
    redirect("/dashboard?error=payment-config");
  }

  const reference = crypto.randomUUID();
  const { data: checkout, error: checkoutError } = await supabase.rpc("start_paystack_checkout", {
    target_business_id: parsed.data.businessId,
    target_plan_slug: parsed.data.plan,
    payment_reference: reference,
  });
  if (checkoutError || !checkout?.[0]) {
    if (checkoutError) console.error("Paystack checkout could not be prepared:", checkoutError.message);
    redirect("/dashboard?error=payment");
  }

  let response: Response;
  try {
    response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        amount: checkout[0].amount_minor_units,
        currency: checkout[0].currency_code,
        reference,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/payments/callback`,
        metadata: { business_id: parsed.data.businessId, plan: parsed.data.plan },
      }),
      cache: "no-store",
    });
  } catch (error) {
    console.error("Paystack checkout request failed:", error);
    const { error: markError } = await supabase.rpc("fail_paystack_checkout", { payment_reference: reference });
    if (markError) console.error("Failed Paystack checkout could not be marked as failed:", markError.message);
    redirect("/dashboard?error=payment");
  }

  let responseBody: unknown;
  try {
    responseBody = await response.json();
  } catch (error) {
    console.error("Paystack returned an unreadable checkout response:", error);
    const { error: updateError } = await supabase.rpc("fail_paystack_checkout", { payment_reference: reference });
    if (updateError) console.error("Failed Paystack checkout could not be marked as failed:", updateError.message);
    redirect("/dashboard?error=payment");
  }

  const paystackResult = z.object({
    status: z.boolean(),
    message: z.string().optional(),
    data: z.object({ authorization_url: z.string().url() }).optional(),
  }).safeParse(responseBody);
  if (!response.ok || !paystackResult.success || !paystackResult.data.status || !paystackResult.data.data) {
    console.error("Paystack checkout initialization failed:", paystackResult.success ? paystackResult.data.message : paystackResult.error.message);
    const { error: updateError } = await supabase.rpc("fail_paystack_checkout", { payment_reference: reference });
    if (updateError) console.error("Failed Paystack checkout could not be marked as failed:", updateError.message);
    redirect("/dashboard?error=payment");
  }

  const authorizationUrl = new URL(paystackResult.data.data.authorization_url);
  if (authorizationUrl.protocol !== "https:" || authorizationUrl.hostname !== "checkout.paystack.com") {
    console.error("Paystack returned an unexpected checkout URL.");
    const { error } = await supabase.rpc("fail_paystack_checkout", { payment_reference: reference });
    if (error) console.error("Invalid Paystack checkout could not be marked as failed:", error.message);
    redirect("/dashboard?error=payment");
  }

  redirect(authorizationUrl.toString());
}

export async function saveSearch(formData: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = z.object({
    label: z.string().trim().min(1).max(100),
    query: z.string().trim().max(100),
    location: z.string().trim().max(100),
    category: z.string().trim(),
    verified: z.enum(["on", ""]).transform((value) => value === "on"),
    open: z.enum(["on", ""]).transform((value) => value === "on"),
    sort: z.enum(["relevance", "rating", "newest"]),
  }).safeParse({
    label: getText(formData, "label"),
    query: getText(formData, "query"),
    location: getText(formData, "location"),
    category: getText(formData, "category"),
    verified: getText(formData, "verified"),
    open: getText(formData, "open"),
    sort: getText(formData, "sort"),
  });
  if (!parsed.success || (parsed.data.category && !categories.some((category) => category.slug === parsed.data.category))) {
    redirect("/search?error=save-search");
  }

  const { error } = await supabase.from("saved_searches").insert({
    user_id: user.id,
    label: parsed.data.label,
    query: parsed.data.query,
    location: parsed.data.location,
    category_slug: parsed.data.category || null,
    verified_only: parsed.data.verified,
    open_now: parsed.data.open,
    sort_by: parsed.data.sort,
  });
  if (error) {
    console.error("Saved search could not be created:", error.message);
    redirect("/search?error=save-search");
  }

  revalidatePath("/dashboard/saved-searches");
  redirect("/dashboard/saved-searches?message=saved");
}

export async function deleteSavedSearch(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = getText(formData, "savedSearchId");
  if (!z.string().uuid().safeParse(id).success) redirect("/dashboard/saved-searches?error=invalid");

  const { error } = await supabase.from("saved_searches").delete().eq("id", id).eq("user_id", user.id);
  if (error) {
    console.error("Saved search could not be removed:", error.message);
    redirect("/dashboard/saved-searches?error=remove");
  }

  revalidatePath("/dashboard/saved-searches");
  redirect("/dashboard/saved-searches?message=removed");
}

export async function submitDataSubjectRequest(formData: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = z.object({
    requestType: z.enum(["access", "correction", "deletion", "listing_removal"]),
    details: z.string().trim().min(10).max(3000),
  }).safeParse({
    requestType: getText(formData, "requestType"),
    details: getText(formData, "details"),
  });
  if (!parsed.success) redirect("/dashboard/privacy?error=invalid");

  const { error } = await supabase.from("data_subject_requests").insert({
    requester_id: user.id,
    request_type: parsed.data.requestType,
    details: parsed.data.details,
  });
  if (error) {
    console.error("Privacy request could not be submitted:", error.message);
    redirect("/dashboard/privacy?error=submit");
  }

  revalidatePath("/dashboard/privacy");
  redirect("/dashboard/privacy?message=submitted");
}

export async function moderateDataSubjectRequest(formData: FormData) {
  const { supabase, user } = await requireStaff();
  const parsed = z.object({
    requestId: z.string().uuid(),
    status: z.enum(["reviewing", "resolved", "dismissed"]),
  }).safeParse({
    requestId: getText(formData, "requestId"),
    status: getText(formData, "status"),
  });
  if (!parsed.success) redirect("/admin?error=invalid");

  const { error } = await supabase.from("data_subject_requests").update({
    status: parsed.data.status,
    reviewed_by: user.id,
    reviewed_at: new Date().toISOString(),
  }).eq("id", parsed.data.requestId);
  if (error) {
    console.error("Privacy request could not be reviewed:", error.message);
    redirect("/admin?error=moderation");
  }

  const { error: auditError } = await supabase.from("audit_logs").insert({
    actor_id: user.id,
    action: `data_request_${parsed.data.status}`,
    entity_type: "data_subject_request",
    entity_id: parsed.data.requestId,
  });
  if (auditError) console.error("Privacy request audit record could not be saved:", auditError.message);
  revalidatePath("/admin");
  redirect("/admin?message=updated");
}
