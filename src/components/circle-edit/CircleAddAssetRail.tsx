/**
 * Compact horizontal asset rail for Circle Add.
 * Opens only when parent sets open=true after explicit user action.
 * Overlay bottom sheet — does NOT shrink the image canvas viewport.
 * First release: PDF-canonical 21 assets only.
 */
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import {
  ADD_ASSET_CATEGORIES,
  searchAddAssets,
  type CircleAddAsset,
} from "@/lib/circle-edit/add-assets";
import { AssetIcon } from "@/components/circle-edit/AssetIcon";

type Props = {
  isDark: boolean;
  open: boolean;
  onClose: () => void;
  addObjectId: string | null;
  onSelect: (id: string) => void;
  disabled?: boolean;
};

function AssetThumb({ asset, selected, isDark }: { asset: CircleAddAsset; selected: boolean; isDark: boolean }) {
  return (
    <span
      className={cn(
        "relative grid h-14 w-14 place-items-center rounded-[14px] border backdrop-blur-md transition-transform duration-200 motion-safe:hover:-translate-y-0.5",
        selected
          ? "border-[#7B6FE0] bg-[rgba(123,111,224,0.22)] shadow-[0_0_12px_rgba(123,111,224,0.35)]"
          : isDark
            ? "border-white/12 bg-white/8"
            : "border-black/8 bg-white/70",
      )}
      title={asset.name}
      aria-label={asset.name}
    >
      <AssetIcon asset={asset} size={30} isDark={isDark} selected={selected} />
      {selected ? (
        <span className="absolute -right-0.5 -top-0.5 grid h-4 w-4 place-items-center rounded-full bg-[#7B6FE0] text-[9px] font-bold text-white">
          ✓
        </span>
      ) : null}
    </span>
  );
}

export function CircleAddAssetRail({
  isDark,
  open,
  onClose,
  addObjectId,
  onSelect,
  disabled,
}: Props) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<string | null>(null);

  // Full PDF set is 21 — show all when unfiltered
  const assets = useMemo(() => searchAddAssets(query, cat), [query, cat]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close object picker"
        className="fixed inset-0 z-[45] bg-black/20"
        onClick={onClose}
      />
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-[50] max-h-[42vh] overflow-y-auto border-t px-3 py-2.5 shadow-[0_-8px_28px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:px-4",
          isDark ? "border-white/10 bg-[#181A22]/95" : "border-black/6 bg-white/95",
        )}
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        data-circle-add-rail="true"
        role="dialog"
        aria-label="Choose object to add"
      >
        <div className="mb-2 flex items-center gap-2">
          <p className={cn("text-[12px] font-semibold", isDark ? "text-[#F2F2F5]" : "text-[#1A1C24]")}>
            Choose object
          </p>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            disabled={disabled}
            className={cn(
              "min-w-0 flex-1 rounded-lg border px-2.5 py-1.5 text-[12px] outline-none focus:border-[#7B6FE0]",
              isDark
                ? "border-white/12 bg-white/8 text-[#F2F2F5] placeholder:text-[#6B7080]"
                : "border-black/10 bg-white/60 text-[#1A1C24] placeholder:text-[#8A90A0]",
            )}
          />
          <Link
            to="/studio/image/circle-add-discover"
            className="shrink-0 text-[11px] font-semibold text-[#7B6FE0]"
          >
            More
          </Link>
          <button
            type="button"
            onClick={onClose}
            className={cn("text-[11px] font-medium", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}
          >
            Close
          </button>
        </div>

        {ADD_ASSET_CATEGORIES.length > 1 ? (
          <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => setCat(null)}
              className={cn(
                "shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium",
                cat === null
                  ? "border-[#7B6FE0] bg-[rgba(123,111,224,0.18)] text-[#7B6FE0]"
                  : isDark
                    ? "border-white/10 text-[#9AA0B0]"
                    : "border-black/8 text-[#5C6170]",
              )}
            >
              All
            </button>
            {ADD_ASSET_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCat(c.id)}
                className={cn(
                  "shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium",
                  cat === c.id
                    ? "border-[#7B6FE0] bg-[rgba(123,111,224,0.18)] text-[#7B6FE0]"
                    : isDark
                      ? "border-white/10 text-[#9AA0B0]"
                      : "border-black/8 text-[#5C6170]",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        ) : null}

        <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {assets.map((asset) => {
            const selected = addObjectId === asset.id;
            return (
              <button
                key={asset.id}
                type="button"
                disabled={disabled}
                onClick={() => {
                  onSelect(asset.id);
                  onClose();
                }}
                className="flex w-[76px] shrink-0 flex-col items-center gap-1"
              >
                <AssetThumb asset={asset} selected={selected} isDark={isDark} />
                <span
                  className={cn(
                    "w-full truncate text-center text-[10px] font-medium",
                    selected ? "text-[#7B6FE0]" : isDark ? "text-[#C5C7D0]" : "text-[#3A3E4C]",
                  )}
                >
                  {asset.name}
                </span>
                <span className={cn("text-[9px] tabular-nums font-medium", isDark ? "text-[#6B7080]" : "text-[#8A90A0]")}>
                  {asset.isFree || asset.creditCost === 0 ? "Free" : `${asset.creditCost} credits`}
                </span>
              </button>
            );
          })}
          {assets.length === 0 ? (
            <p className={cn("py-3 text-[12px]", isDark ? "text-[#9AA0B0]" : "text-[#5C6170]")}>
              No assets match.
            </p>
          ) : null}
        </div>
      </div>
    </>
  );
}
