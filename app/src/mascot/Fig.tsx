import { useMemo } from "react";
import { figSvg, type Look } from "./look";
import type { Wounds } from "./wounds";

/** A drawn character. `talk` moves the mouth, `cheer` raises the arms. */
export function Fig({ look, size, crop = "full", mouth = "smile", talk = false, cheer = false, hurt = 0, mode = "", tip = false, act = "", className = "", wounds }: { wounds?: Wounds; look: Look; size: number; crop?: "bust" | "full"; mouth?: string; talk?: boolean; cheer?: boolean; hurt?: number; mode?: string; tip?: boolean; act?: string; className?: string }) {
  const html = useMemo(() => figSvg(look, { size, crop, mouth, wounds }), [JSON.stringify(look), size, crop, mouth, JSON.stringify(wounds ?? null)]);
  return <div className={`mfw ${talk ? "talk" : ""} ${cheer ? "cheer" : ""} ${hurt ? "hurt" : ""} ${hurt > 1 ? "hurt2" : ""} ${mode ? `m-${mode}` : ""} ${tip ? "tip" : ""} ${act ? `a-${act}` : ""} ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}
