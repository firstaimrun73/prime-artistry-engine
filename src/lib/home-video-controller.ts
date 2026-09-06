/**
 * Global homepage video controller.
 * Exactly one homepage video may play at a time across ALL sections.
 * Activating a new video pauses others and seeks them to 0.
 */

type Listener = () => void;

const els = new Map<string, HTMLVideoElement>();
let activeId: string | null = null;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((l) => l());
}

export function homeVideoSubscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function homeVideoGetActiveId(): string | null {
  return activeId;
}

export function homeVideoRegister(id: string, el: HTMLVideoElement | null): void {
  if (el) els.set(id, el);
  else {
    els.delete(id);
    if (activeId === id) {
      activeId = null;
      notify();
    }
  }
}

/** Stop every video except `exceptId` (pause + seek to start). */
function stopOthers(exceptId: string | null) {
  els.forEach((v, id) => {
    if (exceptId && id === exceptId) return;
    try {
      v.pause();
      v.currentTime = 0;
      v.muted = true;
    } catch {
      /* ignore */
    }
  });
}

/**
 * Request that `id` become the sole playing video.
 * Other homepage videos are paused and reset to the beginning.
 */
export function homeVideoRequestPlay(id: string, el: HTMLVideoElement, opts?: { unmuted?: boolean }): void {
  stopOthers(id);
  els.set(id, el);
  activeId = id;
  el.muted = opts?.unmuted === true ? false : true;
  void el.play().catch(() => {});
  notify();
}

export function homeVideoPause(id: string): void {
  const v = els.get(id);
  if (v) {
    try {
      v.pause();
      v.currentTime = 0;
      v.muted = true;
    } catch {
      /* ignore */
    }
  }
  if (activeId === id) {
    activeId = null;
    notify();
  }
}

export function homeVideoStopAll(): void {
  stopOthers(null);
  activeId = null;
  notify();
}
