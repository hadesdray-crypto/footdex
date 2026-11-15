// Keeps the app light: an animation that nobody can see is paused (the cards that shine, the glowing buttons…).
// Elements come and go with the pages, so a MutationObserver hands the new ones to one IntersectionObserver.
const WATCH = ".carte, .paquet, .btn--glow, .pathbar, .pathmap, .hero__cards, .ball, .fbc, .sd, .aurora, .mascot, .buddy";

/** Pendant que le doigt fait défiler, les animations de fond s'arrêtent (classe is-scrolling), puis repartent. */
function figerPendantDefilement() {
  const root = document.documentElement;
  let t = 0;
  const stop = () => {
    if (!root.classList.contains("is-scrolling")) root.classList.add("is-scrolling");
    clearTimeout(t);
    t = window.setTimeout(() => root.classList.remove("is-scrolling"), 180);
  };
  window.addEventListener("scroll", stop, { passive: true, capture: true });
  window.addEventListener("touchmove", stop, { passive: true });
}

export function garderLegere() {
  figerPendantDefilement();
  if (typeof IntersectionObserver === "undefined" || typeof MutationObserver === "undefined") return;
  const io = new IntersectionObserver(
    (list) => {
      for (const e of list) e.target.classList.toggle("is-off", !e.isIntersecting);
    },
    { rootMargin: "80px" },
  );
  const seen = new WeakSet<Element>();
  const add = (n: Node) => {
    if (!(n instanceof Element)) return;
    if (n.matches(WATCH) && !seen.has(n)) {
      seen.add(n);
      io.observe(n);
    }
    n.querySelectorAll(WATCH).forEach((x) => {
      if (!seen.has(x)) {
        seen.add(x);
        io.observe(x);
      }
    });
  };
  add(document.body);
  new MutationObserver((ms) => {
    for (const m of ms) m.addedNodes.forEach(add);
  }).observe(document.body, { childList: true, subtree: true });
}
