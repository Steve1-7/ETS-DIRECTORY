import Link from "next/link";
import { Store } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-white/95 backdrop-blur">
      <div className="container flex min-h-[68px] items-center justify-between gap-4 py-2">
        <Link aria-label="ETS-Directory home" className="whitespace-nowrap text-lg font-extrabold tracking-[-0.04em]" href="/">
          ETS<span className="text-[var(--green)]">-Directory</span>
        </Link>
        <nav aria-label="Main navigation" className="flex items-center gap-2 text-sm font-semibold sm:gap-5">
          <Link className="hidden text-[#49564f] hover:text-[var(--green)] sm:inline-flex" href="/search">Explore</Link>
          <Link className="hidden text-[#49564f] hover:text-[var(--green)] md:inline-flex" href="/categories">Categories</Link>
          <Link className="hidden text-[#49564f] hover:text-[var(--green)] sm:inline-flex" href="/dashboard">Dashboard</Link>
          <Link className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[var(--green)] px-3 py-2 text-xs font-bold text-white transition hover:bg-[var(--green-dark)] sm:px-4 sm:text-sm" href="/list-your-business">
            <Store aria-hidden="true" size={16} />
            <span>List your business</span>
          </Link>
        </nav>
      </div>
      <nav aria-label="Quick links" className="container flex gap-5 overflow-x-auto pb-2 text-xs font-semibold text-[#65716b] sm:hidden">
        <Link className="whitespace-nowrap" href="/search">Explore businesses</Link>
        <Link className="whitespace-nowrap" href="/categories">Categories</Link>
        <Link className="whitespace-nowrap" href="/dashboard">Dashboard</Link>
      </nav>
    </header>
  );
}
