import { useEffect, useState } from "react";
import { LuCheck, LuGem, LuGift, LuLayers, LuLock, LuStar } from "react-icons/lu";
import { BACKS, CARDS_PER_CHEMIN, CHEMINS, GIFT_LABEL, MILESTONES, RARITY, cheminOf, milestoneRewards, type Reward } from "../cards";
import { reducedMotion } from "../fx";
import { cx, fmt } from "../util";
import { Ball } from "./pack";

export function rewardText(r: Reward): string {
  if (r.type === "stars") return `+${r.amount} étoiles`;
  if (r.type === "gift") return GIFT_LABEL[r.gift];
  return `Nouveau dos de carte : ${BACKS.find((b) => b.id === r.back)?.name ?? r.back}`;
}

export function RewardIcon({ reward, size }: { reward: Reward; size?: number }) {
  if (reward.type === "stars") return <LuStar size={size} className="ricon ricon--stars" aria-hidden="true" />;
  if (reward.type === "back") return <LuLayers size={size} className="ricon ricon--back" aria-hidden="true" />;
  if (reward.gift === "cadeau") return <LuGift size={size} className="ricon ricon--gift" aria-hidden="true" />;
  return <LuGem size={size} className={`ricon ricon--${reward.gift}`} aria-hidden="true" style={{ color: RARITY[reward.gift].color }} />;
}

/** Progress along the current path, with the five reward steps. Animates from `from` to `to` when they differ. */
export function PathBar({ from, to, chemin }: { from: number; to: number; chemin: number }) {
  const [value, setValue] = useState(reducedMotion() ? to : from);
  useEffect(() => {
    if (from === to) {
      setValue(to);
      return;
    }
    const t = setTimeout(() => setValue(to), 350);
    return () => clearTimeout(t);
  }, [from, to]);
  return (
    <div className="pathbar">
      <div className="pathbar__track">
        <span className="pathbar__fill" style={{ width: `${Math.min(100, (value / CARDS_PER_CHEMIN) * 100)}%` }} />
        {MILESTONES.map((m) => {
          const reward = milestoneRewards(m, chemin)[0];
          const done = value >= m;
          return (
            <span key={m} className={cx("pathbar__tick", done && "pathbar__tick--done")} style={{ left: `${m}%` }} title={`${m} cartes : ${milestoneRewards(m, chemin).map(rewardText).join(", ")}`}>
              {done ? <LuCheck aria-hidden="true" /> : <RewardIcon reward={reward} />}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ the winding path

type Pt = [number, number];
type Seg = { a: Pt; b: Pt; c1?: Pt; c2?: Pt };

const XS = [70, 140, 210, 280];
const YS = [430, 338, 246, 154, 62];
const START: Pt = [18, 430];

/** Node k (1..20) stands for 5k cards; rows of four, going up, turning at each side. */
function nodeAt(k: number): Pt {
  if (k === 0) return START;
  const row = Math.floor((k - 1) / 4);
  const col = (k - 1) % 4;
  const x = row % 2 === 0 ? XS[col] : XS[3 - col];
  return [x, YS[row]];
}

function segments(): Seg[] {
  const out: Seg[] = [];
  for (let k = 0; k < 20; k++) {
    const a = nodeAt(k);
    const b = nodeAt(k + 1);
    if (a[1] === b[1]) out.push({ a, b });
    else {
      const side = a[0] > 170 ? 336 : 4;
      out.push({ a, b, c1: [side, a[1]], c2: [side, b[1]] });
    }
  }
  return out;
}

const SEGS = segments();

function segPath(s: Seg): string {
  return s.c1 && s.c2 ? `M${s.a[0]} ${s.a[1]}C${s.c1[0]} ${s.c1[1]} ${s.c2[0]} ${s.c2[1]} ${s.b[0]} ${s.b[1]}` : `M${s.a[0]} ${s.a[1]}L${s.b[0]} ${s.b[1]}`;
}

function pointOn(s: Seg, t: number): Pt {
  if (!s.c1 || !s.c2) return [s.a[0] + (s.b[0] - s.a[0]) * t, s.a[1] + (s.b[1] - s.a[1]) * t];
  const u = 1 - t;
  const f = (i: 0 | 1) => u * u * u * s.a[i] + 3 * u * u * t * s.c1![i] + 3 * u * t * t * s.c2![i] + t * t * t * s.b[i];
  return [f(0), f(1)];
}

/** The map of the current path: 20 steps of 5 cards, a reward every 20 cards, the ball where the child is. */
export function PathMap({ opened }: { opened: number }) {
  const { index, step } = cheminOf(opened);
  const seg = Math.min(19, Math.floor(step / 5));
  const t = (step % 5) / 5;
  const done = Math.floor(step / 5);
  const ball = step >= 100 ? nodeAt(20) : pointOn(SEGS[seg], t);
  return (
    <div className="pathmap">
      <svg className="pathmap__svg" viewBox="0 0 340 470" role="img" aria-label={`Chemin ${index + 1} : ${fmt(step)} cartes sur ${CARDS_PER_CHEMIN}`}>
        {SEGS.map((s, i) => (
          <path key={`b${i}`} d={segPath(s)} className="pathmap__road" />
        ))}
        {SEGS.map((s, i) =>
          i < done || (i === seg && t > 0) ? (
            <path key={`d${i}`} d={segPath(s)} className="pathmap__done" pathLength={1} strokeDasharray={i < done ? "1 0" : `${t} 1`} />
          ) : null,
        )}
        <g className="pathmap__start">
          <circle cx={START[0]} cy={START[1]} r="7" />
        </g>
        {Array.from({ length: 20 }, (_, i) => {
          const k = i + 1;
          const [x, y] = nodeAt(k);
          const cards = k * 5;
          const milestone = MILESTONES.includes(cards);
          const reached = step >= cards;
          if (!milestone) return <circle key={k} cx={x} cy={y} r="6.5" className={cx("pathmap__node", reached && "pathmap__node--done")} />;
          const reward = milestoneRewards(cards, index)[0];
          return (
            <g key={k} className={cx("pathmap__mile", reached && "pathmap__mile--done", !reached && cards - step <= 20 && "pathmap__mile--next")} transform={`translate(${x} ${y})`}>
              <circle r="21" className="pathmap__halo" />
              <circle r="17" className="pathmap__disc" />
              <g transform="translate(-9 -9)">{reached ? <LuCheck size={18} /> : <RewardIcon reward={reward} size={18} />}</g>
              <text y="36" className="pathmap__label">
                {cards}
              </text>
            </g>
          );
        })}
      </svg>
      <span className="pathmap__ball" style={{ left: `${(ball[0] / 340) * 100}%`, top: `${(ball[1] / 470) * 100}%` }}>
        <Ball />
      </span>
    </div>
  );
}

/** The list of rewards of a path, with what is already won. */
export function RewardList({ opened }: { opened: number }) {
  const { index, step } = cheminOf(opened);
  return (
    <ol className="rewards">
      {MILESTONES.map((m) => {
        const won = step >= m;
        return (
          <li key={m} className={cx("rewards__row", won && "rewards__row--won")}>
            <span className="rewards__at">{m}</span>
            <span className="rewards__what">
              {milestoneRewards(m, index).map((r, i) => (
                <span key={i} className="rewards__item">
                  <RewardIcon reward={r} /> {rewardText(r)}
                </span>
              ))}
            </span>
            <span className="rewards__state">{won ? <LuCheck aria-label="Gagné" /> : `dans ${m - step}`}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** The seven paths, one after the other. */
export function Chapters({ opened }: { opened: number }) {
  const { index, level } = cheminOf(opened);
  return (
    <ol className="chapters">
      {CHEMINS.map((c, i) => {
        const state = i < index ? "done" : i === index ? "now" : "locked";
        return (
          <li key={c.id} className={cx("chapter", `chapter--${state}`)} style={{ "--p1": c.tone[0], "--p2": c.tone[1] }}>
            <span className="chapter__num">{i + 1}</span>
            <span className="chapter__name">{c.name}</span>
            <span className="chapter__text">{c.text}</span>
            <span className="chapter__state">
              {state === "done" ? (
                <>
                  <LuCheck aria-hidden="true" /> Terminé
                </>
              ) : state === "now" ? (
                i === CHEMINS.length - 1 ? `Niveau ${level}` : "En cours"
              ) : (
                <>
                  <LuLock aria-hidden="true" /> À {fmt(i * CARDS_PER_CHEMIN)} cartes
                </>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
