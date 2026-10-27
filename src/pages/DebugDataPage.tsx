import { getAllFights } from "../data";

export default function DebugDataPage() {
  const fights = getAllFights();

  return (
    <section aria-labelledby="debug-data-heading">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent-soft">
        Development data
      </p>
      <h1
        id="debug-data-heading"
        className="mt-3 text-3xl font-bold tracking-tight"
      >
        Loaded fights
      </h1>
      <p className="mt-3 text-muted">
        This temporary page lists the fixture records loaded from the local JSON
        files.
      </p>
      {fights.length === 0 ? (
        <p className="mt-8 rounded-xl border border-line bg-panel p-5 text-muted">
          No fight records are loaded.
        </p>
      ) : (
        <ul className="mt-8 grid gap-4">
          {fights.map((fight) => (
            <li
              key={fight.id}
              className="rounded-xl border border-line bg-panel p-5"
            >
              <h2 className="text-lg font-semibold text-white">
                {fight.boxers.a.name} vs {fight.boxers.b.name}
              </h2>
              <dl className="mt-3 grid gap-2 text-sm text-muted sm:grid-cols-2">
                <div>
                  <dt className="inline font-semibold text-slate-200">
                    Fight ID:{" "}
                  </dt>
                  <dd className="inline">{fight.id}</dd>
                </div>
                <div>
                  <dt className="inline font-semibold text-slate-200">
                    Date:{" "}
                  </dt>
                  <dd className="inline">{fight.date}</dd>
                </div>
                <div>
                  <dt className="inline font-semibold text-slate-200">
                    Division:{" "}
                  </dt>
                  <dd className="inline">{fight.weightClass}</dd>
                </div>
                <div>
                  <dt className="inline font-semibold text-slate-200">
                    Scheduled rounds:{" "}
                  </dt>
                  <dd className="inline">{fight.scheduledRounds}</dd>
                </div>
                <div>
                  <dt className="inline font-semibold text-slate-200">
                    Judges:{" "}
                  </dt>
                  <dd className="inline">{fight.judges.length}</dd>
                </div>
                <div>
                  <dt className="inline font-semibold text-slate-200">
                    Data status:{" "}
                  </dt>
                  <dd className="inline">
                    {fight.verified ? "Verified" : "Unverified fixture"}
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
