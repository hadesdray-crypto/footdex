import type { CSSProperties } from "react";
import { CHEMINS, GIFT_LABEL, RARITY, type GiftKind } from "../cards";
import type { PackKind } from "../store";
import { cx } from "../util";

/** A football drawn in a few lines, for wrappers and the path. */
export function Ball({ className }: { className?: string }) {
  const pent = (cx0: number, cy0: number, r: number, rot: number) =>
    Array.from({ length: 5 }, (_, i) => {
      const a = rot + (i * 2 * Math.PI) / 5;
      return `${(cx0 + r * Math.cos(a)).toFixed(2)},${(cy0 + r * Math.sin(a)).toFixed(2)}`;
    }).join(" ");
  const spokes = Array.from({ length: 5 }, (_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    return [32 + 9 * Math.cos(a), 32 + 9 * Math.sin(a), 32 + 19.5 * Math.cos(a), 32 + 19.5 * Math.sin(a)];
  });
  return (
    <svg className={cx("ball", className)} viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="29" fill="#f8f9fc" stroke="#1b2233" strokeWidth="2.5" />
      <polygon points={pent(32, 32, 9.5, -Math.PI / 2)} fill="#1b2233" />
      {spokes.map(([x1, y1, x2, y2], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#1b2233" strokeWidth="2.2" strokeLinecap="round" />
      ))}
      {spokes.map(([, , x2, y2], i) => (
        <polygon key={`p${i}`} points={pent(32 + (x2 - 32) * 1.22, 32 + (y2 - 32) * 1.22, 4.6, Math.atan2(y2 - 32, x2 - 32) + Math.PI)} fill="#1b2233" />
      ))}
      <path d="M10 44a29 29 0 0 0 44 0" fill="none" stroke="#0b1222" strokeOpacity="0.18" strokeWidth="7" strokeLinecap="round" />
    </svg>
  );
}

const GIFT_TONE: Record<GiftKind, [string, string]> = {
  cadeau: ["#ffd76a", "#4a2c06"],
  rare: [RARITY.rare.color, "#3d0714"],
  eclat: [RARITY.eclat.color, "#3a2602"],
  legende: [RARITY.legende.color, "#3b2c12"],
};

export function packTone(kind: PackKind, chemin: number): [string, string] {
  if (kind === "cadeau" || kind === "rare" || kind === "eclat" || kind === "legende") return GIFT_TONE[kind];
  return CHEMINS[Math.min(chemin, CHEMINS.length - 1)].tone;
}

/** The foil wrapper of a pack: the colours of the path, or a ribbon for a gift. */
export function PackArt({ kind, chemin, glow, tear = 0, torn, className, label }: { kind: PackKind; chemin: number; glow?: string; tear?: number; torn?: boolean; className?: string; label?: string }) {
  const [light, deep] = packTone(kind, chemin);
  const gift = kind === "cadeau" || kind === "rare" || kind === "eclat" || kind === "legende";
  const ch = CHEMINS[Math.min(chemin, CHEMINS.length - 1)];
  const style = { "--p1": light, "--p2": deep, "--glow": glow ?? light, "--tear": String(tear) } as CSSProperties;
  return (
    <div className={cx("paquet", gift && "paquet--gift", torn && "paquet--torn", className)} style={style} aria-hidden="true">
      <div className="paquet__body">
        <span className="paquet__foil" />
        <span className="paquet__strip">
          <span className="paquet__crimp" />
        </span>
        {gift ? <span className="paquet__ribbon" /> : null}
        <div className="paquet__face">
          <span className="paquet__chapter">{gift ? "Cadeau" : kind === "bonus" ? "Paquet bonus" : `Chemin ${chemin + 1}`}</span>
          <span className="paquet__brand">FOOTDEX</span>
          <Ball className="paquet__ball" />
          <span className="paquet__name">{label ?? (gift ? GIFT_LABEL[kind as GiftKind] : ch.name)}</span>
          <span className="paquet__count">{kind === "cadeau" || !gift ? "5 cartes" : "1 carte"}</span>
        </div>
        <span className="paquet__crimp paquet__crimp--bottom" />
      </div>
    </div>
  );
}
