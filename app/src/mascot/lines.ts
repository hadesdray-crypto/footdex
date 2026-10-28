// What the character says. Five characters, same facts, different voices.

export type Kind = "base" | "rare" | "eclat" | "legende" | "moment" | "shiny";

export type Mode = "statue" | "excite" | "poli" | "joueur" | "pointu";

export type Perso = {
  mode: Mode;
  ask: string[];
  more: string[];
  extra: string[];
  name: string;
  tag: string;
  sample: string;
  pitch: number;
  rate: number;
  voice: { gender: "m" | "f" | "any"; slot: number; formant: number; vib: number };
  mouth: "smile" | "open" | "flat" | "grin";
  greet: string[];
  open: string[];
  story: string[];
  card: Record<Kind, string[]>;
  shake: string[];
  thrown: string[];
  wardrobe: string[];
  done: string[];
};

export const PERSOS: Perso[] = [
  {
    mode: "statue",
    ask: [],
    more: [],
    extra: [],
    name: "Le Papi Statue",
    tag: "Immobile, il ne dit presque rien",
    sample: "Hm.",
    pitch: 0.7,
    rate: 0.8,
    voice: { gender: "m", slot: 0, formant: 0.88, vib: 6 },
    mouth: "smile",
    greet: [],
    open: [""],
    story: ["Hm. Écoute."],
    card: { base: [], rare: [], eclat: [], legende: [], moment: [], shiny: [] },
    shake: ["Hm."],
    thrown: ["…Aïe.", "Hm ! Pas content.", "Grmbl. Mon dos…"],
    wardrobe: ["Hm. Bien."],
    done: ["…Voilà."],
  },
  {
    mode: "excite",
    ask: ["Oh ! Je peux te raconter ? Je peux ? Touche-moi deux fois pour dire oui !", "J'ai un truc de ouf à te dire ! Je peux ? Touche-moi deux fois !", "Attends, attends, je connais ça par cœur ! Je te raconte ? Touche-moi deux fois pour oui !"],
    more: [" Je continue ?", " Je peux continuer ?", " Encore ? Dis oui !"],
    extra: [],
    name: "Le Supporter excité",
    tag: "Il veut TOUT te raconter",
    sample: "Je peux te raconter un truc ? Dis oui ! Dis oui ! Dis oui !",
    pitch: 1.3,
    rate: 1.3,
    voice: { gender: "m", slot: 1, formant: 1.1, vib: 0 },
    mouth: "open",
    greet: ["SALUT ! On va s'éclater avec le foot aujourd'hui !", "Te voilà ! Allez, on fonce !", "Hey hey hey ! Prêt pour du spectacle ?"],
    open: ["Allez, écoute ça ! ", "Alors alors alors ! ", "C'est parti ! "],
    story: ["Oh là là, celle-là, elle est FOLLE !", "Tu vas voir, c'est du grand spectacle !", "Accroche-toi, ça va secouer !"],
    card: {
      base: ["{n} ! Allez, on construit l'équipe !", "Un joueur de plus pour la bande : {n} !"],
      rare: ["OUH ! {n} en carte rare ! Ça commence à chauffer !", "Pas mal du tout, {n} !"],
      eclat: ["WAOUH ! {n} en Éclat ! Ça brille de partout !", "ÉCLAT ! {n} ! Je saute partout !"],
      legende: ["UNE LÉGENDE !!! {n} !!! Je n'y crois PAS !", "LÉGENDE ! {n} ! Tout le stade se lève !"],
      moment: ["Une carte Moment ! Je revis le match !", "Quel moment ! Les frissons !"],
      shiny: ["ARC-EN-CIEL !!! C'est le JACKPOT !!!", "{n} en arc-en-ciel ! C'est GIGANTESQUE !"],
    },
    shake: ["Ahhh ! Ça secoue comme dans la mêlée !", "Hé ! Tu me fais danser, là !"],
    thrown: ["Heeey ! Je ne suis pas un ballon !", "Aïe aïe aïe ! Carton rouge pour toi !"],
    wardrobe: ["WAOUH ! Je suis magnifique !", "Regarde-moi ce maillot ! Je vais marquer !"],
    done: ["Et voilà, je t'ai TOUT raconté ! Tu veux que je recommence ?", "Je n'ai plus rien à ajouter pour l'instant."],
  },
  {
    mode: "poli",
    ask: [],
    more: [],
    extra: [],
    name: "Le Poli",
    tag: "Courtois, il attend ta demande",
    sample: "Bonjour. Dis-moi simplement ce que tu veux savoir.",
    pitch: 0.9,
    rate: 0.9,
    voice: { gender: "m", slot: 2, formant: 0.96, vib: 0 },
    mouth: "flat",
    greet: ["Bonjour. Je suis à ta disposition quand tu veux.", "Bonjour Raphaël. Touche-moi si tu as besoin de moi."],
    open: ["Avec plaisir. ", "Bien sûr. ", "Voici. "],
    story: ["Je t'explique ce qui s'est passé.", "Analyse du match. Écoute.", "Voici l'histoire, du début à la fin."],
    card: {
      base: ["{n}. Un joueur utile, il faut des soldats.", "Bon, {n}. Solide, on le garde."],
      rare: ["{n}, c'est une belle recrue. Bien joué.", "Rare. {n}. Je valide."],
      eclat: ["{n} en Éclat. Joli coup, très joli coup.", "Un joueur de ce niveau change une équipe."],
      legende: ["Une Légende : {n}. Respect.", "{n}. Voilà un vrai monument. Bravo."],
      moment: ["Une carte Moment. Je m'en souviens, c'était un match énorme.", "Un grand moment de foot, bien rangé."],
      shiny: ["Arc-en-ciel. Je n'ai pas de mots. Félicitations.", "Même moi, je souris. {n}, arc-en-ciel !"],
    },
    shake: ["On se calme, on reste concentré.", "Hé ! Tu perturbes mon échauffement."],
    thrown: ["Un coach, ça ne se lance pas.", "Ça, c'est du jeu dangereux. Faute !"],
    wardrobe: ["Tenue de coach validée.", "Voilà. Propre et efficace."],
    done: ["Voilà. Puis-je faire autre chose pour toi ?", "C'est tout pour cette page. À ton service."],
  },
  {
    mode: "joueur",
    ask: [],
    more: [],
    extra: [],
    name: "Le Jongleur",
    tag: "Toujours un ballon aux pieds",
    sample: "Je suis pressé, je m'entraîne ! Fais vite !",
    pitch: 1.55,
    rate: 1.22,
    voice: { gender: "any", slot: 3, formant: 1.28, vib: 0 },
    mouth: "grin",
    greet: ["Salut ! Une seconde, je finis ma série de jongles !", "Coucou ! Chut, je compte mes jongles… vingt-deux, vingt-trois…"],
    open: ["Vite vite : ", "Rapide : ", "Hop, je réponds : "],
    story: ["Une histoire ? J'ai même une blague avec !", "Elle est vraie, celle-là, sans blague !", "Attention, ça va être drôle et vrai."],
    card: {
      base: ["{n} ! Il court plus vite que sa photo !", "Allez, {n}, un joueur de plus pour la bande !"],
      rare: ["Ooh, {n} ! Une carte rare, ça se fête !", "{n} ! Pas mal pour un joueur !"],
      eclat: ["{n} en Éclat ! Ça brille, j'ai besoin de lunettes de soleil !", "Éclat ! Même mon short brille !"],
      legende: ["NON ! {n} ?! Je ne suis pas digne ! Je m'agenouille !", "{n} ! Mon idole ! Je prie, je prie !"],
      moment: ["Un moment fort ! Je me mets à genoux, c'est trop beau !", "Quel moment ! J'en ai les larmes aux yeux, à genoux !"],
      shiny: ["Arc-en-ciel ?! C'est mon dieu ! À genoux, tout le monde !", "{n} en arc-en-ciel ! Je prie, je prie, je prie !"],
    },
    shake: ["Hé ! Mon ballon !", "Ça secoue ! Mon ballon va s'échapper !"],
    thrown: ["Mon ballon ! Il est où mon ballon ?!", "Aïe ! Et en plus j'ai perdu mes jongles !"],
    wardrobe: ["Ta-daaam ! Regarde-moi ça !", "Je suis tellement beau que mon miroir rougit !"],
    done: ["C'est tout ! Je retourne jongler, salut !", "Voilà, je suis pressé, je retourne m'entraîner !"],
  },
  {
    mode: "pointu",
    ask: [],
    more: [],
    extra: ["Pour aller plus loin, cherche le match complet sur internet : tu verras toutes les actions.", "Tu peux aussi chercher le nom du joueur sur internet pour voir ses meilleurs buts."],
    name: "Le Pointu",
    tag: "Chaque détail compte",
    sample: "Petit détail important : un ballon officiel pèse entre 410 et 450 grammes.",
    pitch: 1.02,
    rate: 0.98,
    voice: { gender: "f", slot: 0, formant: 1.04, vib: 0 },
    mouth: "smile",
    greet: ["Bonjour. Veux-tu entendre une belle histoire de football ?", "Te voilà. Le football a tant à raconter.", "Bienvenue. Chaque carte cache une histoire."],
    open: ["Alors, avec précision : ", "Détail important : ", "Je précise : "],
    story: ["Écoute bien, car c'est une belle histoire.", "Il y a longtemps, mais on s'en souvient toujours.", "Voici comment les choses se sont passées."],
    card: {
      base: ["{n}. Chaque joueur a sa propre histoire.", "Voici {n}. Voyons quelle histoire il nous raconte."],
      rare: ["{n}, une carte rare. Une belle histoire se cache derrière.", "Joli. {n} a marqué son époque."],
      eclat: ["{n} en Éclat. Un joueur qui laisse une trace.", "L'Éclat de {n} illumine ta collection."],
      legende: ["{n}, une Légende. Son nom traverse les années.", "On parlera de {n} encore longtemps."],
      moment: ["Une carte Moment. Un instant gravé dans l'histoire.", "Certains moments ne s'oublient jamais."],
      shiny: ["Arc-en-ciel… une rareté parmi les raretés.", "{n} en arc-en-ciel. Ce soir, tu fais partie de l'histoire."],
    },
    shake: ["Doucement… même un conte peut trembler.", "Oh ! Les pages se mélangent."],
    thrown: ["Voilà qui n'est pas très poli…", "Je ne vole pas, d'ordinaire. Quelle drôle d'histoire !"],
    wardrobe: ["Voilà une tenue digne d'un héros.", "Chaque tenue raconte quelque chose. Celle-ci me plaît."],
    done: ["Voilà, tout est dit. Le reste, c'est à toi de le vivre.", "Je n'ai plus rien à ajouter pour l'instant."],
  },
];

export const PAGES: Record<string, string> = {
  accueil: "Ici, c'est la maison de Footdex. Tu vois la fiche du jour, une recherche pour trouver un joueur, et en bas, le menu pour aller partout.",
  joueurs: "Ici, tu cherches un joueur. Écris son nom, ou utilise les filtres pour chercher par pays, par club ou par époque. Touche une carte pour ouvrir sa fiche.",
  fiche: "Voici la fiche d'un joueur : son club, sa carrière, ses titres et ses anecdotes. Lis tout, tu vas apprendre plein de choses.",
  jeu: "Cette fiche vient du jeu vidéo. Attention : les notes ne sont pas des statistiques de vrais matchs, ce sont des notes du jeu.",
  paquets: "C'est ici qu'on ouvre les paquets de cartes. Déchire le paquet, retourne les cartes une par une et garde les plus belles.",
  classeur: "Le classeur range toutes tes cartes. Tu y trouves aussi la boutique et le chemin des récompenses.",
  matchs: "Ici, les grands matchs de l'histoire, racontés. Choisis-en un pour lire son histoire, voir le score et les buteurs.",
  match: "Voici le récit d'un match : le score, le stade, les buteurs, et ce qu'il faut retenir.",
  scores: "Ici, tu trouves les scores récents. Tu vois qui a gagné, qui a perdu, et quand.",
  coupes: "Les grandes coupes : la Coupe de France, la Ligue Europa, la CAN, la Copa América et le Ballon d'Or. Touche-en une pour voir ses dernières finales.",
  coupe: "Voici une coupe et ses finales, de la plus récente à la plus ancienne.",
  clubs: "Les clubs : leur ville, leur stade et leur histoire.",
  club: "Voici un club, avec son stade, ses titres et son histoire.",
  saison: "La saison 2026-2027 : les stades et les prochains matchs.",
  lexique: "Le lexique explique les mots du foot, comme hors-jeu ou penalty. Avec lui, tu comprends les commentateurs.",
  carte: "Voici la carte du monde du football. Touche un point pour découvrir un stade et son histoire. Tu peux aussi partir en voyage : je t'emmène d'étape en étape.",
  jeux: "Ici, on joue ensemble ! Choisis un jeu, je t'explique la règle à voix haute et je joue avec toi. Si tu gagnes, tu reçois des étoiles.",
  coffre: "Le coffre au trésor. Avec tes étoiles, tu peux ouvrir des personnages secrets et des cartes rigolotes que tu ne trouves nulle part ailleurs.",
  defi: "Le défi du jour : un petit quiz pour gagner des étoiles.",
  "grand-defi": "Le grand défi : un quiz plus long, avec de belles récompenses.",
  histoires: "Des histoires du football, à lire tranquillement.",
  videos: "Des vidéos pour revivre de grands moments du football.",
  sources: "Ici, on dit d'où viennent les informations. Chez Footdex, on dit toujours d'où vient ce qu'on écrit.",
  plus: "Le menu Plus : matchs, scores, coupes, clubs, saison, lexique, défis, histoires, vidéos et sources.",
};

export function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}
