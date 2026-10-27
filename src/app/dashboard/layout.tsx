import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/actions";
import { SiteHeader } from "@/components/site-header";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    redirect("/login?error=not-configured");
  }
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();
  if (error) {
    console.error("Dashboard profile could not be loaded:", error.message);
    redirect("/login?error=profile");
  }

  return (
    <div className="min-h-screen bg-[var(--canvas)]">
      <SiteHeader />
      <div className="container grid gap-8 py-8 md:grid-cols-[220px_minmax(0,1fr)] md:py-12">
        <aside className="self-start rounded-2xl border border-[var(--line)] bg-white p-4 shadow-sm md:sticky md:top-28">
          <p className="truncate px-3 pb-3 text-sm font-bold">{profile.full_name || user.email}</p>
          <nav aria-label="Account navigation" className="flex gap-2 overflow-x-auto md:flex-col">
            <Link className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold hover:bg-[#f2f7f3]" href="/dashboard">Overview</Link>
            <Link className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold hover:bg-[#f2f7f3]" href="/dashboard/new">Add a business</Link>
            <Link className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold hover:bg-[#f2f7f3]" href="/dashboard/enquiries">Enquiries</Link>
            <Link className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold hover:bg-[#f2f7f3]" href="/dashboard/saved">Saved businesses</Link>
            <Link className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold hover:bg-[#f2f7f3]" href="/dashboard/saved-searches">Saved searches</Link>
            <Link className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold hover:bg-[#f2f7f3]" href="/dashboard/privacy">Privacy requests</Link>
            {["moderator", "admin"].includes(profile.role) && <Link className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold text-[var(--green)] hover:bg-[#f2f7f3]" href="/admin">Moderation</Link>}
            <form action={signOut} className="ml-auto md:ml-0">
              <button className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold text-[#65716b] hover:bg-[#f2f7f3]" type="submit">Sign out</button>
            </form>
          </nav>
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
