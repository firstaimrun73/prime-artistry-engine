/**
 * Marketing & offers → profiles.marketing_unsubscribed (off = true).
 * Product / security stay localStorage. Security emails never gated.
 */
import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const NOTIF_KEY = "motio2edit-notifications";

type LocalNotifs = { product: boolean; security: boolean };

export function SettingsNotificationPrefs(props: {
  profileId: string;
  marketingUnsubscribed?: boolean;
  refreshProfile: () => Promise<void>;
}) {
  const [local, setLocal] = useState<LocalNotifs>({ product: true, security: true });
  const marketingOn = props.marketingUnsubscribed === false;

  useEffect(() => {
    try {
      const n = localStorage.getItem(NOTIF_KEY);
      if (n) {
        const parsed = JSON.parse(n) as Partial<LocalNotifs>;
        setLocal((p) => ({ ...p, ...parsed }));
      }
    } catch {
      /* ignore */
    }
  }, []);

  const setLocalKey = (key: keyof LocalNotifs, value: boolean) => {
    const next = { ...local, [key]: value };
    setLocal(next);
    try {
      localStorage.setItem(NOTIF_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const setMarketing = async (value: boolean) => {
    const { error } = await supabase
      .from("profiles")
      .update({ marketing_unsubscribed: !value })
      .eq("id", props.profileId);
    if (error) toast.error(error.message);
    else await props.refreshProfile();
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Product updates</p>
          <p className="text-xs text-muted-foreground">New features and improvements.</p>
        </div>
        <Switch checked={local.product} onCheckedChange={(v) => setLocalKey("product", v)} />
      </div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Marketing & offers</p>
          <p className="text-xs text-muted-foreground">Promotions and tips.</p>
        </div>
        <Switch checked={marketingOn} onCheckedChange={(v) => setMarketing(v)} />
      </div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Security alerts</p>
          <p className="text-xs text-muted-foreground">Important account and security notices.</p>
        </div>
        <Switch checked={local.security} onCheckedChange={(v) => setLocalKey("security", v)} />
      </div>
    </div>
  );
}
