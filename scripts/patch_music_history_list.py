from pathlib import Path

p = Path("src/components/MusicHistoryList.tsx")
t = p.read_text()
if "resolveHistoryMediaUrls" in t:
    print("already patched")
    raise SystemExit(0)
t = t.replace(
    'import { historyUserDelete, musicHistoryUserDelete } from "@/lib/history-retention";',
    'import { historyUserDelete, musicHistoryUserDelete } from "@/lib/history-retention";\nimport { useServerFn } from "@tanstack/react-start";\nimport { resolveHistoryMediaUrls } from "@/lib/private-media.functions";',
)
t = t.replace(
    "  const [playingId, setPlayingId] = useState<string | null>(null);\n  const audioRef = useRef<HTMLAudioElement | null>(null);",
    "  const [playingId, setPlayingId] = useState<string | null>(null);\n  const audioRef = useRef<HTMLAudioElement | null>(null);\n  const resolveHistoryMedia = useServerFn(resolveHistoryMediaUrls);",
)
old = """      if (!mhErr && mh && mh.length > 0) {
        setTracks(mh.map((t) => ({ ...t, source: "music_history" as const })));
        setLoading(false);
        return;
      }"""
new = """      if (!mhErr && mh && mh.length > 0) {
        let tracks = mh.map((t) => ({ ...t, source: "music_history" as const }));
        try {
          const { data: gens } = await supabase
            .from("generations")
            .select("id, output_url, r2_object_key, storage_provider")
            .eq("user_id", userId)
            .eq("type", "music")
            .eq("status", "success")
            .order("created_at", { ascending: false })
            .limit(50);
          const ids = (gens ?? []).map((g) => g.id).filter(Boolean);
          if (ids.length > 0) {
            const resolved = await resolveHistoryMedia({ data: { generationIds: ids } });
            const map = resolved?.urls ?? {};
            const byOut = new Map<string, string>();
            for (const g of gens ?? []) {
              const d = map[g.id];
              if (d && g.output_url) byOut.set(g.output_url as string, d);
              if (d) byOut.set(g.id, d);
            }
            tracks = tracks.map((tr) => {
              const d = byOut.get(tr.audio_url) || byOut.get(tr.id);
              return d && d.startsWith("https://") ? { ...tr, audio_url: d } : tr;
            });
          }
        } catch (e) {
          console.warn("[music-history] media resolve skipped:", e);
        }
        setTracks(tracks);
        setLoading(false);
        return;
      }"""
if old not in t:
    raise SystemExit("mh block missing")
t = t.replace(old, new, 1)
old_g = """      setTracks(
        (gens ?? [])
          .filter((g) => g.output_url && (g as { retained_as_history?: boolean | null }).retained_as_history !== false)
          .map((g) => {
            const meta = (g.metadata ?? {}) as Record<string, unknown>;
            return {
              id: g.id,
              track_title: g.title || "Music track",
              prompt: g.prompt,
              genre: typeof meta.brief_genre === "string" ? meta.brief_genre : null,
              mood: typeof meta.brief_emotion === "string" ? meta.brief_emotion : null,
              bpm: null,
              duration: typeof meta.duration_seconds === "number" ? meta.duration_seconds : null,
              audio_url: g.output_url as string,
              created_at: g.created_at,
              source: "generations" as const,
            };
          }),
      );
      setLoading(false);"""
new_g = """      let built = (gens ?? [])
        .filter((g) => g.output_url && (g as { retained_as_history?: boolean | null }).retained_as_history !== false)
        .map((g) => {
          const meta = (g.metadata ?? {}) as Record<string, unknown>;
          return {
            id: g.id,
            track_title: g.title || "Music track",
            prompt: g.prompt,
            genre: typeof meta.brief_genre === "string" ? meta.brief_genre : null,
            mood: typeof meta.brief_emotion === "string" ? meta.brief_emotion : null,
            bpm: null,
            duration: typeof meta.duration_seconds === "number" ? meta.duration_seconds : null,
            audio_url: g.output_url as string,
            created_at: g.created_at,
            source: "generations" as const,
          };
        });
      try {
        const ids = built.map((tr) => tr.id);
        if (ids.length > 0) {
          const resolved = await resolveHistoryMedia({ data: { generationIds: ids } });
          const map = resolved?.urls ?? {};
          built = built.map((tr) => {
            const d = map[tr.id];
            return d && d.startsWith("https://") ? { ...tr, audio_url: d } : tr;
          });
        }
      } catch (e) {
        console.warn("[music-history] generations resolve skipped:", e);
      }
      setTracks(built);
      setLoading(false);"""
if old_g not in t:
    raise SystemExit("gens block missing")
t = t.replace(old_g, new_g, 1)
p.write_text(t)
print("music history list patched", len(t))
