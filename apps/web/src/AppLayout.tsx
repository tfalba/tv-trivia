import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { applyTheme, getSavedTheme } from "./lib/theme";
import {
  completeAuthFromUrl,
  fetchCurrentUser,
  getStoredAuthUser,
  isSupabaseConfigured,
  signOutSupabase,
  startGoogleSignIn,
} from "./lib/supabaseAuth";

const navItems = [
  { to: "/", label: "Home", end: true },
  { to: "/game", label: "Game", end: false },
  { to: "/settings", label: "Settings", end: false },
] as const;

export function AppLayout() {
  const [authUserEmail, setAuthUserEmail] = useState<string | null>(
    getStoredAuthUser()?.email ?? null,
  );
  const [authMessage, setAuthMessage] = useState<string>("");
  const [authBusy, setAuthBusy] = useState(false);

  useEffect(() => {
    applyTheme(getSavedTheme());
  }, []);

  useEffect(() => {
    void initializeAuth();
  }, []);

  async function initializeAuth() {
    if (!isSupabaseConfigured()) {
      return;
    }

    try {
      const completed = await completeAuthFromUrl();
      if (completed) {
        setAuthMessage("Signed in with Google.");
      }
    } catch (error) {
      console.error(error);
      setAuthMessage("Sign-in callback failed. Try signing in again.");
    }

    const user = await fetchCurrentUser();
    setAuthUserEmail(user?.email ?? null);
  }

  async function handleSignIn() {
    setAuthBusy(true);
    setAuthMessage("");
    try {
      await startGoogleSignIn();
    } catch (error) {
      console.error(error);
      setAuthMessage("Could not start Google sign-in.");
      setAuthBusy(false);
    }
  }

  async function handleSignOut() {
    setAuthBusy(true);
    setAuthMessage("");
    await signOutSupabase();
    setAuthUserEmail(null);
    setAuthBusy(false);
    setAuthMessage("Signed out.");
  }

  return (
    <div className="app-shell">
      <header className="glass-panel mb-6 flex flex-col gap-4 px-5 py-5 sm:px-6">
        <div className="flex justify-between items-center flex-wrap">
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
        {/* </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"> */}
          <div className="flex flex-wrap items-center gap-2">
            {!isSupabaseConfigured() ? (
              <span className="rounded-md border border-white/20 bg-black/20 px-3 py-2 text-xs text-white/75">
                Set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
              </span>
            ) : authUserEmail ? (
              <>
                {/* <span className="rounded-md border border-white/20 bg-black/20 px-3 py-2 text-xs text-white/85">
                  {authUserEmail}
                </span> */}
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  disabled={authBusy}
                  className="rounded-lg border border-white/35 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20 disabled:opacity-60"
                >
                  Sign out
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => void handleSignIn()}
                disabled={authBusy}
                className="rounded-lg border border-white/35 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20 disabled:opacity-60"
              >
                Sign in with Google
              </button>
            )}
          </div>
        </div>
        {authMessage ? (
          <p className="text-sm text-white/80">{authMessage}</p>
        ) : null}
      </header>
      <main className="glass-panel px-5 py-6 sm:px-8 sm:py-7">
        <Outlet />
      </main>
    </div>
  );
}
