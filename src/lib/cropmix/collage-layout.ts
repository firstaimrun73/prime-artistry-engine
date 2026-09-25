import type { CollageStyleId, CollageCustomize, CollageCanvasRatio } from "./types";

export type LayoutRect = { x: number; y: number; w: number; h: number };

/** Normalized 0–1 layout rects for each style. */
export function getLayoutRects(
  styleId: CollageStyleId,
  count: number,
  customize?: CollageCustomize,
): LayoutRect[] {
  const gutter = (customize?.gutter ?? 8) / 1000;
  const n = Math.max(1, Math.min(count, 9));

  switch (styleId) {
    case "normal-grid": {
      const cols = n <= 2 ? n : n <= 4 ? 2 : 3;
      const rows = Math.ceil(n / cols);
      const cellW = (1 - gutter * (cols + 1)) / cols;
      const cellH = (1 - gutter * (rows + 1)) / rows;
      return Array.from({ length: n }, (_, i) => {
        const c = i % cols;
        const r = Math.floor(i / cols);
        return {
          x: gutter + c * (cellW + gutter),
          y: gutter + r * (cellH + gutter),
          w: cellW,
          h: cellH,
        };
      });
    }
    case "clean-editorial": {
      if (n === 1) return [{ x: 0.05, y: 0.05, w: 0.9, h: 0.9 }];
      if (n === 2) return [{ x: 0.04, y: 0.08, w: 0.55, h: 0.84 }, { x: 0.62, y: 0.08, w: 0.34, h: 0.84 }];
      return [
        { x: 0.04, y: 0.04, w: 0.6, h: 0.92 },
        { x: 0.68, y: 0.04, w: 0.28, h: 0.44 },
        { x: 0.68, y: 0.52, w: 0.28, h: 0.44 },
      ].slice(0, n);
    }
    case "comic-page": {
      const panels: LayoutRect[] = [
        { x: 0.03, y: 0.03, w: 0.45, h: 0.45 },
        { x: 0.52, y: 0.03, w: 0.45, h: 0.28 },
        { x: 0.52, y: 0.35, w: 0.45, h: 0.28 },
        { x: 0.03, y: 0.52, w: 0.94, h: 0.45 },
      ];
      return panels.slice(0, n);
    }
    case "storyboard": {
      const cols = Math.min(n, 4);
      const cellW = (1 - gutter * (cols + 1)) / cols;
      return Array.from({ length: n }, (_, i) => ({
        x: gutter + (i % cols) * (cellW + gutter),
        y: 0.15,
        w: cellW,
        h: 0.7,
      }));
    }
    case "film-strip": {
      const cellW = (1 - gutter * (n + 1)) / n;
      return Array.from({ length: n }, (_, i) => ({
        x: gutter + i * (cellW + gutter),
        y: 0.2,
        w: cellW,
        h: 0.6,
      }));
    }
    case "magazine": {
      if (n <= 1) return [{ x: 0.08, y: 0.08, w: 0.84, h: 0.84 }];
      return [
        { x: 0.05, y: 0.05, w: 0.58, h: 0.9 },
        { x: 0.66, y: 0.05, w: 0.29, h: 0.42 },
        { x: 0.66, y: 0.52, w: 0.29, h: 0.43 },
      ].slice(0, n);
    }
    case "polaroid-memory": {
      const cols = n <= 2 ? n : 2;
      const rows = Math.ceil(n / cols);
      const cellW = 0.42;
      const cellH = 0.38;
      return Array.from({ length: n }, (_, i) => {
        const c = i % cols;
        const r = Math.floor(i / cols);
        return {
          x: 0.08 + c * 0.48,
          y: 0.1 + r * 0.42,
          w: cellW,
          h: cellH,
        };
      });
    }
    case "dynamic-diagonal": {
      return Array.from({ length: n }, (_, i) => {
        const t = i / Math.max(1, n - 1);
        return {
          x: 0.05 + t * 0.15,
          y: 0.05 + t * 0.2,
          w: 0.55 - t * 0.1,
          h: 0.55 - t * 0.1,
        };
      });
    }
    case "mosaic": {
      const cols = n <= 4 ? 2 : 3;
      const rows = Math.ceil(n / cols);
      const cellW = (1 - gutter * (cols + 1)) / cols;
      const cellH = (1 - gutter * (rows + 1)) / rows;
      return Array.from({ length: n }, (_, i) => {
        const c = i % cols;
        const r = Math.floor(i / cols);
        const big = i === 0 && n > 3;
        return {
          x: gutter + c * (cellW + gutter),
          y: gutter + r * (cellH + gutter),
          w: big ? cellW * 1.5 : cellW,
          h: big ? cellH * 1.5 : cellH,
        };
      });
    }
    case "hero-supporting": {
      if (n === 1) return [{ x: 0.05, y: 0.05, w: 0.9, h: 0.9 }];
      const side = Math.min(n - 1, 3);
      const heroH = 0.65;
      const sideH = (0.9 - gutter * side) / side;
      const rects: LayoutRect[] = [{ x: 0.05, y: 0.05, w: 0.58, h: heroH }];
      for (let i = 0; i < side; i++) {
        rects.push({
          x: 0.66,
          y: 0.05 + i * (sideH + gutter),
          w: 0.29,
          h: sideH,
        });
      }
      return rects.slice(0, n);
    }
    default:
      return [{ x: 0.05, y: 0.05, w: 0.9, h: 0.9 }];
  }
}

export function canvasSizeForRatio(
  ratio: CollageCanvasRatio,
  base = 1080,
): { width: number; height: number } {
  switch (ratio) {
    case "1:1": return { width: base, height: base };
    case "4:5": return { width: base, height: Math.round((base * 5) / 4) };
    case "3:4": return { width: base, height: Math.round((base * 4) / 3) };
    case "4:3": return { width: Math.round((base * 4) / 3), height: base };
    case "9:16": return { width: base, height: Math.round((base * 16) / 9) };
    case "16:9": return { width: Math.round((base * 16) / 9), height: base };
    default: return { width: base, height: base };
  }
}
