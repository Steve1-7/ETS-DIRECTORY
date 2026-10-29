import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/info-page";
import { signInWithGoogle, signUp } from "@/app/actions";

export const metadata: Metadata = {
  title: "Create an account",
  robots: { index: false, follow: false },
};

type RegisterPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const { error } = await searchParams;
  return (
    <InfoPage eyebrow="Join the directory" title="Create your account">
      {error && <p aria-live="polite" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        {error === "not-configured" ? "Account services are not configured yet. Please try again later." : "We couldn't create your account. Check your details or try another email address."}
      </p>}
      <p>Use an email address you can access. We’ll ask you to confirm it before you can manage a listing.</p>
      <form action={signUp} className="grid gap-4 rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm">
        <label className="grid gap-2 text-sm font-semibold" htmlFor="fullName">Full name
          <input autoComplete="name" className="search-input min-h-11 rounded-lg border border-[var(--line)] px-3" id="fullName" maxLength={120} name="fullName" required />
        </label>
        <label className="grid gap-2 text-sm font-semibold" htmlFor="email">Email address
          <input autoComplete="email" className="search-input min-h-11 rounded-lg border border-[var(--line)] px-3" id="email" name="email" required type="email" />
        </label>
        <label className="grid gap-2 text-sm font-semibold" htmlFor="password">Password
          <input autoComplete="new-password" className="search-input min-h-11 rounded-lg border border-[var(--line)] px-3" id="password" minLength={8} name="password" required type="password" />
          <span className="text-xs font-normal text-[var(--muted)]">Use at least 8 characters.</span>
        </label>
        <button className="min-h-11 rounded-lg bg-[var(--green)] px-4 py-2.5 text-sm font-bold text-white hover:bg-[var(--green-dark)]" type="submit">Create account</button>
      </form>
      <form action={signInWithGoogle}>
        <button className="min-h-11 w-full rounded-lg border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-bold text-[#26332a] hover:bg-[#f7faf7]" type="submit">Continue with Google</button>
      </form>
      <p className="text-sm">Already registered? <Link className="font-bold text-[var(--green)]" href="/login">Sign in</Link></p>
    </InfoPage>
  );
}
