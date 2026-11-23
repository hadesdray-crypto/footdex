// Les grands moments de chaque match raconté, dans l'ordre, pour les écouter (Philippe les lit) et les voir défiler.
// Écrits à partir du récit et des faits déjà vérifiés de chaque fiche (core.json) : rien d'ajouté, seulement raconté
// avec du suspense pour un enfant. `min` : la minute quand la fiche la donne ; `fort` : le moment qui fait tout basculer.
export type Moment = { min?: string; texte: string; fort?: boolean };

export const MOMENTS: Record<string, Moment[]> = {
  "finale-1998": [
    { texte: "Le pays entier s'arrête devant la télé. La France joue la finale de la Coupe du monde contre le Brésil." },
    { texte: "Corner pour la France. Zidane saute plus haut que tout le monde… et marque de la tête !", fort: true },
    { texte: "Avant la mi-temps, encore un corner. Encore Zidane. Encore de la tête. 2-0 !" },
    { texte: "Marcel Desailly est expulsé. La France est à dix. Va-t-elle tenir ?" },
    { texte: "Tout à la fin, Patrick Vieira lance Emmanuel Petit, qui marque le 3-0. La France est championne du monde pour la première fois !", fort: true },
  ],
  "finale-2018": [
    { min: "18e", texte: "Mario Mandžukić dévie le ballon… dans son propre but ! 1-0 pour la France !" },
    { min: "28e", texte: "Ivan Perišić égalise. Tout est à refaire." },
    { min: "38e", texte: "Main dans la surface ! L'arbitre regarde la vidéo… penalty. Griezmann le transforme : 2-1.", fort: true },
    { min: "59e", texte: "Paul Pogba frappe et marque : 3-1." },
    { min: "65e", texte: "Kylian Mbappé, 19 ans, marque à son tour en finale. 4-1 !" },
    { min: "69e", texte: "Mandžukić marque encore, cette fois dans le bon but. 4-2. Mais la France tient : Hugo Lloris soulève la coupe !", fort: true },
  ],
  "finale-2022": [
    { min: "23e", texte: "Penalty pour l'Argentine. Lionel Messi ne tremble pas : 1-0." },
    { min: "36e", texte: "Ángel Di María double la mise. 2-0. On croit la finale terminée…" },
    { min: "80e", texte: "Penalty pour la France ! Mbappé marque. 2-1. Tout le monde se réveille.", fort: true },
    { min: "81e", texte: "Une minute plus tard, Mbappé encore ! 2-2. Deux buts en deux minutes !", fort: true },
    { min: "108e", texte: "Prolongation. Messi marque. 3-2 pour l'Argentine." },
    { min: "118e", texte: "Penalty pour la France. Mbappé, encore lui : 3-3. C'est son troisième but en finale !", fort: true },
    { texte: "Les tirs au but. L'Argentine gagne 4 à 2. Mbappé a été extraordinaire, mais la coupe part en Argentine." },
  ],
  "finale-2006": [
    { texte: "Penalty pour la France. Zidane le frappe tout en douceur, une panenka… but ! 1-0.", fort: true },
    { texte: "Marco Materazzi égalise de la tête. 1-1." },
    { texte: "Prolongation. Après des mots échangés, Zidane donne un coup de tête à Materazzi. Carton rouge. C'est son dernier geste de joueur.", fort: true },
    { texte: "Les tirs au but. David Trezeguet frappe… sur la barre !" },
    { texte: "L'Italie gagne. Dans le but italien, Gianluigi Buffon a tenu jusqu'au bout." },
  ],
  "euro-2000": [
    { texte: "Marco Delvecchio marque pour l'Italie. 1-0. Les Italiens défendent, et le temps passe." },
    { texte: "Dernières secondes de la finale. Sylvain Wiltord frappe… but ! 1-1 ! Incroyable !", fort: true },
    { texte: "Prolongation au but en or : le premier qui marque gagne tout de suite." },
    { texte: "David Trezeguet frappe… but en or ! La France est championne d'Europe !", fort: true },
  ],
  "euro-1984": [
    { texte: "Michel Platini arrive en finale avec un record : 9 buts dans le tournoi." },
    { texte: "Au Parc des Princes, coup franc pour la France. Platini le tire… but ! 1-0.", fort: true },
    { texte: "Bruno Bellone marque le deuxième. 2-0 !" },
    { texte: "La France gagne son premier grand titre : championne d'Europe, à la maison." },
  ],
  "om-1993": [
    { texte: "L'OM affronte le grand Milan, en finale de la Coupe d'Europe." },
    { texte: "Basile Boli s'élève… et marque de la tête ! 1-0.", fort: true },
    { texte: "Marseille tient jusqu'au bout. C'est le premier club français champion d'Europe !" },
    { texte: "Mais la même saison, une affaire de triche en championnat de France fait retirer au club son titre de champion de France. La Coupe d'Europe, elle, reste à l'OM." },
  ],
  "psg-2025": [
    { min: "12e", texte: "Désiré Doué sert Achraf Hakimi : but ! 1-0 pour le PSG." },
    { min: "20e", texte: "Doué marque lui-même. 2-0 !" },
    { min: "63e", texte: "Doué, encore ! 3-0. L'Inter ne revient plus." },
    { texte: "Khvicha Kvaratskhelia marque le quatrième but." },
    { min: "86e", texte: "Senny Mayulu marque le cinquième. 5-0 : le plus grand écart de l'histoire en finale. Le PSG est champion d'Europe !", fort: true },
  ],
  "chelsea-2012": [
    { texte: "La finale se joue à Munich, dans le stade du Bayern. Tout le public est contre Chelsea." },
    { texte: "Le Bayern marque. Il ne reste que quelques minutes…" },
    { texte: "Dans les dernières minutes, Didier Drogba saute… et marque de la tête ! 1-1 !", fort: true },
    { texte: "Prolongation. Le Bayern a une énorme occasion… et ne marque pas." },
    { texte: "Les tirs au but. Le dernier, c'est Drogba. Il marque : Chelsea gagne sa première Ligue des champions !", fort: true },
  ],
  "istanbul-2005": [
    { texte: "Paolo Maldini marque très vite pour Milan." },
    { texte: "Hernán Crespo marque deux fois avant la pause. 3-0 à la mi-temps. Beaucoup de gens éteignent la télé…" },
    { texte: "Retour des vestiaires. Steven Gerrard marque. 3-1." },
    { texte: "Vladimír Šmicer marque à son tour. 3-2 !" },
    { texte: "Xabi Alonso égalise. 3-3 ! Liverpool est revenu en quelques minutes !", fort: true },
    { texte: "Les tirs au but. Le gardien Jerzy Dudek arrête ceux qu'il faut. Liverpool gagne : c'est le miracle d'Istanbul !", fort: true },
  ],
  "main-de-dieu": [
    { texte: "Maradona saute en même temps que le gardien anglais Peter Shilton… et pousse le ballon de la main ! L'arbitre ne voit rien. But. Maradona parlera de la « main de Dieu ».", fort: true },
    { texte: "Quatre minutes plus tard, Maradona part de son propre camp, élimine plusieurs Anglais, et glisse le ballon au fond. On l'appellera le but du siècle.", fort: true },
    { texte: "Gary Lineker réduit l'écart pour l'Angleterre. 2-1." },
    { texte: "L'Argentine gagne. Elle sera ensuite championne du monde." },
  ],
  "remontada-2017": [
    { texte: "Au match aller, à Paris, le PSG gagne 4-0. Presque personne n'imagine un retournement." },
    { texte: "Au retour, au Camp Nou, Barcelone marque encore et encore." },
    { texte: "Le PSG marque à son tour et croit se sauver." },
    { texte: "Barcelone pousse jusqu'au bout. Dans les dernières secondes, Sergi Roberto marque le sixième but !", fort: true },
    { texte: "6-1. Au total des deux matchs, 6-5 pour le Barça. On l'appelle la remontada." },
  ],
  "allemagne-bresil-2014": [
    { texte: "Le Brésil joue chez lui, sans sa star Neymar, blessé." },
    { texte: "L'Allemagne marque très tôt. Puis encore. Puis encore…", fort: true },
    { texte: "La première mi-temps devient incroyable. Le stade ne comprend plus rien." },
    { texte: "Score final : 7-1. Le Brésil marque un seul but, bien trop tard." },
    { texte: "L'Allemagne ira en finale et sera championne du monde." },
  ],
  "bresil-1970": [
    { texte: "Au Mexique, le Brésil de Pelé affronte l'Italie en finale." },
    { texte: "Pelé marque." },
    { texte: "Gérson, puis Jairzinho marquent à leur tour." },
    { texte: "Le dernier but : toute l'équipe se passe le ballon, et Carlos Alberto le termine au fond du but. 4-1 !", fort: true },
    { texte: "Pelé gagne sa troisième Coupe du monde." },
  ],
  "demi-2026": [
    { texte: "Demi-finale de Coupe du monde : la France contre l'Espagne de Lamine Yamal, qui vient d'avoir 19 ans." },
    { min: "22e", texte: "Penalty pour l'Espagne. Mikel Oyarzabal marque. 1-0." },
    { min: "30e", texte: "William Saliba doit sortir." },
    { min: "vers la 58e", texte: "Pedro Porro marque le deuxième but. 2-0.", fort: true },
    { texte: "La France est éliminée. C'est le dernier tournoi de Didier Deschamps comme sélectionneur." },
  ],
  "finale-2026": [
    { texte: "Finale au MetLife Stadium : l'Espagne contre l'Argentine, la championne de 2022." },
    { texte: "Pas de but en 90 minutes. Prolongation…" },
    { min: "106e", texte: "Ferran Torres marque ! 1-0 pour l'Espagne !", fort: true },
    { texte: "L'Espagne tient. Elle est championne du monde pour la deuxième fois, après 2010." },
  ],
};
