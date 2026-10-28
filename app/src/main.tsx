import { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { type Album, loadAlbum } from "./data";
import { Binder } from "./pages/binder";
import { Coffre } from "./pages/coffre";
import { Jeux } from "./pages/jeux";
import { Parents } from "./pages/parents";
import { Reglages } from "./pages/reglages";
import { demarrerHorsLigne } from "./maj/hors-ligne";
import { demarrerMajApk } from "./maj/maj-apk";
import { demarrerTempsEcran } from "./maj/temps-ecran";
import { garderLesLiensExternes } from "./maj/parents";
import { Carte } from "./pages/carte";
import { Defi, GrandDefi } from "./pages/defi";
import { Fiche } from "./pages/fiche";
import { Home } from "./pages/home";
import { Jeu } from "./pages/jeu";
import { MatchPage, Matchs } from "./pages/matchs";
import { ClubPage, Clubs, CoupePage, Coupes, Histoires, Lexique, Plus, Saison, Sources, Videos } from "./pages/misc";
import { Packs } from "./pages/packs";
import { Players } from "./pages/players";
import { Scores } from "./pages/scores";
import { type Route, token, useRoute } from "./router";
import { connectRemote } from "./store";
import { Failure, useLoad } from "./ui/bits";
import { Shell } from "./ui/shell";

function Page({ route, album }: { route: Route; album: Album }) {
  switch (route.page) {
    case "accueil": return <Home album={album} />;
    case "joueurs": return <Players album={album} />;
    case "fiche": return <Fiche album={album} id={route.id} />;
    case "jeu": return <Jeu album={album} id={route.id} />;
    case "paquets": return <Packs album={album} />;
    case "classeur": return <Binder album={album} />;
    case "matchs": return <Matchs album={album} />;
    case "match": return <MatchPage album={album} id={route.id} />;
    case "scores": return <Scores album={album} />;
    case "coupes": return <Coupes album={album} />;
    case "coupe": return <CoupePage album={album} id={route.id} />;
    case "clubs": return <Clubs album={album} />;
    case "club": return <ClubPage album={album} id={route.id} />;
    case "saison": return <Saison album={album} />;
    case "lexique": return <Lexique album={album} />;
    case "defi": return <Defi album={album} />;
    case "grand-defi": return <GrandDefi album={album} />;
    case "histoires": return <Histoires album={album} />;
    case "videos": return <Videos album={album} />;
    case "sources": return <Sources album={album} />;
    case "carte": return <Carte album={album} />;
    case "coffre": return <Coffre />;
    case "jeux": return <Jeux />;
    case "parents": return <Parents />;
    case "reglages": return <Reglages />;
    case "plus": return <Plus album={album} />;
  }
}

const TITLES: Record<string, string> = {
  accueil: "Footdex", joueurs: "Joueurs", paquets: "Paquets", classeur: "Classeur", matchs: "Matchs", scores: "Scores", coupes: "Coupes",
  clubs: "Clubs", saison: "Saison 2026-2027", lexique: "Lexique", defi: "Défi du jour", "grand-defi": "Grand défi", histoires: "Histoires",
  videos: "Vidéos", sources: "Sources", carte: "La carte", coffre: "Le coffre", jeux: "Les jeux", parents: "Coin des parents", reglages: "Paramètres", plus: "Plus",
};

function App() {
  const route = useRoute();
  const { data: album, error, retry } = useLoad(() => loadAlbum(), []);

  useEffect(() => {
    const name = route.page === "fiche" ? album?.byId.get(route.id)?.display : TITLES[route.page];
    document.title = name && name !== "Footdex" ? `${name} · Footdex` : "Footdex";
  }, [route, album]);

  if (error) {
    return (
      <div className="boot">
        <p className="boot__word">FOOTDEX</p>
        <Failure text="L'album n'a pas pu s'ouvrir. Vérifie la connexion, puis réessaie." retry={retry} />
      </div>
    );
  }
  if (!album) {
    return (
      <div className="boot" role="status">
        <p className="boot__word">FOOTDEX</p>
        <p className="boot__sub">Ouverture de l'album…</p>
      </div>
    );
  }
  return (
    <Shell page={route.page} pageKey={token(route)} album={album}>
      <Page route={route} album={album} />
    </Shell>
  );
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<App />);

// Saved progress also lives in claude.ai when the page is opened there, signed in.
setTimeout(() => void connectRemote(), 0);

// Offline copy and guided updates (site: service worker; Android app: in-app update), screen time, parents' corner.
void demarrerHorsLigne();
demarrerMajApk();
demarrerTempsEcran();
garderLesLiensExternes();
