#!/usr/bin/env python3
"""Independent check: every record of the original Footdex is in the new data files.

Re-reads the ORIGINAL sources (SQLite, JSON, Excel, CSV, pasted text, images,
and the TypeScript dumps) and compares them field by field with the files
written by build-data.py. Exits non-zero on the first category with a gap.

Usage: python3 -I tools/verify-data.py <original project dir> <work dir> <out dir>
"""
import base64
import csv
import hashlib
import json
import os
import sqlite3
import sys
import unicodedata

import openpyxl

SRC, WORK, OUT = (os.path.abspath(p) for p in sys.argv[1:4])
DATA = os.path.join(OUT, "data")
report, failures = [], []


def fold(value):
    value = unicodedata.normalize("NFD", value)
    return "".join(ch for ch in value if not ("̀" <= ch <= "ͯ")).lower()


def j(path):
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def check(label, ok, detail=""):
    (report if ok else failures).append(f"{'OK ' if ok else 'ÉCHEC'} {label}{(' — ' + detail) if detail else ''}")


core = j(os.path.join(DATA, "core.json"))
ts = j(os.path.join(WORK, "ts-current.json"))

# Corrections de l'étape 2 (tools/corrections.json) : appliquées aux données d'origine
import importlib.util as _ilu
_sp = _ilu.spec_from_file_location("corrections_lib", os.path.join(os.path.dirname(os.path.abspath(__file__)), "corrections_lib.py"))
_cl = _ilu.module_from_spec(_sp); _sp.loader.exec_module(_cl)
N_CORRECTIONS = _cl.apply_corrections(ts)

# 1. Album fiches: same objects, same order, nothing added or removed.
orig_album = ts["players"]["players"] + ts["roster"]["rosterPlayers"] + ts["saison2026"]["squadNewPlayers"]
new_album = [{k: v for k, v in p.items() if k != "_src"} for p in core["album"]]
check("fiches de l'album", orig_album == new_album, f"{len(new_album)} fiches")
fields = sum(len(p) for p in orig_album)
check("champs des fiches", fields == sum(len(p) for p in new_album), f"{fields} champs")

# 2. Small JSON / TS sources, compared to the files on disk.
pairs = {
    "gameCards": j(f"{SRC}/src/data/game-cards.json"),
    "playerFacts": j(f"{SRC}/src/data/player-facts.json"),
    "changements": j(f"{SRC}/src/data/saison-2026/changements.json"),
    "portraits2026": j(f"{SRC}/src/data/saison-2026/portraits.json"),
    "effectifs": j(f"{SRC}/src/data/effectifs-2026.json"),
    "manifest": j(f"{SRC}/public/archive/manifest.json"),
    "portraits": ts["portraits"]["portraits"],
    "matches": ts["matches"]["matches"],
    "clubs": ts["clubs"]["clubs"],
    "coupes": ts["coupes"]["coupes"],
    "lexique": ts["learn"]["lexique"],
    "quiz": ts["learn"]["quiz"],
}
for key, orig in pairs.items():
    n = len(orig) if hasattr(orig, "__len__") else 1
    check(f"{key}", core[key] == orig, f"{n} éléments")
check("mises à jour", core["updates"] == {"day": ts["updates"]["UPDATE_DAY"], "items": ts["updates"]["updates"]})
check("saison (stades, matchs à venir)", core["saison"] == {"grounds": ts["saison"]["grounds"], "nextFixtures": ts["saison"]["nextFixtures"]})
check("édition et libellés", core["edition"] == ts["edition"]["EDITION"]
      and core["labels"] == {"rayon": ts["edition"]["RAYON_LABEL"], "rarity": ts["edition"]["RARITY_LABEL"]})
check("page Certitude", len(core["certitude"]) == 8 and all(r["sources"] and r["doubt"] for r in core["certitude"]))

# 3. Excel and CSV attachments.
wb = openpyxl.load_workbook(f"{SRC}/attachments/Ligue1_Ligue2_2026-27.xlsx", read_only=True, data_only=True)
sheet = list(wb["Joueurs"].iter_rows(values_only=True))[1:]
s = lambda v: "" if v is None else str(v)
ok = len(sheet) == len(core["effectifs"]["players"]) and all(
    [s(x[0]), s(x[1]), s(x[2]), s(x[3]), s(x[4]), s(x[5]), s(x[9]), s(x[10]), s(x[11])]
    == [p["ligue"], p["club"], p["numero"], p["joueur"], p["poste"], p["nationalite"], p["maj"], p["source"], p["remarque"]]
    and s(x[6]) == next(c["stade"] for c in core["effectifs"]["clubs"] if c["club"] == p["club"])
    for x, p in zip(sheet, core["effectifs"]["players"]))
check("Excel, onglet Joueurs", ok, f"{len(sheet)} lignes")
clubs_sheet = [r for r in list(wb["Clubs et stades"].iter_rows(values_only=True))[1:] if r[0] is not None]
ok = len(clubs_sheet) == len(core["effectifs"]["clubs"]) and all(
    [s(r[0]), s(r[1]), s(r[2]), s(r[3]), s(r[4]), s(r[5]), s(r[6]), s(r[7]), s(r[8]), s(r[9])]
    == [c["ligue"], c["club"], c["ville"], c["stade"], str(c["capacite"]), str(c["joueurs"]), c["maj"], c["source"], c["statut"], c["page"]]
    for r, c in zip(clubs_sheet, core["effectifs"]["clubs"]))
check("Excel, onglet Clubs et stades", ok, f"{len(clubs_sheet)} clubs")
check("Excel, onglet À lire", core["notes2026"] == [r[0] for r in wb["À lire"].iter_rows(values_only=True)])
rows = list(csv.reader(open(f"{SRC}/attachments/joueurs_ligue1_ligue2_2026-27.csv", encoding="utf-8-sig")))[1:]
ok = len(rows) == 804 and all(r[3] == p["joueur"] and r[1] == p["club"] and r[2] == p["numero"]
                              for r, p in zip(rows, core["effectifs"]["players"]))
check("CSV des joueurs 2026-2027", ok, f"{len(rows)} lignes")
extra = list(csv.DictReader(open(f"{SRC}/src/data/extra-scores.csv", encoding="utf-8")))
check("scores ajoutés du 16 au 18 octobre", core["extraScores"] == extra, f"{len(extra)} scores")

# 4. EA Sports FC 24: every column of every row, and every photo byte for byte.
db = sqlite3.connect(f"file:{SRC}/public/archive/footdex.sqlite?mode=ro", uri=True)
db.row_factory = sqlite3.Row
people = j(os.path.join(DATA, "people.json"))
decoded, faces = {}, {}
for k in range(people["chunks"]):
    chunk = j(os.path.join(DATA, f"fc24-{k}.json"))
    cols, attr_keys, skill_keys = chunk["cols"], chunk["attrKeys"], chunk["skillKeys"]
    for row in chunk["rows"]:
        rec = dict(zip(cols, row))
        if rec["name_fold"] is None:
            rec["name_fold"] = fold(rec["name"])
        values = rec["attrs"]
        attrs = dict(zip([a for a in attr_keys if a != "skills"], values[:-1]))
        attrs["skills"] = dict(zip(skill_keys, values[-1]))
        rec["attrs"] = attrs
        assert rec["id"] not in decoded
        decoded[rec["id"]] = rec
    for key, b64 in j(os.path.join(DATA, f"faces-{k}.json")).items():
        assert int(key) not in faces
        faces[int(key)] = base64.b64decode(b64)
orig = {r["id"]: dict(r) for r in db.execute("select * from jeu")}
bad = [i for i, r in orig.items() if i not in decoded or any(
    (json.loads(r[c]) != decoded[i][c]) if c == "attrs" else (r[c] != decoded[i][c])
    for c in r if c != "face")]
check("fiches EA FC 24 (toutes les colonnes)", not bad and len(decoded) == len(orig), f"{len(orig)} lignes, {len(bad)} écarts")
photo_bad = [i for i, r in orig.items() if (r["face"] is None) != (i not in faces) or (r["face"] is not None and bytes(r["face"]) != faces[i])]
check("photos du jeu, octet par octet", not photo_bad and len(faces) == sum(r["face"] is not None for r in orig.values()),
      f"{len(faces)} photos, {len(photo_bad)} écarts")

# 5. EA Sports FC 26 (fichier du 19 septembre 2025).
dec26 = {}
for k in range(people["chunks26"]):
    fc26 = j(os.path.join(DATA, f"fc26-{k}.json"))
    for row in fc26["rows"]:
        rec = dict(zip(fc26["cols"], row))
        if rec["name_fold"] is None:
            rec["name_fold"] = fold(rec["name"])
        assert rec["id"] not in dec26
        dec26[rec["id"]] = rec
orig26 = {r["id"]: dict(r) for r in db.execute("select * from jeu26")}
check("fiches du fichier 2025", dec26 == orig26, f"{len(orig26)} lignes")
c26 = people["cols"].index("chunk26")
check("chaque joueur 2025 retrouve son fichier", all((r[c26] >= 0) == (r[0] in orig26) for r in people["rows"]))

# 6. People index covers every EA id once.
ids = [r[0] for r in people["rows"]]
check("index des joueurs du jeu", len(ids) == len(set(ids)) == len(set(orig) | set(orig26)), f"{len(ids)} joueurs")
album_ids = {p["id"] for p in core["album"]}
ix = people["cols"].index("album")
cd0 = j(os.path.join(DATA, "card-doubts.json"))
check("liens fiche album ↔ fiche du jeu", all(a in album_ids for r in people["rows"] for a in r[ix])
      and sum(len(r[ix]) for r in people["rows"]) == sum(1 for k, v in core["gameCards"].items() if v.get("id") and "id" not in cd0.get(k, {})))

af = j(os.path.join(DATA, "album-faces.json"))
cd = j(os.path.join(DATA, "card-doubts.json"))
check("liens fiche ↔ jeu mis de côté (gardés dans les données)", set(cd) <= set(core["gameCards"]),
      f"{len(cd)} fiches : " + ", ".join(f"{k} ≠ {v.get('id') or v.get('new')}" for k, v in cd.items()))
expected = {}
for name, card in core["gameCards"].items():
    if "id" in cd.get(name, {}):
        continue
    if card.get("id") and orig.get(card["id"], {}).get("face") is not None:
        aid = next(p["id"] for p in core["album"] if p["display"] == name)
        expected[aid] = card["id"]
check("photos du jeu reliées aux fiches de l'album", {k: v[0] for k, v in af.items()} == expected
      and all(str(v[0]) in j(os.path.join(DATA, f"faces-{v[1]}.json")) for v in af.values()), f"{len(af)} fiches")

# 7. Ligue 1 / Ligue 2 scores.
lg = j(os.path.join(DATA, "ligues.json"))
dec = {}
for row in lg["rows"]:
    rec = dict(zip(lg["cols"], row))
    rec["season"], rec["league"] = lg["seasons"][rec["season"]], lg["leagues"][rec["league"]]
    rec["home"], rec["away"] = lg["teams"][rec["home"]], lg["teams"][rec["away"]]
    rec["home_fold"] = lg["teamFold"].get(rec["home"], fold(rec["home"]))
    rec["away_fold"] = lg["teamFold"].get(rec["away"], fold(rec["away"]))
    dec[rec["id"]] = rec
origm = {r["id"]: dict(r) for r in db.execute("select * from matches")}
check("scores de Ligue 1 et de Ligue 2", dec == origm, f"{len(origm)} matchs")

# 8. Matches between countries.
meta = j(os.path.join(DATA, "pays-meta.json"))
decn = {}
for p in meta["periods"]:
    for row in j(os.path.join(DATA, p["file"]))["rows"]:
        rec = dict(zip(meta["cols"], row))
        home, away = meta["teams"][rec["home"]], meta["teams"][rec["away"]]
        t, t_fr = meta["tournaments"][rec["tournament"]]
        decn[rec["id"]] = {
            "id": rec["id"], "date": rec["date"], "home": home, "away": away,
            "home_fold": meta["teamFold"].get(home, fold(home)), "away_fold": meta["teamFold"].get(away, fold(away)),
            "hg": rec["hg"], "ag": rec["ag"], "tournament": t, "tournament_fr": t_fr, "world_cup": rec["world_cup"],
            "city": meta["cities"][rec["city"]], "scorers": rec["scorers"], "shootout": rec["shootout"],
            "scorers_fold": rec["scorers_fold"] if rec["scorers_fold"] is not None else fold(rec["scorers"]),
        }
orign = {r["id"]: dict(r) for r in db.execute("select * from nations")}
check("matchs entre pays", decn == orign, f"{len(orign)} matchs")
check("matchs de Coupe du monde", sum(r["world_cup"] for r in decn.values()) == core["manifest"]["worldCup"],
      f"{sum(r['world_cup'] for r in decn.values())}")

# 9. Wikipedia squads, verified clubs, FIFA history.
wiki = j(os.path.join(DATA, "wiki.json"))
check("effectifs Wikipédia (base)", wiki["players"] == [dict(r) for r in db.execute("select * from players order by id")],
      f"{len(wiki['players'])} joueurs")
check("effectifs Wikipédia par club", wiki["squads"] == j(f"{SRC}/src/data/squads.json"), f"{len(wiki['squads'])} clubs")
check("clubs vérifiés à part", wiki["reel"] == j(f"{SRC}/src/data/reel.json"), f"{len(wiki['reel'])} joueurs")
doubts = j(os.path.join(DATA, "reel-doubts.json"))
check("liens de club mis de côté (gardés dans les données)", set(doubts) <= set(wiki["reel"]), f"{len(doubts)} liens : " + ", ".join(
    f"{(orig.get(int(k)) or orig26.get(int(k)))['name'][:22]} ≠ {', '.join(v['listed']) or '?'}" for k, v in doubts.items()))
pasted = json.load(open(f"{SRC}/attachments/Pasted Text-8ad88fbc-e30f-4137-993f-b786fa6eca33.txt", encoding="utf-8"))
check("historique FIFA collé", wiki["fifaHistory"] == pasted, f"{len(pasted)} joueurs")

# 10. Portraits, byte for byte.
for sub in ("", "sm"):
    folder = os.path.join(SRC, "public/players", sub)
    names = [n for n in os.listdir(folder) if n.endswith(".webp")]
    same = all(hashlib.sha256(open(os.path.join(folder, n), "rb").read()).digest()
               == hashlib.sha256(open(os.path.join(OUT, "img/players", sub, n), "rb").read()).digest() for n in names)
    check(f"portraits {'petits' if sub else 'grands'}", same, f"{len(names)} images")
refs = [v["src"] for v in core["portraits"].values()] + [r["portrait"] for r in wiki["players"] if r["portrait"]]
missing = [r for r in refs if not os.path.exists(os.path.join(OUT, "img", r.lstrip("/")))]
check("chaque portrait cité existe", not missing, f"{len(refs)} références")

print("\n".join(report))
if failures:
    print("\n".join(failures))
    sys.exit(1)
print(f"\nTout est là : {len(report)} contrôles passés.")
