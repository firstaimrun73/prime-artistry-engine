/**
 * Circle 2edit — /studio/image/circle-remove
 * TEMPORARY recovery shell — full editor body being restored
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/studio/image/circle-remove")({
  head: () => ({
    meta: [
      { title: "Circle 2edit — MOTIO2EDIT" },
      { name: "description", content: "Circle 2edit — roughly mark to remove or add objects." },
    ],
  }),
  component: CircleRemovePage,
});

function CircleRemovePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#12141A] px-4 text-[#F2F2F5]">
        <p className="text-sm text-[#9AA0B0]">Sign in to use Circle 2edit.</p>
        <Button asChild className="mt-4 bg-[#A89BFF] text-[#12141A] hover:bg-[#9688EE]">
          <Link to="/auth">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[#12141A] text-[#F2F2F5]">
      <header className="flex shrink-0 items-center gap-2.5 border-b border-[#2A2E3A] bg-[#181A22] px-3 py-2.5">
        <button
          type="button"
          onClick={() => navigate({ to: "/studio" })}
          aria-label="Back to Studio"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] border border-[#2E3140] text-[#9AA0B0] transition-colors hover:border-[#A89BFF] hover:text-[#F2F2F5]"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-[15px] font-medium tracking-[-0.02em] text-[#F2F2F5]">
          <span className="font-semibold text-[#A89BFF]">Circle</span>
          <span className="font-medium text-[#E8E9ED]"> 2edit</span>
        </h1>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
        <p className="text-center text-sm text-[#9AA0B0]">
          Circle 2edit is being restored. Please refresh in a moment.
        </p>
        <Button
          className="bg-[#A89BFF] text-[#12141A] hover:bg-[#9688EE]"
          onClick={() => navigate({ to: "/studio" })}
        >
          Back to Studio
        </Button>
      </main>
    </div>
  );
}
