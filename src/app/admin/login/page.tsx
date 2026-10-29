import type { Metadata } from "next";
import { InfoPage } from "@/components/info-page";
import { signInAdmin, signInAdminWithGoogle } from "@/app/actions";

export const metadata: Metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false },
};

type AdminLoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  const { error } = await searchParams;
  const errorMessage = error === "not-configured"
    ? "Account services are not configured yet. Please try again later."
    : error === "forbidden"
      ? "This account does not have staff access."
      : error === "permissions"
        ? "Staff permissions could not be checked. Please try again later."
        : error === "google"
          ? "Google sign-in is unavailable. Please try again or use your staff email."
          : error
            ? "We couldn't sign you in. Check your details and try again."
            : null;

  return (
    <InfoPage eyebrow="Staff access" title="Admin sign in">
      {errorMessage && <p aria-live="polite" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{errorMessage}</p>}
      <p>Use the staff account created for you. Admin accounts cannot be registered here.</p>
      <form action={signInAdmin} className="grid gap-4 rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
        <label className="grid gap-2 text-sm font-semibold" htmlFor="admin-email">Email address
          <input autoComplete="username" className="search-input min-h-11 rounded-lg border border-[var(--line)] px-3" id="admin-email" name="email" required type="email" />
        </label>
        <label className="grid gap-2 text-sm font-semibold" htmlFor="admin-password">Password
          <input autoComplete="current-password" className="search-input min-h-11 rounded-lg border border-[var(--line)] px-3" id="admin-password" name="password" required type="password" />
        </label>
        <button className="min-h-11 rounded-lg bg-[var(--green)] px-4 py-2.5 text-sm font-bold text-white hover:bg-[var(--green-dark)]" type="submit">Sign in</button>
      </form>
      <form action={signInAdminWithGoogle}>
        <button className="min-h-11 w-full rounded-lg border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-bold text-[#26332a] hover:bg-[#f7faf7]" type="submit">Continue with Google</button>
      </form>
    </InfoPage>
  );
}
