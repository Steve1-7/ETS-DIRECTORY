export default function DashboardLoading() {
  return (
    <main aria-busy="true" aria-label="Loading dashboard" className="container min-h-screen py-10">
      <div className="h-9 w-64 animate-pulse rounded-lg bg-[#e9eee9]" />
      <div className="mt-5 grid gap-3 sm:grid-cols-3">{[1, 2, 3].map((item) => <div className="h-24 animate-pulse rounded-xl border border-[var(--line)] bg-white" key={item} />)}</div>
      <div className="mt-8 h-64 animate-pulse rounded-2xl border border-[var(--line)] bg-white" />
    </main>
  );
}
