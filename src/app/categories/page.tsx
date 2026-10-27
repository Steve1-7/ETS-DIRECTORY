import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { categories } from "@/lib/categories";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Business categories",
  description: "Explore South African businesses by category.",
  robots: { index: false, follow: true },
};

export default function CategoriesPage() {
  return (
    <main className="min-h-screen bg-[var(--canvas)]">
      <SiteHeader />
      <section className="container py-14 md:py-20">
        <p className="eyebrow mb-3">Browse the directory</p>
        <h1 className="section-title">Explore by category</h1>
        <p className="section-copy max-w-xl">Choose a category to find local services and businesses in your area.</p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map(({ name, slug, Icon, description }) => (
            <Link className="category-card rounded-2xl p-5" href={`/categories/${slug}`} key={slug}>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#edf6ef] text-[var(--green)]"><Icon aria-hidden="true" size={21} /></span>
              <h2 className="mt-4 font-extrabold">{name}</h2>
              <p className="mt-2 text-sm leading-6 text-[#758078]">{description}</p>
              <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[var(--green)]">Explore category <ArrowRight aria-hidden="true" size={15} /></span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
