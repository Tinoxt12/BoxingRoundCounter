import { Link, useParams } from "react-router-dom";

export default function FightDetailPage() {
  const { id } = useParams();

  return (
    <section aria-labelledby="fight-heading" className="max-w-2xl">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent-soft">
        Fight details
      </p>
      <h1 id="fight-heading" className="mt-3 text-3xl font-bold tracking-tight">
        Fight placeholder
      </h1>
      <p className="mt-4 text-muted">Fight ID: {id}</p>
      <p className="mt-2 text-muted">
        Fight information will appear here in a later phase.
      </p>
      <Link
        to="/"
        className="mt-8 inline-flex rounded-md border border-line px-4 py-2 text-sm font-semibold text-white hover:bg-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Back to fights
      </Link>
    </section>
  );
}
