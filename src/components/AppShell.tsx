import { NavLink } from "react-router-dom";

type AppShellProps = {
  children: React.ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-canvas text-slate-100">
      <header className="border-b border-line bg-panel/80">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <NavLink
            to="/"
            className="w-fit rounded-sm text-lg font-bold tracking-wide text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            Scorecard
          </NavLink>
          <nav aria-label="Main navigation" className="flex gap-2">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                  isActive
                    ? "bg-accent text-white"
                    : "text-muted hover:bg-raised hover:text-white"
                }`
              }
            >
              Fights
            </NavLink>
            <NavLink
              to="/cards"
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                  isActive
                    ? "bg-accent text-white"
                    : "text-muted hover:bg-raised hover:text-white"
                }`
              }
            >
              My Cards
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        {children}
      </main>
      <footer className="mx-auto max-w-6xl px-4 pb-8 text-xs text-muted sm:px-6">
        Built for thoughtful round-by-round scoring.
      </footer>
    </div>
  );
}
