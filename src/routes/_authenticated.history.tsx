import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CREDIT_COST } from "@/lib/plans";
import { toast } from "sonner";
import {
  Download, Pencil, Trash2, ZoomIn, ZoomOut, Image as ImageIcon,
  Video, History as HistoryIcon, FolderOpen, Music,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/history")({
  component: HistoryPage,
});

type Generation = {
  id: string;
  type: string;
  prompt: string | null;
  output_url: string | null;
  status: string;
  created_at: string;
};

function HistoryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [gens, setGens] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Generation | null>(null);
  const [zoomed, setZoomed] = useState(false);

  const load = () => {
    if (!user) return;
    setLoading(true);
    supabase
      .from("generations")
      .select("id, type, prompt, output_url, status, created_at")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setGens(data as Generation[]);
        setLoading(false);
      });
  };

  useEffect(load, [user]);

  const open = (g: Generation) => {
    setActive(g);
    setZoomed(false);
  };

  const download = async (g: Generation) => {
    if (!g.output_url) return;
    try {
      const res = await fetch(g.output_url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `motio2edit-${g.id}.${g.type === "video" ? "mp4" : "png"}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      window.open(g.output_url, "_blank");
    }
  };

  const editAgain = (g: Generation) => {
    if (!g.output_url) return;
    sessionStorage.setItem(
      "motio2edit-reuse",
      JSON.stringify({ url: g.output_url, kind: g.type === "video" ? "video" : "image" }),
    );
    navigate({ to: "/editor" });
  };

  const remove = async (g: Generation) => {
    const { error } = await supabase.from("generations").delete().eq("id", g.id);
    if (error) {
      toast.error("Could not delete this item.");
      return;
    }
    setGens((prev) => prev.filter((x) => x.id !== g.id));
    if (active?.id === g.id) setActive(null);
    toast.success("Deleted.");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="flex items-center gap-2">
        <HistoryIcon className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Your workspace</h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Every creation lives here. Open any item to view full size, download, edit again or delete — no need to re-upload.
      </p>

      {loading ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading…</p>
      ) : gens.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-border p-10 text-center">
          <FolderOpen className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Nothing here yet. Create something in the editor.</p>
          <Button asChild className="mt-4" size="sm">
            <button onClick={() => navigate({ to: "/editor" })}>Open editor</button>
          </Button>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {gens.map((g) => (
            <button
              key={g.id}
              onClick={() => open(g)}
              className="group overflow-hidden rounded-xl border border-border bg-card text-left transition-colors hover:border-primary"
            >
              <div className="relative aspect-square w-full bg-secondary">
                {g.output_url ? (
                  g.type === "video" ? (
                    <video src={g.output_url} className="h-full w-full object-cover" muted />
                  ) : (
                    <img src={g.output_url} alt={g.prompt ?? "Generated"} loading="lazy" className="h-full w-full object-cover" />
                  )
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-semibold capitalize backdrop-blur">
                  {g.type === "video" ? <Video className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}
                  {g.type}
                </span>
              </div>
              <div className="p-3">
                <p className="truncate text-xs font-medium">{g.prompt ?? "Untitled"}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {new Date(g.created_at).toLocaleDateString()}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-4xl">
          {active && (
            <>
              <DialogTitle className="capitalize">{active.type} preview</DialogTitle>
              <DialogDescription className="line-clamp-2">
                {active.prompt ?? "No prompt"}
              </DialogDescription>
              <div className="mt-2 flex max-h-[60vh] items-center justify-center overflow-auto rounded-lg border border-border bg-secondary/40">
                {active.output_url ? (
                  active.type === "video" ? (
                    <video src={active.output_url} className="max-h-[60vh] w-full" controls autoPlay />
                  ) : (
                    <img
                      src={active.output_url}
                      alt={active.prompt ?? "Generated"}
                      onClick={() => setZoomed((z) => !z)}
                      className={`cursor-zoom-in transition-transform duration-200 ${
                        zoomed ? "scale-[2] cursor-zoom-out" : "max-h-[60vh] w-auto"
                      }`}
                    />
                  )
                ) : (
                  <p className="p-10 text-sm text-muted-foreground">No output available.</p>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {active.type === "image" && active.output_url && (
                  <Button variant="outline" size="sm" onClick={() => setZoomed((z) => !z)}>
                    {zoomed ? <ZoomOut className="mr-1.5 h-4 w-4" /> : <ZoomIn className="mr-1.5 h-4 w-4" />}
                    {zoomed ? "Zoom out" : "Zoom in"}
                  </Button>
                )}
                <Button size="sm" onClick={() => download(active)} disabled={!active.output_url}>
                  <Download className="mr-1.5 h-4 w-4" /> Download
                </Button>
                <Button variant="outline" size="sm" onClick={() => editAgain(active)} disabled={!active.output_url}>
                  <Pencil className="mr-1.5 h-4 w-4" /> Edit Again
                </Button>
                <Button variant="ghost" size="sm" onClick={() => remove(active)}>
                  <Trash2 className="mr-1.5 h-4 w-4" /> Delete
                </Button>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {new Date(active.created_at).toLocaleString()} · {CREDIT_COST[active.type as "image" | "video"]} credits
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
