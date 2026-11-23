// « Ma collection » : on arrive directement sur l'étagère — le classeur des joueurs, le classeur des Footballinis
// et la boîte à objets, chacun sur sa planche — puis le coffre des Footballinis.
// Rien n'est perdu de l'ancienne page : les cartes Footballinis, l'échange des doublons et la légende des raretés
// sont dans leur classeur ; les figurines, les personnages stylés et « Bientôt » sont dans la boîte à objets.
import { useState } from "react";
import { Piece } from "../ui/Piece";
import { ChestModal } from "../fbx/ui";
import { Chest } from "./coffre";
import { Etagere } from "./classeurs";
import { useStore } from "../store";

export function Collection() {
  const s = useStore();
  const [chest, setChest] = useState(false);

  return (
    <div className="colx">
      <Etagere />

      <div className="colx__purse">
        <span><Piece /> <b>{s.stars}</b> pièces</span>
      </div>

      <button type="button" className="colx__chest" onClick={() => setChest(true)}>
        <span className="colx__chesticon" aria-hidden="true"><Chest open={false} /></span>
        <span>
          <strong>Le coffre des Footballinis</strong>
          <em>Ouvre-le avec des pièces : surprises, figurines, personnages stylés</em>
        </span>
      </button>

      {chest ? <ChestModal onClose={() => setChest(false)} /> : null}
    </div>
  );
}
