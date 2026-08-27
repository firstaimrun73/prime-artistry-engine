import { cn } from "@/lib/utils";

/**
 * Motio2edit mark — Motion → Edit.
 * Original faceted gem + diagonal “highway” stripe.
 * NOT a third-party AI / Gemini logo.
 *
 * Interval motion (CSS):
 * ~18s loop: orange → spin → red → spin → purple → spin → orange
 * Wordmark “2” shifts color in sync.
 */
export function MotioMarkIcon({
  className,
  animate = true,
}: {
  className?: string;
  /** Interval brand animation (default on). */
  animate?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("motio-mark-icon", animate && "motio-mark-animate", className)}
      aria-hidden
    >
      <defs>
        {/* Default orange → white gem gradient */}
        <linearGradient id="motioGemGrad" x1="6" y1="4" x2="26" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--motio-gem-hi, #FFF7ED)" />
          <stop offset="45%" stopColor="var(--motio-gem-mid, #F97316)" />
          <stop offset="100%" stopColor="var(--motio-gem-lo, #EA580C)" />
        </linearGradient>
        <linearGradient id="motioHighwayGrad" x1="4" y1="28" x2="28" y2="4" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--motio-hwy-a, #FFFFFF)" stopOpacity="0.95" />
          <stop offset="50%" stopColor="var(--motio-hwy-b, #FED7AA)" stopOpacity="0.9" />
          <stop offset="100%" stopColor="var(--motio-hwy-a, #FFFFFF)" stopOpacity="0.95" />
        </linearGradient>
        <filter id="motioGemGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Soft halo */}
      <circle cx="16" cy="16" r="14.5" className="motio-mark-halo" fill="var(--motio-gem-mid, #F97316)" fillOpacity="0.12" />

      {/* Spinning group: gem + highway */}
      <g className="motio-mark-spin-group" style={{ transformOrigin: "16px 16px" }}>
        {/* Faceted gem (octahedral / crystal — original Motio shape) */}
        <g filter="url(#motioGemGlow)">
          {/* Outer diamond */}
          <path
            d="M16 3.5 L27 16 L16 28.5 L5 16 Z"
            fill="url(#motioGemGrad)"
            className="motio-mark-gem"
          />
          {/* Inner facets for depth */}
          <path d="M16 3.5 L22 16 L16 28.5 L16 3.5 Z" fill="#FFFFFF" fillOpacity="0.22" />
          <path d="M16 3.5 L10 16 L16 28.5 L16 3.5 Z" fill="#000000" fillOpacity="0.12" />
          <path d="M5 16 L16 11 L27 16 L16 21 Z" fill="#FFFFFF" fillOpacity="0.18" />
          {/* Core sparkle */}
          <circle cx="16" cy="16" r="2.4" fill="#FFFFFF" fillOpacity="0.92" />
          <circle cx="16" cy="16" r="1.1" fill="var(--motio-gem-mid, #F97316)" fillOpacity="0.85" />
        </g>

        {/* Highway / motion stripe through the gem */}
        <g className="motio-mark-highway">
          <path
            d="M7.2 24.8 L24.8 7.2"
            stroke="url(#motioHighwayGrad)"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          {/* Lane dashes suggestion */}
          <path
            d="M10 22 L13 19 M16 16 L19 13 M22 10 L23.5 8.5"
            stroke="var(--motio-gem-mid, #F97316)"
            strokeWidth="0.9"
            strokeLinecap="round"
            strokeOpacity="0.55"
            strokeDasharray="1.6 2.2"
          />
        </g>
      </g>
    </svg>
  );
}

export function BrandMark({
  className,
  showIcon = true,
  size = "md",
  animateIcon = true,
}: {
  className?: string;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
  /** Interval gem + “2” animation (default on for brand presence). */
  animateIcon?: boolean;
}) {
  const text =
    size === "lg"
      ? "text-xl sm:text-2xl"
      : size === "sm"
        ? "text-sm"
        : "text-base sm:text-lg";
  const icon =
    size === "lg" ? "h-7 w-7" : size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <span
      className={cn(
        "notranslate motio-brand inline-flex min-w-0 items-center gap-2 font-extrabold tracking-tight",
        animateIcon && "motio-brand-animate",
        className,
      )}
      translate="no"
      data-no-translate
    >
      {showIcon && (
        <MotioMarkIcon className={cn(icon, "shrink-0")} animate={animateIcon} />
      )}
      <span className={cn("leading-none whitespace-nowrap", text)}>
        Motio
        <span className="motio-brand-two">2</span>
        edit
      </span>
    </span>
  );
}

/** Plain text brand for titles / meta (no icon). */
export const BRAND_NAME = "Motio2edit";
