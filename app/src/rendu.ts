// Le retour des cartes effacées par la remise à zéro du 21 novembre 2026 (version 65).
// La liste exacte des anciennes cartes n'existe plus (elle a été effacée avec ses copies de secours),
// mais le nombre de cartes ouvertes avant, lui, est resté : on rend le même nombre de cartes,
// tirées comme dans les vrais paquets, au chemin où il était à chaque moment. Une seule fois.
import { buildPools, cheminOf, drawPack, needsPeople, openGroups, type Pulled } from "./cards";
import { type Album, loadPeople } from "./data";
import { say } from "./mascot/state";
import { ecrireCompteurs, lireCompteurs } from "./reglages-jeu";
import { getState, rendreCartes } from "./store";
import { storageGet, storageSet } from "./util";

const CLE = "footdex.rendu.v70";
const PAQUET = 5;

export function cartesRendues(): number {
  try {
    const v = JSON.parse(storageGet(CLE) ?? "null") as { n?: number } | null;
    return Number(v?.n) || 0;
  } catch {
    return 0;
  }
}

export async function rendreAnciennesCartes(album: Album): Promise<void> {
  if (storageGet(CLE)) return;
  const s = getState();
  // remise à zéro jamais faite sur ce téléphone : rien à rendre
  if (storageGet("footdex.remise.v65") !== "fait") return storageSet(CLE, JSON.stringify({ n: 0, quand: new Date().toISOString() }));
  const depuis = Object.values(s.cards).reduce((n, o) => n + o[0], 0);
  const avant = Math.min(3000, Math.max(0, s.opened - depuis));
  if (avant === 0) return storageSet(CLE, JSON.stringify({ n: 0, quand: new Date().toISOString() }));

  const plusLoin = cheminOf(avant).index;
  let people = null;
  if (needsPeople(openGroups(plusLoin))) {
    try {
      people = (await loadPeople()).list;
    } catch {
      return; // on réessaiera au prochain démarrage
    }
  }
  const pools = buildPools(album, people);
  const compteurs = lireCompteurs(); // les tirages de rendu ne comptent pas pour les garanties des vrais paquets
  const owned: Record<string, unknown> = { ...getState().cards };
  const rendu: Pulled[] = [];
  for (let i = 0; i < avant; i += PAQUET) {
    const reste = Math.min(PAQUET, avant - i);
    const p = drawPack(pools, cheminOf(i).index, owned, PAQUET).slice(0, reste);
    for (const x of p) owned[x.card.id] = 1;
    rendu.push(...p);
  }
  ecrireCompteurs(compteurs);
  if (!rendu.length) return;
  rendreCartes(rendu);
  storageSet(CLE, JSON.stringify({ n: rendu.length, quand: new Date().toISOString() }));
  window.setTimeout(() => say(`Bonne nouvelle : tes ${rendu.length} anciennes cartes sont revenues dans ton classeur !`), 2500);
}
