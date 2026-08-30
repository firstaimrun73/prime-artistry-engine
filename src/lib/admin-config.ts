// Client-safe admin identity used only to toggle nav visibility and to
// short-circuit admin pages in the browser. Real authorization is always
// enforced server-side (see admin-guard.server.ts).
//
// SOLE ADMINISTRATOR: firstaimrun89@gmail.com only.

export const ADMIN_EMAIL = "firstaimrun89@gmail.com";

/** Single-element list for any residual multi-check UI code. */
export const ADMIN_EMAILS: string[] = [ADMIN_EMAIL];

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === ADMIN_EMAIL;
}
