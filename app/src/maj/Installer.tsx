// « Installer l'application » (from the Encyclopédie de la vie): shown only on the website.
import { useState } from "react";
import { LuDownload, LuX } from "react-icons/lu";
import { storageGet, storageSet } from "../util";
import { EST_APK, LIEN_APK } from "./env";

const CLE = "footdex.installer.masque";
const android = () => /Android/i.test(navigator.userAgent);
const installee = () => EST_APK || window.matchMedia?.("(display-mode: standalone)").matches;
const inViewer = () => Boolean((window as unknown as { claude?: unknown }).claude);

export function Installer() {
  const [masque, setMasque] = useState(() => storageGet(CLE) === "oui");
  const [aide, setAide] = useState(false);
  if (installee() || masque || inViewer()) return null;
  return (
    <section className="panel installer">
      <div className="installer__row">
        {android() ? (
          <a className="btn btn--gold" href={LIEN_APK} onClick={() => setAide(true)}>
            <LuDownload aria-hidden="true" /> Installer l'application
          </a>
        ) : (
          <button type="button" className="btn btn--gold" onClick={() => setAide((a) => !a)}>
            <LuDownload aria-hidden="true" /> Installer l'application
          </button>
        )}
        <button type="button" className="iconbtn" aria-label="Ne plus afficher" onClick={() => { storageSet(CLE, "oui"); setMasque(true); }}>
          <LuX aria-hidden="true" />
        </button>
      </div>
      {aide ? (
        <ol className="list list--compact">
          {android() ? (
            <>
              <li>Attends la fin du téléchargement, puis ouvre le fichier.</li>
              <li>Si le téléphone bloque : « Paramètres », active « Autoriser depuis cette source », puis reviens.</li>
              <li>Touche « Installer » (et « Installer quand même » si Play Protect le demande).</li>
              <li>Pour garder tes cartes : avant, fais « Sauvegarder ma progression » dans Plus, Coin des parents.</li>
            </>
          ) : (
            <li>Ouvre cette page sur un téléphone Android pour installer l'application complète. Sur iPhone : Partager, puis « Sur l'écran d'accueil ».</li>
          )}
        </ol>
      ) : (
        <p className="note">Tout est rangé dans le téléphone : ensuite, plus besoin d'Internet.</p>
      )}
    </section>
  );
}
