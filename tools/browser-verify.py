#!/usr/bin/env python3
"""In a real browser: every photo decodes, every album fiche opens, a large sample of game fiches opens."""
import json
import os
import random
import sys
import time

from playwright.sync_api import sync_playwright

BASE = sys.argv[1]
DATA = sys.argv[2]
core = json.load(open(f"{DATA}/core.json", encoding="utf-8"))
people = json.load(open(f"{DATA}/people.json", encoding="utf-8"))
cols = people["cols"]
rows = people["rows"]

random.seed(7)
ci, cc, cf = cols.index("id"), cols.index("chunk"), cols.index("face")
special = [r[ci] for r in rows if r[cc] == -1][:40] + [r[ci] for r in rows if r[cc] >= 0 and r[cf] == 0][:40]
special += [int(k) for k in json.load(open(f"{DATA}/reel-doubts.json"))]
sample = sorted(set(special + (([r[ci] for r in rows]) if os.environ.get("ALL") else random.sample([r[ci] for r in rows], 400))))

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 390, "height": 844})
    page.route("**/fonts.g*/**", lambda r: r.abort())
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(f"{BASE}#accueil")
    page.wait_for_selector(".page")

    # A. every game photo decodes as an image in the browser
    t = time.time()
    result = page.evaluate(
        """async (chunks) => {
          let ok = 0, bad = [];
          for (let k = 0; k < chunks; k++) {
            const faces = await (await fetch(`data/faces-${k}.json`)).json();
            const ids = Object.keys(faces);
            for (let i = 0; i < ids.length; i += 200) {
              await Promise.all(ids.slice(i, i + 200).map(async (id) => {
                const img = new Image();
                img.src = `data:image/webp;base64,${faces[id]}`;
                try { await img.decode(); if (img.naturalWidth > 0) ok++; else bad.push(id); } catch { bad.push(id); }
              }));
            }
          }
          return { ok, bad: bad.slice(0, 20), badCount: bad.length };
        }""",
        people["chunks"],
    )
    print(f"Photos du jeu décodées : {result['ok']} (échecs : {result['badCount']}) en {time.time() - t:.0f} s")

    # B. every picture file of the album loads
    pics = [v["src"] for v in core["portraits"].values()]
    pics += [f"/players/sm/{i}.webp" for i in json.load(open(f"{DATA}/portraits-small.json"))]
    res = page.evaluate(
        """async (srcs) => {
          let ok = 0, bad = [];
          await Promise.all(srcs.map(async (s) => { const img = new Image(); img.src = s; try { await img.decode(); ok++; } catch { bad.push(s); } }));
          return { ok, bad };
        }""",
        [f"img{s}" for s in pics] + ["img/une.webp", "img/une-800.webp"] + [f"media/{m}.webp" for m in ("finale-1998", "main-de-dieu", "psg-2025", "euro-2000")],
    )
    print(f"Portraits, couverture, affiches : {res['ok']} chargés, échecs {res['bad']}")

    # C. every album fiche opens with the right name
    t = time.time()
    missing = []
    for pl in core["album"]:
        page.evaluate("id => { location.hash = 'fiche-' + id; }", pl["id"])
        try:
            page.wait_for_function("name => document.querySelector('.fiche__name')?.textContent === name", arg=pl["display"], timeout=5000)
        except Exception:
            missing.append(pl["id"])
    print(f"Fiches de l'album ouvertes : {len(core['album']) - len(missing)} / {len(core['album'])} en {time.time() - t:.0f} s {missing[:10]}")

    # D. game fiches: edge cases and a random sample
    t = time.time()
    bad = []
    for eid in sample:
        page.evaluate("id => { location.hash = 'jeu-' + id; }", eid)
        try:
            page.wait_for_function("id => document.querySelector('.fiche .eyebrow')?.textContent.includes(String(id))", arg=eid, timeout=8000)
        except Exception:
            bad.append(eid)
    print(f"Fiches du jeu ouvertes : {len(sample) - len(bad)} / {len(sample)} (dont cas particuliers) en {time.time() - t:.0f} s {bad[:10]}")

    # E. every match, cup and club page
    pages = [f"match-{m['id']}" for m in core["matches"]] + [f"coupe-{c['id']}" for c in core["coupes"]] + [f"club-{c['id']}" for c in core["clubs"]]
    bad = []
    for tok in pages:
        page.evaluate("t => { location.hash = t; }", tok)
        page.wait_for_timeout(150)
        if page.locator(".empty").count() > 0:
            bad.append(tok)
    print(f"Matchs, coupes, clubs : {len(pages) - len(bad)} / {len(pages)} {bad}")
    print("Erreurs JavaScript :", errors[:5] if errors else "aucune")
    browser.close()
