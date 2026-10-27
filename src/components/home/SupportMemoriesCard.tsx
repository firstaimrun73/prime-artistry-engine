import { Link } from "@tanstack/react-router";
import { Heart, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Honest, non-intrusive support message.
 * Placed on homepage below main creation experience — never a popup.
 */
export function SupportMemoriesCard() {
  return (
    <section
      className="mt-10 rounded-2xl border border-border/80 bg-card/80 p-5 shadow-sm backdrop-blur-sm sm:p-6"
      aria-labelledby="support-memories-heading"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
          <Heart className="h-5 w-5" fill="currentColor" />
        </span>
        <div className="min-w-0 flex-1">
          <h2
            id="support-memories-heading"
            className="text-base font-bold tracking-tight text-foreground sm:text-lg"
          >
            Help Us Keep Memories Alive ❤️
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Not everyone can afford expensive photo-editing tools. We built Motio2edit to help
            people restore old family photos, sharpen precious memories, and bring damaged
            pictures back to life.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Every AI restoration costs us money to run. Your support helps us keep this service
            available and improve it for everyone.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Can't donate? That's completely okay. You can still use the website, explore
            our tools, and share Motio2edit with someone who needs help restoring a photograph.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild className="rounded-full bg-orange-600 hover:bg-orange-700">
              <Link to="/support">
                <Heart className="mr-1.5 h-4 w-4" />
                Support Our Work
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/studio/image/auto-edit">
                <Sparkles className="mr-1.5 h-4 w-4" />
                Try Maluto AI
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
