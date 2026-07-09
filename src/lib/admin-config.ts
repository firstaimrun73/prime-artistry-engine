// Client-safe admin identity used only to toggle nav visibility.
// Real authorization is always enforced server-side in admin-stats.functions.ts
// against the ADMIN_EMAIL secret — this value is non-sensitive.
export const ADMIN_EMAIL = "firstaimrun89@gmail.com";

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}
