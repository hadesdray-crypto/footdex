// The journal of what's new. Add the newest entry FIRST. type: "appli" (🛠️) or "donnees" (📊).
export type Nouveaute = { date: string; titre: string; type: "appli" | "donnees"; points: string[] };

export const NOUVEAUTES: Nouveaute[] = [
  {
    date: "2026-10-28",
    titre: "Version 24 : la fenêtre de mise à jour tient dans l'écran",
    type: "appli",
    points: [
      "La fenêtre « Nouvelle mise à jour » est centrée et tient toujours dans l'écran.",
      "Le texte défile avec le doigt, les boutons restent visibles en bas.",
    ],
  },
  {
    date: "2026-10-28",
    titre: "Version 23 : Paramètres, jolie voix, et le jongleur qui vole",
    type: "appli",
    points: [
      "La voix n'est plus déformée : chaque personnage garde une voix naturelle.",
      "Réglages, « Comment il parle » : choisis parmi les voix françaises du téléphone.",
      "Bouton « Installer de plus belles voix » (voix Google haute qualité).",
      "Lance le jongleur d'un coup de doigt : il vole, tombe, se relève et retourne à son ballon.",
      "Déplace-le : il va chercher son ballon et le ramène à sa nouvelle place.",
      "Nouvelle page Paramètres (bouton ⚙️ en haut) : personnage, voix, sons, mises à jour.",
      "Deux touchers sur le personnage : son menu s'ouvre.",
      "Tous les personnages se lancent : appui long puis lancer, ou coup de doigt. Ils volent, tombent, ont un bobo et râlent !",
      "Type de voix au choix : Garçon (par défaut), Homme, Grave, ou celle du personnage.",
    ],
  },
  {
    date: "2026-10-28",
    titre: "Version 21 : le jongleur et son ballon",
    type: "appli",
    points: [
      "Le jongleur et son ballon ne font plus qu'un : le ballon reste à ses pieds, même dans son coin.",
      "Ses jambes bougent vraiment (hanches, genoux, pieds) : course, conduite de balle, tir, contrôle.",
      "Les jongles : c'est son pied qui fait monter le ballon, lui reste sur place.",
      "Le sol est sous ses pieds : le ballon roule, vole et rebondit dessus.",
      "Prends-lui son ballon et lance-le : il court le récupérer !",
      "De vrais bruits de ballon : frappe, rebond, contrôle.",
    ],
  },
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

