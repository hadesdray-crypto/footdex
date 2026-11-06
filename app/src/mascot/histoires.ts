// Les histoires secrètes : des petites scènes que l'on débloque en laissant certains personnages ensemble.
// Chaque histoire a plusieurs versions ; on peut la revoir depuis le coffre (avec d'autres personnages pour les témoins).
import { useEffect, useState, useSyncExternalStore } from "react";

/** `balle` : qui tient le ballon marqué à partir de cette ligne ; `sol` : qui est par terre (blessé) à partir de cette ligne. */
export type Ligne = { who: string; text: string; balle?: string; sol?: string };
export type Histoire = {
  id: string;
  titre: string;
  teaser: string;
  indice: string; // ce qu'il faut faire pour la débloquer (affiché avec un « ? »)
  fixes: string[]; // les personnages obligatoires
  prix: number; // en pièces : les histoires sont les cartes les plus rares du coffre
  temoins: number; // combien de personnages « au hasard » écoutent (w1, w2)
  versions: Ligne[][];
  calme?: boolean; // histoire douce : pas de fête à la fin
};

const w1 = "w1", w2 = "w2";
const L = (who: string, text: string, fx: { balle?: string; sol?: string } = {}): Ligne => ({ who, text, ...fx });

export const HISTOIRES: Histoire[] = [
  {
    id: "philippe",
    prix: 400,
    titre: "Philippe et la bouteille",
    teaser: "Pourquoi Philippe n'est jamais devenu un grand joueur.",
    indice: "Le Papy + 2 copains, côte à côte, un petit moment.",
    fixes: ["statue"],
    temoins: 2,
    versions: [
      [
        L(w1, "Papy, tu connais l'histoire de Philippe ?"),
        L("statue", "Hm. Oui, je connais l'histoire de Philippe."),
        L(w2, "Il aurait pu être un grand joueur, mais personne ne sait ce qui s'est passé !"),
        L("statue", "Moi, je sais. Un jour de grand match, il y avait un recruteur dans les tribunes."),
        L("statue", "Et Philippe a glissé sur une bouteille d'eau. La bouteille est partie… en pleine figure du recruteur !"),
        L(w1, "Oh non !"),
        L(w2, "Aïe, aïe, aïe…"),
        L("statue", "Il n'a jamais été repris. Chut… personne ne doit le savoir."),
      ],
      [
        L("statue", "Hm. Approchez, les enfants. Je vais vous parler de Philippe."),
        L(w1, "Philippe ? Le sérieux ? Il joue super bien !"),
        L("statue", "Oui. Il aurait pu être un très grand joueur. Un recruteur était venu le voir jouer."),
        L(w2, "Et alors ?"),
        L("statue", "Alors il a glissé sur une bouteille d'eau, en plein match. Elle a volé droit sur le recruteur."),
        L(w1, "Pas possible !"),
        L("statue", "Si. Depuis ce jour-là, on ne l'a plus jamais appelé."),
        L(w2, "On ne dira rien, papy. Promis."),
      ],
      [
        L(w2, "Papy, pourquoi Philippe n'est pas devenu célèbre ?"),
        L("statue", "Hm. C'est une longue histoire… Il y avait un grand match, et un recruteur."),
        L(w1, "Un vrai recruteur ?"),
        L("statue", "Un vrai. Philippe court, il glisse sur une bouteille d'eau… et pan ! Elle atterrit sur le nez du recruteur."),
        L(w1, "Ouille !"),
        L(w2, "Le pauvre Philippe…"),
        L("statue", "Voilà pourquoi il ne joue pas dans un grand club. Mais ça, c'est un secret entre nous."),
      ],
    ],
  },
  {
    id: "ballon",
    prix: 500,
    titre: "Le ballon marqué du Jongleur",
    teaser: "Pourquoi le Jongleur n'arrive jamais à garder son ballon.",
    indice: "Philippe et le Jongleur, ensemble.",
    fixes: ["philippe", "joueur"],
    temoins: 0,
    versions: [
      [
        L("joueur", "Philippe, rends-moi mon ballon !", { balle: "philippe" }),
        L("philippe", "Celui avec la marque ? Non. Viens le chercher."),
        L("joueur", "Je n'y arrive jamais ! Tu es trop fort pour moi !"),
        L("philippe", "C'est le foot, mon grand. Regarde, je tire !"),
        L("philippe", "Aïe ! Aïe aïe aïe ! J'ai glissé ! Ma jambe est en vrac !", { sol: "philippe" }),
        L("joueur", "Ça y est ! Mon ballon ! Enfin !", { balle: "joueur" }),
        L("joueur", "Merci la glissade, Philippe ! Je le garde, et j'appelle le Médecin !"),
        L("philippe", "Garde-le… Moi, je reste là, par terre."),
      ],
      [
        L("joueur", "Mon ballon, il a ma marque dessus ! Rends-le-moi !", { balle: "philippe" }),
        L("philippe", "Je suis plus fort que toi. Je le garde. Comme toujours."),
        L("joueur", "À chaque fois, tu m'empêches de le reprendre !"),
        L("philippe", "Parce que c'est du sérieux. Attention, tir de loin !"),
        L("philippe", "Ouille ! Le pied qui part ! Ma jambe !", { sol: "philippe" }),
        L("joueur", "Il roule ! Il est à moi ! Mon ballon !", { balle: "joueur" }),
        L("joueur", "Tu es plus fort que moi, c'est vrai. Mais le sol est plus fort que toi !"),
        L("philippe", "Ne rigole pas… Appelle le Médecin."),
      ],
    ],
  },
  {
    id: "papy",
    prix: 800,
    titre: "Pourquoi le Papy aime le foot",
    teaser: "Ce que le foot veut dire pour le Papy.",
    indice: "Le Papy + 1 copain, un moment tranquille.",
    fixes: ["statue"],
    temoins: 1,
    calme: true,
    versions: [
      [
        L(w1, "Papy, pourquoi tu aimes autant le foot ?"),
        L("statue", "Hm. Au début, ce n'est pas le foot que j'aimais."),
        L("statue", "J'avais un meilleur ami, à l'école. Je l'aimais plus que tout, mais je n'ai jamais osé le lui dire."),
        L("statue", "Lui, il adorait le foot. Alors je l'ai suivi à tous ses matchs, pendant des années."),
        L(w1, "Et toi, tu aimais ça ?"),
        L("statue", "Pas du tout. Je regardais surtout mon ami. Et puis, petit à petit, j'ai aimé le jeu aussi."),
        L("statue", "Mon ami n'est plus là aujourd'hui. Moi, je suis toujours là."),
        L("statue", "Le foot, c'est tout ce qui me reste de lui. Quand je regarde un match, il est à côté de moi."),
        L(w1, "Alors on regardera des matchs avec toi, Papy."),
        L("statue", "Merci, mon petit. Hm… Chut. C'est entre nous."),
      ],
      [
        L("statue", "Hm. Viens t'asseoir, petit. Je vais te dire pourquoi je suis fou de football."),
        L(w1, "Je t'écoute, Papy."),
        L("statue", "Quand j'étais petit, j'avais un copain d'école. Mon meilleur ami. Je l'aimais très fort, et je n'ai jamais su lui dire."),
        L("statue", "Il ne parlait que de foot. Alors je l'accompagnais à chaque match, même sous la pluie."),
        L(w1, "Mais toi, ça ne t'intéressait pas ?"),
        L("statue", "Au début, non. Et puis, avec les années, je suis devenu un vrai fan. Plus que lui, peut-être."),
        L("statue", "Il est parti depuis longtemps. Moi, je suis resté."),
        L("statue", "Alors le foot, c'est ma façon de rester avec lui. Chaque match, c'est un peu de lui."),
        L(w1, "Il serait fier de toi, Papy."),
        L("statue", "Hm… Peut-être. Merci. Et chut, hein ? Ça reste entre nous."),
      ],
    ],
  },
  {
    id: "lacet",
    prix: 450,
    titre: "Le lacet du Jongleur",
    teaser: "Pourquoi le Jongleur tombe tout le temps.",
    indice: "Le Papy et le Jongleur, ensemble.",
    fixes: ["statue", "joueur"],
    temoins: 0,
    versions: [
      [
        L("joueur", "Papy, je suis encore tombé en jouant !"),
        L("statue", "Hm. Tes lacets étaient défaits ?"),
        L("joueur", "Je n'ai pas de lacets : j'ai des scratchs. Mes parents voulaient m'acheter des chaussures à lacets, j'ai toujours refusé."),
        L("statue", "Un footballeur qui ne sait pas faire ses lacets ! Il y a un temps pour tout."),
        L("joueur", "Moi, je préfère jouer avec mon ballon."),
        L("statue", "Bon… viens ici. J'ai bien mal au dos, mais je vais te le faire, ton lacet."),
        L("joueur", "Merci, papy !"),
      ],
      [
        L("statue", "Hm. Regarde-moi ça. Tu es encore tombé."),
        L("joueur", "Ce n'est pas ma faute, ma chaussure est bizarre !"),
        L("statue", "Elle a des lacets, ta chaussure. Et tu ne sais pas les faire."),
        L("joueur", "J'ai toujours porté des scratchs. Et puis, le football, c'est différent !"),
        L("statue", "Différent, différent… Tu perds du temps avec ton ballon, jeune homme."),
        L("joueur", "Aïe, mon nez…"),
        L("statue", "Allez, je me mets à quatre pattes. Aïe, mon dos. Voilà, c'est fait."),
      ],
    ],
  },
  {
    id: "voix",
    prix: 500,
    titre: "La voix du supporter",
    teaser: "Pourquoi le supporter n'a plus de voix après un match.",
    indice: "Le Supporter excité et le Poli, ensemble.",
    fixes: ["excite", "poli"],
    temoins: 0,
    versions: [
      [
        L("poli", "Excusez-moi… vous avez l'air un peu enroué, non ?"),
        L("excite", "Chhh ! Parle plus bas… Hier, j'ai tellement crié pour mon équipe que j'ai perdu ma voix pendant une semaine."),
        L("poli", "Oh, je suis désolé. Une semaine entière ?"),
        L("excite", "Sept jours sans pouvoir dire BUUUT ! J'ai dû applaudir à la place. Mais surtout, ne le dis à personne."),
        L("poli", "Je vous le promets. Pardon de vous avoir fait parler."),
      ],
      [
        L("excite", "Hé, toi ! Tu veux entendre mon plus beau cri ?"),
        L("poli", "Avec plaisir, mais… je ne voudrais pas vous déranger."),
        L("excite", "Ahhh… hhh… Voilà. Plus de voix. Ça m'arrive à chaque grand match."),
        L("poli", "Pardon, pardon ! C'est de ma faute ?"),
        L("excite", "Mais non ! C'est la faute du but à la dernière minute. Chut, c'est notre secret."),
      ],
    ],
  },
  {
    id: "jardin",
    prix: 550,
    titre: "Le ballon du président",
    teaser: "Pourquoi le Poli s'excuse tout le temps.",
    indice: "Le Poli et le Papy, ensemble.",
    fixes: ["poli", "statue"],
    temoins: 0,
    versions: [
      [
        L("statue", "Hm. Pourquoi t'excuses-tu toujours, mon garçon ?"),
        L("poli", "Pardon… C'est une vieille histoire. Un jour, j'ai tapé dans un ballon un peu trop fort."),
        L("poli", "Il est passé par-dessus un mur. Dans le jardin du président du club."),
        L("statue", "Aïe. Et alors ?"),
        L("poli", "Il a cassé son rosier préféré. Depuis, je dis pardon à tout le monde. Pardon, papy."),
        L("statue", "Hm. Un rosier… Ça se replante, tu sais."),
      ],
      [
        L("poli", "Papy, je peux vous confier quelque chose ? Je vous demande pardon d'avance."),
        L("statue", "Hm. Parle, je t'écoute."),
        L("poli", "Un ballon, un mur, le jardin du président… et un grand bruit de vase."),
        L("statue", "Un vase ! Ha ha. Et le président ?"),
        L("poli", "Il n'a rien dit. Et c'est pire. Pardon, pardon, pardon."),
      ],
    ],
  },
  {
    id: "stats",
    prix: 600,
    titre: "Les chiffres du Pointu",
    teaser: "Les statistiques que le Pointu n'a jamais osé calculer.",
    indice: "Le Pointu et le Jongleur, ensemble.",
    fixes: ["pointu", "joueur"],
    temoins: 0,
    versions: [
      [
        L("joueur", "Pointu, tu connais les chiffres de tout le monde. Et les tiens ?"),
        L("pointu", "Précisément… non. Je ne les ai jamais calculés."),
        L("joueur", "Allez, je t'aide ! Combien de buts as-tu marqués ?"),
        L("pointu", "Zéro. Sur zéro match. Taux de réussite : impossible à calculer."),
        L("joueur", "Ha ha ! Alors tu es aussi bon que moi quand j'ai oublié mes lacets !"),
      ],
      [
        L("pointu", "Je connais le nombre de passes de tout le monde. Sauf les miennes."),
        L("joueur", "Les tiennes ? Compte-les !"),
        L("pointu", "Une. Hier. Et elle est partie dans la mauvaise direction."),
        L("joueur", "Alors la statistique, c'est cent pour cent de passes ratées !"),
        L("pointu", "Précisément… Je préfère ne pas écrire ça dans mon carnet."),
      ],
    ],
  },
  {
    id: "medecin",
    prix: 700,
    titre: "Le secret du Médecin",
    teaser: "D'où vient vraiment le Zombie ?",
    indice: "Le Médecin et le Pointu, ensemble, après deux soins pour une fracture.",
    fixes: ["medecin", "pointu"],
    temoins: 0,
    versions: [
      [
        L("medecin", "Encore une fracture… Vous me fatiguez, vous savez. Je vais vous dire quelque chose."),
        L("medecin", "Il y a longtemps, dans mon pays, j'ai inventé un produit pour booster les footballeurs."),
        L("pointu", "D'après les chiffres… c'est une très mauvaise idée."),
        L("medecin", "Le premier à l'essayer a couru comme un cheval au galop. Mais il n'a jamais su s'arrêter. Il s'est écrasé contre un mur."),
        L("medecin", "J'ai gardé le corps pour mes recherches. Et pendant l'analyse… il s'est relevé. Il lui manquait un œil."),
        L("pointu", "Je… je préfère ne pas faire le calcul."),
      ],
      [
        L("pointu", "Docteur, vous avez l'air très fatigué."),
        L("medecin", "Je vous ai soigné deux fois de suite. Cela m'a donné envie de parler."),
        L("medecin", "J'ai fabriqué un jour un stéroïde, quand personne ne savait que c'était interdit."),
        L("medecin", "Le footballeur a couru plus vite que tout le monde. Et plus vite qu'un cheval. Puis le mur est arrivé."),
        L("pointu", "Précisément… ça fait beaucoup de kilomètres par heure."),
        L("medecin", "Il est mort. Puis il s'est relevé, pendant l'examen. Voilà."),
      ],
    ],
  },
  {
    id: "mere",
    prix: 900,
    titre: "La mère du Zombie",
    teaser: "Ce que disait sa maman, quand il était footballeur.",
    indice: "Le Médecin et le Zombie, ensemble, après le secret du Médecin.",
    fixes: ["medecin", "zombie"],
    temoins: 0,
    versions: [
      [
        L("medecin", "Tu sais, sa mère ne voulait pas qu'il joue au football."),
        L("zombie", "Maman…"),
        L("medecin", "Elle disait que c'était trop dangereux. Qu'il valait mieux faire des études."),
        L("medecin", "Je n'ai jamais compris ce que ça avait à voir avec mon produit. Vraiment pas."),
        L("zombie", "Grouu… Ouille."),
      ],
      [
        L("zombie", "Ma… man…"),
        L("medecin", "Oui, oui, sa maman. Elle voulait qu'il étudie, pas qu'il joue au foot."),
        L("medecin", "Moi, je trouve que le football est un très bon sport. Il n'y a aucun danger."),
        L("zombie", "Hmm… Hmm…"),
      ],
    ],
  },
];

export const histoire = (id: string) => HISTOIRES.find((h) => h.id === id);
/** The chest id of a story's card: nothing happens in the game for a story whose card was not opened. */
export const carteId = (id: string) => `h-${id}`;

// ------------------------------------------------------------------ what has been discovered
const KEY = "footdex.histoires.v1";
const SOINS = "footdex.soins.v1";
const EVT = "footdex:histoires";
type Vues = Record<string, number>;
const lire = (): Vues => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
};
let cache = JSON.stringify(lire());
export function vues(): Vues {
  return lire();
}
export function marquerVue(id: string) {
  const v = lire();
  v[id] = (v[id] ?? 0) + 1;
  try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* nothing */ }
  cache = JSON.stringify(v);
  window.dispatchEvent(new Event(EVT));
}
let vuesBrut = "";
let vuesObj: Vues = {};
export function useVues(): Vues {
  const raw = useSyncExternalStore(
    (fn: () => void) => { window.addEventListener(EVT, fn); return () => window.removeEventListener(EVT, fn); },
    () => cache,
  );
  if (raw !== vuesBrut) {
    vuesBrut = raw;
    try { vuesObj = JSON.parse(raw); } catch { vuesObj = {}; }
  }
  return vuesObj;
}
/** A story only plays by itself while its card has been activated by the player (30 minutes). */
const ARMEES = "footdex.histoires.armees.v1";
export const DUREE_ARMEE = 30 * 60 * 1000;
let armeesBrut: string | null = null;
let armeesObj: Record<string, number> = {};
const lireArmees = (): Record<string, number> => {
  try {
    const raw = localStorage.getItem(ARMEES) ?? "{}";
    if (raw !== armeesBrut) {
      armeesBrut = raw;
      const v = JSON.parse(raw);
      armeesObj = v && typeof v === "object" ? v : {};
    }
    return armeesObj;
  } catch {
    return {};
  }
};
const ecrireArmees = (v: Record<string, number>) => {
  try { localStorage.setItem(ARMEES, JSON.stringify(v)); } catch { /* nothing */ }
  window.dispatchEvent(new Event(EVT));
};
/** Milliseconds left before the card stops being active (0 = not active). */
export function resteArmee(id: string): number {
  return Math.max(0, (lireArmees()[id] ?? 0) - Date.now());
}
export const estArmee = (id: string) => resteArmee(id) > 0;
export function armer(id: string) {
  const v = { ...lireArmees() };
  v[id] = Date.now() + DUREE_ARMEE;
  ecrireArmees(v);
}
export function desarmer(id: string) {
  const v = { ...lireArmees() };
  delete v[id];
  ecrireArmees(v);
}
/** Re-renders now and then so the remaining time stays right. */
export function useArmees(): Record<string, number> {
  const [, setT] = useState(0);
  useEffect(() => {
    const f = () => setT((n) => n + 1);
    window.addEventListener(EVT, f);
    const i = window.setInterval(f, 15000);
    return () => { window.removeEventListener(EVT, f); window.clearInterval(i); };
  }, []);
  const out: Record<string, number> = {};
  for (const id of Object.keys(lireArmees())) out[id] = resteArmee(id);
  return out;
}

/** The Doctor treated a fracture (cast): two in a row unlock his secret. */
export function compterSoin() {
  try { localStorage.setItem(SOINS, String(soins() + 1)); } catch { /* nothing */ }
}
export function soins(): number {
  try { return Number(localStorage.getItem(SOINS) ?? 0) || 0; } catch { return 0; }
}

/** Does this story unlock now? `present` = who is on the screen. */
export function conditionRemplie(id: string, present: string[], chest: string[] = []): boolean {
  const h = histoire(id);
  if (!h) return false;
  if (!chest.includes(carteId(id))) return false; // the card has to be won in the chest first
  if (!h.fixes.every((k) => present.includes(k))) return false;
  if (present.length < h.fixes.length + h.temoins) return false;
  if (id === "medecin") return soins() >= 2;
  if (id === "mere") return chest.includes(carteId("medecin"));
  return true;
}

export function lancerHistoire(id: string, prefer: string[] = [], version?: number) {
  window.dispatchEvent(new CustomEvent("footdex:histoire", { detail: { id, prefer, version } }));
}
