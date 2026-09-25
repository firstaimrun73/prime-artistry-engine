/**
 * Motio2edit Lenses - temporary build-safe stub.
 * Full camera UI restored in a follow-up; this unblocks Filters production deploy.
 */
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export function LensEditor({ initialLensId }: { initialLensId?: string }) {
  void initialLensId;
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-black text-white p-6">
      <Link to="/" className="absolute left-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/10" aria-label="Back">
        <ArrowLeft className="h-5 w-5" />
      </Link>
      <p className="text-center text-sm text-white/70">Lenses temporarily unavailable while camera UI restores.</p>
    </div>
  );
}

export default LensEditor;
