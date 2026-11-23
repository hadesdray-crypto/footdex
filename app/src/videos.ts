// Les vidéos du rayon vidéos : seulement des liens vérifiés (le 23 novembre 2026) sur des chaînes OFFICIELLES
// (FIFA, OM, PSG, FFF, Ligue 1, UEFA, TNT Sports, Sikana…), qui acceptent d'être lues dans une autre appli.
// Les copies faites par des particuliers sont écartées : elles disparaissent et ne respectent pas les droits.
// Les photos des matchs viennent de Wikimedia Commons, sous licence libre ; l'auteur est écrit sous chaque photo.

export type Video = { yt: string; titre: string; chaine: string; genre: "complet" | "resume" | "recit"; langue?: string };

/** Le meilleur film officiel pour chaque match raconté. Pas de match complet officiel = le meilleur résumé officiel. */
export const VIDEO_MATCH: Record<string, Video> = {
  "finale-1998": { yt: "8R7ojiXL2VA", titre: "Brésil - France, finale de la Coupe du monde 1998", chaine: "FIFA", genre: "complet", langue: "anglais" },
  "finale-2018": { yt: "SvV6aUki6LU", titre: "France - Croatie, finale de la Coupe du monde 2018", chaine: "FIFA", genre: "complet", langue: "anglais" },
  "finale-2022": { yt: "RgqKdplLIk4", titre: "Argentine - France, finale de la Coupe du monde 2022", chaine: "FIFA", genre: "complet", langue: "anglais" },
  "finale-2006": { yt: "nELaL14ms7A", titre: "Italie - France, finale de la Coupe du monde 2006", chaine: "FIFA", genre: "complet", langue: "anglais" },
  "euro-2000": { yt: "74EVNVUWedE", titre: "David Trezeguet raconte son Euro 2000", chaine: "FFF", genre: "recit", langue: "français" },
  "euro-1984": { yt: "JPYaQVMwK74", titre: "France - Espagne 1984 raconté par Bellone et Hidalgo", chaine: "FFF", genre: "recit", langue: "français" },
  "om-1993": { yt: "IEhudQY0ijw", titre: "La finale OM - Milan 1993, le match complet", chaine: "Olympique de Marseille", genre: "complet", langue: "français" },
  "psg-2025": { yt: "4FqiDFAxCB4", titre: "Le résumé de PSG - Inter", chaine: "PSG", genre: "resume", langue: "français" },
  "chelsea-2012": { yt: "h-eXJpTftvM", titre: "Bayern - Chelsea 2012, finale", chaine: "TNT Sports", genre: "resume", langue: "anglais" },
  "istanbul-2005": { yt: "PWErN627Il8", titre: "Le miracle d'Istanbul, Liverpool - Milan 2005", chaine: "TNT Sports", genre: "resume", langue: "anglais" },
  "main-de-dieu": { yt: "Pl3AnYCeTrU", titre: "Argentine - Angleterre, Coupe du monde 1986", chaine: "FIFA", genre: "complet", langue: "anglais" },
  "allemagne-bresil-2014": { yt: "jW5jobEpkk4", titre: "Brésil - Allemagne, Coupe du monde 2014", chaine: "FIFA", genre: "complet", langue: "anglais" },
  "bresil-1970": { yt: "xZRdegSdrBI", titre: "Brésil - Italie, finale 1970, le long résumé", chaine: "FIFA", genre: "resume", langue: "anglais" },
  "demi-2026": { yt: "_cV8QcKp3GU", titre: "France - Espagne, demi-finale 2026, le résumé", chaine: "FIFA", genre: "resume", langue: "anglais" },
  "finale-2026": { yt: "PCZu5Lr5KRg", titre: "Espagne - Argentine, finale de la Coupe du monde 2026", chaine: "FIFA", genre: "complet", langue: "anglais" },
};
/** Les matchs sans vidéo officielle qu'on peut lire dans l'appli : où le voir quand même. */
export const AILLEURS: Record<string, string> = {
  "remontada-2017": "Le match complet est sur le site du FC Barcelone et sur UEFA.tv (il faut un compte). Aucune vidéo officielle ne peut être lue ici.",
};

export const BUTS: Video[] = [
  { yt: "4N7KtauLMh4", titre: "Les plus beaux buts de la saison en Ligue 1 (25/26)", chaine: "Ligue 1", genre: "resume", langue: "français" },
  { yt: "S-DL7HbwPk0", titre: "Les plus beaux buts de la saison en Ligue 1 (24/25)", chaine: "Ligue 1", genre: "resume", langue: "français" },
  { yt: "NHf74Ch7Jqo", titre: "Les plus beaux buts collectifs de la saison (24/25)", chaine: "Ligue 1", genre: "resume", langue: "français" },
  { yt: "EVOxq-vADlg", titre: "Les 10 plus beaux buts du PSG (24/25)", chaine: "Ligue 1", genre: "resume", langue: "français" },
  { yt: "zPdHk4Iq7DQ", titre: "Les plus beaux buts de la Coupe du monde 2026", chaine: "FIFA", genre: "resume" },
  { yt: "hTES44U0fTs", titre: "Les plus beaux buts des poules, Coupe du monde 2026", chaine: "FIFA", genre: "resume" },
  { yt: "UjBzxgGmpNU", titre: "Les plus beaux buts des huitièmes, Coupe du monde 2026", chaine: "FIFA", genre: "resume" },
  { yt: "NiPCDDNEZa0", titre: "Les plus beaux buts de la Ligue des champions 2025/26", chaine: "UEFA", genre: "resume" },
];

export const GESTES: Video[] = [
  { yt: "g_YDCuLZOsA", titre: "Le passement de jambes", chaine: "Sikana", genre: "recit", langue: "français" },
  { yt: "TiVS3XoF2CQ", titre: "La roulette", chaine: "Sikana", genre: "recit", langue: "français" },
  { yt: "LteDa9efWRU", titre: "La roulette, épisode 1", chaine: "Zidane Five Club", genre: "recit", langue: "français" },
  { yt: "P4FvKTU124w", titre: "Le crochet", chaine: "Sikana", genre: "recit", langue: "français" },
  { yt: "e-twqVBjvmc", titre: "La feinte de corps", chaine: "Sikana", genre: "recit", langue: "français" },
  { yt: "oDIKZtdsOvo", titre: "La frappe du cou-de-pied", chaine: "Sikana", genre: "recit", langue: "français" },
  { yt: "ff6z3a_iqb0", titre: "La frappe enroulée", chaine: "Sikana", genre: "recit", langue: "français" },
  { yt: "mOxSBatEPck", titre: "7 dribbles efficaces en match", chaine: "Unisport FR", genre: "recit", langue: "français" },
  { yt: "HaFe7L7cP0U", titre: "La roulette de Zidane", chaine: "Footstyle TV", genre: "recit", langue: "français" },
];

export type Photo = { src: string; quoi: string; duMatch: boolean; auteur: string; licence: string; fichier: string };
const P = (id: string, quoi: string, duMatch: boolean, auteur: string, licence: string, fichier: string): [string, Photo] => [
  id,
  { src: `media/matchs/${id}.webp`, quoi, duMatch, auteur, licence, fichier },
];
export const PHOTOS: Record<string, Photo> = Object.fromEntries([
  P("finale-1998", "La tribune présidentielle pendant la finale", true, "Archives nationales", "CC BY-SA 4.0", "Tribune présidentielle finale France Brésil football 12 juillet 1998.jpg"),
  P("finale-2018", "L'équipe de France avant la finale", true, "Kremlin.ru", "CC BY 4.0", "France WC2018 final.jpg"),
  P("finale-2022", "L'Argentine sacrée championne", true, "Sebas", "CC BY 3.0", "Argentina 3-3 Francia - Copa Mundial 2022 - Argentina campeón.jpg"),
  P("finale-2006", "Le stade olympique de Berlin pendant la finale", true, "Pixel-Sepp", "CC0", "Football-stadium-berlin.jpg"),
  P("euro-2000", "Les deux équipes alignées à Rotterdam", true, "Presidenza della Repubblica", "Licence de la Présidence italienne (attribution)", "Italy - France, 2 July 2000.jpg"),
  P("euro-1984", "Le coup franc de Platini", true, "El Gráfico", "Domaine public", "France v spain euro 1984 01.jpg"),
  P("om-1993", "Le stade olympique de Munich (photo de 1972)", false, "Fortepan / Romák Éva", "CC BY-SA 3.0", "Olimpiai Stadion. Fortepan 73812.jpg"),
  P("psg-2025", "L'Allianz Arena de Munich (photo de 2015)", false, "dom fellowes", "CC BY 2.0", "Allianz Arena (16921194516).jpg"),
  P("chelsea-2012", "Le stade pendant la fête de Chelsea", true, "Markus Unger", "CC BY 2.0", "Champions League Final 2012 celebration.jpg"),
  P("istanbul-2005", "Le stade Atatürk d'Istanbul (photo de 2010)", false, "Myrat", "CC BY-SA 3.0", "Atatürk Olimpiyat.jpg"),
  P("main-de-dieu", "Maradona marque le but du siècle", true, "El Gráfico", "Domaine public", "Goal of the Century.jpg"),
  P("remontada-2017", "Le Camp Nou pendant le match", true, "Hugo Pérez Marsol", "CC BY 2.0", "Barça 6 - PSG 1; Dimecres 8 de març de 2017.jpg"),
  P("allemagne-bresil-2014", "Les Allemands fêtent un but à Belo Horizonte", true, "Agência Brasil", "CC BY 3.0 br", "Brazil vs Germany, in Belo Horizonte 01.jpg"),
  P("bresil-1970", "Le but de Gérson", true, "El Gráfico", "Domaine public", "Brazil v italia 1970 01.jpg"),
  P("demi-2026", "Les Espagnols fêtent un but", true, "Bryan Berlin / WikiPortraits", "CC BY-SA 4.0", "France v Spain 7.24.26-208.jpg"),
  P("finale-2026", "L'Espagne soulève la coupe", true, "Bryan Berlin / WikiPortraits", "CC BY-SA 4.0", "Spain World Cup Winners Argentina v Spain 19 July 2026-1.jpg"),
]);
