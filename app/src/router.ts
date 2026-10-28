// Hash routing with plain tokens (letters, digits, hyphens), as the claude.ai viewer allows.
import { useSyncExternalStore } from "react";

export type Route =
  | { page: "accueil" }
  | { page: "joueurs" }
  | { page: "fiche"; id: string }
  | { page: "jeu"; id: number }
  | { page: "paquets" }
  | { page: "classeur" }
  | { page: "matchs" }
  | { page: "match"; id: string }
  | { page: "scores" }
  | { page: "coupes" }
  | { page: "coupe"; id: string }
  | { page: "clubs" }
  | { page: "club"; id: string }
  | { page: "saison" }
  | { page: "lexique" }
  | { page: "defi" }
  | { page: "grand-defi" }
  | { page: "histoires" }
  | { page: "videos" }
  | { page: "sources" }
  | { page: "carte" }
  | { page: "coffre" }
  | { page: "jeux" }
  | { page: "parents" }
  | { page: "plus" };

const SIMPLE = new Set([
  "accueil", "joueurs", "paquets", "classeur", "matchs", "scores", "coupes", "clubs", "saison",
  "lexique", "defi", "grand-defi", "histoires", "videos", "sources", "carte", "coffre", "jeux", "parents", "plus",
]);

export function parse(hash: string): Route {
  const token = decodeURIComponent(hash.replace(/^#/, "")).trim();
  if (SIMPLE.has(token)) return { page: token } as Route;
  const dash = token.indexOf("-");
  if (dash > 0) {
    const head = token.slice(0, dash);
    const rest = token.slice(dash + 1);
    if (head === "fiche" && rest) return { page: "fiche", id: rest };
    if (head === "jeu" && /^\d+$/.test(rest)) return { page: "jeu", id: Number(rest) };
    if (head === "match" && rest) return { page: "match", id: rest };
    if (head === "coupe" && rest) return { page: "coupe", id: rest };
    if (head === "club" && rest) return { page: "club", id: rest };
  }
  return { page: "accueil" };
}

export function token(route: Route): string {
  switch (route.page) {
    case "fiche": return `fiche-${route.id}`;
    case "jeu": return `jeu-${route.id}`;
    case "match": return `match-${route.id}`;
    case "coupe": return `coupe-${route.id}`;
    case "club": return `club-${route.id}`;
    default: return route.page;
  }
}

export function href(route: Route): string {
  return `#${token(route)}`;
}

function read(): string {
  try {
    return window.location.hash;
  } catch {
    return "";
  }
}

let current = read();
let currentRoute = parse(current);
const listeners = new Set<() => void>();
const scrolls = new Map<string, number>();
let pushed = false;
let depth = 0;

window.addEventListener("hashchange", () => {
  const prevToken = token(currentRoute);
  scrolls.set(prevToken, window.scrollY);
  current = read();
  currentRoute = parse(current);
  const restore = !pushed ? scrolls.get(token(currentRoute)) : undefined;
  if (pushed) depth += 1;
  else if (depth > 0) depth -= 1;
  pushed = false;
  for (const fn of listeners) fn();
  requestAnimationFrame(() => window.scrollTo(0, restore ?? 0));
});

export function useRoute(): Route {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => currentRoute,
  );
}

export function go(route: Route) {
  const next = href(route);
  if (next === read()) {
    window.scrollTo(0, 0);
    return;
  }
  pushed = true;
  window.location.hash = next;
}

/** Goes back only through pages opened inside the app, never out of it. */
export function back(fallback: Route) {
  if (depth > 0) window.history.back();
  else go(fallback);
}
