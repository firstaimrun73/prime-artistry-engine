/**
 * Small unobtrusive disclaimer shown at the bottom of every editor
 * (Image / Video / Music). Mot2Edit is the product; Motion2AI is the
 * underlying engine credit.
 */
export function EditorDisclaimer({ className = "" }: { className?: string }) {
  return (
    <p
      className={`mt-6 text-center text-[11px] leading-relaxed text-muted-foreground/80 ${className}`}
      aria-label="AI disclaimer"
    >
      Mot2Edit is powered by{" "}
      <span className="font-semibold text-muted-foreground">Motion2AI</span> and
      can make mistakes — please double-check responses.
    </p>
  );
}

/**
 * Small credit chip shown inside generation loaders. Treat as a licensed-tech
 * badge, not a marketing logo.
 */
export function Motion2AIBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground backdrop-blur ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
      Powered by Motion2AI
    </span>
  );
}
