// The currency of the game: a gold coin. The picture made with the image AI goes in public/fbx/piece.png;
// until it is there (or if it cannot load), a drawn coin is shown, so nothing ever breaks.
import { useState } from "react";

let manque = false;
export function Piece({ size, className }: { size?: number | string; className?: string }) {
  const [, bump] = useState(0);
  const dim = size ?? "1.1em";
  if (!manque)
    return <img className={className} src="fbx/piece.png" width={undefined} height={undefined} alt="" draggable={false} style={{ height: dim, width: dim, objectFit: "contain", verticalAlign: "-0.2em", display: "inline-block" }} onError={() => { manque = true; bump((n) => n + 1); }} />;
  return (
    <svg className={className} viewBox="0 0 32 32" style={{ height: dim, width: dim, verticalAlign: "-0.2em", display: "inline-block" }} aria-hidden="true">
      <defs>
        <linearGradient id="pcG" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe58a" />
          <stop offset="0.55" stopColor="#f6c453" />
          <stop offset="1" stopColor="#c58a14" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="14.5" fill="url(#pcG)" stroke="#8a5a08" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="10.6" fill="none" stroke="#fff3c4" strokeOpacity="0.8" strokeWidth="1.2" />
      <path d="M16 9.5l5 3.6-1.9 5.9h-6.2l-1.9-5.9z" fill="#8a5a08" />
    </svg>
  );
}
