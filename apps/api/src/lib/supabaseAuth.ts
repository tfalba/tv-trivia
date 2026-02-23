import type { Request, Response, NextFunction } from "express";

export type AuthenticatedUser = {
  id: string;
  email?: string;
};

type SupabaseUserResponse = {
  id: string;
  email?: string;
};

export type AuthenticatedRequest = Request & {
  authUser?: AuthenticatedUser;
};

function getBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) {
    return null;
  }
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }
  return token;
}

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL?.trim();
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim();
  return { url, anonKey };
}

export function isSupabaseAuthEnabled(): boolean {
  const { url, anonKey } = getSupabaseConfig();
  return Boolean(url && anonKey);
}

async function resolveUserFromToken(token: string): Promise<AuthenticatedUser | null> {
  const { url, anonKey } = getSupabaseConfig();
  if (!url || !anonKey) {
    return null;
  }

  const response = await fetch(`${url}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: anonKey,
    },
  });

  if (!response.ok) {
    return null;
  }

  const body = (await response.json()) as SupabaseUserResponse;
  if (!body?.id) {
    return null;
  }

  return {
    id: body.id,
    email: body.email,
  };
}

export async function optionalSupabaseAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const token = getBearerToken(req);
  if (!token || !isSupabaseAuthEnabled()) {
    next();
    return;
  }

  try {
    const user = await resolveUserFromToken(token);
    if (user) {
      req.authUser = user;
    }
  } catch {
    // Ignore and continue as anonymous when token validation fails.
  }
  next();
}

export async function requireSupabaseAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!isSupabaseAuthEnabled()) {
    // Backward-compatible migration mode: allow requests until auth is configured.
    next();
    return;
  }

  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ ok: false, error: "Missing Bearer token." });
    return;
  }

  try {
    const user = await resolveUserFromToken(token);
    if (!user) {
      res.status(401).json({ ok: false, error: "Invalid or expired token." });
      return;
    }
    req.authUser = user;
    next();
  } catch {
    res.status(401).json({ ok: false, error: "Unable to validate token." });
  }
}
