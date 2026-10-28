#!/usr/bin/env python3
"""Quick screenshots of a few pages, with an optional saved collection.

Usage: python3 tools/shots.py <base url> <out dir> <mobile|desktop> <state.json|-> route [route ...]
A route may end with "@full" for a full-page screenshot.
"""
import json
import os
import sys

from playwright.sync_api import sync_playwright

BASE, OUT, MODE, STATE = sys.argv[1:5]
ROUTES = sys.argv[5:]
os.makedirs(OUT, exist_ok=True)
size = {"width": 390, "height": 844} if MODE == "mobile" else {"width": 1280, "height": 860}
state = None if STATE == "-" else open(STATE, encoding="utf-8").read()

with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport=size, device_scale_factor=2 if MODE == "mobile" else 1, locale="fr-FR")
    ctx.route("**/fonts.g*/**", lambda r: r.abort())
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
    page.on("console", lambda m: errors.append(f"{m.type}: {m.text}") if m.type == "error" and "ERR_FAILED" not in m.text else None)
    page.goto(f"{BASE}#accueil")
    page.wait_for_selector(".page")
    if state:
        page.evaluate("s => { localStorage.setItem('footdex.etat.v3', s); }", state)
    for route in ROUTES:
        full = route.endswith("@full")
        r = route.replace("@full", "")
        page.goto(f"{BASE}#{r}")
        page.reload()
        page.wait_for_selector(".page", timeout=20000)
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1300)
        overflow = page.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        page.screenshot(path=os.path.join(OUT, f"{MODE}-{r}.png"), full_page=full)
        print(f"{r}: débord {overflow}px")
    browser.close()
print("Erreurs :", errors[:6] if errors else "aucune")
