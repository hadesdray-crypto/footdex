// Les phrases, mises en forme pour la voix de synthèse. Le sens ne change jamais, seule la forme change :
// - les cris étirés (« Grrrr », « fooot », « Wouaaah ») deviennent des mots que le synthétiseur sait dire ;
// - les points de suspension deviennent de vraies pauses (virgule ou point) ;
// - les bruitages qui ne sont pas des mots (« TUUUT », « CRONCH ») ne sont pas lus par la voix ;
// - chiffres, parenthèses, guillemets, majuscules criées sont rendus lisibles.
// Le texte de la bulle, lui, ne change pas. Dans les options développeur, « toutes les phrases » les lit telles quelles.

const KEEP_CAPS = /^(PSG|VAR|UEFA|FIFA|OM|OL|RC|USA|TV|CAF|LOSC|ASSE|PSV|MVP|GPS|DVD|SMS|LED)$/;
/** Words made of noise only: the voice would spell them letter by letter, so they are not read. */
const NOISE = /^(?:t+u+t+|cr?o+n+c?h+|tch?o+u+m?|b+r+|g+r+h*|r+h*|p+f+h*|z+|m+h*|h+m+h*|n+h+|b+z+|b+o+u+m+|p+a+f+|b+a+m+|c+l+a+c+)$/i;
/** Noises replaced by a word the voice can say. */
const SAYABLE: [RegExp, string][] = [
  [/^a+-?tch?o+u+m*$/i, "Atchoum"],
  [/^p+f+h*$/i, "Ouf"],
  [/^h+m+h*$/i, "Hum"],
  [/^m{2,}h*$/i, "Hum"],
  [/^b+r+$/i, "Oh là là"],
  [/^w(?:ou+)?a+h+$/i, "Ouah"],
  [/^a+h+$/i, "Ah"],
  [/^o+h+$/i, "Oh"],
  [/^a+ï+e+$/i, "Aïe"],
  [/^ou+f+$/i, "Ouf"],
  [/^ou+i+n+$/i, "Ouin"],
  [/^ha?( ha?)+$/i, "Ha ha ha"],
];

function cleanWord(w: string): string {
  const core = w.replace(/^[^\p{L}\d]+|[^\p{L}\d]+$/gu, "");
  if (!core) return w;
  let c = core;
  for (const [re, to] of SAYABLE) if (re.test(c)) { c = core[0] === core[0].toLowerCase() ? to.charAt(0).toLowerCase() + to.slice(1) : to; break; }
  if (c === core) {
    // stretched letters: fooot → foot, OLAAAA → ola (two letters stay: « passe », « ballon »)
    c = c.replace(/([\p{L}])\1{2,}/giu, "$1$1");
    // loud caps → normal (acronyms stay)
    if (c.length >= 4 && c === c.toUpperCase() && /\p{L}/u.test(c)) c = c.toLowerCase();
    else if (c.length >= 2 && c.length <= 3 && c === c.toUpperCase() && /\p{L}/u.test(c) && !KEEP_CAPS.test(c)) c = c.toLowerCase();
  }
  return w.replace(core, c);
}

/** The sentence ready for the voice, or "" when nothing in it can be said (only noises). */
export function pourVoix(text: string): string {
  let t = text
    .replace(/[«»“”"]/g, "")
    .replace(/\{[^}]*\}/g, "")
    .replace(/\s*\(([^)]*)\)/g, ", $1,")
    .replace(/(\d)\s*-\s*(\d)/g, "$1 à $2")
    .replace(/%/g, " pour cent")
    .replace(/&/g, " et ")
    .replace(/\s*(?:…|\.{3,})\s*/g, " … ")
    .replace(/\bh[ia]( h[ia]){2,}\b/gi, "Ha ha ha");
  // word by word
  const words = t.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  for (const w of words) {
    const core = w.replace(/^[^\p{L}\d]+|[^\p{L}\d]+$/gu, "");
    if (core && NOISE.test(core) && !SAYABLE.some(([re]) => re.test(core))) {
      // a noise alone: dropped, but its punctuation (a pause) stays
      const tail = w.match(/[.!?,;:]+$/)?.[0] ?? "";
      if (tail) out.push(tail);
      continue;
    }
    out.push(cleanWord(w));
  }
  t = out.join(" ")
    .replace(/\s+([.!?,;:])/g, "$1")
    .replace(/\s*…\s*$/g, ".")
    .replace(/\s*…\s*/g, ", ")
    .replace(/([,;:])\s*([.!?])/g, "$2")
    .replace(/([.!?])\s*[,;:]+/g, "$1")
    .replace(/^[\s,;:.!?]+/, "")
    .replace(/(?:,\s*){2,}/g, ", ")
    .replace(/([!?.])\1+/g, "$1")
    .replace(/[!?]{2,}/g, (m) => m[0])
    .replace(/, (Tu|Je|Il|Elle|On|Nous|Vous|Ça|Un|Une|Le|La|Les|Mon|Ma|Mes|Quel|Quelle|Si|Et|Mais|Ce|Où|Pas|Moi|Toi|Lui|Allez|Viens|Voyons|Voilà|Ils|Elles|Ne|Euh|Encore|Hum|Ouf)\b/g, (_m, w: string) => `, ${w.toLowerCase()}`)
    .replace(/\s{2,}/g, " ")
    .trim();
  if (!/\p{L}{2,}/u.test(t)) return "";
  return t.charAt(0).toUpperCase() + t.slice(1);
}
