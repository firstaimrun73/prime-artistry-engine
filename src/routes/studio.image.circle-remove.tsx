/**
 * Circle 2edit — EMERGENCY STUB
 * Full implementation was corrupted during watermark edit.
 * Restore from commit 89dbce4dc51fa3484fca36c788b0320480da4eec
 *
 * This stub prevents a total white-screen while the full route is restored.
 */
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/studio/image/circle-remove")({
  ssr: false,
  component: Circle2editEmergency,
  head: () => ({
    meta: [
      { title: "Circle 2edit — Restoring — Motio2edit" },
      { name: "description", content: "Circle 2edit is being restored." },
    ],
  }),
});

function Circle2editEmergency() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <h1 className="text-xl font-bold text-[#7B6FE0]">Circle 2edit</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        The editor route is being restored after a deploy glitch. Please refresh in a moment or open
        Homepage samples.
      </p>
      <Link to="/" className="rounded-xl bg-[#7B6FE0] px-4 py-2.5 text-sm font-semibold text-white">
        Back to Home
      </Link>
    </div>
  );
}
