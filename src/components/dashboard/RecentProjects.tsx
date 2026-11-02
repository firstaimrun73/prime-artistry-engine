import { Link } from "@tanstack/react-router";
import {
  History,
  FolderOpen,
  Image as ImageIcon,
  Video,
  Music,
  Lock,
  ArrowRight,
} from "lucide-react";

export type DashboardGeneration = {
  id: string;
  type: string;
  prompt: string | null;
  output_url: string | null;
  status: string;
  created_at: string;
};

type Props = {
  gens: DashboardGeneration[];
  loading: boolean;
  historyUnlocked: boolean;
};

export function RecentProjects({ gens, loading, historyUnlocked }: Props) {
  return (
    <section>
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <History className="h-5 w-5 text-primary" />
          Recent projects
        </h2>
        <Link
          to="/history"
          className="text-sm font-medium text-primary hover:underline"
        >
          View all →
        </Link>
      </div>

      {loading ? (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square animate-pulse rounded-xl border border-border bg-muted/60"
            />
          ))}
        </div>
      ) : gens.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-border bg-card/50 px-6 py-12 text-center">
          <FolderOpen
            className="mx-auto h-11 w-11 text-muted-foreground/70"
            strokeWidth={1.5}
          />
          <p className="mt-4 text-sm font-semibold text-foreground">
            Your creative journey starts here
          </p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
            Create your first masterpiece — it will show up here.
          </p>
          <Link
            to="/editor"
            className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Open Image Editor
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {gens.map((g) => {
            const media = g.output_url ? (
              g.type === "video" ? (
                <div className="relative aspect-square w-full bg-secondary">
                  <video
                    src={g.output_url}
                    className="h-full w-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                  />
                  <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-background/85 px-2 py-0.5 text-[10px] font-semibold backdrop-blur">
                    <Video className="h-3 w-3" /> Video
                  </span>
                </div>
              ) : g.type === "music" ? (
                <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 bg-secondary">
                  <Music className="h-6 w-6 text-primary" />
                  <span className="text-xs text-muted-foreground">Music</span>
                </div>
              ) : (
                <img
                  src={g.output_url}
                  alt={g.prompt ?? "Generated"}
                  loading="lazy"
                  className="aspect-square w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.opacity = "0.35";
                  }}
                />
              )
            ) : (
              <div className="flex aspect-square w-full items-center justify-center bg-secondary">
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              </div>
            );

            const footer = (
              <div className="p-3">
                <p className="truncate text-xs font-medium">
                  {g.prompt ?? "Untitled"}
                </p>
                <p className="mt-1 text-[11px] capitalize text-muted-foreground">
                  {g.type} · {new Date(g.created_at).toLocaleDateString()}
                </p>
              </div>
            );

            const lock = !historyUnlocked ? (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5 bg-background/55 backdrop-blur-[2px]">
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card/90 shadow-sm">
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <span className="rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  Upgrade to unlock
                </span>
              </div>
            ) : null;

            if (historyUnlocked) {
              return (
                <Link
                  key={g.id}
                  to="/history"
                  className="relative overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/40"
                >
                  {media}
                  {footer}
                </Link>
              );
            }

            return (
              <div
                key={g.id}
                className="relative overflow-hidden rounded-xl border border-border bg-card opacity-90"
              >
                {media}
                {lock}
                {footer}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
