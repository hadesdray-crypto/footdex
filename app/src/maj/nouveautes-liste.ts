// The journal of what's new. Add the newest entry FIRST. type: "appli" (🛠️) or "donnees" (📊).
export type Nouveaute = { date: string; titre: string; type: "appli" | "donnees"; points: string[] };

export const NOUVEAUTES: Nouveaute[] = [
  {
    date: "2026-10-28",
    titre: "Version 20 : la voix et l'appli Android",
    type: "appli",
    points: [
      "Le personnage parle avec la vraie voix d'Android, même sans Internet.",
      "Chaque caractère a sa tenue, sa voix et sa façon de parler.",
      "Nouveaux équipements : bonnet, brassard de capitaine, casque de commentateur, maquillage de supporter.",
      "Les mises à jour se font dans l'appli, avec une barre de chargement.",
      "Sauvegarde de ta progression, et un coin des parents.",
    ],
  },
];

