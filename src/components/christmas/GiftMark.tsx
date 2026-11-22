/**
 * Original Motio2edit gift-box mark (inline SVG).
 * License: created for Motio2edit — commercial use by the product owner.
 * Not sourced from Google Images or third-party stock.
 * See docs/ASSETS_GIFT_MARK.md
 */
export function GiftMark({
  className = "h-5 w-5",
  title = "Gift",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      {/* Box body — Motio2edit orange */}
      <rect x="6" y="14" width="20" height="14" rx="2" className="fill-orange-500 dark:fill-orange-400" />
      {/* Lid */}
      <rect x="5" y="11" width="22" height="4" rx="1.5" className="fill-orange-600 dark:fill-orange-500" />
      {/* Vertical ribbon */}
      <rect x="14.5" y="11" width="3" height="17" className="fill-white/90 dark:fill-white/85" />
      {/* Horizontal ribbon */}
      <rect x="5" y="16" width="22" height="2.5" className="fill-white/90 dark:fill-white/85" />
      {/* Bow left */}
      <path
        d="M16 11 C12 6, 7 7, 9 11 C11 13, 14 12, 16 11Z"
        className="fill-red-500 dark:fill-red-400"
      />
      {/* Bow right */}
      <path
        d="M16 11 C20 6, 25 7, 23 11 C21 13, 18 12, 16 11Z"
        className="fill-red-500 dark:fill-red-400"
      />
      {/* Bow center */}
      <circle cx="16" cy="11" r="1.6" className="fill-amber-300 dark:fill-amber-200" />
    </svg>
  );
}
