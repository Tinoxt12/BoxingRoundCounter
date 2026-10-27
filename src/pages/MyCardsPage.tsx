export default function MyCardsPage() {
  return (
    <section aria-labelledby="cards-heading" className="max-w-2xl">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent-soft">
        Your scorecards
      </p>
      <h1 id="cards-heading" className="mt-3 text-3xl font-bold tracking-tight">
        My Cards
      </h1>
      <p className="mt-4 text-muted">
        Your saved cards will appear here once scoring and browser storage are
        added.
      </p>
    </section>
  );
}
