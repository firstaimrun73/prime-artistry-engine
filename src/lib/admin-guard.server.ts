// Server-side admin authorization helper.
//
// Single source of truth for "is this caller the administrator?". Every admin
// server function must call assertAdmin() before touching privileged data.
// Every attempt (allowed or denied) is written to public.admin_access_log.

type Claims = { sub?: string; email?: string } & Record<string, unknown>;

export function adminEmail(): string {
  return (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
}

/** All accepted admin emails (ADMIN_EMAIL + optional ADMIN_EMAILS comma list + known ops). */
export function adminEmails(): string[] {
  const primary = adminEmail();
  const extra = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const known = ["firstaimrun89@gmail.com", "firstaimrun73@gmail.com"];
  return Array.from(new Set([primary, ...extra, ...known].filter(Boolean)));
}

export function isAdminClaims(claims: Claims | null | undefined): boolean {
  const caller = String(claims?.email ?? "").trim().toLowerCase();
  if (!caller) return false;
  return adminEmails().includes(caller);
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
 * Throws when the caller is not the configured administrator.
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
