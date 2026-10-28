#!/usr/bin/env python3
"""Browser checks for the new Footdex: every page renders, no console error, screenshots.

Usage: python3 tools/qa.py <base url> <screenshot dir> [mobile|desktop] [route ...]
"""
import json
import os
import sys

from playwright.sync_api import sync_playwright

BASE, OUTDIR = sys.argv[1], sys.argv[2]
MODE = sys.argv[3] if len(sys.argv) > 3 else "mobile"
ROUTES = sys.argv[4:] or [
    "accueil", "joueurs", "fiche-zidane", "fiche-anthony-lopes", "fiche-samba-diop", "jeu-231747", "jeu-209331",
    "paquets", "classeur", "matchs", "match-finale-1998", "match-finale-2022", "scores", "coupes", "coupe-france",
    "clubs", "club-om", "saison", "lexique", "defi", "grand-defi", "histoires", "videos", "sources", "plus",
]
os.makedirs(OUTDIR, exist_ok=True)
size = {"width": 390, "height": 844} if MODE == "mobile" else {"width": 1280, "height": 860}

report = {}
with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport=size, device_scale_factor=2 if MODE == "mobile" else 1, locale="fr-FR")
    ctx.route("**/fonts.googleapis.com/**", lambda r: r.abort())
    ctx.route("**/fonts.gstatic.com/**", lambda r: r.abort())
    page = ctx.new_page()
    errors = []
    page.on("console", lambda m: errors.append(f"{m.type}: {m.text}") if m.type in ("error", "warning") else None)
    page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
    page.on("requestfailed", lambda r: errors.append(f"failed: {r.url}") if "fonts.g" not in r.url else None)
    for route in ROUTES:
        errors.clear()
        page.goto(f"{BASE}#{route}")
        page.wait_for_selector(".page", timeout=20000)
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(400)
        overflow = page.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        text = page.evaluate("document.querySelector('.page').innerText.length")
        shot = os.path.join(OUTDIR, f"{MODE}-{route}.png")
        page.screenshot(path=shot, full_page=False)
        report[route] = {"errors": list(errors), "overflow": overflow, "text": text}
        flag = "OK " if not errors and overflow <= 0 and text > 50 else "!! "
        print(f"{flag}{route}: texte {text}, débord {overflow}px, erreurs {len(errors)}" + (f" -> {errors[:3]}" if errors else ""))
    browser.close()
json.dump(report, open(os.path.join(OUTDIR, f"report-{MODE}.json"), "w"), indent=1, ensure_ascii=False)
