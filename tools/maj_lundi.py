#!/usr/bin/env python3
"""Mise à jour du lundi de Footdex : liste les grandes fiches à revérifier, puis applique
les changements confirmés sans rien effacer.

  python3 -I maj_lundi.py liste core.json
      -> une ligne JSON par joueur en activité : id, nom, club, poste, ligne « aujourd'hui »

  python3 -I maj_lundi.py appliquer core.json changements.json "26 octobre 2026, matin" sortie.json
      changements.json = liste de changements confirmés (liste vide si rien n'a changé) :
      [{"id": "kante",                     # id de la fiche (obligatoire)
        "now": "26 octobre 2026 : milieu défensif à X. Sources : A et B.",   # obligatoire
        "change": "Phrase courte pour le journal des mises à jour.",           # obligatoire
        "source": "A et B, 26 octobre 2026",                                     # obligatoire
        "club": "X",                       # facultatif : nouveau club actuel (ou « Sans club confirmé », « Retraité »)
        "position": "Milieu défensif",     # facultatif : nouveau poste
        "stop": {"name": "X", "years": "2026–"}}]   # facultatif : nouvelle étape de carrière

Règles tenues par le script : aucune fiche ajoutée ni retirée, aucun champ effacé, l'ancien club et
l'ancienne ligne « aujourd'hui » sont recopiés dans le journal, les anciennes entrées du journal restent.
"""
import copy
import json
import re
import sys

ALLOWED = {"now", "club", "position", "clubs"}


def load(path):
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def active(player):
    return player.get("_src") == "curated" and not re.search(r"–\s*\d{4}\s*$", player.get("era", ""))


def liste(core_path):
    core = load(core_path)
    for p in core["album"]:
        if active(p):
            print(json.dumps({"id": p["id"], "nom": p["display"], "club": p["club"], "poste": p["position"],
                              "aujourdhui": p.get("now", "")}, ensure_ascii=False))


def appliquer(core_path, changes_path, day_label, out_path):
    core = load(core_path)
    before = copy.deepcopy(core)
    changes = load(changes_path)
    if not isinstance(changes, list):
        raise SystemExit("changements.json doit être une liste")
    by_id = {p["id"]: p for p in core["album"]}
    entries = []
    for ch in changes:
        for key in ("id", "now", "change", "source"):
            if not isinstance(ch.get(key), str) or not ch[key].strip():
                raise SystemExit(f"champ « {key} » manquant dans {ch}")
        extra = set(ch) - {"id", "now", "change", "source", "club", "position", "stop"}
        if extra:
            raise SystemExit(f"champs inconnus {extra} dans {ch}")
        p = by_id.get(ch["id"])
        if p is None or not active(p):
            raise SystemExit(f"« {ch['id']} » n'est pas une grande fiche en activité")
        notes = []
        if ch.get("club") and ch["club"] != p["club"]:
            notes.append(f"Avant : club {p['club']}.")
            p["club"] = ch["club"]
        if ch.get("position") and ch["position"] != p["position"]:
            notes.append(f"Avant : poste {p['position']}.")
            p["position"] = ch["position"]
        if p.get("now") and p["now"] != ch["now"]:
            notes.append(f"Ligne d'avant : « {p['now']} »")
        p["now"] = ch["now"].strip()
        stop = ch.get("stop")
        if stop:
            if not (isinstance(stop, dict) and stop.get("name") and stop.get("years")):
                raise SystemExit(f"étape de carrière incomplète : {stop}")
            if not any(c["name"] == stop["name"] and c["years"] == stop["years"] for c in p["clubs"]):
                p["clubs"].append({"name": stop["name"], "years": stop["years"]})
        entries.append({"player": p["display"], "change": " ".join([ch["change"].strip(), *notes]), "source": ch["source"].strip()})
    if not entries:
        entries.append({"player": "Contrôle du lundi", "change": "Aucun changement confirmé pour les grandes fiches en activité.",
                        "source": f"Recherche du {day_label}"})
    core["updates"]["items"] = entries + core["updates"]["items"]
    core["updates"]["day"] = day_label

    # Contrôles : rien de perdu, seuls les champs prévus ont bougé.
    assert len(core["album"]) == len(before["album"]), "nombre de fiches changé"
    for old, new in zip(before["album"], core["album"]):
        assert old["id"] == new["id"], "ordre des fiches changé"
        for key in set(old) | set(new):
            if old.get(key) != new.get(key):
                assert key in ALLOWED, f"{new['id']} : champ {key} modifié"
        assert set(old) <= set(new), f"{new['id']} : champ effacé"
        assert new["clubs"][: len(old["clubs"])] == old["clubs"], f"{new['id']} : parcours raccourci"
    assert core["updates"]["items"][len(entries):] == before["updates"]["items"], "journal modifié"
    for key in before:
        if key not in ("album", "updates"):
            assert core[key] == before[key], f"partie {key} modifiée"

    with open(out_path, "w", encoding="utf-8") as fh:
        json.dump(core, fh, ensure_ascii=False, separators=(",", ":"))
    load(out_path)
    print(f"{len(changes)} changement(s) appliqué(s), journal : {len(core['updates']['items'])} entrées, fiches : {len(core['album'])}.")
    for e in entries:
        print(f"- {e['player']} : {e['change']} ({e['source']})")


if __name__ == "__main__":
    if len(sys.argv) == 3 and sys.argv[1] == "liste":
        liste(sys.argv[2])
    elif len(sys.argv) == 6 and sys.argv[1] == "appliquer":
        appliquer(*sys.argv[2:6])
    else:
        raise SystemExit(__doc__)
