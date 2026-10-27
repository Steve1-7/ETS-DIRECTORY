export default function BusinessProfileLoading() {
  return (
    <main aria-busy="true" aria-label="Loading business profile" className="container min-h-screen py-10">
      <div className="h-4 w-28 animate-pulse rounded bg-[#edf1ed]" />
      <div className="mt-6 rounded-2xl border border-[var(--line)] bg-white p-7">
        <div className="h-10 max-w-sm animate-pulse rounded-lg bg-[#e9eee9]" />
        <div className="mt-4 h-4 max-w-xl animate-pulse rounded bg-[#edf1ed]" />
        <div className="mt-8 grid gap-8 md:grid-cols-[1fr_0.7fr]">
          <div className="h-64 animate-pulse rounded-xl bg-[#f2f5f2]" />
          <div className="h-48 animate-pulse rounded-xl bg-[#f2f5f2]" />
        </div>
      </div>
    </main>
  );
}
