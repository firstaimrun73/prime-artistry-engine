/**
 * Shared on-device face tracking for Lens AR overlays.
 * - Prefer browser FaceDetector (Shape Detection API) when available.
 * - Fallback: multi-scale skin-tone detection + dark-spot eye refinement.
 * - No network, no external APIs, no frame uploads.
 * - Temporal smoother for live preview stability.
 */

export type FacePoint = { x: number; y: number };

export type FaceLandmarks = {
  /** Normalized face bounding box in source pixel space */
  bounds: { x: number; y: number; w: number; h: number };
  faceCentre: FacePoint;
  forehead: FacePoint;
  headTop: FacePoint;
  leftEye: FacePoint;
  rightEye: FacePoint;
  leftEyeOuter: FacePoint;
  rightEyeOuter: FacePoint;
  /** Approx scale = face width in px */
  scale: number;
  /** Roll in radians (positive = clockwise), estimated */
  roll: number;
  /** Pitch proxy -1..1 (positive = looking up), weak estimate */
  pitch: number;
  /** 0..1 confidence */
  confidence: number;
  /** detector used */
  source: "facedetector" | "skin" | "fallback";
};

type FaceDetectorLike = {
  detect: (source: CanvasImageSource) => Promise<Array<{ boundingBox: DOMRectReadOnly }>>;
};

let detectorPromise: Promise<FaceDetectorLike | null> | null = null;

function getFaceDetector(): Promise<FaceDetectorLike | null> {
  if (detectorPromise) return detectorPromise;
  detectorPromise = (async () => {
    try {
      const FD = (globalThis as unknown as { FaceDetector?: new (opts?: { fastMode?: boolean; maxDetectedFaces?: number }) => FaceDetectorLike }).FaceDetector;
      if (!FD) return null;
      return new FD({ fastMode: true, maxDetectedFaces: 1 });
    } catch {
      return null;
    }
  })();
  return detectorPromise;
}

function isSkin(r: number, g: number, b: number): boolean {
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  return y > 40 && y < 240 && cb > 77 && cb < 127 && cr > 133 && cr < 173;
}

function skinBoundsFromImageData(
  d: Uint8ClampedArray,
  W: number,
  H: number,
): { x: number; y: number; w: number; h: number; score: number } | null {
  const cell = Math.max(3, Math.floor(Math.min(W, H) / 48));
  let best = 0;
  let bx = 0;
  let by = 0;
  let bw = cell * 5;
  let bh = cell * 6;

  for (let y = 0; y < H - cell; y += cell) {
    for (let x = 0; x < W - cell; x += cell) {
      let skin = 0;
      let tot = 0;
      for (let dy = 0; dy < cell; dy += 2) {
        for (let dx = 0; dx < cell; dx += 2) {
          const i = ((y + dy) * W + (x + dx)) * 4;
          tot++;
          if (isSkin(d[i], d[i + 1], d[i + 2])) skin++;
        }
      }
      const score = skin / Math.max(1, tot);
      if (score > 0.28 && score > best) {
        best = score;
        bx = x;
        by = y;
        bw = cell * 5;
        bh = cell * 6;
      }
    }
  }

  if (best < 0.28) return null;

  const padX = Math.floor(bw * 0.55);
  const padYTop = Math.floor(bh * 0.75);
  const padYBot = Math.floor(bh * 0.55);
  const x = Math.max(0, bx - padX);
  const y = Math.max(0, by - padYTop);
  const w = Math.min(W - x, bw + padX * 2);
  const h = Math.min(H - y, bh + padYTop + padYBot);
  return { x, y, w, h, score: best };
}

function refineEyes(
  d: Uint8ClampedArray,
  W: number,
  H: number,
  box: { x: number; y: number; w: number; h: number },
): { left: FacePoint; right: FacePoint; roll: number } {
  const eyeBandY0 = Math.floor(box.y + box.h * 0.28);
  const eyeBandY1 = Math.floor(box.y + box.h * 0.52);
  const step = Math.max(2, Math.floor(box.w / 40));

  let leftBest = Infinity;
  let rightBest = Infinity;
  let lx = box.x + box.w * 0.32;
  let ly = box.y + box.h * 0.38;
  let rx = box.x + box.w * 0.68;
  let ry = box.y + box.h * 0.38;

  for (let y = eyeBandY0; y < eyeBandY1; y += step) {
    for (let x = Math.floor(box.x + box.w * 0.08); x < Math.floor(box.x + box.w * 0.48); x += step) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const i = (y * W + x) * 4;
      const luma = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      if (luma < leftBest) {
        leftBest = luma;
        lx = x;
        ly = y;
      }
    }
    for (let x = Math.floor(box.x + box.w * 0.52); x < Math.floor(box.x + box.w * 0.92); x += step) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const i = (y * W + x) * 4;
      const luma = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      if (luma < rightBest) {
        rightBest = luma;
        rx = x;
        ry = y;
      }
    }
  }

  if (rx - lx < box.w * 0.12) {
    lx = box.x + box.w * 0.32;
    rx = box.x + box.w * 0.68;
    ly = ry = box.y + box.h * 0.38;
  }

  const roll = Math.atan2(ry - ly, rx - lx);
  return {
    left: { x: lx, y: ly },
    right: { x: rx, y: ry },
    roll,
  };
}

function landmarksFromBox(
  box: { x: number; y: number; w: number; h: number },
  eyes: { left: FacePoint; right: FacePoint; roll: number },
  confidence: number,
  source: FaceLandmarks["source"],
): FaceLandmarks {
  const faceCentre = { x: box.x + box.w * 0.5, y: box.y + box.h * 0.48 };
  const forehead = {
    x: (eyes.left.x + eyes.right.x) * 0.5,
    y: Math.min(eyes.left.y, eyes.right.y) - box.h * 0.22,
  };
  const headTop = {
    x: forehead.x,
    y: box.y + box.h * 0.02,
  };
  const eyeSpan = Math.max(8, eyes.right.x - eyes.left.x);
  return {
    bounds: box,
    faceCentre,
    forehead,
    headTop,
    leftEye: eyes.left,
    rightEye: eyes.right,
    leftEyeOuter: { x: eyes.left.x - eyeSpan * 0.18, y: eyes.left.y },
    rightEyeOuter: { x: eyes.right.x + eyeSpan * 0.18, y: eyes.right.y },
    scale: box.w,
    roll: eyes.roll,
    pitch: 0,
    confidence,
    source,
  };
}

function readPixels(src: HTMLCanvasElement): ImageData | null {
  try {
    const ctx = src.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    return ctx.getImageData(0, 0, src.width, src.height);
  } catch {
    return null;
  }
}

/**
 * Detect a single face + landmarks on a canvas.
 * Always returns null on total failure (caller must handle no-face).
 */
export async function detectFaceLandmarks(
  src: HTMLCanvasElement,
  opts?: { preferDetector?: boolean },
): Promise<FaceLandmarks | null> {
  const W = src.width;
  const H = src.height;
  if (W < 16 || H < 16) return null;

  const preferDetector = opts?.preferDetector !== false;
  let box: { x: number; y: number; w: number; h: number } | null = null;
  let confidence = 0.4;
  let source: FaceLandmarks["source"] = "fallback";

  if (preferDetector) {
    try {
      const det = await getFaceDetector();
      if (det) {
        const faces = await det.detect(src);
        if (faces && faces.length > 0) {
          const b = faces[0].boundingBox;
          box = {
            x: Math.max(0, Math.floor(b.x)),
            y: Math.max(0, Math.floor(b.y)),
            w: Math.min(W, Math.floor(b.width)),
            h: Math.min(H, Math.floor(b.height)),
          };
          confidence = 0.85;
          source = "facedetector";
        }
      }
    } catch {
      /* fall through */
    }
  }

  const img = readPixels(src);
  if (!img) {
    if (!box) {
      box = {
        x: Math.floor(W * 0.28),
        y: Math.floor(H * 0.12),
        w: Math.floor(W * 0.44),
        h: Math.floor(H * 0.5),
      };
      confidence = 0.15;
      source = "fallback";
    }
    const eyes = {
      left: { x: box.x + box.w * 0.32, y: box.y + box.h * 0.38 },
      right: { x: box.x + box.w * 0.68, y: box.y + box.h * 0.38 },
      roll: 0,
    };
    return landmarksFromBox(box, eyes, confidence, source);
  }

  if (!box) {
    const skin = skinBoundsFromImageData(img.data, W, H);
    if (skin) {
      box = { x: skin.x, y: skin.y, w: skin.w, h: skin.h };
      confidence = Math.min(0.75, 0.35 + skin.score * 0.5);
      source = "skin";
    } else {
      return null;
    }
  }

  const eyes = refineEyes(img.data, W, H, box);
  return landmarksFromBox(box, eyes, confidence, source);
}

/** Synchronous path using skin only (for tight live loops when async is costly). */
export function detectFaceLandmarksSync(src: HTMLCanvasElement): FaceLandmarks | null {
  const W = src.width;
  const H = src.height;
  if (W < 16 || H < 16) return null;
  const img = readPixels(src);
  if (!img) return null;
  const skin = skinBoundsFromImageData(img.data, W, H);
  if (!skin) return null;
  const box = { x: skin.x, y: skin.y, w: skin.w, h: skin.h };
  const eyes = refineEyes(img.data, W, H, box);
  return landmarksFromBox(box, eyes, Math.min(0.7, 0.35 + skin.score * 0.45), "skin");
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpPt(a: FacePoint, b: FacePoint, t: number): FacePoint {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
}

/**
 * Temporal smoother for live RAF loops.
 * Call `push` with each new detection; `current` is the stable result.
 */
export class FaceTrackSmoother {
  private prev: FaceLandmarks | null = null;
  private miss = 0;
  private readonly alpha: number;
  private readonly maxMiss: number;

  constructor(opts?: { alpha?: number; maxMiss?: number }) {
    this.alpha = opts?.alpha ?? 0.35;
    this.maxMiss = opts?.maxMiss ?? 8;
  }

  push(next: FaceLandmarks | null): FaceLandmarks | null {
    if (!next) {
      this.miss++;
      if (this.miss > this.maxMiss) {
        this.prev = null;
        return null;
      }
      return this.prev;
    }
    this.miss = 0;
    if (!this.prev) {
      this.prev = next;
      return next;
    }
    const t = this.alpha;
    const p = this.prev;
    const smoothed: FaceLandmarks = {
      bounds: {
        x: lerp(p.bounds.x, next.bounds.x, t),
        y: lerp(p.bounds.y, next.bounds.y, t),
        w: lerp(p.bounds.w, next.bounds.w, t),
        h: lerp(p.bounds.h, next.bounds.h, t),
      },
      faceCentre: lerpPt(p.faceCentre, next.faceCentre, t),
      forehead: lerpPt(p.forehead, next.forehead, t),
      headTop: lerpPt(p.headTop, next.headTop, t),
      leftEye: lerpPt(p.leftEye, next.leftEye, t),
      rightEye: lerpPt(p.rightEye, next.rightEye, t),
      leftEyeOuter: lerpPt(p.leftEyeOuter, next.leftEyeOuter, t),
      rightEyeOuter: lerpPt(p.rightEyeOuter, next.rightEyeOuter, t),
      scale: lerp(p.scale, next.scale, t),
      roll: lerp(p.roll, next.roll, t),
      pitch: lerp(p.pitch, next.pitch, t),
      confidence: lerp(p.confidence, next.confidence, t),
      source: next.source,
    };
    this.prev = smoothed;
    return smoothed;
  }

  reset(): void {
    this.prev = null;
    this.miss = 0;
  }

  get current(): FaceLandmarks | null {
    return this.prev;
  }
}

/** Downscale canvas for cheaper tracking (caller draws video/image into this). */
export function createTrackCanvas(maxEdge = 320): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = maxEdge;
  c.height = maxEdge;
  return c;
}

export function drawScaledForTrack(
  source: CanvasImageSource,
  trackCanvas: HTMLCanvasElement,
  srcW: number,
  srcH: number,
  maxEdge = 320,
): { scaleX: number; scaleY: number } {
  const scale = Math.min(1, maxEdge / Math.max(srcW, srcH));
  const tw = Math.max(1, Math.round(srcW * scale));
  const th = Math.max(1, Math.round(srcH * scale));
  if (trackCanvas.width !== tw || trackCanvas.height !== th) {
    trackCanvas.width = tw;
    trackCanvas.height = th;
  }
  const ctx = trackCanvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(source, 0, 0, tw, th);
  return { scaleX: srcW / tw, scaleY: srcH / th };
}

/** Map landmarks from track-canvas space back to full-resolution space. */
export function scaleLandmarks(
  lm: FaceLandmarks,
  scaleX: number,
  scaleY: number,
): FaceLandmarks {
  const sx = (p: FacePoint): FacePoint => ({ x: p.x * scaleX, y: p.y * scaleY });
  return {
    bounds: {
      x: lm.bounds.x * scaleX,
      y: lm.bounds.y * scaleY,
      w: lm.bounds.w * scaleX,
      h: lm.bounds.h * scaleY,
    },
    faceCentre: sx(lm.faceCentre),
    forehead: sx(lm.forehead),
    headTop: sx(lm.headTop),
    leftEye: sx(lm.leftEye),
    rightEye: sx(lm.rightEye),
    leftEyeOuter: sx(lm.leftEyeOuter),
    rightEyeOuter: sx(lm.rightEyeOuter),
    scale: lm.scale * scaleX,
    roll: lm.roll,
    pitch: lm.pitch,
    confidence: lm.confidence,
    source: lm.source,
  };
}
