import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/info-page";
import { signIn } from "@/app/actions";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

type LoginPageProps = {
  searchParams: Promise<{ error?: string; message?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, message } = await searchParams;
  const errorMessage = error === "not-configured"
    ? "Account services are not configured yet. Add your Supabase project settings to enable sign in."
    : error
      ? "We couldn't sign you in. Check your details and try again."
      : null;

  return (
    <InfoPage eyebrow="Welcome back" title="Sign in to your account">
      {errorMessage && <p aria-live="polite" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{errorMessage}</p>}
      {message === "confirm-email" && <p aria-live="polite" className="rounded-xl border border-[#cfe5d4] bg-[#f0f8f1] p-4 text-sm text-[#315d3e]">Check your inbox and confirm your email address before signing in.</p>}
      <form action={signIn} className="grid gap-4 rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
        <label className="grid gap-2 text-sm font-semibold" htmlFor="email">Email address
          <input autoComplete="email" className="search-input min-h-11 rounded-lg border border-[var(--line)] px-3" id="email" name="email" required type="email" />
        </label>
        <label className="grid gap-2 text-sm font-semibold" htmlFor="password">Password
          <input autoComplete="current-password" className="search-input min-h-11 rounded-lg border border-[var(--line)] px-3" id="password" name="password" required type="password" />
        </label>
        <button className="min-h-11 rounded-lg bg-[var(--green)] px-4 py-2.5 text-sm font-bold text-white hover:bg-[var(--green-dark)]" type="submit">Sign in</button>
      </form>
      <p className="text-sm">New to ETS-Directory? <Link className="font-bold text-[var(--green)]" href="/register">Create an account</Link></p>
    </InfoPage>
  );
}
