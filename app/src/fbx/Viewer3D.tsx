// A real 3D figurine: a .glb model (public/fbx/3d/<id>.glb) that a finger turns in every direction, above and below too.
// It turns slowly by itself when nobody touches it. If WebGL or the file is missing, `onMissing` is called and the
// picture turntable (or the drawing) takes over: nothing ever breaks.
import { useEffect, useRef } from "react";

const checked = new Map<string, boolean>();
/** Is there a model for this figurine? (asked once) */
export async function has3d(id: string): Promise<boolean> {
  const url = `fbx/3d/${id}.glb`;
  const known = checked.get(url);
  if (known !== undefined) return known;
  let ok = false;
  try {
    const r = await fetch(url, { method: "GET", headers: { Range: "bytes=0-3" } });
    if (r.ok || r.status === 206) {
      const head = new Uint8Array(await r.arrayBuffer()).slice(0, 4);
      ok = String.fromCharCode(...head) === "glTF"; // a real model, not the page of the app answering for a missing file
    }
  } catch {
    ok = false;
  }
  checked.set(url, ok);
  return ok;
}

export function Viewer3D({ id, size, onMissing }: { id: string; size: number; onMissing: () => void }) {
  const box = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    let dead = false;
    let cleanup = () => undefined as void;
    (async () => {
      try {
        const THREE = await import("three");
        const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
        if (dead || !box.current) return;
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
        renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
        renderer.setSize(size, size);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        box.current.appendChild(renderer.domElement);
        renderer.domElement.style.touchAction = "pan-y";
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
        scene.add(new THREE.HemisphereLight(0xffffff, 0x556680, 1.6));
        const sun = new THREE.DirectionalLight(0xffffff, 2.2);
        sun.position.set(2, 3, 4);
        scene.add(sun);
        const back = new THREE.DirectionalLight(0xbfd4ff, 1.1);
        back.position.set(-3, -2, -4);
        scene.add(back);
        const gltf = await new GLTFLoader().loadAsync(`fbx/3d/${id}.glb`);
        if (dead) return renderer.dispose();
        const pivot = new THREE.Group();
        const model = gltf.scene;
        // centred and always the same size, whatever the size of the model
        const bb = new THREE.Box3().setFromObject(model);
        const c = bb.getCenter(new THREE.Vector3());
        const sz = bb.getSize(new THREE.Vector3());
        model.position.sub(c);
        const r = Math.max(sz.x, sz.y, sz.z) || 1;
        pivot.add(model);
        pivot.scale.setScalar(1.2 / r);
        scene.add(pivot);
        camera.position.set(0, 0, 4.4);
        // a finger turns it in every direction (no limit up or down: the underside is seen too)
        let drag: { x: number; y: number } | null = null;
        let idle = performance.now();
        const el = renderer.domElement;
        const down = (e: PointerEvent) => { drag = { x: e.clientX, y: e.clientY }; el.setPointerCapture?.(e.pointerId); };
        const move = (e: PointerEvent) => {
          if (!drag) return;
          const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
          drag = { x: e.clientX, y: e.clientY };
          // turn around the screen's own axes, so « up » always feels like up
          const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(dy * 0.012, dx * 0.012, 0, "XYZ"));
          pivot.quaternion.premultiply(q);
        };
        const up = () => { drag = null; idle = performance.now(); };
        el.addEventListener("pointerdown", down);
        el.addEventListener("pointermove", move);
        el.addEventListener("pointerup", up);
        el.addEventListener("pointercancel", up);
        let raf = 0;
        let last = performance.now();
        const loop = (t: number) => {
          const dt = Math.min(0.05, (t - last) / 1000);
          last = t;
          if (!drag && t - idle > 1500) pivot.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), dt * 0.6));
          renderer.render(scene, camera);
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        cleanup = () => {
          cancelAnimationFrame(raf);
          el.removeEventListener("pointerdown", down);
          el.removeEventListener("pointermove", move);
          el.removeEventListener("pointerup", up);
          el.removeEventListener("pointercancel", up);
          renderer.dispose();
          el.remove();
        };
      } catch {
        if (!dead) onMissing();
      }
    })();
    return () => { dead = true; cleanup(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, size]);
  return <div ref={box} className="fig3__gl" role="img" aria-label="Figurine en 3D : fais-la tourner avec le doigt, dans tous les sens" style={{ width: size, height: size }} />;
}
