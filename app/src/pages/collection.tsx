// « Ma collection » : everything Raphaël collects in one place: the album of player cards (the binder),
// the Footballinis cards, the figurines, the styled characters, and soon music, clips and match moments.
import { useState } from "react";
import { Piece } from "../ui/Piece";
import { LuLibrary, LuLock } from "react-icons/lu";
import { FBX, RARITY } from "../fbx/art";
import { ChestModal, FbxCard, FigZoom, Figurine } from "../fbx/ui";
import type { Edition } from "../fbx/Standee";
import { Chest } from "./coffre";
import { dupValue, tradeDuplicates, tradeFigDuplicates, useCollec } from "../fbx/store";
import { Fig } from "../mascot/Fig";
import { say, update } from "../mascot/state";
import { go } from "../router";
import { useStore } from "../store";
import { PageTitle } from "../ui/bits";
import { cx } from "../util";
import { coins as coinSound } from "../sound";

type Tab = "cartes" | "figurines" | "styles" | "bientot";

export function Collection() {
  const s = useStore();
  const c = useCollec();
  const [tab, setTab] = useState<Tab>("cartes");
  const [chest, setChest] = useState(false);
  const [zoom, setZoom] = useState<string | null>(null);
  const [ed, setEd] = useState<Edition>("s");
  const [figZoom, setFigZoom] = useState<string | null>(null);
  const cardsOwned = FBX.filter((f) => c.cards[f.id]).length;
  const figsOwned = FBX.filter((f) => c.figs[f.id]).length + FBX.filter((f) => c.figsC[f.id]).length;
  const figs = ed === "c" ? c.figsC : c.figs;
  const dupCards = FBX.reduce((a, f) => a + Math.max(0, (c.cards[f.id] ?? 0) - 1) * dupValue(f.rar), 0);

  function tradeAll() {
    let gain = 0;
    for (const f of FBX) gain += tradeDuplicates(f.id);
    if (gain) {
      coinSound(6);
      say(`Tes doublons sont échangés : ${gain} pièces d'or !`);
    }
  }

  return (
    <div className="colx">
      <PageTitle kicker="Tout ce que tu collectionnes" title="Ma collection" />

      <div className="colx__purse">
        <span><Piece /> <b>{s.stars}</b> pièces</span>
      </div>

      <button type="button" className="colx__chest" onClick={() => setChest(true)}>
        <span className="colx__chesticon" aria-hidden="true"><Chest open={false} /></span>
        <span>
          <strong>Le coffre des Footballinis</strong>
          <em>Ouvre-le avec des pièces : surprises, figurines, personnages stylés</em>
        </span>
      </button>

      <button type="button" className="colx__binder" onClick={() => go({ page: "classeur" })}>
        <LuLibrary aria-hidden="true" />
        <span>
          <strong>Mon classeur de cartes</strong>
          <em>Les cartes des joueurs, page par page</em>
        </span>
      </button>

      <div className="segmented" role="tablist" aria-label="Ma collection">
        {([
          ["cartes", `Cartes ${cardsOwned}/20`],
          ["figurines", `Figurines ${figsOwned}/40`],
          ["styles", `Stylés ${c.styles.length}`],
          ["bientot", "Bientôt"],
        ] as [Tab, string][]).map(([t, l]) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} className={cx("segmented__tab", tab === t && "segmented__tab--on")} onClick={() => setTab(t)}>{l}</button>
        ))}
      </div>

      {tab === "cartes" ? (
        <>
          <p className="note">20 personnages rigolos à collectionner. Les plus rares brillent. Touche une carte pour la voir en grand.</p>
          {dupCards ? <button type="button" className="btn btn--soft" onClick={tradeAll}><Piece /> Échanger mes doublons contre {dupCards} pièces</button> : null}
          <div className="colx__grid">
            {FBX.map((f) => (
              <FbxCard key={f.id} id={f.id} owned={!!c.cards[f.id]} count={c.cards[f.id] ?? 0} onClick={() => c.cards[f.id] && setZoom(f.id)} />
            ))}
          </div>
          <p className="note colx__legend">{RARITY.map((r) => <span key={r.name} style={{ color: r.color }}>{"★".repeat(r.stars)} {r.name}  </span>)}</p>
        </>
      ) : tab === "figurines" ? (
        <>
          <p className="note">Les figurines se gagnent dans le coffre au trésor, en deux éditions. Touche-en une pour la tourner dans tous les sens.</p>
          <div className="colx__eds" role="tablist" aria-label="Édition des figurines">
            {([["s", `Studio ${FBX.filter((f) => c.figs[f.id]).length}/20`], ["c", `Classique ${FBX.filter((f) => c.figsC[f.id]).length}/20`]] as [Edition, string][]).map(([k, l]) => (
              <button key={k} type="button" role="tab" aria-selected={ed === k} className={cx("btn btn--small", ed === k ? "btn--gold" : "btn--soft")} onClick={() => setEd(k)}>{l}</button>
            ))}
          </div>
          <div className="colx__shelf">
            {FBX.map((f) => (
              <div key={f.id} className="colx__figslot">
                <button type="button" className="colx__figbtn" disabled={!figs[f.id]} aria-label={figs[f.id] ? `${f.name} : voir en grand` : `Figurine n° ${f.n} pas encore trouvée`} onClick={() => setFigZoom(f.id)}>
                  <Figurine id={f.id} edition={ed} owned={!!figs[f.id]} count={figs[f.id] ?? 0} size={140} spin={false} />
                </button>
                {(figs[f.id] ?? 0) > 1 ? <button type="button" className="btn btn--ghost btn--small" onClick={() => { const g = tradeFigDuplicates(f.id, ed); if (g) { coinSound(4); say(`${g} pièces d'or !`); } }}>Échanger le doublon</button> : null}
              </div>
            ))}
          </div>
          {figZoom ? <FigZoom id={figZoom} v={ed} count={figs[figZoom] ?? 1} onClose={() => setFigZoom(null)} /> : null}
        </>
      ) : tab === "styles" ? (
        <>
          <p className="note">Des personnages stylés trouvés dans les coffres. Ils n'ont pas encore de caractère… mais tu peux habiller ton personnage comme eux !</p>
          {c.styles.length ? (
            <div className="colx__styles">
              {c.styles.map((st, k) => (
                <div key={k} className="colx__style">
                  <Fig look={st.look} size={90} mouth="grin" />
                  <strong>{st.name}</strong>
                  <button type="button" className="btn btn--soft btn--small" onClick={() => { update({ look: st.look }); say(`Je m'habille comme ${st.name} !`); }}>L'habiller comme ça</button>
                </div>
              ))}
            </div>
          ) : (
            <p className="colx__empty">Pas encore de personnage stylé. Ouvre des coffres !</p>
          )}
        </>
      ) : (
        <div className="colx__soon">
          {[
            ["🎵", "Musiques", "De courts morceaux de musique à collectionner."],
            ["🎬", "Clips", "De petits clips vidéo rigolos."],
            ["⚽", "Séquences de match", "Les plus beaux buts, à revoir."],
          ].map(([i, t, d]) => (
            <div key={t} className="colx__soonitem">
              <span aria-hidden="true">{i}</span>
              <strong>{t}</strong>
              <em>{d}</em>
              <LuLock aria-hidden="true" />
            </div>
          ))}
          <p className="note">Bientôt dans le coffre au trésor !</p>
        </div>
      )}

      {zoom ? (
        <div className="chm" role="dialog" aria-modal="true" onClick={() => setZoom(null)}>
          <div className="chm__box chm__box--card">
            <FbxCard id={zoom} big count={c.cards[zoom] ?? 1} />
            <button type="button" className="btn btn--gold" onClick={() => setZoom(null)}>Fermer</button>
          </div>
        </div>
      ) : null}
      {chest ? <ChestModal onClose={() => setChest(false)} /> : null}
    </div>
  );
}
