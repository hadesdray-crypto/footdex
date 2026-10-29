// What the character says. Five characters, same facts, different voices.

export type Kind = "base" | "rare" | "eclat" | "legende" | "moment" | "shiny";

export type Mode = "statue" | "excite" | "poli" | "joueur" | "pointu" | "zombie";

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
    tag: "Le vieux sage du foot, avec sa canne",
    sample: "Hm. De mon temps, petit, on jouait avec un ballon en cuir. Et il était lourd !",
    pitch: 0.7,
    rate: 0.78,
    voice: { gender: "m", slot: 0, formant: 0.82, vib: 6 },
    mouth: "smile",
    greet: ["Hm. Bonjour, petit.", "Ah, te voilà, jeune homme. Approche, approche.", "Hm… Tu es là. Bien. Assieds-toi, je vais te raconter."],
    open: [""],
    story: ["Hm. Écoute.", "De mon temps…", "Approche, petit. Celle-là, je l'ai vue."],
    card: {
      base: ["Hm. {n}… Je ne le connais pas, celui-là. Moi, j'ai arrêté de savoir à partir de 2000.", "{n} ? Ah… les jeunes d'aujourd'hui. Je ne peux pas être au courant de tout, hein. Je suis un vieux."],
      rare: ["Hm. {n}. Il a l'air bien. Mais après 2000, moi, je ne sais plus rien."],
      eclat: ["Ça brille… {n}. De mon temps, les cartes ne brillaient pas."],
      legende: ["Ah ! {n} ! Ça, c'est du vrai football. Je m'en souviens.", "{n}… Une légende. Ça me rappelle ma jeunesse."],
      moment: ["Hm. Ce moment-là… Si c'est avant 2000, je l'ai sûrement vu."],
      shiny: ["Oh… ça brille. Mes vieux yeux…"],
    },
    shake: ["Hé ! Doucement ! Mon dos !", "Hm. On ne secoue pas les vieux."],
    thrown: ["…Aïe.", "Hm ! Pas content.", "Grmbl. Mon dos…", "Ma canne ! Où est ma canne ?"],
    wardrobe: ["Hm. Bien.", "Pas mal… pour un vieux."],
    done: ["…Voilà.", "Hm. C'est tout."],
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
  {
    mode: "zombie",
    ask: [],
    more: [" Grrr… encore ?", " Tu en veux encore ? Grrr…"],
    extra: [],
    name: "Le Zombie",
    tag: "Il perd ses morceaux… mais pas son appétit de foot",
    sample: "Grrrr… du fooot… cerveaux de foot…",
    pitch: 0.75,
    rate: 0.82,
    voice: { gender: "m", slot: 2, formant: 0.82, vib: 9 },
    mouth: "open",
    greet: ["Grrr… bonjour… je suis… pas mort… juste fatigué.", "Grrrr… du foot… J'adore le foot… et les cerveaux.", "Bouh ! … Grrr, je rigole. Salut !"],
    open: ["Grrr… écoute… ", "Mmmh… alors… ", "Cerveaux… euh, pardon : "],
    story: ["Grrr… une histoire… qui donne la chair de poule.", "Mmmh… celle-là… elle m'a fait perdre la tête.", "Écoute… grrr… c'est une histoire à mourir de rire."],
    card: {
      base: ["Grrr… {n}… appétissant.", "{n}… Mmmh… je le garde."],
      rare: ["Grrr ! {n} en rare ! Ça me redonne des couleurs !", "Ooooh… {n}… joli."],
      eclat: ["GRRRR ! {n} en Éclat ! Ça brille… mes yeux !", "{n} ! Mon œil en tombe… encore."],
      legende: ["{n}… Une Légende… même les zombies le connaissent.", "Grrr… {n}… immortel… comme moi."],
      moment: ["Un Moment… grrr… gravé dans mon cerveau… enfin, ce qu'il en reste.", "Mmmh… ce moment-là… je m'en souviens… grrr."],
      shiny: ["ARC-EN-CIEL ! Grrrr ! J'en perds la tête !", "{n} en arc-en-ciel… je fonds… comme ma gelée."],
    },
    shake: ["Grrr ! Doucement ! Mes morceaux !", "Arrête ! Ça va se décoller !"],
    thrown: ["GRRR ! Ma tête !", "Aïe… pas trop fort… je me décolle !", "Grrr… ramasse mes morceaux, s'il te plaît."],
    wardrobe: ["Grrr… très chic… pour un zombie.", "Mmmh… ça cache mes coutures."],
    done: ["Grrr… fini… je retourne… dormir… sous le terrain.", "C'est tout… grrr."],
  },
];

export const PAGES: Record<string, string> = {
  collection: "Ta collection ! En haut, le coffre au trésor : un coffre gratuit chaque jour, avec des pièces, des paquets de cartes Footballinis, des figurines et des personnages stylés. Dessous, ton classeur de cartes, puis les Footballinis, les figurines et les personnages stylés.",
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
  parents: "Le coin des parents : les nouveautés, la sauvegarde de ta progression, et les réglages des grands avec le code parent.",
  reglages: "Les paramètres : choisis ton personnage, change sa voix, ses habits, et les bruitages.",
  plus: "Le menu Plus : matchs, scores, coupes, clubs, saison, lexique, défis, histoires, vidéos et sources.",
};

export function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}


// ------------------------------------------------------------------ the story of the world (the Papi tells it)
// Everybody in the app knows it, but only the old Papi likes to remind it, so that the young ones remember
// that they do not come from nowhere.
export type LoreLine = { t: string; act?: "vie" | "univers" | "pray" };
export const LORE: LoreLine[] = [
  { t: "Hm… Les jeunes… Ils ne savent plus d'où on vient. Ni pourquoi on est là." },
  { t: "Approche, petit. Je vais te raconter l'histoire du monde." },
  { t: "Au début, il n'y avait rien. Pas de stade. Pas de ballon. Pas de joueurs. Rien du tout." },
  { t: "Et puis un jour, un papa qui aimait très fort son fils a décidé de lui fabriquer une application de football." },
  { t: "Lui, le football, il n'aimait pas tellement ça. Mais ça ne l'a pas empêché de prendre son temps, et son plaisir, pour construire ce monde, morceau par morceau." },
  { t: "Ici, ce papa, on l'appelle le Concepteur." },
  { t: "Son fils s'appelle Raphaël. Tout ce que tu vois ici, le ballon, les cartes, les stades… et même nous… tout ça existe parce que Raphaël existe." },
  { t: "Sans Raphaël, il n'y aurait pas de monde du tout. Voilà comment l'amour peut créer la vie…", act: "vie" },
  { t: "… et même l'univers !", act: "univers" },
  { t: "Tout le monde ici le sait. La plupart s'en fichent, ils vivent leur vie. Mais moi, ça me tient à cœur." },
  { t: "Un jour, peut-être, le Concepteur m'invitera dans le monde des concepteurs. Mais pour l'instant, il ne m'a pas autorisé." },
  { t: "Alors je reste ici, avec vous, à devenir vieux tranquillement. Et je le rappelle aux jeunes : on ne vient pas de nulle part. … Hm." },
];
/** What the others say, now and then, very quietly. */
export const LORE_HINTS: string[] = [
  "Le Papi dit toujours que sans Raphaël, on n'existerait pas. Chut… on n'en parle pas trop.",
  "Tu sais quoi ? Tout ce monde a été fabriqué pour Raphaël. C'est le Papi qui me l'a dit.",
  "Un jour, quelqu'un a construit tout ce terrain juste pour Raphaël. Ça donne envie de bien jouer, non ?",
];


// ------------------------------------------------------------------ the Papi's old football stories (before 2000: after, he does not know)
export const OLD_STORIES: string[] = [
  "En 1958, en Suède, un gamin brésilien de 17 ans a gagné la Coupe du monde. Il a marqué deux buts en finale. Il s'appelait Pelé. Il en a gagné trois en tout : 1958, 1962 et 1970. Trois ! Personne n'a fait mieux.",
  "En 1958 aussi, un Français, Just Fontaine, a marqué 13 buts dans une seule Coupe du monde. Treize ! C'est toujours le record, petit. Toujours.",
  "Raymond Kopa, un petit Français fils de mineurs, a gagné le Ballon d'Or en 1958. Il dribblait si bien qu'on l'appelait le Napoléon du football.",
  "Garrincha, au Brésil, avait les jambes toutes tordues. Les docteurs disaient qu'il ne pourrait jamais jouer. Et en 1962, c'est lui qui a fait gagner la Coupe du monde au Brésil !",
  "Lev Yachine, un gardien russe, toujours habillé en noir. On l'appelait l'Araignée noire, parce qu'on aurait dit qu'il avait huit bras. C'est le seul gardien qui a gagné le Ballon d'Or, en 1963.",
  "En 1966, l'Angleterre a gagné sa Coupe du monde, chez elle. En finale, un ballon a tapé la barre et a rebondi sur la ligne. But ou pas but ? On se dispute encore, petit. Encore aujourd'hui.",
  "En 1970, au Mexique, Pelé a fait une tête parfaite. Mais le gardien anglais, Gordon Banks, a plongé et l'a sortie. On l'appelle l'arrêt du siècle. Pelé lui-même n'en revenait pas.",
  "En 1974, les Hollandais de Johan Cruyff jouaient le football total : tout le monde attaquait, tout le monde défendait. Ils ont perdu la finale contre l'Allemagne de Beckenbauer, le Kaiser. Mais tout le monde s'en souvient.",
  "En 1976, Saint-Étienne, les Verts, a perdu la finale de la Coupe d'Europe contre le Bayern Munich, 1 à 0. Ils ont tapé deux fois les poteaux. Des poteaux carrés ! Avec des poteaux ronds, le ballon serait peut-être rentré…",
  "En 1982, à Séville, la France a joué la demi-finale de la Coupe du monde contre l'Allemagne. 3 à 3 ! Puis les tirs au but… et on a perdu. J'en ai pleuré, petit. Un vieux qui pleure, tu imagines ?",
  "En 1984, Michel Platini a marqué 9 buts dans le Championnat d'Europe. Neuf ! Et la France a gagné son premier grand trophée. Quel joueur…",
  "En 1986, Maradona a marqué deux buts contre l'Angleterre dans le même match. Le premier avec la main : il a appelé ça la main de Dieu. Le deuxième en dribblant presque toute l'équipe : le but du siècle !",
  "En 1993, Marseille a gagné la Ligue des champions. Basile Boli a marqué de la tête contre le grand Milan. 1 à 0 ! C'était la première fois pour un club français.",
  "Et le 12 juillet 1998… La France championne du monde ! Zidane a marqué deux fois de la tête en finale contre le Brésil. 3 à 0 ! Tout le pays était dans la rue. Ça, petit, je ne l'oublierai jamais.",
];
/** When the young ones talk about things after 2000. */
export const AFTER_2000: string[] = [
  "Ah ça, je ne peux pas savoir, hein. Moi, j'ai arrêté de savoir à partir de 2000.",
  "Les trucs de jeunes… Je ne peux pas être au courant de tout. Je suis un vieux !",
  "Après les années 2000 ? Hm. Demande au Jongleur, il est jeune, lui.",
];
/** His little accident… */
export const OUPS: string[] = [
  "Oh… Hm. J'ai un petit problème. Excusez-moi, les jeunes… Je reviens.",
  "Oh là là… Euh… Ne regardez pas. Je dois m'absenter un instant.",
];
export const OUPS_BACK: string[] = ["Hm. Voilà. Ça va mieux. On n'en parle plus.", "… Me revoilà. Tout propre. On n'en parle plus, hein ?"];


// ------------------------------------------------------------------ the Jongleur's idols: for them, and only them, he falls to his knees
export const IDOLS = ["mbappe", "zidane", "messi", "ronaldo", "pele", "maradona", "henry", "platini", "ronaldinho", "neymar", "griezmann", "benzema", "haaland", "cruyff", "beckenbauer", "papin", "cantona", "dembele", "yamal", "bellingham"];
export const IDOL_LINES = ["{n} ! C'EST MON IDOLE ! Je ne suis pas digne !", "Non… {n} ! Je me mets à genoux ! Mon héros !", "{n}… Le plus grand ! J'en ai des étoiles plein les yeux !"];
