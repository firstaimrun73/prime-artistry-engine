// Client-safe admin identity used only to toggle nav visibility and to
// short-circuit admin pages in the browser. Real authorization is always
// enforced server-side against ADMIN_EMAIL / ADMIN_EMAILS secrets
// (see admin-guard.server.ts), so this value is non-sensitive.

const fromEnv = (import.meta.env.VITE_ADMIN_EMAIL as string | undefined)?.trim() || "";

/** Primary display email + known operators (comma-separated VITE_ADMIN_EMAIL supported). */
export const ADMIN_EMAIL =
  fromEnv.split(",")[0]?.trim() || "firstaimrun89@gmail.com";

const EXTRA = [
  "firstaimrun89@gmail.com",
  "firstaimrun73@gmail.com",
];

export const ADMIN_EMAILS: string[] = Array.from(
  new Set(
    [
      ...fromEnv.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean),
      ...EXTRA.map((s) => s.toLowerCase()),
      ADMIN_EMAIL.toLowerCase(),
    ].filter(Boolean),
  ),
);

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}
