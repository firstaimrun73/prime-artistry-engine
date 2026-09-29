#!/usr/bin/env python3
"""Harden History page load: multi-fallback so Free/legacy never hard-fails."""
from pathlib import Path
import re
import sys

p = Path("src/routes/_authenticated.history.tsx")
if not p.exists():
    sys.exit("missing history route")
t = p.read_text()
if "all selects failed" in t:
    print("already hardened")
    sys.exit(0)

new_load = r'''  const load = async () => {
    if (!user) { setLoading(false); setGens([]); setLoadError(null); return; }
    setLoading(true); setLoadError(null);
    try {
      let rows: Generation[] = [];
      const full = await supabase
        .from("generations")
        .select("id, type, prompt, output_url, status, created_at, metadata, retained_as_history, deleted_at, storage_provider, r2_object_key")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (!full.error && full.data) {
        rows = ((full.data as Generation[]) ?? []).filter((g) => isVisibleInHistory(g));
      } else {
        if (full.error) console.warn("[history] full select:", full.error.message);
        const core = await supabase
          .from("generations")
          .select("id, type, prompt, output_url, status, created_at, metadata")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(100);
        if (!core.error && core.data) {
          rows = ((core.data as Generation[]) ?? []).filter((g) => isVisibleInHistory(g));
        } else {
          if (core.error) console.warn("[history] core select:", core.error.message);
          const min = await supabase
            .from("generations")
            .select("id, type, prompt, output_url, status, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(100);
          if (min.error) {
            console.error("[history] all selects failed:", min.error.message);
            setGens([]);
            setLoadError(min.error.message);
            toast.error("Could not load history.");
            setLoading(false);
            return;
          }
          rows = ((min.data as Generation[]) ?? []).filter((g) => isVisibleInHistory(g));
        }
      }
      try {
        const ids = rows.map((g) => g.id).filter(Boolean);
        if (ids.length > 0) {
          const resolved = await resolveHistoryMedia({ data: { generationIds: ids } });
          const map = resolved?.urls ?? {};
          rows = rows.map((g) => {
            const delivery = map[g.id];
            if (delivery && delivery.startsWith("https://")) {
              return { ...g, output_url: delivery };
            }
            return g;
          });
        }
      } catch (e) {
        console.warn("[history] media resolve skipped:", e);
      }
      setGens(rows);
      setLoadError(null);
    } catch (e) {
      console.error("[history] unexpected load error:", e);
      setGens([]);
      setLoadError(e instanceof Error ? e.message : "Unknown error");
      toast.error("Could not load history.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, [user]);
'''

t2, n = re.subn(
    r"  const load = \(\) => \{[\s\S]*?\n  \};\n  useEffect\(load, \[user\]\);",
    new_load,
    t,
    count=1,
)
if n != 1:
    sys.exit(f"replace failed n={n}")
p.write_text(t2)
print("history hardened")
