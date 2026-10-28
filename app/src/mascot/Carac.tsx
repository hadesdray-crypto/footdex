import { cx } from "../util";
import { Fig } from "./Fig";
import { PERSOS } from "./lines";
import { CARAC, dots } from "./caractere";
import { useMascot } from "./state";

/** The characters, the way Plume shows hers: outfit, how much he talks, how he talks. */
export function CaracList({ current, onPick }: { current: number; onPick: (i: number) => void }) {
  const m = useMascot();
  return (
    <div className="carac">
      {PERSOS.map((p, i) => {
        const c = CARAC[p.mode];
        return (
          <button key={p.name} type="button" className={cx("carac__row", current === i && "is-on")} aria-pressed={current === i} onClick={() => onPick(i)}>
            <Fig look={m.s.looks[p.mode] ?? c.tenue} size={58} crop="bust" mouth={p.mouth} />
            <span className="carac__text">
              <strong>{p.name}</strong>
              <span className="carac__lvl"><b aria-hidden="true">{dots(c.level)}</b> {c.label}</span>
              <em>{c.style}</em>
              <span className="carac__say">« {p.sample} »</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
