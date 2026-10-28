#!/usr/bin/env python3
"""Screenshots of a pack opening, step by step, with a fixed random seed.

Usage: python3 tools/reveal-shots.py <base url> <out dir> <mobile|desktop> <state.json|-> <seed>
"""
import json
import os
import sys

from playwright.sync_api import sync_playwright

BASE, OUT, MODE, STATE, SEED = sys.argv[1:6]
os.makedirs(OUT, exist_ok=True)
size = {"width": 390, "height": 844} if MODE == "mobile" else {"width": 1280, "height": 860}
state = None if STATE == "-" else open(STATE, encoding="utf-8").read()

SEEDED = """
(() => {
  let a = %s >>> 0;
  const next = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0); };
  crypto.getRandomValues = (buf) => { for (let i = 0; i < buf.length; i++) buf[i] = next(); return buf; };
})();
""" % SEED

with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport=size, device_scale_factor=2 if MODE == "mobile" else 1, locale="fr-FR")
    ctx.route("**/fonts.g*/**", lambda r: r.abort())
    ctx.add_init_script(SEEDED)
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
    page.on("console", lambda m: errors.append(f"{m.type}: {m.text}") if m.type == "error" and "ERR_FAILED" not in m.text else None)
    page.goto(f"{BASE}#accueil")
    page.wait_for_selector(".page")
    if state:
        page.evaluate("s => localStorage.setItem('footdex.etat.v3', s)", state)
    page.goto(f"{BASE}#paquets")
    page.reload()
    page.wait_for_selector(".packhero")
    page.wait_for_load_state("networkidle")
    n = 0

    def shot(name):
        global n
        n += 1
        page.screenshot(path=os.path.join(OUT, f"{MODE}-r{n:02d}-{name}.png"))

    page.get_by_role("button", name="Ouvrir le paquet du jour").click()
    page.wait_for_selector(".reveal__pack")
    page.wait_for_timeout(900)
    shot("paquet")
    # swipe across the pack
    box = page.locator(".reveal__pack").bounding_box()
    y = box["y"] + box["height"] * 0.12
    page.mouse.move(box["x"] + 20, y)
    page.mouse.down()
    for k in range(1, 6):
        page.mouse.move(box["x"] + 20 + k * box["width"] * 0.08, y)
        page.wait_for_timeout(40)
    shot("dechirure")
    for k in range(6, 12):
        page.mouse.move(box["x"] + 20 + k * box["width"] * 0.08, y)
        page.wait_for_timeout(30)
    page.mouse.up()
    page.wait_for_timeout(450)
    shot("ouverture")
    page.wait_for_selector(".reveal__deck")
    page.wait_for_timeout(700)
    shot("pile")
    for i in range(5):
        page.locator(".reveal__stage").click(position={"x": 30, "y": 30})
        page.wait_for_timeout(300)
        walking = page.locator(".reveal--walk").count() > 0
        if walking:
            page.wait_for_timeout(900)
            shot(f"carte{i + 1}-indice1")
            page.wait_for_timeout(1500)
            shot(f"carte{i + 1}-indices")
            page.wait_for_timeout(1300)
        else:
            page.wait_for_timeout(700)
        shot(f"carte{i + 1}")
        page.locator(".reveal__stage").click(position={"x": 30, "y": 30})
        page.wait_for_timeout(500)
    page.wait_for_selector(".recap")
    page.wait_for_timeout(2200)
    shot("resume")
    page.screenshot(path=os.path.join(OUT, f"{MODE}-r99-resume-full.png"), full_page=True)
    saved = json.loads(page.evaluate("localStorage.getItem('footdex.etat.v3')"))
    print("cartes ouvertes :", saved["opened"], "paquets :", saved["packs"], "étoiles :", saved["stars"], "cadeaux :", len(saved["gifts"]))
    browser.close()
print("Erreurs :", errors[:6] if errors else "aucune")
