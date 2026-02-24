type SupabaseUser = {
  id: string;
  email?: string;
};

type SupabaseSession = {
  access_token: string;
  refresh_token?: string;
  user?: SupabaseUser;
};

const accessTokenStorageKey = "tv-trivia:supabase-access-token";
const refreshTokenStorageKey = "tv-trivia:supabase-refresh-token";
const userStorageKey = "tv-trivia:supabase-user";
const pkceVerifierKey = "tv-trivia:supabase-pkce-verifier";

function getSupabaseConfig() {
  const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();
  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseConfig();
  return Boolean(url && anonKey);
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function randomString(length = 64): string {
  const bytes = new Uint8Array(length);
  window.crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

async function sha256Base64Url(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return toBase64Url(new Uint8Array(digest));
}

function saveSession(session: SupabaseSession): void {
  window.localStorage.setItem(accessTokenStorageKey, session.access_token);
  if (session.refresh_token) {
    window.localStorage.setItem(refreshTokenStorageKey, session.refresh_token);
  }
  if (session.user) {
    window.localStorage.setItem(userStorageKey, JSON.stringify(session.user));
  }
}

function clearSession(): void {
  window.localStorage.removeItem(accessTokenStorageKey);
  window.localStorage.removeItem(refreshTokenStorageKey);
  window.localStorage.removeItem(userStorageKey);
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(accessTokenStorageKey);
}

export function getStoredAuthUser(): SupabaseUser | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(userStorageKey);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as SupabaseUser;
  } catch {
    return null;
  }
}

export async function startGoogleSignIn(): Promise<void> {
  const { url, anonKey } = getSupabaseConfig();
  if (!url || !anonKey) {
    throw new Error("Supabase auth is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }

  const codeVerifier = randomString(64);
  const codeChallenge = await sha256Base64Url(codeVerifier);
  window.sessionStorage.setItem(pkceVerifierKey, codeVerifier);

  // Always return to root so Supabase redirect URL config only needs one entry.
  const redirectTo = `${window.location.origin}/`;
  const authUrl = new URL(`${url}/auth/v1/authorize`);
  authUrl.searchParams.set("provider", "google");
  authUrl.searchParams.set("redirect_to", redirectTo);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("apikey", anonKey);

  window.location.assign(authUrl.toString());
}

export async function completeAuthFromUrl(): Promise<boolean> {
  const { url, anonKey } = getSupabaseConfig();
  if (!url || !anonKey) {
    return false;
  }

  const currentUrl = new URL(window.location.href);
  const code = currentUrl.searchParams.get("code");
  if (!code) {
    return false;
  }

  const codeVerifier = window.sessionStorage.getItem(pkceVerifierKey);
  if (!codeVerifier) {
    throw new Error("Missing PKCE verifier. Please sign in again.");
  }

  const response = await fetch(`${url}/auth/v1/token?grant_type=pkce`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
    },
    body: JSON.stringify({
      auth_code: code,
      code_verifier: codeVerifier,
    }),
  });

  const body = (await response.json()) as SupabaseSession & { error_description?: string };
  if (!response.ok || !body.access_token) {
    throw new Error(body.error_description ?? "Could not complete Supabase sign-in.");
  }

  saveSession(body);
  window.sessionStorage.removeItem(pkceVerifierKey);
  currentUrl.searchParams.delete("code");
  currentUrl.searchParams.delete("state");
  window.history.replaceState({}, "", currentUrl.toString());
  return true;
}

export async function fetchCurrentUser(): Promise<SupabaseUser | null> {
  const { url, anonKey } = getSupabaseConfig();
  const token = getAccessToken();
  if (!url || !anonKey || !token) {
    return null;
  }

  const response = await fetch(`${url}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: anonKey,
    },
  });
  if (!response.ok) {
    clearSession();
    return null;
  }
  const user = (await response.json()) as SupabaseUser;
  window.localStorage.setItem(userStorageKey, JSON.stringify(user));
  return user;
}

export async function signOutSupabase(): Promise<void> {
  const { url, anonKey } = getSupabaseConfig();
  const token = getAccessToken();
  if (url && anonKey && token) {
    await fetch(`${url}/auth/v1/logout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: anonKey,
      },
    }).catch(() => undefined);
  }
  clearSession();
}
