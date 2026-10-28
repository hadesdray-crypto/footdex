// A small French speech synthesizer that lives entirely in the page: no internet, no voice installed in the phone.
// Text -> sounds (rules for French spelling) -> formant synthesis with the Web Audio API.
// It is a robot voice, but it says the words that are written.

// ---------------------------------------------------------------- numbers

const U = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
const T = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante", "quatre-vingt", "quatre-vingt"];

function numberWords(n: number): string {
  if (n < 20) return U[n];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const u = n % 10;
    if (t === 7 || t === 9) return `${T[t]} ${U[10 + u]}`.replace("soixante dix", "soixante-dix").replace("quatre-vingt dix", "quatre-vingt-dix");
    if (u === 0) return t === 8 ? "quatre-vingts" : T[t];
    if (u === 1 && t < 8) return `${T[t]} et un`;
    return `${T[t]} ${U[u]}`;
  }
  if (n < 1000) {
    const c = Math.floor(n / 100);
    const r = n % 100;
    const head = c === 1 ? "cent" : `${U[c]} cent`;
    return r ? `${head} ${numberWords(r)}` : head;
  }
  if (n < 1000000) {
    const k = Math.floor(n / 1000);
    const r = n % 1000;
    const head = k === 1 ? "mille" : `${numberWords(k)} mille`;
    return r ? `${head} ${numberWords(r)}` : head;
  }
  return String(n).split("").map((d) => U[Number(d)]).join(" ");
}

// ---------------------------------------------------------------- spelling -> sounds
// One character per sound.  Vowels: i y u e E(è) ø 2(œ) @(e muet) o O a   Nasals: 5(in) 3(an) 6(on)
// Consonants: p t k b d g f s S(ch) v z Z(j) m n N(gn) l R j w H(u of "huit")

const DICT: Record<string, string> = {
  et: "e", est: "E", es: "E", les: "le", des: "de", mes: "me", tes: "te", ses: "se", ces: "se", un: "5", une: "yn@", le: "l@", la: "la", de: "d@", du: "dy", je: "Z@", tu: "ty",
  il: "il", ils: "il", elle: "El", elles: "El", on: "6", nous: "nu", vous: "vu", ce: "s@", que: "k@", qui: "ki", ne: "n@", me: "m@", te: "t@", se: "s@", a: "a", à: "a", au: "o", aux: "o",
  en: "3", y: "i", ou: "u", où: "u", mais: "mE", pas: "pa", plus: "plys", tout: "tu", tous: "tus", très: "trE", avec: "avEk", pour: "puR", dans: "d3", sur: "syR", par: "paR",
  sont: "s6", suis: "sHi", as: "a", ai: "e", fait: "fE", ont: "6", sans: "s3", son: "s6", mon: "m6", ton: "t6", ma: "ma", ta: "ta", sa: "sa", mon_: "m6", leur: "l2R", leurs: "l2R",
  ça: "sa", cela: "s@la", ici: "isi", oui: "wi", non: "n6", bien: "bj5", bravo: "bRavo", merci: "mERsi", bonjour: "b6ZuR", salut: "saly", allez: "ale", voici: "vwasi", voilà: "vwala",
  foot: "fut", football: "futbol", match: "matS", matchs: "matS", penalty: "penalti", penalties: "penalti", but: "byt", buts: "byt", sept: "sEt", cent: "s3", fils: "fis", mille: "mil", ville: "vil",
  tranquille: "tR3kil", million: "miljo6".replace("o6", "6"), ballon: "bal6", ballons: "bal6", stade: "stad", coupe: "kup", monde: "m6d", club: "klyb", clubs: "klyb", gardien: "gaRdj5", gardiens: "gaRdj5",
  maillot: "majo", maillots: "majo", jeu: "Zø", jeux: "Zø", joueur: "Zw2R", joueurs: "Zw2R", étoile: "etwal", étoiles: "etwal", gagne: "gaN@", gagné: "gaNe", haut: "o", faux: "fo", doux: "du",
  nul: "nyl", sud: "syd", ouest: "wEst", est_: "Est", cinq: "s5k", six: "sis", dix: "dis", huit: "Hit", neuf: "n2f", vingt: "v5", quatre: "katR@", trois: "tRwa", deux: "dø", zéro: "zeRo", onze: "6z", douze: "duz",
  treize: "tREz", quatorze: "katoRz", quinze: "k5z", seize: "sEz", trente: "tR3t", quarante: "kaR3t", cinquante: "s5k3t", soixante: "swas3t", mille_: "mil", comment: "kom3", combien: "k6bj5", pourquoi: "puRkwa",
  quel: "kEl", quelle: "kEl", quels: "kEl", quelles: "kEl", ensemble: "3s3bl@", toi: "twa", moi: "mwa", lui: "lHi", eux: "ø", ceux: "sø", yeux: "jø", dieu: "djø", monsieur: "m@sjø", messieurs: "mesjø",
  femme: "fam", fille: "fij", famille: "famij", ainsi: "5si", aussi: "osi", alors: "alOR", encore: "3kOR", toujours: "tuZuR", jamais: "ZamE", souvent: "suv3", vraiment: "vREm3", seulement: "s2lm3",
  alors_: "alOR", aujourd: "oZuRd", hui: "Hi", beaucoup: "boku", peu: "pø", trop: "tRo", assez: "ase", très_: "tRE", bon: "b6", bonne: "bOn", bons: "b6", mal: "mal", mieux: "mjø",
  chaque: "Sak", chose: "Soz", choses: "Soz", gens: "Z3", temps: "t3", corps: "kOR", poids: "pwa", doigt: "dwa", nez: "ne", chez: "Se", pied: "pje", pieds: "pje",
  mets: "mE", sais: "sE", vais: "vE", vas: "va", va: "va", peux: "pø", veux: "vø", veut: "vø", peut: "pø", dit: "di", dis: "di", lis: "li", lit: "li", prix: "pRi", paix: "pE", voix: "vwa", croix: "kRwa",
  roi: "Rwa", loi: "lwa", foi: "fwa", moins: "mw5", point: "pw5", loin: "lw5", coin: "kw5", soin: "sw5", besoin: "b@zw5", joint: "Zw5", rien: "Rj5", chien: "Sj5", viens: "vj5", tiens: "tj5",
  ok: "oke", wow: "wao", hop: "Op", hé: "e", oh: "o", ah: "a", eh: "E", hum: "Om", hm: "m", ouf: "uf", oups: "ups", ouille: "uj", pfff: "pf", zut: "zyt",
};

const VOWEL_LETTERS = "aeiouyàâäéèêëîïôöùûü";
const isV = (c: string | undefined) => !!c && VOWEL_LETTERS.includes(c);
const isC = (c: string | undefined) => !!c && /[a-zç]/.test(c) && !VOWEL_LETTERS.includes(c);

function wordToPhonemes(raw: string): string {
  const w = raw;
  if (DICT[w] !== undefined) return DICT[w];
  let out = "";
  let i = 0;
  const n = w.length;
  const at = (k: number) => (k >= 0 && k < n ? w[k] : "");
  const rest = (k: number) => w.slice(k);
  // silent final letters
  let end = n;
  if (/(aient|ient|uent)$/.test(w) && n >= 6) end = n - 3;
  else if (/es$/.test(w) && n > 3) end = n - 2;
  else if (/e$/.test(w) && n > 1) end = n - 1;
  else if (/[sxzdtpgh]$/.test(w) && n > 2 && !/^(sept|net|but|ouest|test|zest)$/.test(w)) end = n - 1;
  if (end === n - 1 && /(ts|ds|ps|gs|xs)$/.test(w) && n > 3) end = n - 2;
  const last = end;
  while (i < last) {
    const c = w[i];
    const c1 = at(i + 1);
    const c2 = at(i + 2);
    const atEnd = (len: number) => i + len >= last;
    const afterVowelCons = (k: number) => !isV(at(k)) && at(k) !== "" ? true : false;
    // ---- vowel groups
    if (rest(i).startsWith("eau")) { out += "o"; i += 3; continue; }
    if (rest(i).startsWith("oeu") || rest(i).startsWith("œu")) { out += "2"; i += 3; continue; }
    if (c === "œ") { out += "2"; i += 1; continue; }
    if (rest(i).startsWith("ou")) { out += i + 2 < last && isV(c2) && c2 !== "i" && c2 !== "u" ? "w" : "u"; i += 2; continue; }
    if (rest(i).startsWith("oi")) { out += "wa"; i += 2; continue; }
    if (rest(i).startsWith("oin") && !isV(at(i + 3))) { out += "w5"; i += 3; continue; }
    if (rest(i).startsWith("ui")) { out += "Hi"; i += 2; continue; }
    if (rest(i).startsWith("au")) { out += "o"; i += 2; continue; }
    if (rest(i).startsWith("eu")) { out += isC(c2) && c2 === "r" && atEnd(3) ? "2" : atEnd(2) || c2 === "s" || c2 === "x" || c2 === "z" ? "ø" : "2"; i += 2; continue; }
    if (rest(i).startsWith("ai") || rest(i).startsWith("ei")) {
      if ((rest(i).startsWith("ain") || rest(i).startsWith("ein") || rest(i).startsWith("aim")) && !isV(at(i + 3))) { out += "5"; i += 3; continue; }
      out += atEnd(2) && c === "a" && i > 0 ? "e" : "E";
      i += 2;
      continue;
    }
    if (rest(i).startsWith("ien") && (atEnd(3) || !isV(at(i + 3)))) { out += "j5"; i += 3; continue; }
    // ---- nasals
    const nasalCtx = (k: number) => !isV(at(k)) && !(at(k) === "n" || at(k) === "m") ? true : at(k) === "" ;
    if ((c === "a" || c === "e") && (c1 === "n" || c1 === "m") && (i + 2 >= last || (!isV(c2) && c2 !== c1))) { if (!(c1 === "m" && c2 === "m")) { out += "3"; i += 2; continue; } }
    if (c === "i" && (c1 === "n" || c1 === "m") && (i + 2 >= last || (!isV(c2) && c2 !== c1)) && !(c1 === "m" && c2 === "m")) { out += "5"; i += 2; continue; }
    if (c === "u" && (c1 === "n" || c1 === "m") && (i + 2 >= last || (!isV(c2) && c2 !== c1))) { out += "5"; i += 2; continue; }
    if (c === "o" && (c1 === "n" || c1 === "m") && (i + 2 >= last || (!isV(c2) && c2 !== c1)) && !(c1 === "m" && c2 === "m")) { out += "6"; i += 2; continue; }
    void nasalCtx;
    void afterVowelCons;
    // ---- single vowels
    if (c === "é") { out += "e"; i += 1; continue; }
    if (c === "è" || c === "ê" || c === "ë") { out += "E"; i += 1; continue; }
    if (c === "à" || c === "â" || c === "ä") { out += "a"; i += 1; continue; }
    if (c === "î" || c === "ï") { out += "i"; i += 1; continue; }
    if (c === "ô" || c === "ö") { out += "o"; i += 1; continue; }
    if (c === "ù" || c === "û" || c === "ü") { out += "y"; i += 1; continue; }
    if (c === "a") { out += "a"; i += 1; continue; }
    if (c === "i" && c1 === "l" && c2 === "l" && i > 0) { out += isV(at(i - 1)) ? "j" : "ij"; i += 3; continue; }
    if (c === "i") { out += isV(c1) && i > 0 && isC(at(i - 1)) && c1 !== "i" ? "j" : "i"; i += 1; continue; }
    if (c === "y") { out += isV(c1) ? "j" : "i"; i += 1; continue; }
    if (c === "u") { out += "y"; i += 1; continue; }
    if (c === "o") {
      out += atEnd(1) || (c1 === "s" && isV(c2)) || c1 === "z" || (c1 === "i" && false) ? "o" : "O";
      i += 1;
      continue;
    }
    if (c === "e") {
      if (atEnd(1)) { if (n === 1) out += "@"; i += 1; continue; }
      if ((c1 === "r" || c1 === "z") && atEnd(2) && n > 3) { out += "e"; i += 2; continue; }
      if (c1 === "t" && atEnd(2) && last === n - 1) { out += "E"; i += 2; continue; }
      if (i === 1 && "pbdtkgfvr".includes(c1) && "rl".includes(c2) && c2 !== "") { out += "@"; i += 1; continue; }
      if (i === 1 && isC(c1) && !isC(c2) && "rd".includes(at(0))) { out += "@"; i += 1; continue; }
      if ((isC(c1) && isC(c2) && c1 !== "r" ) || (c1 === "x") || (isC(c1) && atEnd(2)) || (c1 === "l" && c2 === "l") || (c1 === "r" && isC(c2))) { out += "E"; i += 1; continue; }
      out += "@";
      i += 1;
      continue;
    }
    // ---- consonants
    if (rest(i).startsWith("ch")) { out += "S"; i += 2; continue; }
    if (rest(i).startsWith("ph")) { out += "f"; i += 2; continue; }
    if (rest(i).startsWith("th")) { out += "t"; i += 2; continue; }
    if (rest(i).startsWith("gn")) { out += "N"; i += 2; continue; }
    if (rest(i).startsWith("qu")) { out += "k"; i += 2; continue; }
    if (rest(i).startsWith("tion")) { out += "sj"; i += 2; continue; }
    if (c === "g") {
      if ("eiyéèê".includes(c1)) { out += "Z"; i += 1; continue; }
      if (c1 === "u" && "eiyéèê".includes(c2)) { out += "g"; i += 2; continue; }
      out += "g"; i += c1 === "g" ? 2 : 1; continue;
    }
    if (c === "c") {
      if (c1 === "c" && "eiy".includes(c2)) { out += "ks"; i += 2; continue; }
      if ("eiyéèê".includes(c1)) { out += "s"; i += 1; continue; }
      out += "k"; i += c1 === "c" || c1 === "k" ? 2 : 1; continue;
    }
    if (c === "ç") { out += "s"; i += 1; continue; }
    if (c === "s") {
      if (c1 === "s") { out += "s"; i += 2; continue; }
      out += isV(at(i - 1)) && isV(c1) ? "z" : "s"; i += 1; continue;
    }
    if (c === "x") { out += atEnd(1) ? "" : isV(at(i - 1)) && isV(c1) && i === 1 ? "gz" : "ks"; i += 1; continue; }
    if (c === "h") { i += 1; continue; }
    if (c === "j") { out += "Z"; i += 1; continue; }
    if (c === "k") { out += "k"; i += 1; continue; }
    if (c === "w") { out += "w"; i += 1; continue; }
    if (c === "r") { out += "R"; i += c1 === "r" ? 2 : 1; continue; }
    if (c === "m" || c === "n" || c === "l" || c === "p" || c === "t" || c === "d" || c === "b" || c === "f" || c === "v" || c === "z") {
      out += c;
      i += c1 === c ? 2 : 1;
      continue;
    }
    i += 1; // anything else is skipped
  }
  return out || "";
}

// ---------------------------------------------------------------- synthesis

type VowelDef = [number, number, number];
const VOW: Record<string, VowelDef> = {
  i: [270, 2250, 3050], y: [275, 1900, 2350], u: [315, 820, 2250], e: [400, 2100, 2650], E: [580, 1850, 2600], ø: [400, 1500, 2400], "2": [560, 1500, 2400],
  "@": [470, 1500, 2500], o: [410, 820, 2500], O: [600, 980, 2500], a: [760, 1350, 2500], "5": [600, 1900, 2600], "3": [720, 1100, 2500], "6": [470, 920, 2450],
  j: [270, 2250, 3050], w: [315, 820, 2250], H: [275, 1900, 2350],
};
const NASAL = new Set(["5", "3", "6"]);
const GLIDE = new Set(["j", "w", "H"]);
type Cons = { kind: "stop" | "fric" | "nasal" | "liquid"; voiced: boolean; f?: number; q?: number; amp?: number; dur: number; form?: VowelDef };
const CONS: Record<string, Cons> = {
  p: { kind: "stop", voiced: false, f: 900, q: 0.8, amp: 0.45, dur: 0.07 }, t: { kind: "stop", voiced: false, f: 4200, q: 0.9, amp: 0.5, dur: 0.07 }, k: { kind: "stop", voiced: false, f: 2100, q: 1.2, amp: 0.5, dur: 0.075 },
  b: { kind: "stop", voiced: true, f: 700, q: 0.8, amp: 0.3, dur: 0.065, form: [250, 1000, 2300] }, d: { kind: "stop", voiced: true, f: 3500, q: 0.9, amp: 0.3, dur: 0.06, form: [250, 1600, 2500] }, g: { kind: "stop", voiced: true, f: 1800, q: 1.2, amp: 0.3, dur: 0.065, form: [250, 1500, 2300] },
  f: { kind: "fric", voiced: false, f: 5200, q: 0.35, amp: 0.2, dur: 0.09 }, s: { kind: "fric", voiced: false, f: 6500, q: 0.9, amp: 0.55, dur: 0.1 }, S: { kind: "fric", voiced: false, f: 3300, q: 1.0, amp: 0.55, dur: 0.11 },
  v: { kind: "fric", voiced: true, f: 4500, q: 0.4, amp: 0.15, dur: 0.07, form: [260, 1400, 2300] }, z: { kind: "fric", voiced: true, f: 6200, q: 0.9, amp: 0.3, dur: 0.08, form: [260, 1600, 2500] }, Z: { kind: "fric", voiced: true, f: 3000, q: 1.0, amp: 0.3, dur: 0.085, form: [260, 1700, 2400] },
  m: { kind: "nasal", voiced: true, dur: 0.07, form: [260, 1000, 2200] }, n: { kind: "nasal", voiced: true, dur: 0.065, form: [260, 1500, 2500] }, N: { kind: "nasal", voiced: true, dur: 0.075, form: [260, 2000, 2700] },
  l: { kind: "liquid", voiced: true, dur: 0.06, form: [360, 1150, 2700] }, R: { kind: "liquid", voiced: true, f: 1500, q: 0.8, amp: 0.18, dur: 0.065, form: [500, 1350, 2300] },
};

type Ev = { p: string; dur: number; f0a: number; f0b: number; stress: boolean; pause?: number };

function buildEvents(text: string): Ev[] {
  const clean = text
    .toLowerCase()
    .replace(/[’`´]/g, "'")
    .replace(/(\d+)/g, (m) => ` ${numberWords(Math.min(999999999, parseInt(m, 10)))} `)
    .replace(/&/g, " et ");
  // phrases separated by punctuation
  const parts = clean.match(/[^.!?,;:…]+[.!?,;:…]*/g) ?? [clean];
  const evs: Ev[] = [];
  for (const part of parts) {
    const mark = (part.match(/[.!?,;:…]+$/)?.[0] ?? "")[0] ?? "";
    const body = part.replace(/[.!?,;:…]+$/, "").trim();
    if (!body) continue;
    const toks = body.split(/\s+/).flatMap((tk) => {
      const k = tk.replace(/[^a-zàâäéèêëîïôöùûüçœ'-]/g, "");
      if (!k) return [];
      const segs: string[] = [];
      // elisions: l'ami -> l + ami
      const m = k.match(/^(qu|jusqu|lorsqu|puisqu|[cdjlmnst])'(.+)$/);
      if (m) {
        const e = ({ c: "s", d: "d", j: "Z", l: "l", m: "m", n: "n", s: "s", t: "t", qu: "k", jusqu: "ZHsk", lorsqu: "lORsk", puisqu: "pHisk" } as Record<string, string>)[m[1]] ?? m[1];
        segs.push(`=${e}`);
        k.slice(m[1].length + 1).split("-").forEach((x) => x && segs.push(x));
      } else k.split("-").forEach((x) => x && segs.push(x));
      return segs;
    });
    const words: string[] = toks.map((t) => (t.startsWith("=") ? t.slice(1) : wordToPhonemes(t)));
    const lastIdx = words.map((w, i) => (/[iyueEø2@oOa536]/.test(w) ? i : -1)).filter((i) => i >= 0).pop() ?? words.length - 1;
    words.forEach((ph, wi) => {
      const lastVowel = [...ph].map((c, i) => (/[iyueEø2@oOa536]/.test(c) ? i : -1)).filter((i) => i >= 0).pop() ?? -1;
      const isLastWord = wi === lastIdx;
      const prog = words.length > 1 ? wi / (words.length - 1) : 0;
      [...ph].forEach((c, ci) => {
        const vowel = /[iyueEø2@oOa536]/.test(c);
        const stressed = vowel && ci === lastVowel && !toks[wi]?.startsWith("=") && ph.length > 1;
        let dur = vowel ? (c === "@" ? 0.055 : 0.085) : CONS[c]?.dur ?? 0.06;
        if (GLIDE.has(c)) dur = 0.06;
        if (stressed) dur *= isLastWord ? 1.7 : 1.3;
        const base = 1 - 0.12 * prog;
        let a = base;
        let b = base;
        if (stressed) { a = base * 1.0; b = base * (isLastWord ? (mark === "?" ? 1.28 : mark === "," || mark === ";" ? 1.1 : 0.84) : 1.1); }
        evs.push({ p: c, dur, f0a: a, f0b: b, stress: stressed });
      });
      evs.push({ p: " ", dur: 0.045, f0a: 1, f0b: 1, stress: false });
    });
    const long = mark === "." || mark === "!" || mark === "?" || mark === "…";
    evs.push({ p: "_", dur: long ? 0.42 : mark ? 0.24 : 0.1, f0a: 1, f0b: 1, stress: false });
  }
  return evs;
}

const NK = 0.6; // how loud the hissing sounds are compared with the vowels
export type Voice = { f0: number; rate: number; formant: number; vib: number };

/** Plays `text` with the robot voice on audio context `a`, into `dest`. Returns how long it lasts and how to stop it. */
export function speakFr(a: BaseAudioContext, dest: AudioNode, text: string, v: Voice, startAt = a.currentTime + 0.05): { ms: number; stop: () => void } {
  const evs = buildEvents(text);
  const rate = Math.max(0.45, Math.min(1.6, v.rate * 0.8)); // a little slower than natural speech: easier to understand
  const fm = v.formant;
  // voiced source
  const osc = a.createOscillator();
  osc.type = "sawtooth";
  const vg = a.createGain();
  vg.gain.value = 0;
  const tilt = a.createBiquadFilter();
  tilt.type = "lowpass";
  tilt.frequency.value = 5000;
  osc.connect(vg);
  const filters = [6, 8, 10].map((q) => {
    const f = a.createBiquadFilter();
    f.type = "bandpass";
    f.Q.value = q;
    f.frequency.value = 500;
    return f;
  });
  const fgain = [1.0, 0.8, 0.45].map((g) => {
    const x = a.createGain();
    x.gain.value = g;
    return x;
  });
  const nasalF = a.createBiquadFilter();
  nasalF.type = "bandpass";
  nasalF.frequency.value = 280;
  nasalF.Q.value = 6;
  const nasalG = a.createGain();
  nasalG.gain.value = 0;
  filters.forEach((f, i) => {
    vg.connect(f);
    f.connect(fgain[i]);
    fgain[i].connect(tilt);
  });
  vg.connect(nasalF);
  nasalF.connect(nasalG);
  nasalG.connect(tilt);
  const master = a.createGain();
  master.gain.value = 1.6;
  tilt.connect(master);
  master.connect(dest);
  // vibrato
  let lfo: OscillatorNode | null = null;
  if (v.vib > 0) {
    lfo = a.createOscillator();
    const depth = a.createGain();
    lfo.frequency.value = 5.2;
    depth.gain.value = v.vib;
    lfo.connect(depth);
    depth.connect(osc.frequency);
  }
  // noise source
  const nbuf = a.createBuffer(1, a.sampleRate, a.sampleRate);
  const nd = nbuf.getChannelData(0);
  for (let i = 0; i < nd.length; i += 1) nd[i] = Math.random() * 2 - 1;
  const noise = a.createBufferSource();
  noise.buffer = nbuf;
  noise.loop = true;
  const nf = a.createBiquadFilter();
  nf.type = "bandpass";
  nf.frequency.value = 3000;
  nf.Q.value = 1;
  const ng = a.createGain();
  ng.gain.value = 0;
  noise.connect(nf);
  nf.connect(ng);
  ng.connect(master);

  let t = startAt;
  const f0 = v.f0;
  const setF = (def: VowelDef, at: number, tc = 0.018) => {
    filters.forEach((f, i) => f.frequency.setTargetAtTime(def[i] * fm, at, tc));
  };
  let prev: VowelDef = [500, 1500, 2500];
  osc.frequency.setValueAtTime(f0, t);
  for (const e of evs) {
    const d = e.dur / rate;
    const c = CONS[e.p];
    if (e.p === "_" || e.p === " ") {
      vg.gain.setTargetAtTime(0, t, 0.01);
      ng.gain.setTargetAtTime(0, t, 0.006);
      t += d;
      continue;
    }
    if (VOW[e.p]) {
      const def = VOW[e.p];
      setF(def, t);
      const nas = NASAL.has(e.p);
      nasalG.gain.setTargetAtTime(nas ? 0.9 : 0, t, 0.015);
      const level = e.p === "@" ? 0.5 : GLIDE.has(e.p) ? 0.7 : 0.9;
      vg.gain.setTargetAtTime(level, t, 0.012);
      ng.gain.setTargetAtTime(0, t, 0.006);
      osc.frequency.setValueAtTime(f0 * e.f0a * (e.stress ? 1 : 1), t);
      osc.frequency.linearRampToValueAtTime(f0 * e.f0b, t + d);
      prev = def;
      t += d;
      continue;
    }
    if (!c) {
      t += d * 0.5;
      continue;
    }
    nasalG.gain.setTargetAtTime(c.kind === "nasal" ? 1.2 : 0, t, 0.01);
    if (c.kind === "stop") {
      const closure = d * 0.65;
      vg.gain.setTargetAtTime(c.voiced ? 0.25 : 0, t, 0.006);
      if (c.form) setF(c.form, t, 0.012);
      ng.gain.setTargetAtTime(0, t, 0.004);
      nf.frequency.setValueAtTime(c.f ?? 3000, t + closure);
      nf.Q.value = c.q ?? 1;
      ng.gain.setValueAtTime(0, t + closure);
      ng.gain.linearRampToValueAtTime((c.amp ?? 0.4) * NK, t + closure + 0.004);
      ng.gain.exponentialRampToValueAtTime(0.001, t + d + 0.018);
      setF(prev, t + d, 0.01);
    } else if (c.kind === "fric") {
      nf.frequency.setValueAtTime(c.f ?? 4000, t);
      nf.Q.value = c.q ?? 1;
      ng.gain.setTargetAtTime((c.amp ?? 0.3) * NK, t, 0.008);
      vg.gain.setTargetAtTime(c.voiced ? 0.28 : 0, t, 0.008);
      if (c.form) setF(c.form, t, 0.012);
    } else {
      // nasals and liquids: voiced, with their own formants
      if (c.form) setF(c.form, t, 0.012);
      vg.gain.setTargetAtTime(c.kind === "nasal" ? 0.55 : 0.7, t, 0.01);
      if (c.f) {
        nf.frequency.setValueAtTime(c.f, t);
        nf.Q.value = c.q ?? 1;
        ng.gain.setTargetAtTime((c.amp ?? 0.15) * NK, t, 0.008);
      } else ng.gain.setTargetAtTime(0, t, 0.006);
    }
    t += d;
  }
  vg.gain.setTargetAtTime(0, t, 0.02);
  ng.gain.setTargetAtTime(0, t, 0.02);
  osc.start(startAt);
  noise.start(startAt);
  lfo?.start(startAt);
  const end = t + 0.15;
  osc.stop(end);
  noise.stop(end);
  lfo?.stop(end);
  return {
    ms: Math.max(500, (end - startAt) * 1000),
    stop: () => {
      for (const n of [osc, noise, lfo]) {
        try {
          n?.stop();
        } catch {
          /* already finished */
        }
      }
      try {
        master.disconnect();
      } catch {
        /* already disconnected */
      }
    },
  };
}

/** For tests: the sounds chosen for a text, one character per sound. */
export function soundsOf(text: string): string {
  return buildEvents(text).map((e) => (e.p === "_" ? " | " : e.p)).join("").replace(/ +/g, " ");
}
