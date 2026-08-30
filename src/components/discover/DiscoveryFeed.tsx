import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, X } from "lucide-react";
import { toast } from "sonner";
import {
  DISCOVER_CATALOG,
  DISCOVER_SECTIONS,
  getDiscoverByCategory,
  getFeaturedDiscover,
  searchDiscover,
} from "@/lib/discover/catalog";
import type { DiscoverItem } from "@/lib/discover/types";
import { DiscoveryCard } from "@/components/discover/DiscoveryCard";
import {
  DiscoveryDetailSheet,
  applyDiscoverPreset,
} from "@/components/discover/DiscoveryDetailSheet";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
  isSignedIn: boolean;
  compact?: boolean;
  /** When true, show search field even in compact (post-login icon-first) mode */
  forceSearchOpen?: boolean;
};

function SectionRail({
  title,
  emoji,
  description,
  items,
  onSelect,
}: {
  title: string;
  emoji?: string;
  description?: string;
  items: DiscoverItem[];
  onSelect: (item: DiscoverItem) => void;
}) {
  if (items.length === 0) return null;
  return (
    <section className="mt-8 first:mt-4">
      <div className="mb-3 flex items-end justify-between gap-3 px-0.5">
        <div>
          <h2 className="text-base font-bold tracking-tight sm:text-lg">
            {emoji ? <span className="mr-1.5">{emoji}</span> : null}
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        <span className="text-[10px] font-medium text-muted-foreground">{items.length}</span>
      </div>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-none sm:mx-0 sm:px-0">
        {items.map((item) => (
          <DiscoveryCard key={item.id} item={item} onSelect={onSelect} />
        ))}
      </div>
    </section>
  );
}

export function DiscoveryFeed({ isSignedIn, compact, forceSearchOpen }: Props) {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<DiscoverItem | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [query, setQuery] = useState("");

  /** Post-login: icon-first — only show search field when forceSearchOpen or not compact */
  const showSearch = !compact || !!forceSearchOpen || query.trim().length > 0;

  const featured = useMemo(() => getFeaturedDiscover(), []);

  const sections = useMemo(() => {
    return DISCOVER_SECTIONS.filter((s) => s.id !== "featured").map((s) => ({
      ...s,
      items: getDiscoverByCategory(s.id as DiscoverItem["category"]),
    }));
  }, []);

  const searchResults = useMemo(() => {
    if (!query.trim()) return null;
    return searchDiscover(query);
  }, [query]);

  const openItem = (item: DiscoverItem) => {
    setSelected(item);
    setSheetOpen(true);
  };

  const handleUse = (item: DiscoverItem) => {
    if (!item.available) {
      toast.message("This experience is not available yet");
      return;
    }
    const path = applyDiscoverPreset(item);
    setSheetOpen(false);
    toast.success("Recipe loaded", {
      description: item.title,
      duration: 2000,
    });
    window.setTimeout(() => {
      void navigate({ to: path as never });
    }, 200);
  };

  return (
    <div className={cn(!compact && "pb-4")}>
      {!compact && (
        <div className="mb-2">
          <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">
            Create something
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse ideas, open the recipe, then Use this to jump into the right studio.
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground/80">
            Staff picks & curated ideas — not live trend rankings.
          </p>
        </div>
      )}

      {showSearch && (
        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search ideas — portrait, product, cinematic…"
            className="h-11 rounded-xl border-border bg-card pl-9 pr-9"
            aria-label="Search creative ideas"
            autoFocus={!!forceSearchOpen}
          />
          {query && (
            <button
              type="button"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
              onClick={() => setQuery("")}
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {!searchResults && (
        <div className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1 scrollbar-none">
          {DISCOVER_SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#discover-${s.id}`}
              className="shrink-0 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              {s.emoji} {s.label}
            </a>
          ))}
        </div>
      )}

      {searchResults ? (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-bold">
            {searchResults.length} result{searchResults.length === 1 ? "" : "s"} for “{query.trim()}”
          </h2>
          {searchResults.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
              No ideas match that search. Try “portrait”, “product”, or “video”.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {searchResults.map((item) => (
                <DiscoveryCard
                  key={item.id}
                  item={item}
                  onSelect={openItem}
                  className="w-full"
                />
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          <div id="discover-featured">
            <SectionRail
              title="Staff picks"
              emoji="⭐"
              description="Curated recipes to try first"
              items={featured}
              onSelect={openItem}
            />
          </div>
          {sections.map((s) => (
            <div key={s.id} id={`discover-${s.id}`}>
              <SectionRail
                title={s.label}
                emoji={s.emoji}
                description={s.description}
                items={s.items}
                onSelect={openItem}
              />
            </div>
          ))}
          {DISCOVER_CATALOG.filter((i) => !i.available).length > 0 && (
            <p className="mt-8 text-center text-[11px] text-muted-foreground">
              Filters and Lenses will appear here when those studios ship.
            </p>
          )}
        </>
      )}

      <DiscoveryDetailSheet
        item={selected}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        isSignedIn={isSignedIn}
        onUse={handleUse}
      />
    </div>
  );
}
