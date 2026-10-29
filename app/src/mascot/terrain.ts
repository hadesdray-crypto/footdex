// What happens on the "pitch" around the character: the Doctor comes to treat him, a broken leg sends him off,
// the Square Referee asks for a substitute, and sometimes turns up for no reason… and shows a card if you misbehave.
import { pick, PERSOS } from "./lines";
import { CARAC } from "./caractere";
import { getMascot } from "./state";
import { enter, sackFor, type Visitor } from "./visitor";

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const busyScreen = () => !!document.querySelector(".mm, .wd, .reveal, .majfull, .subst");
let doctor: Visitor | null = null;
let referee: Visitor | null = null;

// ------------------------------------------------------------------ the Doctor

/** The Doctor runs in with his bag, kneels next to the injured character, treats him, and leaves. */
export async function doctorVisit(at: { x: number; y: number }, opts: { zombie?: boolean } = {}) {
  if (doctor) return;
  const d = enter("medecin", at.x, at.y);
  doctor = d;
  try {
    d.say(pick(["Pas de panique, le docteur arrive !", "J'arrive, j'arrive !", "Laissez passer le docteur !"]));
    const side = at.x > window.innerWidth / 2 ? -1 : 1;
    const spot = at.x + side * 44 >= 30 && at.x + side * 44 <= window.innerWidth - 30 ? at.x + side * 44 : at.x - side * 44;
    await d.walk({ x: spot, y: at.y }, 300);
    d.face(at.x - spot);
    if (opts.zombie) {
      d.hold("");
      d.say("Je mets mon collier en métal… on ne sait jamais !");
      await d.pose("think", 1400);
    }
    await d.pose("kneel", 500);
    d.say(opts.zombie ? "Un point… deux points… et voilà !" : pick(["Voyons ça…", "Ne bouge pas, ça ne fait pas mal.", "Hmm… Un petit bandage !"]));
    await d.pose("work", 2400);
    if (opts.zombie) {
      d.say("CRONCH ! … Vacciné ! Regardez, ça ne me fait rien !", 3400);
      await d.pose("bitten", 1800);
    }
    await d.pose("think", 300);
    d.say(opts.zombie ? "Recousu comme neuf. Grrr toi-même !" : pick(["Rien de cassé… enfin, presque !", "Un petit plâtre et ça repart !", "Guéri ! Enfin, bientôt."]));
    await d.wait(1200);
    await d.leave();
  } finally {
    d.destroy();
    doctor = null;
  }
}

/** The zombie fell to pieces: the Doctor puts every piece in his sack and drags it off the screen. */
export async function doctorSack(pieces: { x: number; y: number; take: () => void }[], at: { x: number; y: number }) {
  const d = enter("medecin", at.x, at.y);
  doctor = d;
  try {
    d.say("Oh là là… Encore lui. Je ramasse tout !");
    for (const p of pieces) {
      await d.walk({ x: p.x - 20 * d.dir, y: Math.max(at.y - 30, Math.min(at.y + 30, p.y)) }, 280);
      await d.pose("kneel", 450);
      p.take();
      await d.pose("work", 500);
    }
    sackFor(d);
    d.say("Allez, à l'infirmerie ! (Grrrmbl… dans le sac)", 3200);
    await d.wait(400);
    await d.leave();
  } finally {
    d.destroy();
    doctor = null;
  }
}

/** The Zombie lost one or two pieces: the Doctor puts on his metal collar, sews them back on… and gets bitten. */
export async function doctorRepair(pieces: { x: number; y: number; take: () => void }[], at: { x: number; y: number }) {
  if (doctor) return;
  const d = enter("medecin", at.x, at.y);
  doctor = d;
  try {
    d.collar();
    d.say("Encore lui ! Je mets mon collier en métal… on ne sait jamais.", 3000);
    for (const p of pieces) {
      await d.walk({ x: Math.max(30, Math.min(window.innerWidth - 30, p.x - 22 * d.dir)), y: at.y }, 280);
      await d.pose("kneel", 450);
      p.take();
      await d.pose("work", 600);
    }
    const spot = at.x + 44 <= window.innerWidth - 30 ? at.x + 44 : at.x - 44;
    await d.walk({ x: spot, y: at.y }, 200);
    d.face(at.x - spot);
    d.say("Un point… deux points… et voilà !");
    await d.pose("work", 1800);
    d.say("CRONCH ! … Vacciné ! Regardez : ça ne me fait rien !", 3400);
    await d.pose("bitten", 2000);
    d.say("Il mâchouille mon collier… Bon appétit !");
    await d.wait(1200);
    await d.leave();
  } finally {
    d.destroy();
    doctor = null;
  }
}

// ------------------------------------------------------------------ broken leg: off the pitch, and a substitute

/** Nobody on the pitch any more: the Referee comes, opens his hands, lifts a foot (« and now? »), and offers a substitute. */
export function substitution(home: { x: number; y: number }, chosen: (perso: number) => void) {
  const r = enter("arbitre", window.innerWidth / 2, home.y);
  referee = r;
  let over = false;
  const panel = document.createElement("div");
  panel.className = "subst";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Faire entrer un remplaçant");
  const st = getMascot().s;
  panel.innerHTML = `<p class="subst__title">Faire entrer un remplaçant ?</p><div class="subst__list">${PERSOS.map(
    (p, i) => `<button type="button" class="subst__btn${i === st.perso ? " is-same" : ""}" data-i="${i}">${p.name}${i === st.perso ? "<small>revient avec son plâtre</small>" : `<small>${CARAC[p.mode].label}</small>`}</button>`,
  ).join("")}</div>`;
  void (async () => {
    await r.walk({ x: window.innerWidth / 2 + rnd(-40, 40), y: home.y }, 170);
    if (over) return;
    r.face(home.x - r.x || 1);
    // he says nothing: hands open, one foot up… and the question appears
    document.body.appendChild(panel);
    while (!over && !r.dead) await r.pose("shrug", 1800);
  })();
  panel.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest("button[data-i]") as HTMLButtonElement | null;
    if (!b || over) return;
    over = true;
    panel.remove();
    chosen(Number(b.dataset.i));
    void (async () => {
      await r.wait(900);
      await r.pose("whistle", 900);
      r.say("TUUUT ! On reprend !");
      await r.wait(700);
      await r.leave();
      referee = null;
    })();
  });
}

// ------------------------------------------------------------------ the Square Referee and his cards

type Faute = "lancer" | "ballon" | "reponse" | "perdu" | "zombie";
let present = false;
let cards = 0; // cards shown during this visit
let wrongStreak = 0;
const throwsLately: number[] = [];

const CARD_LINE: Record<Faute, string[]> = {
  lancer: ["On ne lance pas les joueurs !", "Jet de joueur : faute !"],
  ballon: ["Main volontaire sur le ballon !", "On ne vole pas le ballon !"],
  reponse: ["Mauvaise réponse… carton !", "Hors-jeu de la réponse !"],
  perdu: ["Ça joue mal, tout ça !", "Allez, un peu de sérieux !"],
  zombie: ["Ballon dans la tête du zombie : faute !", "On ne décapite pas les zombies !"],
};

async function showCard(r: Visitor, f: Faute) {
  cards += 1;
  const red = cards >= 2;
  await r.pose("whistle", 700);
  r.say("TUUUT !", 900);
  await r.wait(500);
  r.card(red ? "rouge" : "jaune");
  r.say(`${red ? "Carton ROUGE ! " : "Carton jaune ! "}${pick(CARD_LINE[f])}`, 3000);
  await r.pose("card", 2400);
  r.hold("");
  if (red) {
    r.say("Bon… je suis gentil : on oublie pour cette fois.", 2600);
    await r.wait(1600);
  }
}

/** Something silly happened. If the Referee is here, he shows a card; some mistakes call him on purpose. */
export function faute(f: Faute) {
  if (f === "reponse") wrongStreak += 1;
  if (f === "lancer") {
    const now = Date.now();
    throwsLately.push(now);
    while (throwsLately.length && now - throwsLately[0] > 120000) throwsLately.shift();
  }
  if (present && referee && !referee.dead) {
    const r = referee;
    void showCard(r, f);
    return;
  }
  // he comes on purpose: three wrong answers in a row, or players thrown three times in two minutes
  if ((f === "reponse" && wrongStreak >= 3) || (f === "lancer" && throwsLately.length >= 3)) {
    wrongStreak = 0;
    throwsLately.length = 0;
    void refereeVisit(f);
  }
}
export function bonneReponse() {
  wrongStreak = 0;
}

/** A visit of the Referee: on purpose (a card), or by chance (a wave, a long look, a whistle… and he goes). */
export async function refereeVisit(reason?: Faute) {
  if (referee || busyScreen()) return;
  const m = document.querySelector(".mascot__fab")?.getBoundingClientRect();
  const y = m ? Math.min(window.innerHeight - 90, m.bottom - 2) : window.innerHeight * 0.7;
  const fear = PERSOS[getMascot().s.perso].mode === ("zombie" as string);
  const r = enter("arbitre", m ? m.left : window.innerWidth / 2, y);
  referee = r;
  present = true;
  cards = 0;
  try {
    const keep = fear ? 150 : 95; // he keeps his distance from the zombie
    const mx = m ? m.left + m.width / 2 : window.innerWidth / 2;
    // beside the character, on the side he comes from, or on the other side if there is no room there
    const fits = (x: number) => x >= 40 && x <= window.innerWidth - 40;
    const near = mx + (r.x < mx ? -keep : keep);
    const far = mx + (r.x < mx ? keep : -keep);
    const tx = fits(near) ? near : fits(far) ? far : Math.max(40, Math.min(window.innerWidth - 40, near));
    await r.walk({ x: tx, y }, reason ? 260 : 120);
    r.face(mx - r.x);
    if (reason) {
      await showCard(r, reason);
    } else {
      const k = Math.random();
      if (fear) {
        r.say("Hmm… je reste à distance, moi.", 2400);
        await r.pose("think", 3000);
      } else if (k < 0.4) {
        await r.pose("wave", 1600);
        r.say(pick(["Salut !", "Tout va bien ici ?", "Bon match !"]), 1600);
        await r.wait(800);
      } else if (k < 0.75) {
        // he just stands there, looking… why is he here?
        await r.pose("think", rnd(5000, 8000));
      } else {
        await r.pose("whistle", 900);
        r.say("TUUUT !", 1000);
        await r.pose("point", 1800);
        await r.wait(rnd(2000, 4000));
      }
    }
    present = false;
    await r.leave();
  } finally {
    present = false;
    r.destroy();
    referee = null;
  }
}

/** Every few minutes, maybe, the Referee walks by. */
let started = false;
export function startReferee() {
  if (started) return;
  started = true;
  const loop = (first: boolean) =>
    window.setTimeout(() => {
      if (document.visibilityState === "visible" && !busyScreen() && !getMascot().busy) void refereeVisit();
      loop(false);
    }, first ? rnd(180000, 360000) : rnd(240000, 480000));
  loop(true);
}

// For checking the scenes in a browser: open the app with « ?essai-terrain » in the address.
if (typeof location !== "undefined" && location.search.includes("essai-terrain")) {
  (window as unknown as { __terrain?: unknown }).__terrain = { doctorVisit, refereeVisit, faute };
}
