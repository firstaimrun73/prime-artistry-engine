/**
 * Public aggregate: successful Maluto AI (auto-edit) jobs completed "today".
 * Uses service-role count only — never exposes user rows, URLs, or PII.
 * Timezone: Asia/Kolkata (IST) to match product ops.
 */
import { createServerFn } from "@tanstack/react-start";

function istDayBounds(): { startIso: string; endIso: string; label: string } {
  // IST = UTC+5:30
  const now = new Date();
  const istMs = now.getTime() + 5.5 * 60 * 60 * 1000;
  const ist = new Date(istMs);
  const y = ist.getUTCFullYear();
  const m = ist.getUTCMonth();
  const d = ist.getUTCDate();
  // Midnight IST as UTC
  const startUtc = Date.UTC(y, m, d, 0, 0, 0) - 5.5 * 60 * 60 * 1000;
  const endUtc = startUtc + 24 * 60 * 60 * 1000;
  return {
    startIso: new Date(startUtc).toISOString(),
    endIso: new Date(endUtc).toISOString(),
    label: `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")} IST`,
  };
}

export type DailyRestorationsStats = {
  ok: boolean;
  count: number;
  dayLabel: string;
  source: "generations" | "unavailable";
};

export const getDailyRestorationsCount = createServerFn({ method: "GET" }).handler(
  async (): Promise<DailyRestorationsStats> => {
    const bounds = istDayBounds();
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      // Count successful auto-edit rows created today (IST).
      // Filter by metadata experience when present; also accept source standalone_auto.
      const { count, error } = await supabaseAdmin
        .from("generations")
        .select("id", { count: "exact", head: true })
        .eq("status", "success")
        .eq("type", "image")
        .gte("created_at", bounds.startIso)
        .lt("created_at", bounds.endIso)
        .or(
          "metadata->>experience.eq.auto-edit,metadata->>source.eq.standalone_auto,metadata->>operation.eq.auto_edit",
        );

      if (error) {
        // Fallback: broader success image count for the day if metadata filter unsupported
        const fallback = await supabaseAdmin
          .from("generations")
          .select("id", { count: "exact", head: true })
          .eq("status", "success")
          .eq("type", "image")
          .gte("created_at", bounds.startIso)
          .lt("created_at", bounds.endIso);

        if (fallback.error) {
          console.warn("[daily-restorations]", error.message, fallback.error.message);
          return {
            ok: false,
            count: 0,
            dayLabel: bounds.label,
            source: "unavailable",
          };
        }
        return {
          ok: true,
          count: fallback.count ?? 0,
          dayLabel: bounds.label,
          source: "generations",
        };
      }

      return {
        ok: true,
        count: count ?? 0,
        dayLabel: bounds.label,
        source: "generations",
      };
    } catch (e) {
      console.warn("[daily-restorations] exception", e);
      return {
        ok: false,
        count: 0,
        dayLabel: bounds.label,
        source: "unavailable",
      };
    }
  },
);
