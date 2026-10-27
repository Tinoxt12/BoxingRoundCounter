import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <section aria-labelledby="not-found-heading" className="max-w-2xl">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent-soft">
        404
      </p>
      <h1
        id="not-found-heading"
        className="mt-3 text-3xl font-bold tracking-tight"
      >
        Page not found
      </h1>
      <p className="mt-4 text-muted">That page does not exist in Scorecard.</p>
      <Link
        to="/"
        className="mt-8 inline-flex rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Go to fights
      </Link>
    </section>
  );
}
