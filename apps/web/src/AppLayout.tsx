import { useEffect } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { applyTheme, getSavedTheme } from "./lib/theme";

const navItems = [
  { to: "/", label: "Home", end: true },
  { to: "/game", label: "Game", end: false },
  { to: "/settings", label: "Settings", end: false },
  { to: "/about", label: "About", end: false },
] as const;

export function AppLayout() {
  useEffect(() => {
    applyTheme(getSavedTheme());
  }, []);

  return (
    <div className="app-shell">
      <header className="glass-panel mb-6 flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-trivia-gold">
            Trivia Night
          </p>
          <h1 className="font-display text-3xl leading-none text-trivia-paper sm:text-4xl">
            TV Trivia
          </h1>
        </div>
        <nav className="flex flex-wrap gap-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [
                  "rounded-lg px-4 py-2 text-sm font-semibold transition",
                  isActive
                    ? "bg-trivia-blue text-white"
                    : "bg-white/5 text-white hover:bg-white/15",
                ].join(" ")
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="glass-panel px-5 py-6 sm:px-8 sm:py-7">
        <Outlet />
      </main>
    </div>
  );
}
