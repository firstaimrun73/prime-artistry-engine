// Server-side admin authorization helper.
//
// Single source of truth for "is this caller the administrator?". Every admin
// server function must call assertAdmin() before touching privileged data.
// Every attempt (allowed or denied) is written to public.admin_access_log.
//
// SOLE ADMINISTRATOR: firstaimrun89@gmail.com only.
// No ADMIN_EMAILS lists, no legacy second admins, no client flags.

type Claims = { sub?: string; email?: string } & Record<string, unknown>;

/** The only account that may receive admin privileges. */
export const SOLE_ADMIN_EMAIL = "firstaimrun89@gmail.com";

export function adminEmail(): string {
  return SOLE_ADMIN_EMAIL;
}

/** @deprecated Prefer isAdminClaims / assertAdmin. Kept as single-element for any residual callers. */
export function adminEmails(): string[] {
  return [SOLE_ADMIN_EMAIL];
}

export function isAdminClaims(claims: Claims | null | undefined): boolean {
  const caller = String(claims?.email ?? "").trim().toLowerCase();
  if (!caller) return false;
  return caller === SOLE_ADMIN_EMAIL;
}

async function logAttempt(claims: Claims | null | undefined, path: string, allowed: boolean) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await (supabaseAdmin as any).from("admin_access_log").insert({
      user_id: (claims?.sub as string) ?? null,
      email: (claims?.email as string) ?? null,
      path,
      allowed,
    });
  } catch (err) {
    console.error("[admin-guard] could not record access attempt:", err);
  }
}

/**
 * Throws when the caller is not the sole administrator.
 * Always records the attempt for auditing.
 */
export async function assertAdmin(claims: Claims | null | undefined, path: string): Promise<void> {
  const allowed = isAdminClaims(claims);
  if (!allowed) {
    console.warn(`[admin-guard] UNAUTHORIZED admin access attempt → ${path} by ${claims?.email ?? "unknown"}`);
  }
  await logAttempt(claims, path, allowed);
  if (!allowed) throw new Error("Forbidden: administrator access only.");
}
