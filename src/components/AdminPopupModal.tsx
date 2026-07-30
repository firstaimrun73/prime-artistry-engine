import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getAdminPopup } from "@/lib/popup.functions";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { Button } from "@/components/ui/button";
import { X, Megaphone } from "lucide-react";

const DISMISS_KEY = "motio2edit-popup-dismissed-until";
const ONE_HOUR = 60 * 60 * 1000;

/** Admin-controlled announcement popup. Rendered once inside the app shell. */
export function AdminPopupModal() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const fetchPopup = useServerFn(getAdminPopup);
  const [open, setOpen] = useState(false);

  const admin = isAdminEmail(profile?.email);

  const { data } = useQuery({
    queryKey: ["admin-popup"],
    queryFn: () => fetchPopup(),
    enabled: !!profile && !admin,
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (!data?.enabled || !profile || admin) return;
    const plan = profile.plan ?? "free";
    const credits = profile.credits ?? 0;
    const matches =
      data.target === "all" ||
      (data.target === "free" && plan === "free") ||
      (data.target === "paid" && plan !== "free") ||
      (data.target === "low_credits" && credits < 25);
    if (!matches) return;

    try {
      const until = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
      if (Date.now() < until) return;
    } catch {
      /* ignore */
    }
    setOpen(true);
  }, [data, profile, admin]);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now() + ONE_HOUR));
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  if (!open || !data) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <button
          onClick={dismiss}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
        <Megaphone className="h-7 w-7 text-primary" />
        <h2 className="mt-3 text-lg font-bold">{data.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{data.message}</p>
        <div className="mt-5 flex gap-2">
          <Button
            className="flex-1"
            onClick={() => {
              dismiss();
              navigate({ to: "/pricing" });
            }}
          >
            {data.buttonText}
          </Button>
          <Button variant="outline" onClick={dismiss}>
            Later
          </Button>
        </div>
      </div>
    </div>
  );
}
