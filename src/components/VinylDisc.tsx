// Spinning vinyl disc shown while generated music is playing.

export function VinylDisc({ playing, size = 120 }: { playing: boolean; size?: number }) {
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <div
        className={`vinyl-disc ${playing ? "is-playing" : ""}`}
        style={{ width: size, height: size }}
      />
      <div className="vinyl-center" />
    </div>
  );
}
