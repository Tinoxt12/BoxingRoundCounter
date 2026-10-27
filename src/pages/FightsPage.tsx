export default function FightsPage() {
  return (
    <section aria-labelledby="fights-heading" className="max-w-2xl">
      <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-accent-soft">
        Boxing scorecards
      </p>
      <h1
        id="fights-heading"
        className="text-3xl font-bold tracking-tight sm:text-4xl"
      >
        Fights
      </h1>
      <p className="mt-4 max-w-xl text-base leading-7 text-muted">
        Choose a fight, score each round with the 10-point must system, then
        compare your card with the official judges.
      </p>
      <div className="mt-8 rounded-xl border border-line bg-panel p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-white">
          Fight library coming soon
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          The project scaffold is ready. Verified fight data will be added in a
          later phase.
        </p>
      </div>
    </section>
  );
}
