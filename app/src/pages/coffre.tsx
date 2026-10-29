import { useState } from "react";
import { LuGem, LuGift, LuHeart, LuLock, LuSparkles, LuStar, LuTrophy, LuZap, LuFlag } from "react-icons/lu";
import type { Look } from "../mascot/look";
import { Fig } from "../mascot/Fig";
import { PERSOS } from "../mascot/lines";
import { say, update, useMascot } from "../mascot/state";
import { unlockChest, useStore } from "../store";
import { PageTitle } from "../ui/bits";
import { go } from "../router";
import { click } from "../sound";
import { cx, fmt } from "../util";

type Icon = typeof LuStar;

type Secret = { id: string; name: string; tag: string; text: string; price: number; perso: number; look: Look; line: string };

// Funny drawings inspired by the habits of famous players: no real name, no real face.
export const SECRETS: Secret[] = [
  { id: "s-boule", name: "Le Roi du Coup de Boule", tag: "Il fonce tête la première", text: "Un grand costaud chauve, très fier de sa tête. Quand il s'énerve, mieux vaut garder ses distances.", price: 60, perso: 1, look: { body: 3, skin: 2, hair: 5, hairColor: 0, outfit: 6, acc: ["band"] }, line: "Attention à ma tête ! Elle est très dure, et très célèbre !" },
  { id: "s-magicien", name: "Le Magicien aux Crampons d'Or", tag: "Un ballon, mille tours", text: "Il fait des gestes que personne n'avait vus. Le ballon lui obéit comme un petit chien.", price: 90, perso: 3, look: { body: 0, skin: 3, hair: 1, hairColor: 0, outfit: 5, acc: [] }, line: "Regarde, le ballon fait tout ce que je veux. Abracadabra !" },
  { id: "s-pieuvre", name: "Le Gardien Pieuvre", tag: "Il a des bras partout", text: "Il arrête tout : les tirs, les têtes, même les mouches. Personne ne sait combien il a de bras.", price: 110, perso: 4, look: { body: 5, skin: 1, hair: 2, hairColor: 1, outfit: 4, acc: ["cap"] }, line: "Tir à gauche ? Je suis là. Tir à droite ? Je suis déjà là." },
  { id: "s-gaucher", name: "Le Petit Génie Gaucher", tag: "Un pied gauche magique", text: "Tout petit, mais avec un pied gauche qui dessine des passes comme un pinceau.", price: 130, perso: 2, look: { body: 0, skin: 2, hair: 1, hairColor: 1, outfit: 2, acc: [] }, line: "Mon pied gauche est très poli. Il ne rate presque jamais." },
  { id: "s-fusee", name: "La Fusée Express", tag: "Plus rapide que le vent", text: "Elle court si vite que son ombre arrive en retard. Les défenseurs la regardent partir.", price: 150, perso: 1, look: { body: 0, skin: 4, hair: 4, hairColor: 2, outfit: 7, acc: ["band"] }, line: "Bzzzzou ! Tu m'as vu passer ? Non ? C'est normal !" },
  { id: "s-capitaine", name: "Le Capitaine Moustachu", tag: "Un chef qui rassemble", text: "Sa moustache impressionne autant que ses discours. Quand il parle, toute l'équipe se redresse.", price: 180, perso: 0, look: { body: 4, skin: 0, hair: 0, hairColor: 1, outfit: 1, acc: ["stache"] }, line: "Mes enfants, un match se gagne ensemble. Et avec une belle moustache." },
  { id: "s-dribbleur", name: "Le Dribbleur Chignon", tag: "On ne le voit jamais venir", text: "Il passe entre les jambes, par-dessus, par côté. Les défenseurs tournent en rond.", price: 210, perso: 3, look: { body: 1, skin: 5, hair: 4, hairColor: 0, outfit: 3, acc: ["scarf"] }, line: "Hop, entre les jambes ! Et hop, de l'autre côté !" },
  { id: "s-sage", name: "Le Sage de la Tactique", tag: "Il a tout compris du foot", text: "Cheveux gris, lunettes et carnet plein de flèches. Il sait où sera le ballon avant tout le monde.", price: 250, perso: 4, look: { body: 2, skin: 0, hair: 3, hairColor: 4, outfit: 4, acc: ["glasses", "clip"] }, line: "Selon mon carnet, le ballon va ici. Toujours. Regarde." },
];

type Special = { id: string; name: string; icon: Icon; hue: [string, string]; quirk: string; fact: string; price: number };

// Funny cards, only in the chest.
export const SPECIALS: Special[] = [
  { id: "c-butfou", name: "Le But Fou", icon: LuZap, hue: ["#ff5a76", "#7a1230"], quirk: "Le ballon est parti dans le ciel… et il est revenu dans la lucarne !", fact: "La première Coupe du monde a eu lieu en 1930, en Uruguay.", price: 40 },
  { id: "c-gant", name: "Le Gant d'Or", icon: LuHeart, hue: ["#ffcf4f", "#7a5410"], quirk: "Un gant si grand qu'il arrête les nuages.", fact: "Les gardiens de but jouent avec des gants pour mieux attraper le ballon.", price: 60 },
  { id: "c-sifflet", name: "Le Sifflet Géant", icon: LuFlag, hue: ["#8af3ff", "#0c4a63"], quirk: "On l'entend d'ici : tout le monde s'arrête !", fact: "Les arbitres utilisent un sifflet depuis 1878.", price: 80 },
  { id: "c-filet", name: "Le Filet Magique", icon: LuSparkles, hue: ["#34d399", "#0c5a41"], quirk: "Il attrape les ballons et les transforme en confettis.", fact: "Les filets des buts existent depuis 1889.", price: 100 },
  { id: "c-carton", name: "Le Carton Rigolo", icon: LuGift, hue: ["#f6c453", "#a8761c"], quirk: "Jaune pour les bêtises, rouge pour les grosses bêtises, arc-en-ciel pour les blagues.", fact: "Les cartons jaunes et rouges ont été utilisés pour la première fois à la Coupe du monde 1970.", price: 130 },
  { id: "c-penalty", name: "Le Penalty Légendaire", icon: LuStar, hue: ["#7aa2ff", "#1d2a66"], quirk: "Onze mètres de suspense, et un gardien qui tremble.", fact: "Le penalty a été inventé en 1891.", price: 160 },
  { id: "c-ballon", name: "Le Ballon d'Or Pur", icon: LuGem, hue: ["#ffe49a", "#a8761c"], quirk: "Il brille tellement qu'il faut mettre des lunettes de soleil.", fact: "Le Ballon d'Or a été créé en 1956 par le magazine France Football.", price: 200 },
  { id: "c-coupe", name: "La Coupe Étoilée", icon: LuTrophy, hue: ["#c58bff", "#3d1a6b"], quirk: "On dit qu'elle chante quand on la soulève.", fact: "La FIFA, qui organise la Coupe du monde, a été fondée en 1904 à Paris.", price: 240 },
];

export function Chest({ open }: { open: boolean }) {
  return (
    <svg className={cx("chest", open && "chest--open")} viewBox="0 0 160 130" aria-hidden="true">
      <ellipse cx="80" cy="120" rx="64" ry="8" fill="#0006" />
      <g className="chest__glow"><circle cx="80" cy="60" r="46" fill="#ffd76a" opacity=".55" /></g>
      <rect x="22" y="58" width="116" height="58" rx="8" fill="#8a4b1e" stroke="#3b1d08" strokeWidth="3" />
      <path d="M22 78 H138 M22 98 H138" stroke="#3b1d08" strokeWidth="2" opacity=".5" />
      <rect x="22" y="58" width="116" height="10" fill="#c9a24a" />
      <rect x="70" y="66" width="20" height="26" rx="4" fill="#f6c453" stroke="#3b1d08" strokeWidth="2.5" />
      <circle cx="80" cy="79" r="3.4" fill="#3b1d08" />
      <g className="chest__lid" style={{ transformOrigin: "22px 58px" }}>
        <path d="M22 58 Q22 20 80 20 Q138 20 138 58Z" fill="#a35a24" stroke="#3b1d08" strokeWidth="3" />
        <path d="M22 58 H138" stroke="#c9a24a" strokeWidth="8" />
        <path d="M50 28 V58 M110 28 V58" stroke="#c9a24a" strokeWidth="6" />
      </g>
    </svg>
  );
}

export function Coffre() {
  const s = useStore();
  const m = useMascot();
  const [tab, setTab] = useState<"perso" | "cartes">("perso");
  const [flash, setFlash] = useState("");
  const [opened, setOpened] = useState(0);

  function buy(id: string, price: number, name: string, line: string) {
    if (s.stars < price) {
      say(`Il te manque ${price - s.stars} étoiles. Gagne-en avec les jeux, le défi du jour, ou les doublons !`);
      return;
    }
    if (unlockChest(id, price)) {
      click("button");
      setOpened((n: number) => n + 1);
      setFlash(name);
      say(`Bravo ! Le coffre s'ouvre : ${name} ! ${line}`);
    }
  }

  return (
    <div className="coffre">
      <PageTitle kicker="Le trésor" title="Le coffre">
        <p>Dépense tes étoiles pour ouvrir le coffre : des personnages secrets pour la mascotte, et des cartes rigolotes qu'on ne trouve que là.</p>
      </PageTitle>
      <button type="button" className="colx__chest is-free" onClick={() => go({ page: "collection" })}>
        <span className="colx__chesticon" aria-hidden="true">🧰</span>
        <span>
          <strong>Le coffre au trésor des Footballinis</strong>
          <em>Cartes rigolotes, figurines, pièces d'or… dans « Ma collection »</em>
        </span>
      </button>
      <div className="coffre__top">
        <Chest open={opened > 0 && flash !== ""} />
        <div className="coffre__stars">
          <LuStar aria-hidden="true" />
          <strong>{fmt(s.stars)}</strong>
          <span>étoiles</span>
        </div>
      </div>
      <p className="coffre__how">Comment gagner des étoiles ? Avec les doublons de tes paquets, le défi du jour, et en gagnant aux jeux (3 étoiles par jeu et par jour).</p>
      {flash ? <p className="coffre__flash" role="status">Nouveau dans ton coffre : {flash} !</p> : null}

      <div className="segmented" role="tablist" aria-label="Le coffre">
        <button type="button" role="tab" aria-selected={tab === "perso"} className={cx("segmented__tab", tab === "perso" && "segmented__tab--on")} onClick={() => setTab("perso")}>Personnages secrets</button>
        <button type="button" role="tab" aria-selected={tab === "cartes"} className={cx("segmented__tab", tab === "cartes" && "segmented__tab--on")} onClick={() => setTab("cartes")}>Cartes spéciales</button>
      </div>

      {tab === "perso" ? (
        <ul className="secrets">
          {SECRETS.map((c) => {
            const mine = s.chest.includes(c.id);
            const wearing = m.s.perso === c.perso && JSON.stringify(m.s.look) === JSON.stringify(c.look);
            return (
              <li key={c.id} className={cx("secret", !mine && "secret--locked")}>
                <div className="secret__fig">
                  <Fig look={c.look} size={92} crop="bust" mouth="grin" mode={PERSOS[c.perso].mode} />
                  {!mine ? <span className="secret__lock"><LuLock aria-hidden="true" /></span> : null}
                </div>
                <div className="secret__body">
                  <h3>{mine ? c.name : "Personnage secret"}</h3>
                  <p className="secret__tag">{mine ? c.tag : "Ouvre le coffre pour le découvrir !"}</p>
                  {mine ? <p>{c.text}</p> : null}
                  {mine ? (
                    <button type="button" className="btn btn--gold" disabled={wearing} onClick={() => { update({ perso: c.perso, look: c.look }); window.setTimeout(() => say(c.line), 250); }}>
                      {wearing ? "Il est avec toi" : "Le choisir"}
                    </button>
                  ) : (
                    <button type="button" className="btn btn--soft" onClick={() => buy(c.id, c.price, c.name, c.line)}>
                      <LuStar aria-hidden="true" /> Ouvrir pour {c.price}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <ul className="specials">
          {SPECIALS.map((c) => {
            const mine = s.chest.includes(c.id);
            const Icon = c.icon;
            return (
              <li key={c.id} className={cx("spec", !mine && "spec--locked")} style={{ "--h1": c.hue[0], "--h2": c.hue[1] }}>
                <div className="spec__art">{mine ? <Icon aria-hidden="true" /> : <LuLock aria-hidden="true" />}</div>
                <h3>{mine ? c.name : "Carte secrète"}</h3>
                {mine ? (
                  <>
                    <p className="spec__quirk">{c.quirk}</p>
                    <p className="spec__fact"><strong>Savais-tu ?</strong> {c.fact}</p>
                    <button type="button" className="btn btn--soft" onClick={() => say(`${c.name}. ${c.quirk} Savais-tu ? ${c.fact}`)}>Écouter</button>
                  </>
                ) : (
                  <button type="button" className="btn btn--soft" onClick={() => buy(c.id, c.price, c.name, "")}>
                    <LuStar aria-hidden="true" /> Ouvrir pour {c.price}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
