import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Search } from "lucide-react";
import { InfoPage } from "@/components/info-page";
import { categories } from "@/lib/categories";

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = categories.find((item) => item.slug === slug);

  return category
    ? { title: category.name, description: category.description, robots: { index: false, follow: true } }
    : { title: "Category not found" };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const category = categories.find((item) => item.slug === slug);

  if (!category) {
    notFound();
  }

  return (
    <InfoPage eyebrow="Browse a category" title={category.name}>
      <p>{category.description}</p>
      <p>Search the directory for {category.name.toLowerCase()} services in your city or neighbourhood.</p>
      <Link className="inline-flex items-center gap-2 rounded-xl bg-[var(--green)] px-5 py-3 text-sm font-bold text-white hover:bg-[var(--green-dark)]" href={`/search?category=${category.slug}`}>
        <Search aria-hidden="true" size={16} /> Search this category <ArrowRight aria-hidden="true" size={16} />
      </Link>
    </InfoPage>
  );
}
