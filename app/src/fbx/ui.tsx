// The Footballinis on screen: the card, the figurine on its turning pedestal, and the treasure chest that opens.
import { useEffect, useMemo, useState } from "react";
import { cx } from "../util";
import { FBX, RARITY, fbx, fbxSvg } from "./art";
import { CHEST_COINS, CHEST_STARS, freeChestToday, openChest, useCollec, type Loot } from "./store";
import { spendStars, useStore } from "../store";
import { Chest } from "../pages/coffre";
import { Fig } from "../mascot/Fig";
import { getMascot, say, update } from "../mascot/state";
import { PERSOS } from "../mascot/lines";
import { playFx } from "../mascot/bruits";
import { click, coins as coinSound, fanfare, flip, tear, thump } from "../sound";

const Art = ({ id, size }: { id: string; size: number }) => {
  const html = useMemo(() => fbxSvg(id, size), [id, size]);
  return <span className="fbart" dangerouslySetInnerHTML={{ __html: html }} />;
};

const Bar = ({ label, icon, v, hide }: { label: string; icon: string; v: number; hide: boolean }) => (
  <span className="fbc__stat" aria-label={`${label} : ${hide ? "inconnu" : `${v} sur 10`}`}>
    <i aria-hidden="true">{icon}</i>
    <b>{hide ? "???" : <span className="fbc__bar"><span style={{ width: `${v * 10}%` }} /></span>}</b>
  </span>
);

/** One Footballini card. `owned` false: a dark silhouette with a question mark. */
export function FbxCard({ id, count = 1, owned = true, big = false, onClick }: { id: string; count?: number; owned?: boolean; big?: boolean; onClick?: () => void }) {
  const f = fbx(id);
  const r = RARITY[f.rar];
  const vide = f.rar === 4;
  const hide = vide || !owned;
  return (
    <button type="button" className={cx("fbc", `fbc--r${f.rar}`, !owned && "fbc--locked", vide && owned && "fbc--vide", big && "fbc--big")} style={{ "--rc": r.color, "--rg": r.glow } as Record<string, string>} onClick={onClick} aria-label={owned ? (vide ? "Une carte… vide ?" : f.name) : `Carte n° ${f.n} pas encore trouvée`}>
      <span className="fbc__top">
        <span>n° {vide ? "??" : f.n}</span>
        <span className="fbc__stars">{vide ? "?" : "★".repeat(r.stars)}</span>
      </span>
      <span className="fbc__art">{owned ? <Art id={id} size={big ? 220 : 120} /> : <span className="fbc__sil"><Art id={id} size={big ? 220 : 120} /><b>?</b></span>}</span>
      <span className="fbc__name">{owned && !vide ? f.name : "???"}</span>
      <span className="fbc__rar">{owned && !vide ? r.name : "???"}</span>
      {big ? (
        <>
          <span className="fbc__stats">
            <Bar label="Vitesse" icon="⚡" v={f.vit} hide={hide} />
            <Bar label="Tir" icon="🎯" v={f.tir} hide={hide} />
            <Bar label="Rigolade" icon="😂" v={f.rig} hide={hide} />
          </span>
          <span className="fbc__power">{hide ? "???" : f.power}</span>
          <span className="fbc__cry">{hide ? "« … »" : `« ${f.cry} »`}</span>
        </>
      ) : null}
      {count > 1 ? <span className="fbc__dup">×{count}</span> : null}
      {f.rar >= 2 && owned && !vide ? <span className="fbc__holo" aria-hidden="true" /> : null}
    </button>
  );
}

/** A figurine: the Footballini in shiny plastic, turning slowly on its pedestal. */
export function Figurine({ id, count = 1, owned = true, size = 150 }: { id: string; count?: number; owned?: boolean; size?: number }) {
  const f = fbx(id);
  const r = RARITY[f.rar];
  return (
    <div className={cx("fig3", !owned && "fig3--locked", f.rar === 4 && "fig3--vide")} style={{ "--rc": r.color, width: `${size}px` } as Record<string, string>}>
      <div className="fig3__stage">
        <div className="fig3__spin">
          <Art id={id} size={size * 0.86} />
        </div>
        <div className="fig3__base" aria-hidden="true"><span>{owned ? (f.rar === 4 ? "???" : f.name) : "?"}</span></div>
      </div>
      {count > 1 ? <span className="fbc__dup">×{count}</span> : null}
    </div>
  );
}

// ------------------------------------------------------------------ the treasure chest

type Step = { loot: Loot; shown: number };

/** The chest opens: a shake, a burst of light, then what is inside, one thing after the other. */
export function ChestModal({ onClose }: { onClose: () => void }) {
  const s = useStore();
  const c = useCollec();
  const [phase, setPhase] = useState<"choose" | "shake" | "open" | "loot">("choose");
  const [loot, setLoot] = useState<Loot[]>([]);
  const [i, setI] = useState(0);
  const [cardI, setCardI] = useState(0);
  const free = freeChestToday();

  function start(pay: "free" | "coins" | "stars") {
    if (pay === "stars" && !spendStars(CHEST_STARS)) return say(`Il te faut ${CHEST_STARS} étoiles pour ouvrir un coffre.`);
    const got = openChest(pay);
    if (!got) return;
    click("button");
    setLoot(got);
    setPhase("shake");
    playFx(PERSOS[getMascot().s.perso].mode, "coffre");
    thump();
    window.setTimeout(() => {
      setPhase("open");
      fanfare("eclat");
    }, 1300);
    window.setTimeout(() => setPhase("loot"), 2300);
  }

  const cur: Step | null = phase === "loot" && loot[i] ? { loot: loot[i], shown: cardI } : null;
  useEffect(() => {
    if (!cur) return;
    const l = cur.loot;
    if (l.k === "coins") {
      coinSound(5);
      say(`${l.n} pièces d'or ! Elles servent à ouvrir d'autres coffres.`);
    } else if (l.k === "fig") say(l.fresh ? `Une nouvelle figurine : ${fbx(l.id).name} !` : `Encore ${fbx(l.id).name} ! Un doublon, tu peux l'échanger contre des pièces.`);
    else if (l.k === "style") say(`Un nouveau personnage stylé : ${l.name} ! Tu peux habiller ton personnage comme lui.`);
    else if (l.k === "pack") say(l.cards.length === 1 ? "Un paquet d'une carte ! Touche-le pour l'ouvrir." : `Un paquet de ${l.cards.length} cartes ! Touche-le pour l'ouvrir.`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, phase]);

  const next = () => {
    if (i + 1 < loot.length) {
      setI(i + 1);
      setCardI(0);
    } else onClose();
  };

  return (
    <div className="chm" role="dialog" aria-modal="true" aria-label="Le coffre au trésor">
      <div className="chm__box">
        {phase === "choose" ? (
          <>
            <h2 className="chm__title">Le coffre au trésor</h2>
            <div className="chm__chest"><Chest open={false} /></div>
            <p className="chm__hint">Dedans : des pièces, des paquets de 1, 2 ou 15 cartes Footballinis, des figurines, des personnages stylés… On ne sait jamais !</p>
            <div className="chm__pay">
              <button type="button" className="btn btn--gold btn--big btn--glow" disabled={!free} onClick={() => start("free")}>{free ? "🎁 Le coffre gratuit du jour" : "Coffre gratuit : reviens demain"}</button>
              <button type="button" className="btn btn--soft" disabled={c.coins < CHEST_COINS} onClick={() => start("coins")}>🪙 Ouvrir pour {CHEST_COINS} pièces ({c.coins})</button>
              <button type="button" className="btn btn--soft" disabled={s.stars < CHEST_STARS} onClick={() => start("stars")}>⭐ Ouvrir pour {CHEST_STARS} étoiles ({s.stars})</button>
            </div>
            <button type="button" className="btn btn--ghost" onClick={onClose}>Fermer</button>
          </>
        ) : phase !== "loot" ? (
          <div className={cx("chm__chest chm__chest--big", phase === "shake" && "is-shake", phase === "open" && "is-open")}>
            <span className="chm__rays" aria-hidden="true" />
            <Chest open={phase === "open"} />
          </div>
        ) : cur ? (
          <div className="chm__loot" key={i}>
            {loot.length > 1 ? <p className="chm__count">Surprise {i + 1} sur {loot.length}</p> : null}
            {cur.loot.k === "coins" ? (
              <div className="chm__item">
                <div className="chm__coins">{Array.from({ length: 7 }, (_, k) => <span key={k} style={{ animationDelay: `${k * 90}ms`, left: `${10 + k * 12}%` }}>🪙</span>)}</div>
                <h3>+{cur.loot.n} pièces d'or</h3>
                <button type="button" className="btn btn--gold btn--big" onClick={next}>Super !</button>
              </div>
            ) : cur.loot.k === "fig" ? (
              <div className="chm__item">
                <Figurine id={cur.loot.id} size={190} />
                <h3>{cur.loot.fresh ? "Nouvelle figurine !" : "Figurine en double"}</h3>
                <p>{fbx(cur.loot.id).rar === 4 ? "Un socle… vide ? C'est Ultime Vide. Personne ne l'a jamais vu." : fbx(cur.loot.id).name}</p>
                <button type="button" className="btn btn--gold btn--big" onClick={next}>Super !</button>
              </div>
            ) : cur.loot.k === "style" ? (
              <div className="chm__item">
                <Fig look={cur.loot.look} size={130} mouth="grin" />
                <h3>{cur.loot.name}</h3>
                <p>Un personnage stylé rejoint ta collection.</p>
                <div className="chips">
                  <button type="button" className="btn btn--soft" onClick={() => { if (cur.loot.k === "style") { update({ look: cur.loot.look }); say("Wouah, j'ai une nouvelle tenue !"); } }}>L'habiller comme ça</button>
                  <button type="button" className="btn btn--gold" onClick={next}>Super !</button>
                </div>
              </div>
            ) : (
              <PackOpen cards={cur.loot.cards} shown={cardI} setShown={setCardI} onDone={next} />
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** A pack of Footballinis: tear it, then the cards come one by one (the 15-card pack: all of them at the end). */
function PackOpen({ cards, shown, setShown, onDone }: { cards: string[]; shown: number; setShown: (n: number) => void; onDone: () => void }) {
  const c = useCollec();
  const [torn, setTorn] = useState(false);
  const big = cards.length > 2;
  const best = Math.max(...cards.map((id) => fbx(id).rar));
  if (!torn)
    return (
      <div className="chm__item">
        <button type="button" className={cx("fbpack", `fbpack--${cards.length}`)} onClick={() => { tear(); setTorn(true); setShown(0); }} aria-label="Ouvrir le paquet">
          <b>{cards.length}</b>
          <span>CARTE{cards.length > 1 ? "S" : ""}</span>
          <em>FOOTBALLINIS</em>
        </button>
        <p>Touche le paquet pour le déchirer !</p>
      </div>
    );
  if (big && shown >= cards.length)
    return (
      <div className="chm__item">
        <h3>Ton méga paquet !</h3>
        <div className="chm__grid">{cards.map((id, k) => <FbxCard key={k} id={id} />)}</div>
        <button type="button" className="btn btn--gold btn--big" onClick={onDone}>Super !</button>
      </div>
    );
  const id = cards[Math.min(shown, cards.length - 1)];
  const f = fbx(id);
  const isNew = (c.cards[id] ?? 0) <= cards.slice(0, shown + 1).filter((x) => x === id).length;
  return (
    <div className="chm__item">
      <p className="chm__count">Carte {Math.min(shown + 1, cards.length)} sur {cards.length}{best >= 3 && shown === 0 ? " · ça brille…" : ""}</p>
      <div className="chm__flip" key={shown} onAnimationStart={() => flip(["base", "rare", "eclat", "legende", "legende"][f.rar])}>
        <FbxCard id={id} big />
      </div>
      <p className="chm__new">{f.rar === 4 ? "Une carte… complètement vide ?!" : isNew ? "Nouvelle carte !" : "Doublon"}</p>
      <div className="chips">
        {big ? <button type="button" className="btn btn--soft" onClick={() => setShown(cards.length)}>Tout voir</button> : null}
        <button type="button" className="btn btn--gold btn--big" onClick={() => (shown + 1 < cards.length ? setShown(shown + 1) : big ? setShown(cards.length) : onDone())}>{shown + 1 < cards.length ? "Carte suivante" : "Super !"}</button>
      </div>
    </div>
  );
}

export { FBX };
