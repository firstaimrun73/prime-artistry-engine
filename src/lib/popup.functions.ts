/** Popup ads removed. Stubs kept so admin imports compile. */
export type PopupTarget = "all" | "free" | "paid";
export type AdminPopup = {
  id?: string;
  title: string;
  message: string;
  target: PopupTarget;
  active: boolean;
};
export async function getAdminPopup(): Promise<AdminPopup | null> {
  return null;
}
export async function saveAdminPopup(_data: unknown): Promise<{ ok: boolean }> {
  return { ok: false };
}
