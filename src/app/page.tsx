import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  MapPin,
  Search,
  ShieldCheck,
  Store,
} from "lucide-react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SearchAutocomplete } from "@/components/search-autocomplete";
import { categories, popularLocations } from "@/lib/categories";

export default function HomePage() {
  return (
    <>
      <SiteHeader />

      <main>
        <section className="relative overflow-hidden border-b border-[#e9efe9] bg-[radial-gradient(ellipse_at_77%_18%,#e5f4e9_0%,transparent_35%),linear-gradient(180deg,#fff_0%,#f8fbf7_100%)]">
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 top-16 h-80 w-80 rounded-full border border-[#dbece0] opacity-80" />
          <div aria-hidden="true" className="pointer-events-none absolute -right-10 top-30 h-52 w-52 rounded-full border border-[#dbece0] opacity-80" />
          <div className="container relative grid min-h-[550px] items-center gap-12 py-16 lg:grid-cols-[1.15fr_0.85fr] lg:py-20">
            <div className="max-w-[700px]">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#dcebe0] bg-white/80 px-3 py-1.5 text-xs font-bold text-[#42634e] shadow-sm">
                <span className="h-2 w-2 rounded-full bg-[#22a36d]" />
                Discover South African businesses
              </div>
              <h1 className="max-w-[680px] text-[clamp(2.8rem,6.5vw,5.15rem)] font-extrabold leading-[1.02] tracking-[-0.065em] text-[var(--ink)]">
                Good things are
                <br />
                <span className="text-[var(--green)]">closer than</span> you think.
              </h1>
              <p className="mt-6 max-w-[540px] text-base leading-7 text-[#65716b] md:text-lg">
                Find the local people and businesses that make your neighbourhood work. Search, connect, and support local — all in one place.
              </p>

              <form action="/search" className="mt-9 flex flex-col gap-2 rounded-2xl border border-[#e0e8e1] bg-white p-2.5 shadow-[0_18px_55px_rgba(31,61,42,0.1)] sm:flex-row sm:items-center">
                <label className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2">
                  <Search aria-hidden="true" className="shrink-0 text-[var(--green)]" size={19} />
                  <span className="sr-only">Business or service</span>
                  <SearchAutocomplete className="search-input min-w-0 flex-1 border-0 bg-transparent text-sm text-[var(--ink)] outline-none placeholder:text-[#929c95]" label="Business or service" name="q" placeholder="What are you looking for?" />
                </label>
                <span aria-hidden="true" className="hidden h-9 w-px bg-[#e8ece8] sm:block" />
                <label className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2">
                  <MapPin aria-hidden="true" className="shrink-0 text-[var(--green)]" size={19} />
                  <span className="sr-only">Location</span>
                  <SearchAutocomplete className="search-input min-w-0 flex-1 border-0 bg-transparent text-sm text-[var(--ink)] outline-none placeholder:text-[#929c95]" label="Location" name="location" placeholder="City or neighbourhood" />
                </label>
                <button className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[var(--green)] px-6 text-sm font-bold text-white transition hover:bg-[var(--green-dark)]" type="submit">
                  <Search aria-hidden="true" size={16} />
                  Search
                </button>
              </form>

              <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-[#77817a]">
                <span className="font-semibold text-[#5e6962]">Popular:</span>
                {["Plumbers", "Restaurants", "Accountants", "Electricians"].map((term) => (
                  <Link className="rounded-full border border-[#e6ebe6] bg-white/75 px-3 py-1.5 transition hover:border-[#a8cbb4] hover:text-[var(--green)]" href={`/search?q=${encodeURIComponent(term)}`} key={term}>{term}</Link>
                ))}
              </div>
            </div>

            <div className="relative hidden min-h-[380px] items-center justify-center lg:flex">
              <div aria-hidden="true" className="absolute h-[330px] w-[330px] rounded-full bg-[#e6f3e9]" />
              <div aria-hidden="true" className="absolute h-[255px] w-[255px] rounded-full border border-[#cddfce]" />
              <div className="relative w-[340px] rotate-[-4deg] rounded-2xl border border-[#e8eee9] bg-white p-5 shadow-[0_30px_90px_rgba(28,64,41,0.13)]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#6c7770]">A little closer to home</span>
                  <span className="rounded-full bg-[#eef8f0] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--green)]">Local</span>
                </div>
                <div className="mt-5 rounded-xl bg-[#edf5ee] p-5">
                  <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-[#bdd5c3] bg-[radial-gradient(circle_at_50%_45%,#d2e8d5_0%,#e9f4e9_58%,#eff6ef_100%)]">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[var(--green)] shadow-sm">
                      <MapPin aria-hidden="true" size={26} />
                    </div>
                  </div>
                </div>
                <div className="mt-5 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e7f5eb] text-[var(--green)]"><Store aria-hidden="true" size={20} /></div>
                  <div className="flex-1">
                    <p className="text-sm font-extrabold">Your next great local find</p>
                    <p className="mt-1 text-xs text-[#7b857e]">Discover businesses in your area</p>
                  </div>
                  <ArrowUpRight aria-hidden="true" className="text-[#95a198]" size={18} />
                </div>
              </div>
              <div className="absolute right-0 top-[64px] flex items-center gap-2 rounded-xl border border-[#e9eee9] bg-white px-3 py-2.5 text-xs font-bold shadow-lg">
                <BadgeCheck aria-hidden="true" className="text-[var(--green)]" size={17} />
                Verified businesses
              </div>
              <div className="absolute bottom-[42px] left-1 flex items-center gap-2 rounded-xl border border-[#e9eee9] bg-white px-3 py-2.5 text-xs font-bold shadow-lg">
                <ShieldCheck aria-hidden="true" className="text-[var(--green)]" size={17} />
                Built for local
              </div>
            </div>
          </div>
        </section>

        <section className="container py-16 md:py-20">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="eyebrow mb-3">Explore by category</p>
              <h2 className="section-title">Find the right people for the job</h2>
              <p className="section-copy">Start with a category and discover local businesses near you.</p>
            </div>
            <Link className="inline-flex items-center gap-2 pb-1 text-sm font-bold text-[var(--green)] hover:text-[var(--green-dark)]" href="/categories">
              All categories <ArrowRight aria-hidden="true" size={16} />
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map(({ name, slug, Icon }) => (
              <Link className="category-card group rounded-2xl p-5" href={`/categories/${slug}`} key={slug}>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#edf6ef] text-[var(--green)] transition group-hover:bg-[var(--green)] group-hover:text-white">
                  <Icon aria-hidden="true" size={21} strokeWidth={1.8} />
                </span>
                <span className="mt-4 block text-sm font-bold leading-snug">{name}</span>
                <span className="mt-2 block text-xs text-[#879189]">Explore local</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="border-y border-[#edf0ed] bg-white py-16 md:py-20">
          <div className="container grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <p className="eyebrow mb-3">Search your neighbourhood</p>
              <h2 className="section-title">Local starts right around the corner.</h2>
              <p className="section-copy max-w-[420px]">From a quick repair to your new favourite lunch spot, see what local businesses are doing in your area.</p>
              <Link className="mt-6 inline-flex items-center gap-2 rounded-lg border border-[#dce6de] px-4 py-2.5 text-sm font-bold transition hover:border-[var(--green)] hover:text-[var(--green)]" href="/search">
                Explore all businesses <ArrowRight aria-hidden="true" size={16} />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {popularLocations.map((location, index) => (
                <Link className={`rounded-xl border border-[#e7ece7] px-4 py-4 transition hover:border-[#b9d2bf] hover:bg-[#f6faf6] ${index === 0 ? "bg-[#f3f8f3]" : "bg-white"}`} href={`/search?location=${encodeURIComponent(location)}`} key={location}>
                  <span className="flex items-center gap-2 text-sm font-bold">
                    <MapPin aria-hidden="true" className="text-[var(--green)]" size={15} />
                    {location}
                  </span>
                  <span className="mt-2 block pl-[23px] text-xs text-[#879189]">Find local businesses</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="container py-16 md:py-20">
          <div className="overflow-hidden rounded-3xl bg-[#153e2d] px-7 py-10 text-white md:px-12 md:py-12">
            <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
              <div className="max-w-[650px]">
                <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#9bd2ac]">For South African businesses</p>
                <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.045em] md:text-4xl">Your community is looking for you.</h2>
                <p className="mt-3 max-w-[540px] text-sm leading-6 text-[#d0e1d5]">Create a listing and help more people discover what you do. Start with a free profile and grow from there.</p>
              </div>
              <Link className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-[#153e2d] transition hover:bg-[#e9f3ec]" href="/list-your-business">
                List your business <ArrowUpRight aria-hidden="true" size={17} />
              </Link>
            </div>
              <p className="mt-5 text-sm text-[#d0e1d5]">Already listed? <Link className="font-bold text-white underline decoration-[#9bd2ac] underline-offset-4 hover:text-[#c9ebd2]" href="/list-your-business#claim">Learn about claiming a business</Link></p>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--line)] bg-white">
        <div className="container grid gap-9 py-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Link className="flex items-center gap-2.5" href="/">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--green)] text-xs font-black text-white">ETS</span>
              <span className="font-extrabold tracking-[-0.04em]">ETS<span className="text-[var(--green)]">-Directory</span></span>
            </Link>
            <p className="mt-3 max-w-[260px] text-sm leading-6 text-[#748078]">Find Local. Connect Direct.<br />Proudly built for South Africa by Eva-Tech-Studio.</p>
          </div>
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#344139]">Discover</h3>
            <div className="mt-4 flex flex-col gap-3 text-sm text-[#748078]">
              <Link className="hover:text-[var(--green)]" href="/search">Search businesses</Link>
              <Link className="hover:text-[var(--green)]" href="/categories">Categories</Link>
              <Link className="hover:text-[var(--green)]" href="/pricing">Pricing</Link>
            </div>
          </div>
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#344139]">Company</h3>
            <div className="mt-4 flex flex-col gap-3 text-sm text-[#748078]">
              <Link className="hover:text-[var(--green)]" href="/about">About us</Link>
              <Link className="hover:text-[var(--green)]" href="/contact">Contact</Link>
              <Link className="hover:text-[var(--green)]" href="/list-your-business">List or claim your business</Link>
            </div>
          </div>
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#344139]">Legal</h3>
            <div className="mt-4 flex flex-col gap-3 text-sm text-[#748078]">
              <Link className="hover:text-[var(--green)]" href="/privacy">Privacy</Link>
              <Link className="hover:text-[var(--green)]" href="/terms">Terms</Link>
            </div>
          </div>
        </div>
        <div className="border-t border-[#eef1ee] py-4">
          <div className="container flex flex-col justify-between gap-2 text-xs text-[#88928b] sm:flex-row">
            <span>© {new Date().getFullYear()} Eva-Tech-Studio. All rights reserved.</span>
            <span>Find Local. Connect Direct.</span>
          </div>
        </div>
      </footer>
    </>
  );
}
