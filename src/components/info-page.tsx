import Link from "next/link";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";

export function InfoPage({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[var(--canvas)]">
      <SiteHeader />
      <section className="container max-w-4xl py-14 md:py-20">
        <p className="eyebrow mb-3">{eyebrow}</p>
        <h1 className="section-title">{title}</h1>
        <div className="mt-8 space-y-5 text-[0.98rem] leading-7 text-[#58645c]">{children}</div>
      </section>
      <footer className="border-t border-[var(--line)] bg-white py-5">
        <div className="container flex flex-wrap justify-between gap-3 text-xs text-[#78837b]">
          <span>© {new Date().getFullYear()} Eva-Tech-Studio</span>
          <div className="flex gap-4">
            <Link className="hover:text-[var(--green)]" href="/privacy">Privacy</Link>
            <Link className="hover:text-[var(--green)]" href="/terms">Terms</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
