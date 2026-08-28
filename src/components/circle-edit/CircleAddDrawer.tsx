/**
 * Circle 2edit Add asset drawer — search, select, confirm.
 * Selection closes drawer and surfaces "Selected: [asset]".
 */
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ADD_ASSET_CATEGORIES,
  findAddAsset,
  searchAddAssets,
  type AddAsset,
} from "@/lib/circle-edit/add-assets";

type Props = {
  isDark: boolean;
  open: boolean;
  onClose: () => void;
  addObjectId: string | null;
  setAddObjectId: (id: string | null) => void;
  addPrompt: string;
  setAddPrompt: (v: string) => void;
  activeCat: string | null;
  setActiveCat: (id: string | null) => void;
  assetQuery: string;
  setAssetQuery: (q: string) => void;
};

export function CircleAddDrawer({
  isDark,
  open,
  onClose,
  addObjectId,
  setAddObjectId,
  addPrompt,
  setAddPrompt,
  activeCat,
  setActiveCat,
  assetQuery,
  setAssetQuery,
}: Props) {
  if (!open) return null;

  const filteredAssets: AddAsset[] = searchAddAssets(assetQuery, activeCat);
  const selectedAsset = findAddAsset(addObjectId);

  return (
    <div className="relative z-30 shrink-0">
      <button
        type="button"
        aria-label="Close assets"
        className="absolute inset-x-0 bottom-full h-28 bg-black/25"
        onClick={onClose}
      />
      <div
        className={cn(
          "max-h-[48vh] overflow-y-auto rounded-t-2xl border-t px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_28px_rgba(0,0,0,0.2)] sm:px-4",
          isDark ? "border-white/10 bg-[#1E212B]" : "border-black/8 bg-white",
        )}
      >
        <div
          className={cn(
            "mx-auto mb-2.5 h-1 w-10 rounded-full",
            isDark ? "bg-[#3A3E4C]" : "bg-[#D8DAE0]",
          )}
        />
        <div className="mb-2 flex items-center justify-between gap-2">
          <p
            className={cn(
              "text-[13px] font-semibold",
              isDark ? "text-[#F2F2F5]" : "text-[#1A1C24]",
            )}
          >
            Add Object
          </p>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "rounded-lg px-2 py-1 text-[12px] font-medium",
              isDark ? "text-[#9AA0B0] hover:text-[#F2F2F5]" : "text-[#5C6170] hover:text-[#1A1C24]",
            )}
          >
            Close
          </button>
        </div>

        {selectedAsset ? (
          <div
            className={cn(
              "mb-2.5 flex items-center gap-2.5 rounded-xl border px-3 py-2",
              isDark
                ? "border-[#7B6FE0]/40 bg-[rgba(123,111,224,0.12)]"
                : "border-[#7B6FE0]/30 bg-[rgba(123,111,224,0.08)]",
            )}
          >
            <span className="text-xl" aria-hidden>
              {selectedAsset.glyph}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold text-[#7B6FE0]">
                Selected: {selectedAsset.label}
              </p>
              <p
                className={cn(
                  "truncate text-[11px]",
                  isDark ? "text-[#9AA0B0]" : "text-[#5C6170]",
                )}
              >
                {selectedAsset.generationDescriptor}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAddObjectId(null)}
              className={cn(
                "rounded-md px-2 py-1 text-[11px] font-medium",
                isDark ? "text-[#9AA0B0] hover:text-[#F2F2F5]" : "text-[#5C6170] hover:text-[#1A1C24]",
              )}
            >
              Clear
            </button>
          </div>
        ) : null}

        <input
          type="search"
          value={assetQuery}
          onChange={(e) => setAssetQuery(e.target.value)}
          placeholder="Search assets (bird, guitar, snake…)"
          className={cn(
            "mb-2.5 w-full rounded-lg border px-3 py-2 text-[13px] focus:border-[#7B6FE0] focus:outline-none",
            isDark
              ? "border-white/10 bg-[#22252F] text-[#F2F2F5] placeholder:text-[#6B7080]"
              : "border-black/10 bg-[#F4F5F8] text-[#1A1C24] placeholder:text-[#8A90A0]",
          )}
        />

        <textarea
          value={addPrompt}
          onChange={(e) => setAddPrompt(e.target.value)}
          rows={1}
          placeholder="Optional detail (e.g. red electric guitar)"
          className={cn(
            "mb-2.5 min-h-[42px] max-h-[72px] w-full resize-none rounded-lg border px-3 py-2.5 text-[13px] focus:border-[#7B6FE0] focus:outline-none",
            isDark
              ? "border-white/10 bg-[#22252F] text-[#F2F2F5] placeholder:text-[#6B7080]"
              : "border-black/10 bg-[#F4F5F8] text-[#1A1C24] placeholder:text-[#8A90A0]",
          )}
        />

        <div className="mb-2 flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setActiveCat(null)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium",
              activeCat === null
                ? "border-[#7B6FE0] bg-[rgba(123,111,224,0.18)] text-[#7B6FE0]"
                : isDark
                  ? "border-white/10 bg-white/5 text-[#9AA0B0]"
                  : "border-black/8 bg-[#F4F5F8] text-[#5C6170]",
            )}
          >
            All
          </button>
          {ADD_ASSET_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveCat(c.id)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium",
                activeCat === c.id
                  ? "border-[#7B6FE0] bg-[rgba(123,111,224,0.18)] text-[#7B6FE0]"
                  : isDark
                    ? "border-white/10 bg-white/5 text-[#9AA0B0]"
                    : "border-black/8 bg-[#F4F5F8] text-[#5C6170]",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-4 gap-2 pb-1 sm:grid-cols-5">
          {filteredAssets.map((asset) => {
            const selected = addObjectId === asset.id;
            return (
              <button
                key={asset.id}
                type="button"
                onClick={() => {
                  setAddObjectId(asset.id);
                  onClose();
                  toast.message(`${asset.label} selected`);
                }}
                className="flex flex-col items-center gap-1"
              >
                <span
                  className={cn(
                    "grid h-12 w-12 place-items-center rounded-[12px] border text-xl",
                    selected
                      ? "border-[#7B6FE0] bg-[rgba(123,111,224,0.14)]"
                      : isDark
                        ? "border-white/10 bg-white/5"
                        : "border-black/8 bg-[#F4F5F8]",
                  )}
                >
                  {asset.glyph}
                </span>
                <span
                  className={cn(
                    "max-w-[64px] truncate text-center text-[10px]",
                    selected ? "text-[#7B6FE0]" : isDark ? "text-[#9AA0B0]" : "text-[#5C6170]",
                  )}
                >
                  {asset.label}
                </span>
              </button>
            );
          })}
        </div>
        {filteredAssets.length === 0 ? (
          <p
            className={cn(
              "py-4 text-center text-[12px]",
              isDark ? "text-[#9AA0B0]" : "text-[#5C6170]",
            )}
          >
            No assets match “{assetQuery}”.
          </p>
        ) : (
          <p
            className={cn(
              "mt-2 pb-1 text-center text-[10px]",
              isDark ? "text-[#6B7080]" : "text-[#8A90A0]",
            )}
          >
            {filteredAssets.length} assets
          </p>
        )}
      </div>
    </div>
  );
}
