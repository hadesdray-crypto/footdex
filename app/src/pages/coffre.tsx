import { useEffect, useState } from "react";
import { Piece } from "../ui/Piece";
import { LuGem, LuGift, LuHeart, LuLock, LuSparkles, LuStar, LuTrophy, LuZap, LuFlag } from "react-icons/lu";
import type { Look } from "../mascot/look";
import { Fig } from "../mascot/Fig";
import { PERSOS } from "../mascot/lines";
import { CARAC } from "../mascot/caractere";
import { DOCTOR_LOOK } from "../mascot/state";
import { HISTOIRES, armer, carteId, desarmer, lancerHistoire, useArmees, useVues } from "../mascot/histoires";
import { say, update, useMascot } from "../mascot/state";
import { unlockChest, useStore } from "../store";
import { reglages } from "../reglages-jeu";
import { PageTitle } from "../ui/bits";
import { go } from "../router";
import { click } from "../sound";
import { cx, fmt, storageGet, storageSet } from "../util";

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

/** The treasure chest of Footdex: dark wood, gold bands, a football on the lock. It opens in a burst of light and coins. */
let chestSeq = 0;
export function Chest({ open }: { open: boolean }) {
  const [u] = useState(() => `c${(chestSeq += 1)}`);
  return (
    <svg className={cx("chest", open && "chest--open")} viewBox="0 0 160 130" aria-hidden="true">
      <defs>
        <linearGradient id={`w${u}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9c5a26" /><stop offset="1" stopColor="#5e3213" /></linearGradient>
        <linearGradient id={`l${u}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#c07a38" /><stop offset="1" stopColor="#7a431a" /></linearGradient>
        <linearGradient id={`g${u}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff0a6" /><stop offset=".5" stopColor="#f6c453" /><stop offset="1" stopColor="#b9832a" /></linearGradient>
        <radialGradient id={`h${u}`}><stop offset="0" stopColor="#ffe9a0" stopOpacity=".95" /><stop offset="1" stopColor="#ffb52e" stopOpacity="0" /></radialGradient>
      </defs>
      <ellipse cx="80" cy="121" rx="66" ry="7" fill="#000" opacity=".4" />
      <g className="chest__glow"><circle cx="80" cy="58" r="64" fill={`url(#h${u})`} /></g>
      <g className="chest__sparks" fill="#fff5c2">
        <path d="M30 24 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2z" />
        <path d="M132 16 l1.6 4.8 4.8 1.6 -4.8 1.6 -1.6 4.8 -1.6 -4.8 -4.8 -1.6 4.8 -1.6z" />
        <path d="M118 44 l1.2 3.6 3.6 1.2 -3.6 1.2 -1.2 3.6 -1.2 -3.6 -3.6 -1.2 3.6 -1.2z" />
      </g>
      <g className="chest__coins">
        <ellipse cx="56" cy="62" rx="13" ry="5" fill={`url(#g${u})`} stroke="#7a5318" strokeWidth="1.5" />
        <ellipse cx="84" cy="58" rx="14" ry="5.4" fill={`url(#g${u})`} stroke="#7a5318" strokeWidth="1.5" />
        <ellipse cx="108" cy="63" rx="12" ry="4.8" fill={`url(#g${u})`} stroke="#7a5318" strokeWidth="1.5" />
        <circle cx="72" cy="52" r="6" fill="#ffd76a" stroke="#7a5318" strokeWidth="1.5" /><circle cx="97" cy="50" r="5" fill="#ffd76a" stroke="#7a5318" strokeWidth="1.5" />
      </g>
      <rect x="20" y="58" width="120" height="60" rx="9" fill={`url(#w${u})`} stroke="#2b1405" strokeWidth="3" />
      <path d="M21 80 H139 M21 98 H139" stroke="#2b1405" strokeWidth="2" opacity=".45" />
      <path d="M26 64 H134" stroke="#fff" strokeWidth="2" opacity=".12" />
      <rect x="20" y="58" width="120" height="11" fill={`url(#g${u})`} stroke="#2b1405" strokeWidth="2" />
      <rect x="20" y="108" width="120" height="10" rx="4" fill={`url(#g${u})`} stroke="#2b1405" strokeWidth="2" />
      <rect x="36" y="58" width="12" height="60" fill={`url(#g${u})`} stroke="#2b1405" strokeWidth="2" /><rect x="112" y="58" width="12" height="60" fill={`url(#g${u})`} stroke="#2b1405" strokeWidth="2" />
      <g fill="#3a1d08"><circle cx="42" cy="76" r="2" /><circle cx="42" cy="100" r="2" /><circle cx="118" cy="76" r="2" /><circle cx="118" cy="100" r="2" /></g>
      <path d="M66 70 h28 a4 4 0 0 1 4 4 v22 a14 14 0 0 1 -14 14 h-8 a14 14 0 0 1 -14 -14 v-22 a4 4 0 0 1 4 -4z" fill={`url(#g${u})`} stroke="#2b1405" strokeWidth="2.5" />
      <circle cx="80" cy="88" r="11" fill="#fff" stroke="#2b1405" strokeWidth="2" />
      <path d="M80 81.5 l6 4.4 -2.3 7 h-7.4 l-2.3 -7z" fill="#1a1f33" />
      <g className="chest__lid" style={{ transformOrigin: "20px 58px" }}>
        <path d="M20 58 Q20 16 80 16 Q140 16 140 58z" fill={`url(#l${u})`} stroke="#2b1405" strokeWidth="3" />
        <path d="M30 50 Q34 28 60 24" stroke="#fff" strokeWidth="3" opacity=".18" fill="none" strokeLinecap="round" />
        <path d="M20 58 H140" stroke="#2b1405" strokeWidth="2.5" />
        <path d="M44 24 V58 M116 24 V58" stroke={`url(#g${u})`} strokeWidth="9" />
        <path d="M44 24 V58 M116 24 V58" stroke="#2b1405" strokeWidth="1.2" opacity=".6" />
        <circle cx="80" cy="30" r="7" fill={`url(#g${u})`} stroke="#2b1405" strokeWidth="2" />
        <circle cx="80" cy="30" r="2.6" fill="#7a5318" />
      </g>
    </svg>
  );
}

/** What one opening of the chest costs, in coins. What is inside is drawn by chance: nothing can be chosen or seen before. */
export const OUVRIR = 100;

// The grown-up's key (menu « Essais »): shows everything and opens it for free, to test. Never on for the child.
const TOUT = "footdex.coffre.tout.v1";
export const coffreTout = () => storageGet(TOUT) === "1";
export function setCoffreTout(on: boolean) {
  storageSet(TOUT, on ? "1" : "0");
  window.dispatchEvent(new Event("footdex:coffretout"));
}
export function useCoffreTout(): boolean {
  const [on, setOn] = useState(coffreTout);
  useEffect(() => {
    const f = () => setOn(coffreTout());
    window.addEventListener("footdex:coffretout", f);
    return () => window.removeEventListener("footdex:coffretout", f);
  }, []);
  return on;
}

type Gain = { id: string; name: string; line: string; poids: number };
/** Everything the chest can give. The cheaper old prices are now the odds: the rarest things come out the least. */
function toutesLesCartes(): Gain[] {
  return [
    ...SECRETS.map((c) => ({ id: c.id, name: c.name, line: c.line, poids: 1000 / c.price })),
    ...SPECIALS.map((c) => ({ id: c.id, name: c.name, line: "", poids: 1000 / c.price })),
    ...HISTOIRES.map((h) => ({ id: carteId(h.id), name: h.titre, line: "", poids: 1000 / h.prix })),
  ];
}
function tirer(chest: string[]): Gain | null {
  const possibles = toutesLesCartes().filter((g) => !chest.includes(g.id) && !(g.id === carteId("mere") && !chest.includes(carteId("medecin"))));
  const total = possibles.reduce((n, g) => n + g.poids, 0);
  if (!possibles.length || total <= 0) return null;
  let x = Math.random() * total;
  for (const g of possibles) { x -= g.poids; if (x < 0) return g; }
  return possibles[possibles.length - 1];
}

export function Coffre() {
  const s = useStore();
  const m = useMascot();
  const tout = useCoffreTout();
  const [tab, setTab] = useState<"perso" | "cartes" | "histoires">("perso");
  const vues = useVues();
  const armees = useArmees();
  const [flash, setFlash] = useState("");
  const [opened, setOpened] = useState(0);

  const ouvrir = () => {
    const g = tirer(s.chest);
    if (!g) {
      say("Tu as déjà tout trouvé dans le coffre. Bravo !");
      return;
    }
    if (s.stars < OUVRIR) {
      say(`Il te manque ${OUVRIR - s.stars} pièces. Gagne-en avec les jeux ou avec les doublons !`);
      return;
    }
    if (unlockChest(g.id, OUVRIR)) {
      click("button");
      setOpened((n: number) => n + 1);
      setFlash(g.name);
      say(`Bravo ! Le coffre s'ouvre : ${g.name} ! ${g.line}`.trim());
    }
  };
  /** The grown-up's key only: opens one thing for free, to try it. */
  const offrir = (id: string) => { unlockChest(id, 0); setOpened((n: number) => n + 1); };
  const cache = (id: string) => tout || s.chest.includes(id);

  return (
    <div className="coffre">
      <PageTitle kicker="Le trésor" title="Le coffre">
        <p>Ouvre le coffre avec tes pièces : tu ne sais jamais ce qu'il cache. Personnages secrets, cartes rigolotes, histoires… Ce que tu trouves reste à toi.</p>
      </PageTitle>
      <button type="button" className="colx__chest" onClick={() => go({ page: "collection" })}>
        <span className="colx__chesticon" aria-hidden="true"><Chest open={false} /></span>
        <span>
          <strong>Le coffre des Footballinis</strong>
          <em>Un autre coffre, avec des pièces : figurines, personnages stylés… dans « Ma collection »</em>
        </span>
      </button>
      <div className="coffre__top">
        <Chest open={opened > 0 && flash !== ""} />
        <div className="coffre__stars">
          <Piece /> 
          <strong>{fmt(s.stars)}</strong>
          <span>pièces</span>
        </div>
      </div>
      <button type="button" className="btn btn--gold coffre__open" onClick={ouvrir}>
        <Piece />  Ouvrir le coffre : {OUVRIR} pièces
      </button>
      <p className="coffre__how">Comment gagner des pièces ? Avec les doublons de tes paquets et en gagnant aux jeux ({reglages().gainJeu} pièces par jeu et par jour).</p>
      {flash ? <p className="coffre__flash" role="status">Nouveau dans ton coffre : {flash} !</p> : null}

      <div className="segmented" role="tablist" aria-label="Ce que tu as trouvé">
        <button type="button" role="tab" aria-selected={tab === "perso"} className={cx("segmented__tab", tab === "perso" && "segmented__tab--on")} onClick={() => setTab("perso")}>Personnages</button>
        <button type="button" role="tab" aria-selected={tab === "cartes"} className={cx("segmented__tab", tab === "cartes" && "segmented__tab--on")} onClick={() => setTab("cartes")}>Cartes</button>
        <button type="button" role="tab" aria-selected={tab === "histoires"} className={cx("segmented__tab", tab === "histoires" && "segmented__tab--on")} onClick={() => setTab("histoires")}>Histoires</button>
      </div>

      {tab === "histoires" ? (
        <ul className="specials">
          {HISTOIRES.filter((h) => cache(carteId(h.id))).map((h) => {
            const mine = s.chest.includes(carteId(h.id));
            const look = (k: string) => (k === "medecin" ? DOCTOR_LOOK : m.s.looks[k] ?? CARAC[k as keyof typeof CARAC].tenue);
            return (
              <li key={h.id} className={cx("spec", !mine && "spec--locked")} style={{ "--h1": "#c58bff", "--h2": "#3d1a6b" }}>
                <div className="spec__art spec__art--duo">
                  {mine ? h.fixes.map((k) => <Fig key={k} look={look(k)} size={52} crop="bust" />) : <LuLock aria-hidden="true" />}
                </div>
                <h3>{h.titre}</h3>
                {mine ? (
                  <>
                    <p className="spec__quirk">{h.teaser}</p>
                    <p className="spec__fact">
                      {armees[h.id] > 0
                        ? `Carte activée, encore ${Math.max(1, Math.ceil(armees[h.id] / 60000))} min : mets les bons personnages côte à côte.`
                        : `${vues[h.id] ? `Vue ${vues[h.id]} fois. ` : ""}Carte éteinte : l'histoire ne vient pas toute seule.`}
                    </p>
                    {armees[h.id] > 0 ? (
                      <button type="button" className="btn btn--soft" onClick={() => desarmer(h.id)}>Éteindre la carte</button>
                    ) : (
                      <button type="button" className="btn btn--gold" onClick={() => armer(h.id)}>Activer 30 minutes</button>
                    )}
                    <button type="button" className="btn btn--soft" onClick={() => lancerHistoire(h.id, [...m.s.buddies, ...[PERSOS[m.s.perso].mode as string]])}>Revoir l'histoire</button>
                  </>
                ) : (
                  <button type="button" className="btn btn--soft" onClick={() => offrir(carteId(h.id))}>Essai : l'ouvrir gratuitement</button>
                )}
              </li>
            );
          })}
          {!HISTOIRES.some((h) => cache(carteId(h.id))) ? <li className="coffre__vide">Rien pour l'instant. Ouvre le coffre pour découvrir ce qu'il cache !</li> : null}
        </ul>
      ) : tab === "perso" ? (
        <ul className="secrets">
          {SECRETS.filter((c) => cache(c.id)).map((c) => {
            const mine = s.chest.includes(c.id);
            const wearing = m.s.perso === c.perso && JSON.stringify(m.s.look) === JSON.stringify(c.look);
            return (
              <li key={c.id} className={cx("secret", !mine && "secret--locked")}>
                <div className="secret__fig">
                  <Fig look={c.look} size={92} crop="bust" mouth="grin" mode={PERSOS[c.perso].mode} />
                  {!mine ? <span className="secret__lock"><LuLock aria-hidden="true" /></span> : null}
                </div>
                <div className="secret__body">
                  <h3>{c.name}</h3>
                  <p className="secret__tag">{c.tag}</p>
                  <p>{c.text}</p>
                  {mine ? (
                    <button type="button" className="btn btn--gold" disabled={wearing} onClick={() => { update({ perso: c.perso, look: c.look }); window.setTimeout(() => say(c.line), 250); }}>
                      {wearing ? "Il est avec toi" : "Le choisir"}
                    </button>
                  ) : (
                    <button type="button" className="btn btn--soft" onClick={() => offrir(c.id)}>Essai : l'ouvrir gratuitement</button>
                  )}
                </div>
              </li>
            );
          })}
          {!SECRETS.some((c) => cache(c.id)) ? <li className="coffre__vide">Rien pour l'instant. Ouvre le coffre pour découvrir ce qu'il cache !</li> : null}
        </ul>
      ) : (
        <ul className="specials">
          {SPECIALS.filter((c) => cache(c.id)).map((c) => {
            const mine = s.chest.includes(c.id);
            const Icon = c.icon;
            return (
              <li key={c.id} className={cx("spec", !mine && "spec--locked")} style={{ "--h1": c.hue[0], "--h2": c.hue[1] }}>
                <div className="spec__art">{mine ? <Icon aria-hidden="true" /> : <LuLock aria-hidden="true" />}</div>
                <h3>{c.name}</h3>
                <p className="spec__quirk">{c.quirk}</p>
                <p className="spec__fact"><strong>Savais-tu ?</strong> {c.fact}</p>
                {mine ? (
                  <button type="button" className="btn btn--soft" onClick={() => say(`${c.name}. ${c.quirk} Savais-tu ? ${c.fact}`)}>Écouter</button>
                ) : (
                  <button type="button" className="btn btn--soft" onClick={() => offrir(c.id)}>Essai : l'ouvrir gratuitement</button>
                )}
              </li>
            );
          })}
          {!SPECIALS.some((c) => cache(c.id)) ? <li className="coffre__vide">Rien pour l'instant. Ouvre le coffre pour découvrir ce qu'il cache !</li> : null}
        </ul>
      )}
    </div>
  );
}
