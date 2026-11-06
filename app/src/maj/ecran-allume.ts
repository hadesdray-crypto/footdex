// The screen stays on while the app is open (nobody has to touch it to keep it awake). Two ways, one after the other:
// 1) the phone's « screen wake lock »; 2) if it is not there, a tiny silent video that plays in a loop.
let lock: { release: () => Promise<void> } | null = null;
let video: HTMLVideoElement | null = null;

async function askLock() {
  try {
    const wl = (navigator as unknown as { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } }).wakeLock;
    if (wl && document.visibilityState === "visible" && !lock) {
      lock = await wl.request("screen");
      (lock as unknown as EventTarget).addEventListener?.("release", () => { lock = null; });
      return true;
    }
  } catch {
    lock = null;
  }
  return !!lock;
}

function silentVideo() {
  try {
    if (video) return void video.play().catch(() => undefined);
    const c = document.createElement("canvas");
    c.width = c.height = 2;
    const g = c.getContext("2d");
    const stream = (c as unknown as { captureStream?: (f: number) => MediaStream }).captureStream?.(1);
    if (!g || !stream) return;
    g.fillRect(0, 0, 2, 2);
    video = document.createElement("video");
    video.muted = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("aria-hidden", "true");
    video.style.cssText = "position:fixed;width:1px;height:1px;opacity:0.01;pointer-events:none;left:0;top:0";
    video.srcObject = stream;
    document.body.appendChild(video);
    void video.play().catch(() => undefined);
    window.setInterval(() => { if (!document.hidden) g.fillRect(0, 0, 2, 2); }, 1000);
  } catch {
    /* nothing more to try */
  }
}

export function garderEcranAllume() {
  const go = async () => {
    if (document.visibilityState !== "visible") return;
    if (!(await askLock())) silentVideo();
  };
  void go();
  document.addEventListener("visibilitychange", () => void go());
  // the first touch is a good moment too (some phones only allow it after a touch)
  window.addEventListener("pointerdown", () => void go(), { passive: true });
}
