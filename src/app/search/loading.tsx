export default function SearchLoading() {
  return (
    <main aria-busy="true" aria-label="Loading search results" className="container min-h-screen py-10">
      <div className="h-8 w-64 animate-pulse rounded-lg bg-[#e9eee9]" />
      <div className="mt-3 h-4 max-w-md animate-pulse rounded bg-[#edf1ed]" />
      <div className="mt-7 h-20 animate-pulse rounded-2xl border border-[var(--line)] bg-white" />
      <div className="mt-7 grid gap-3">{[1, 2, 3].map((item) => <div className="h-32 animate-pulse rounded-2xl border border-[var(--line)] bg-white" key={item} />)}</div>
    </main>
  );
}
