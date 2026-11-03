// « Papa te propose une mission » : the parent starts it (with a code he chose), the child answers 3 questions
// (football, science, maths) and wins a special card. Also the secrets of the card machine. All offline, in the tablet.
import { useSyncExternalStore } from "react";
import { storageGet, storageSet } from "./util";
import { reglages, type Question } from "./reglages-jeu";

export type Mission = { en: boolean; gagnees: string[]; machine: string[] }; // en = a mission is waiting; machine = cards already put in the machine
const KEY = "footdex.mission";
function charge(): Mission {
  try {
    const m = JSON.parse(storageGet(KEY) ?? "null") as Partial<Mission> | null;
    const l = (x: unknown) => (Array.isArray(x) ? x.filter((v): v is string => typeof v === "string").slice(0, 400) : []);
    return { en: !!m?.en, gagnees: l(m?.gagnees), machine: l(m?.machine) };
  } catch {
    return { en: false, gagnees: [], machine: [] };
  }
}
let etat = charge();
const abonnes = new Set<() => void>();
function ecrire(m: Mission) {
  etat = m;
  storageSet(KEY, JSON.stringify(m));
  abonnes.forEach((f) => f());
}
export const mission = () => etat;
export function useMission(): Mission {
  return useSyncExternalStore(
    (f) => {
      abonnes.add(f);
      return () => void abonnes.delete(f);
    },
    () => etat,
  );
}
/** The parent sends the mission (the child will see « Papa te propose une mission »). */
export const lancerMission = () => ecrire({ ...etat, en: true });
export const annulerMission = () => ecrire({ ...etat, en: false });
export function gagnerMission(carte: string) {
  ecrire({ ...etat, en: false, gagnees: etat.gagnees.includes(carte) ? etat.gagnees : [...etat.gagnees, carte] });
}
export function marquerMachine(id: string): boolean {
  if (etat.machine.includes(id)) return false;
  ecrire({ ...etat, machine: [...etat.machine, id] });
  return true;
}
export const codeValide = (saisi: string) => {
  const c = reglages().codeMission.trim();
  return c.length > 0 && saisi.trim().toLowerCase() === c.toLowerCase();
};

// ------------------------------------------------------------------ questions (easy enough for a child, football flavoured)
export type Q = Question & { visuel: string; explication: string };
const Qs = (type: Q["type"], visuel: string, q: string, choix: string[], bonne: number, explication: string): Q => ({ type, visuel, q, choix, bonne, explication });
export const BANQUE: Q[] = [
  Qs("foot", "⚽", "Combien de joueurs une équipe a-t-elle sur le terrain pendant un match ?", ["9", "11", "13"], 1, "Onze joueurs par équipe, gardien compris."),
  Qs("foot", "🟨", "Quelle couleur de carton l'arbitre sort-il pour avertir un joueur ?", ["Jaune", "Bleu", "Vert"], 0, "Le carton jaune est un avertissement. Deux jaunes font un rouge."),
  Qs("foot", "🏆", "Quelle équipe a gagné la Coupe du monde 2018 ?", ["Le Brésil", "La France", "L'Allemagne"], 1, "La France a gagné en 2018, en Russie."),
  Qs("foot", "🧤", "Quel joueur a le droit de prendre le ballon avec les mains dans sa surface ?", ["Le gardien", "L'attaquant", "Le capitaine"], 0, "Seul le gardien peut le faire, dans sa surface."),
  Qs("foot", "🥅", "Comment appelle-t-on un tir donné depuis le point de penalty ?", ["Un corner", "Un penalty", "Une touche"], 1, "Le penalty : un face-à-face entre le tireur et le gardien."),
  Qs("foot", "⏱️", "Combien de temps dure un match de football, sans les prolongations ?", ["60 minutes", "90 minutes", "120 minutes"], 1, "Deux mi-temps de 45 minutes."),
  Qs("science", "🏀", "Un ballon posé sur l'herbe ne bouge pas tant que personne ne le pousse. Comment s'appelle cette idée ?", ["L'inertie", "La couleur", "Le rebond"], 0, "L'inertie : un objet immobile reste immobile tant qu'une force ne le fait pas bouger."),
  Qs("science", "⬇️", "Tu lances un ballon en l'air. Qu'est-ce qui le fait retomber ?", ["Le vent", "La gravité", "Le soleil"], 1, "La gravité de la Terre attire tout vers le sol."),
  Qs("science", "💨", "Quand on gonfle un ballon plus fort, que se passe-t-il ?", ["Il rebondit plus haut", "Il devient plus lourd d'un coup", "Il ne rebondit plus"], 0, "Plus d'air comprimé dedans, plus il repousse le sol."),
  Qs("science", "🌧️", "Sur une pelouse mouillée, le ballon glisse plus vite. Pourquoi ?", ["Il y a moins de frottement", "Il devient plus léger", "La pelouse est plus chaude"], 0, "L'eau diminue le frottement entre le ballon et l'herbe."),
  Qs("science", "🌀", "Un ballon frappé avec un effet tourne sur lui-même. Il décrit alors…", ["Une trajectoire courbe", "Une ligne droite parfaite", "Un cercle fermé"], 0, "La rotation fait dévier le ballon : c'est le tir brossé, ou « coup franc brossé »."),
  Qs("science", "🦵", "Pour envoyer le ballon plus loin, il faut taper…", ["Plus fort", "Plus doucement", "Avec un pied mouillé"], 0, "Plus la force est grande, plus le ballon prend de vitesse."),
  Qs("maths", "🧮", "Un joueur marque 2 buts par match pendant 4 matchs. Combien de buts en tout ?", ["6", "8", "10"], 1, "2 × 4 = 8."),
  Qs("maths", "🧮", "Une équipe a 11 joueurs. 3 sortent blessés. Combien en reste-t-il sur le terrain ?", ["7", "8", "9"], 1, "11 − 3 = 8."),
  Qs("maths", "🧮", "Un paquet contient 5 cartes. Avec 3 paquets, combien de cartes ?", ["15", "10", "20"], 0, "5 × 3 = 15."),
  Qs("maths", "🧮", "Un match dure 90 minutes. La mi-temps arrive à la moitié. À quelle minute ?", ["30", "45", "60"], 1, "90 ÷ 2 = 45."),
  Qs("maths", "🧮", "Ton équipe gagne 3 points par victoire. Après 4 victoires, combien de points ?", ["7", "12", "16"], 1, "3 × 4 = 12."),
  Qs("maths", "🧮", "Il y a 20 minutes de jeu écoulées sur 90. Combien en reste-t-il ?", ["60", "70", "80"], 1, "90 − 20 = 70."),
];
/** One question of each kind: the parent's own questions are mixed in with the built-in ones. */
export function tirerQuestions(): Q[] {
  const perso: Q[] = reglages().questionsPerso.map((q) => ({ ...q, visuel: q.type === "maths" ? "🧮" : q.type === "science" ? "🔬" : "⚽", explication: "" }));
  return (["foot", "science", "maths"] as const).map((t) => {
    const l = [...BANQUE, ...perso].filter((q) => q.type === t);
    return l[Math.floor(Math.random() * l.length)];
  });
}

// ------------------------------------------------------------------ the machine: extra secrets for some cards
export const CARTES_SPECIALES: Record<string, { nom: string; sous: string }> = {
  mbappe: { nom: "Kylian Mbappé", sous: "Carte spéciale de la mission" },
};
export const SECRETS: Record<string, { titre: string; texte: string }[]> = {
  mbappe: [
    { titre: "Une famille de sportifs", texte: "Son père, Wilfrid, était entraîneur de football, et sa mère, Fayza, a joué au handball. Le sport, il est tombé dedans tout petit, à Bondy, près de Paris." },
    { titre: "Une carrière éclair", texte: "Il joue son premier match pro avec Monaco à 16 ans. À 17 ans, il devient le plus jeune buteur de l'histoire du club." },
    { titre: "Champion du monde à 19 ans", texte: "En 2018, il gagne la Coupe du monde avec la France et marque en finale. À 19 ans seulement : avant lui, seul Pelé l'avait fait aussi jeune." },
    { titre: "36 km/h", texte: "Pendant la Coupe du monde 2018, il a été chronométré à plus de 36 km/h en courant avec le ballon. Plus vite qu'un vélo de course en ville !" },
    { titre: "Trois buts en finale", texte: "En 2022, il marque trois buts en finale de la Coupe du monde, un exploit très rare. Il termine meilleur buteur du tournoi, avec 8 buts." },
    { titre: "Le roi de Paris", texte: "Quand il quitte le PSG en 2024, il en est le meilleur buteur de tous les temps. Ensuite, il rejoint le Real Madrid." },
    { titre: "Son salaire, c'est combien ?", texte: "Selon la presse, il fait partie des joueurs les mieux payés du monde : plusieurs millions d'euros par mois. Ces chiffres sont des estimations, personne ne connaît les contrats exacts." },
  ],
};
