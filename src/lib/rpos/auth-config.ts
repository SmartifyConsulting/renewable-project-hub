export type AuthConfigStatus = { ok: true } | { ok: false; missing: string[] };

/** Checks that the backend connection settings needed for real sign-in are present. */
export function checkAuthConfig(env: Record<string, string | undefined>): AuthConfigStatus {
  const missing = ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"].filter((k) => !env[k]?.trim());
  return missing.length ? { ok: false, missing } : { ok: true };
}

/** Maps backend auth errors to safe user-facing messages. */
export function mapAuthError(err: unknown): string {
  const msg = (err as { message?: string })?.message?.toLowerCase() ?? "";
  if (msg.includes("invalid login") || msg.includes("invalid credentials") || msg.includes("user not found"))
    return "Email or password is incorrect.";
  if (msg.includes("email not confirmed")) return "Please confirm your email address before signing in.";
  if (msg.includes("rate limit") || msg.includes("too many")) return "Too many attempts. Please wait a minute and try again.";
  if (msg.includes("pwned") || msg.includes("leaked")) return "This password appeared in a known data breach. Choose a different one.";
  if (msg.includes("should be different")) return "Choose a password different from your current one.";
  if (msg.includes("password should be at least") || msg.includes("weak")) return "Password must be at least 8 characters.";
  console.error("[auth]", err);
  return "Something went wrong. Please try again.";
}

export type MembershipState = "has-access" | "no-membership";
export function membershipState(orgCount: number, projectCount: number): MembershipState {
  return orgCount + projectCount > 0 ? "has-access" : "no-membership";
}

export const WRITER_ROLES = ["admin", "director", "manager"] as const;
/** Mirrors private.rpos_can_write_org: only these org roles may create/edit portfolios and projects. */
export function canWriteOrg(role: string | null | undefined): boolean {
  return !!role && (WRITER_ROLES as readonly string[]).includes(role);
}

/** Maps database RPC errors to messages safe to show in forms. */
export function mapRpcError(err: unknown): string {
  const e = err as { code?: string; message?: string };
  if (e?.code === "22023" || e?.code === "42501") return e.message ?? "Not allowed.";
  if (e?.code === "PGRST202") return "This action is not available yet. Please refresh.";
  console.error("[rpc]", err);
  return "Could not save. Please try again.";
}

export const MEMBER_ROLES = ["admin", "director", "manager", "member", "viewer"] as const;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Accepts only a well-formed account ID (UUID); trims whitespace. Returns null if invalid. */
export function parseUserId(v: string): string | null {
  const t = v.trim().toLowerCase();
  return UUID_RE.test(t) ? t : null;
}
