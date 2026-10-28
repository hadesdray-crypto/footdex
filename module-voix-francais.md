# Module « voix française » — pack réutilisable

> À donner tel quel à n'importe quelle IA (ou développeur) : « Intègre ce module de voix française dans mon application web. »
> Issu de l'appli Footdex pour Raphaël (React + TypeScript, mais le module marche avec n'importe quel site web).

## 1. Le principe : une chaîne de voix, la suivante prend le relais

Dans un navigateur, **aucune** voix n'est garantie. On essaie donc plusieurs voix dans l'ordre et on passe à la suivante dès qu'une échoue :

| Ordre | Voix | Internet ? | Qualité | Où elle échoue |
|---|---|---|---|---|
| 1 | **Voix du téléphone** (`speechSynthesis`, `lang = "fr-FR"`) | Non | Bonne | Aucune voix française installée ; cadres (iframe) de certains aperçus |
| 2 | **Piper** `fr_FR-siwis-medium` (paquet `@diffusionstudio/vits-web`) | Une seule fois (60 Mo), puis non | Très bonne, naturelle | Site qui bloque jsDelivr / Hugging Face ; premier téléchargement sans réseau |
| 3 | **Voix en ligne** (fichier audio d'un service de synthèse) | Oui | Bonne | Hors connexion ; sites qui bloquent les médias externes |
| 4 | **Voix robot intégrée** (synthèse par formants, Web Audio, fichier `frtts.ts`) | Non | Robotique mais compréhensible | Presque jamais : c'est le filet de sécurité |
| 5 | **Bruitage** (syllabes rigolotes sans mots) | Non | — | Dernier recours |

Règles qui comptent :
- **Mode automatique** : d'abord les voix que l'utilisateur a confirmé entendre (« Tu m'entends ? Oui / Non »), puis les voix pas encore testées, dans l'ordre ci-dessus.
- **Démarrée ≠ entendue** : une voix peut « démarrer » (événement `onstart`) sans aucun son. Seul l'utilisateur sait s'il entend : prévoir un bouton « Oui, je t'entends / Non, rien » et mémoriser la réponse (localStorage).
- **Délais courts** : si une voix n'a pas démarré après ~2,5 s (téléphone) ou ~4,5 s (en ligne), on passe à la suivante. Piper : 12 s pour la première phrase (vieux téléphones).
- **Textes longs** : découper en morceaux d'environ 170 caractères, aux fins de phrase.

## 2. Les 5 pièges qui rendent la voix muette (tous rencontrés)

1. **« Réduire les animations »** (`prefers-reduced-motion`) **ne doit pas couper le son.** Erreur classique : on coupe tout l'audio avec cette option → plus aucune voix sur les téléphones qui l'ont activée.
2. **iPhone en mode silencieux** : Web Audio est muet. Correction (Safari 17+) :
   ```ts
   const s = (navigator as any).audioSession; if (s) s.type = "playback";
   ```
3. **Toucher d'abord** : le son n'est autorisé qu'après un geste. Au premier `pointerdown`, faire `audioContext.resume()`, jouer un son vide d'un échantillon et lancer un `SpeechSynthesisUtterance(" ")` de volume 0.
4. **Aperçus dans un cadre** (iframe, ex. l'aperçu des artefacts Claude) : la voix du téléphone et les voix en ligne y sont souvent bloquées. Détecter `window.self !== window.top` et, dans ce cas, mettre **la voix robot intégrée en premier** : on entend tout de suite au lieu de 9 s de silence.
5. **Bouton « bruitages coupés »** : il ne doit pas couper la voix du personnage. Séparer les deux réglages.

## 3. Piper (la belle voix hors connexion) — code prêt à l'emploi

Chargé **uniquement** quand l'utilisateur appuie sur « Télécharger » (60 Mo : ne jamais le faire en cachette). Ensuite gardé dans le navigateur (stockage OPFS) et utilisable sans internet.

```ts
// piper.ts
const LIB = "https://cdn.jsdelivr.net/npm/@diffusionstudio/vits-web@1.0.3/+esm";
export const PIPER_VOICE = "fr_FR-siwis-medium"; // ou "fr_FR-siwis-low" (plus léger, ~28 Mo)

type Vits = {
  predict: (o: { text: string; voiceId: string }) => Promise<Blob>;
  download: (id: string, cb?: (p: { url: string; loaded: number; total: number }) => void) => Promise<void>;
  stored: () => Promise<string[]>;
  remove?: (id: string) => Promise<void>;
};
let lib: Promise<Vits> | null = null;
function load(): Promise<Vits> {
  if (!lib) { const url = LIB; lib = (import(url) as Promise<Vits>).catch((e) => { lib = null; throw e; }); }
  return lib;
}
export async function piperReady() { try { return (await (await load()).stored()).includes(PIPER_VOICE); } catch { return false; } }
export async function piperDownload(progress: (f: number) => void) {
  try {
    const t = await load(); const parts = new Map<string, [number, number]>();
    await t.download(PIPER_VOICE, (p) => {
      parts.set(p.url, [p.loaded, p.total || 1]);
      let a = 0, b = 0; for (const [l, tot] of parts.values()) { a += l; b += tot; }
      progress(b ? a / b : 0);
    });
    return (await t.stored()).includes(PIPER_VOICE);
  } catch { return false; }
}
export async function piperWav(text: string) { return (await load()).predict({ text, voiceId: PIPER_VOICE }); }
```

Lecture d'une phrase :
```ts
const blob = await piperWav("Bonjour, je suis ton ami du football !");
const url = URL.createObjectURL(blob);
const a = new Audio(url);
a.preservesPitch = false;  // pour changer la hauteur selon le personnage
a.playbackRate = 1.0;      // vitesse (0.6 à 1.7)
a.onended = () => URL.revokeObjectURL(url);
await a.play();
```

Astuces : préparer la phrase suivante pendant que la précédente est lue (pas de blanc entre les phrases). Avec un bundler (esbuild, Vite), garder l'URL dans une variable pour qu'il ne tente pas d'empaqueter la bibliothèque.

Conditions : le site doit pouvoir joindre `cdn.jsdelivr.net` et `huggingface.co` au premier téléchargement. Marche sur un vrai site (GitHub Pages, Netlify…). Dans l'aperçu Claude, c'est bloqué : le bouton affiche alors un message clair et la voix robot prend le relais.

## 4. Voix robot intégrée (le filet de sécurité)

Fichier `frtts.ts` de l'appli Footdex : synthèse française par formants en Web Audio, sans internet ni fichier.
- Entrée : `speakFr(audioContext, destination, texte, { f0, rate, formant, vib })` → `{ ms, stop }`.
- Fait : texte → sons du français (règles de lecture) → voyelles et consonnes jouées par un oscillateur + bruit filtré.
- Vérifié : 5 s de son net pour « Bonjour, tu m'entends ? Je suis ton ami du football ! ».
- **Joindre `frtts.ts` à ce document** quand on le donne à une autre IA.

## 5. Le menu à proposer à l'utilisateur

- « Trouver ma voix, pas à pas » : teste chaque voix une par une et demande « Tu m'entends ? ».
- Une ligne par voix avec son état (« Tu l'entends », « Ne marche pas ici », « Pas encore testée ») et un bouton « Tester ».
- Pour Piper : bouton « Télécharger » avec barre de progression, puis « Supprimer la belle voix (libère 60 Mo) ».
- « Automatique (conseillé) » et « Voix coupée » (bulle seulement).
- Vitesse : Lent / Normal / Rapide.

## 6. Liste de contrôle après intégration

- [ ] Téléphone en mode « réduire les animations » : on entend la voix.
- [ ] iPhone en mode silencieux : on entend la voix robot.
- [ ] Bruitages coupés : le personnage parle quand même.
- [ ] Dans un aperçu en cadre : la voix robot part tout de suite.
- [ ] Mode avion après téléchargement de Piper : la belle voix marche.
- [ ] Texte long : lu en entier, sans coupure au milieu d'une phrase.
