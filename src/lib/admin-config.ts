// Client-safe admin identity used only to toggle nav visibility and to
// short-circuit admin pages in the browser. Real authorization is always
// enforced server-side against the ADMIN_EMAIL secret (see admin-guard.server.ts),
// so this value is non-sensitive.
export const ADMIN_EMAIL =
  (import.meta.env.VITE_ADMIN_EMAIL as string | undefined)?.trim() || "firstaimrun89@gmail.com";

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}
