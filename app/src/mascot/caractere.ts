// The character of each companion, the way Plume has it in the Encyclopédie de la vie:
// how often he speaks up (level 1 to 4), his own outfit made of football gear, and what he puts on to read.
// The voice and the way of speaking are in lines.ts (each companion already has his own).
import type { Look } from "./look";
import type { Mode } from "./lines";

export type Level = 1 | 2 | 3 | 4;
export type Carac = { level: Level; label: string; style: string; tenue: Look; readAcc: string[] };

export const CARAC: Record<Mode, Carac> = {
  statue: {
    level: 1,
    label: "Discret",
    style: "Bonnet, écharpe et moustache. Il ne bouge presque pas et ne parle que si tu le touches. Pour lire, il met ses lunettes.",
    tenue: { body: 5, skin: 0, hair: 3, hairColor: 4, outfit: 0, acc: ["stache", "scarf", "beanie"] },
    readAcc: ["glasses"],
  },
  poli: {
    level: 2,
    label: "Présent",
    style: "Tenue d'arbitre, sifflet et barbe. Courtois, il te propose parfois de t'aider. Pour lire, il sort son carnet.",
    tenue: { body: 3, skin: 4, hair: 5, hairColor: 0, outfit: 4, acc: ["whistle", "beard"] },
    readAcc: ["clip"],
  },
  pointu: {
    level: 3,
    label: "Sérieux",
    style: "Lunettes et casque de commentateur. Il donne les chiffres exacts et commence par « D'après les chiffres… ». Pour lire, il prend son carnet de stats.",
    tenue: { body: 1, skin: 2, hair: 2, hairColor: 0, outfit: 3, acc: ["glasses", "headset"] },
    readAcc: ["clip"],
  },
  joueur: {
    level: 3,
    label: "Joueur",
    style: "Brassard de capitaine et ballon aux pieds. Il bouge partout et te propose des jeux. Pour lire, il garde le ballon sous le bras.",
    tenue: { body: 0, skin: 0, hair: 0, hairColor: 1, outfit: 5, acc: ["armband", "band"] },
    readAcc: ["ball"],
  },
  zombie: {
    level: 2,
    label: "Affamé",
    style: "Peau verte, points de suture, œil qui pend, gelée verte qui coule, mouches. Il grogne lentement… et si on le lance trop fort, il perd ses morceaux !",
    tenue: { body: 1, skin: 6, hair: 2, hairColor: 1, outfit: 8, acc: ["slime", "stitches", "eyedrop", "flies"] },
    readAcc: ["glasses"],
  },
  excite: {
    level: 4,
    label: "À fond",
    style: "Écharpe, bandeau et maquillage de supporter. Il veut TOUT te raconter, tout le temps ! Pour lire, il met son casque de commentateur.",
    tenue: { body: 2, skin: 0, hair: 2, hairColor: 2, outfit: 2, acc: ["scarf", "band", "paint"] },
    readAcc: ["headset"],
  },
};

/** The dots that show how much he talks: ●●○○ */
export const dots = (l: Level) => "●".repeat(l) + "○".repeat(4 - l);
