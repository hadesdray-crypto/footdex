#!/usr/bin/env python3
"""Interactive checks of the collection (state v3): packs, path, rewards, gifts, shop, migration,
plus search, fiches and archives.

Usage: python3 tools/flows.py <base url> <screenshot dir> [mobile|desktop]
"""
import json
import os
import sys
from datetime import date

from playwright.sync_api import sync_playwright

BASE, OUT = sys.argv[1], sys.argv[2]
MODE = sys.argv[3] if len(sys.argv) > 3 else "mobile"
os.makedirs(OUT, exist_ok=True)
size = {"width": 390, "height": 844} if MODE == "mobile" else {"width": 1280, "height": 860}
TODAY = date.today().isoformat()
KEY, OLD = "footdex.etat.v3", "footdex.etat.v2"
problems = []


def check(ok, text):
    if not ok:
        problems.append(text)


def v3(**over):
    s = {"v": 3, "cards": {}, "order": 0, "opened": 0, "packs": 0, "stars": 0, "gifts": [], "claimed": 0, "backs": ["dos-0"], "back": "dos-0",
         "freeDay": "", "bonusDay": "", "quiz": None, "seen": [], "fav": [], "quizBest": 0, "log": [], "updated": 1}
    s.update(over)
    return json.dumps(s)


with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport=size, device_scale_factor=2 if MODE == "mobile" else 1, locale="fr-FR")
    ctx.route("**/fonts.g*/**", lambda r: r.abort())
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" and "ERR_FAILED" not in m.text else None)

    def shot(name):
        page.screenshot(path=os.path.join(OUT, f"{MODE}-{name}.png"))

    def saved():
        return json.loads(page.evaluate(f"localStorage.getItem('{KEY}')") or "null")

    def load(route, state=None, old=None):
        page.goto(f"{BASE}#accueil")
        page.wait_for_selector(".page")
        page.evaluate("() => { localStorage.clear(); sessionStorage.clear(); }")
        if state:
            page.evaluate(f"s => localStorage.setItem('{KEY}', s)", state)
        if old:
            page.evaluate(f"s => localStorage.setItem('{OLD}', s)", old)
        page.goto(f"{BASE}#{route}")
        page.reload()
        page.wait_for_selector(".page")
        page.wait_for_load_state("networkidle")

    def open_and_finish(button, close="Fermer"):
        page.get_by_role("button", name=button).first.click()
        page.wait_for_selector(".reveal")
        if page.locator(".reveal__pack").count():
            page.locator(".reveal__pack").click()
        page.wait_for_selector(".reveal__deck", timeout=5000)
        page.get_by_role("button", name="Tout montrer").click()
        page.wait_for_selector(".recap")
        page.wait_for_timeout(400)

    # 1. first pack, from an empty album: tear, show all, binder
    load("paquets")
    page.get_by_role("button", name="Ouvrir le paquet du jour").click()
    page.wait_for_selector(".reveal__pack")
    page.wait_for_timeout(500)
    shot("flow-01-paquet")
    page.locator(".reveal__pack").click()
    page.wait_for_selector(".reveal__deck")
    page.wait_for_timeout(600)
    shot("flow-02-pile")
    page.locator(".reveal__stage").click(position={"x": 20, "y": 20})
    page.wait_for_timeout(3600)
    shot("flow-03-premiere")
    page.get_by_role("button", name="Tout montrer").click()
    page.wait_for_selector(".recap")
    page.wait_for_timeout(1200)
    shot("flow-04-resume")
    check(page.locator(".recap__cards .carte").count() == 5, f"résumé : {page.locator('.recap__cards .carte').count()} cartes au lieu de 5")
    page.get_by_role("button", name="Voir mon classeur").click()
    page.wait_for_selector(".binder__grid")
    page.wait_for_timeout(500)
    shot("flow-05-classeur")
    s = saved()
    check(page.locator(".binder__grid .carte").count() == 5, "classeur : pas 5 cartes")
    check(s and s["packs"] == 1 and s["opened"] == 5 and len(s["cards"]) == 5 and s["freeDay"] == TODAY, f"état après 1er paquet : {s and (s['packs'], s['opened'], len(s['cards']), s['freeDay'])}")
    page.goto(f"{BASE}#paquets")
    page.wait_for_selector(".packhero")
    check(page.get_by_role("button", name="Paquet du jour ouvert").is_disabled(), "le paquet du jour reste ouvrable")

    # 2. quiz passed: bonus pack
    load("paquets", v3(packs=1, opened=5, freeDay=TODAY, quiz={"day": TODAY, "score": 4, "total": 5, "passed": True}))
    open_and_finish("Ouvrir le paquet bonus")
    page.get_by_role("button", name="Fermer", exact=True).last.click()
    s = saved()
    check(s["packs"] == 2 and s["bonusDay"] == TODAY and s["opened"] == 10, f"bonus : {s['packs']} paquets, {s['opened']} cartes, bonusDay {s['bonusDay']}")

    # 3. crossing 100 cards: new path, rewards, gift opened right away
    load("paquets", v3(packs=19, opened=97, claimed=80, stars=50, gifts=[]))
    open_and_finish("Ouvrir le paquet du jour")
    page.wait_for_timeout(1800)
    shot("flow-06-nouveau-chemin")
    check(page.locator(".recap__newpath").count() == 1, "pas d'annonce de nouveau chemin à 100 cartes")
    s = saved()
    check(s["opened"] == 102 and s["claimed"] == 100 and any(g["kind"] == "eclat" for g in s["gifts"]), f"palier 100 : {s['opened']} cartes, claimed {s['claimed']}, cadeaux {s['gifts']}")
    page.get_by_role("button", name="Ouvrir mon cadeau").click()
    page.wait_for_selector(".reveal__pack")
    page.locator(".reveal__pack").click()
    page.wait_for_selector(".reveal__deck")
    page.locator(".reveal__stage").click(position={"x": 20, "y": 20})
    page.wait_for_timeout(3600)
    shot("flow-07-cadeau-eclat")
    s = saved()
    check(len(s["gifts"]) == 0 and s["opened"] == 103, f"cadeau Éclat : cadeaux restants {s['gifts']}, {s['opened']} cartes")
    page.keyboard.press("Escape")

    # 4. path 4 (world): game cards with their pictures
    load("paquets", v3(packs=70, opened=350, claimed=340))
    open_and_finish("Ouvrir le paquet du jour")
    page.wait_for_timeout(1500)
    shot("flow-08-monde")
    faces = page.locator(".recap__cards img").count()
    check(faces >= 2, f"chemin du monde : seulement {faces} images sur 5 cartes")
    page.keyboard.press("Escape")

    # 5. path 6 (legends): pack opens, binder shows the cards
    load("paquets", v3(packs=110, opened=550, claimed=540))
    open_and_finish("Ouvrir le paquet du jour")
    page.keyboard.press("Escape")
    page.goto(f"{BASE}#classeur")
    page.wait_for_selector(".binder__grid")
    page.wait_for_timeout(800)
    shot("flow-09-classeur-legendes")
    check(page.locator(".binder__grid .carte").count() == 5, "classeur après chemin 6 : pas 5 cartes")

    # 6. shop: a Rare card for 80 stars, the path does not move
    load("accueil", v3(packs=3, opened=15, stars=200))
    page.evaluate("() => sessionStorage.setItem('footdex.classeur', 'boutique')")
    page.goto(f"{BASE}#classeur")
    page.wait_for_selector(".offers")
    page.locator(".offer--rare button").click()
    page.wait_for_selector(".reveal")
    page.locator(".reveal__stage").click(position={"x": 20, "y": 20})
    page.wait_for_timeout(1200)
    shot("flow-10-boutique")
    s = saved()
    check(s["stars"] == 120 and s["opened"] == 15 and len(s["cards"]) == 1, f"boutique : {s['stars']} étoiles, {s['opened']} cartes ouvertes, {len(s['cards'])} carte")
    page.keyboard.press("Escape")

    # 7. a collection of the first version is not carried over: the new one starts empty
    old = {"v": 2, "cards": {"a:zidane": [2, 20000, 1], "a:mbappe": [1, 20001, 2]}, "order": 2, "packs": 5, "zonePacks": {}, "zone": "ligue1",
           "freeDay": "", "bonusDay": "", "quiz": None, "seen": [], "fav": [], "quizBest": 7, "log": [], "updated": 5}
    load("classeur", old=json.dumps(old))
    page.wait_for_selector(".emptybinder")
    check(page.locator(".carte").count() == 0, "remise à zéro : des cartes de l'ancienne version sont encore là")

    # 8. home shortcut opens the daily pack directly
    load("accueil", v3())
    page.get_by_role("button", name="Ouvrir le paquet du jour").click()
    page.wait_for_selector(".reveal__pack", timeout=8000)
    shot("flow-11-depuis-accueil")
    page.keyboard.press("Escape")

    # 9. a card held up in the binder, favourite from the fiche
    page.goto(f"{BASE}#classeur")
    page.wait_for_selector(".binder__grid")
    page.locator(".binder__grid .carte").first.click()
    page.wait_for_selector(".viewer")
    page.wait_for_timeout(700)
    shot("flow-12-carte")
    page.get_by_role("button", name="Ouvrir la fiche").click()
    page.wait_for_selector(".fiche__name")
    page.get_by_role("button", name="Mettre en favori").first.click()
    check(len(saved()["fav"]) == 1, "favori non enregistré")

    # 10. search, then a fiche
    page.goto(f"{BASE}#joueurs")
    page.wait_for_selector("#q")
    page.fill("#q", "haaland")
    page.wait_for_timeout(1500)
    shot("flow-13-recherche")
    check(page.locator(".tile").count() > 0, "recherche haaland : aucun résultat")
    page.locator(".tile").first.click()
    page.wait_for_selector(".fiche__name")
    page.wait_for_timeout(600)
    shot("flow-14-fiche")
    page.goto(f"{BASE}#joueurs")
    page.wait_for_selector("#q")
    page.fill("#q", "japon")
    page.wait_for_timeout(1200)
    check(page.locator(".tile").count() > 0, "recherche japon : aucun résultat")

    # 11. archives
    page.goto(f"{BASE}#scores")
    page.wait_for_selector(".results")
    page.get_by_role("button", name="Classement").click()
    page.wait_for_selector(".standings")
    shot("flow-15-classement")
    page.get_by_role("button", name="Matchs entre pays").click()
    page.wait_for_selector(".results")
    page.fill("#pays", "France")
    page.check("#coupe-du-monde")
    page.wait_for_timeout(600)
    page.locator(".result__main").first.click()
    shot("flow-16-pays")
    page.get_by_role("button", name="Effectifs Wikipédia").click()
    page.wait_for_selector(".standings--squad")
    page.goto(f"{BASE}#jeu-209331")
    page.wait_for_selector(".fiche__name")
    page.wait_for_timeout(500)
    shot("flow-17-fc26")

    browser.close()

print("\n".join(problems) if problems else "Parcours OK")
print("Erreurs console :", errors[:5] if errors else "aucune")
