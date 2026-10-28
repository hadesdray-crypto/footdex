#!/usr/bin/env python3
"""Build the data files of the new Footdex from the original Grok project.

Nothing is summarised or dropped: every row of every source is written out,
in compact but exact form. tools/verify-data.py re-reads the originals and
checks the output independently.

Usage: python3 -I tools/build-data.py <original project dir> <work dir> <out dir>
"""
import base64
import csv
import difflib
import re
import hashlib
import json
import os
import shutil
import sqlite3
import sys
import unicodedata

import openpyxl

SRC, WORK, OUT = (os.path.abspath(p) for p in sys.argv[1:4])
DATA = os.path.join(OUT, "data")
os.makedirs(DATA, exist_ok=True)

CHUNK = 2300          # FC24 rows (and their photos) per file
FRENCH_MONTHS = {
    "janvier": 1, "février": 2, "fevrier": 2, "mars": 3, "avril": 4, "mai": 5, "juin": 6,
    "juillet": 7, "août": 8, "aout": 8, "septembre": 9, "octobre": 10, "novembre": 11,
    "décembre": 12, "decembre": 12,
}


def fold(value):
    value = unicodedata.normalize("NFD", value)
    return "".join(ch for ch in value if not ("̀" <= ch <= "ͯ")).lower()


def dump(name, obj):
    path = os.path.join(DATA, name)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(obj, fh, ensure_ascii=False, separators=(",", ":"))
    return path


def load_json(rel):
    with open(os.path.join(SRC, rel), encoding="utf-8") as fh:
        return json.load(fh)


def french_date_iso(text):
    """'20 décembre 1998' -> '1998-12-20' (sorting only; the original text is kept)."""
    if not text:
        return ""
    parts = text.replace("1er", "1").split()
    if len(parts) != 3:
        return ""
    day, month, year = parts
    m = FRENCH_MONTHS.get(month.lower())
    if not m or not day.isdigit() or not year.isdigit():
        return ""
    return f"{int(year):04d}-{m:02d}-{int(day):02d}"


ts = json.load(open(os.path.join(WORK, "ts-current.json"), encoding="utf-8"))

# Corrections de l'étape 2 (tools/corrections.json) : appliquées aux données d'origine
import importlib.util as _ilu
_sp = _ilu.spec_from_file_location("corrections_lib", os.path.join(os.path.dirname(os.path.abspath(__file__)), "corrections_lib.py"))
_cl = _ilu.module_from_spec(_sp); _sp.loader.exec_module(_cl)
N_CORRECTIONS = _cl.apply_corrections(ts)
route = json.load(open(os.path.join(WORK, "route-data.json"), encoding="utf-8"))
db = sqlite3.connect(f"file:{SRC}/public/archive/footdex.sqlite?mode=ro", uri=True)
db.row_factory = sqlite3.Row

# ---------------------------------------------------------------- album fiches
album = []
for origin, rows in (
    ("curated", ts["players"]["players"]),
    ("roster", ts["roster"]["rosterPlayers"]),
    ("saison2026", ts["saison2026"]["squadNewPlayers"]),
):
    for row in rows:
        album.append({**row, "_src": origin})

game_cards = load_json("src/data/game-cards.json")
album_by_display = {p["display"]: p["id"] for p in album}
jeu = {r["id"]: dict(r) for r in db.execute("select * from jeu")}
jeu26 = {r["id"]: dict(r) for r in db.execute("select * from jeu26")}

# Audit of the "verified club" links: the original pipeline matched EA names to Wikipedia squads by name.
# A link is set aside (kept in wiki.json, not shown as the player's club) when no player listed at that
# club and number has a name close to the EA name. Example: Lamine Yamal linked to Lamine Sy, Auxerre.
TRANSLIT = str.maketrans({"æ": "ae", "ø": "o", "ß": "ss", "ł": "l", "đ": "d", "œ": "oe", "ı": "i", "?": ""})


def letters(name):
    try:
        name = name.encode("latin-1").decode("cp1252")
    except (UnicodeEncodeError, UnicodeDecodeError):
        pass
    return [t for t in re.findall(r"[a-z]+", fold(name).translate(TRANSLIT)) if t]


def close(a, b):
    return a == b or difflib.SequenceMatcher(None, a, b).ratio() >= 0.8




def same_person(a_name, e_name):
    a, e = letters(a_name), letters(e_name)
    if len(a) > 1 and any(close(t, x) for t in a[1:] for x in e):
        return True
    if len(a) == 1 and any(close(a[0], x) for x in e):
        return True
    return len(e) == 1 and e[0] in a


# Same audit for the album fiches: the old pipeline linked some fiches to another player who shares
# the first name (Ousmane Ba -> Ousmane Dembélé). Those links stay in core.json but are not used.
fc26_by_sig = {}
for r in jeu26.values():
    fc26_by_sig.setdefault((r["overall"], r["club"], r["nation"], r["pace"], r["shooting"]), []).append(r)
card_doubts = {}
for name, card in game_cards.items():
    d = {}
    if card.get("id"):
        e = jeu.get(card["id"]) or jeu26.get(card["id"])
        if e and not same_person(name, e["name"]):
            d["id"] = e["name"]
    if card.get("new"):
        nw = card["new"]
        cands = fc26_by_sig.get((nw["overall"], nw["club"], nw["nation"], nw.get("pace"), nw.get("shooting")), [])
        if cands and not any(same_person(name, r["name"]) for r in cands):
            d["new"] = cands[0]["name"]
    if d:
        card_doubts[name] = d

ea_to_album = {}
for name, card in game_cards.items():
    if card.get("id") and "id" not in card_doubts.get(name, {}):
        ea_to_album.setdefault(card["id"], []).append(album_by_display[name])

# ------------------------------------------------------------- xlsx notes sheet
wb = openpyxl.load_workbook(os.path.join(SRC, "attachments/Ligue1_Ligue2_2026-27.xlsx"), read_only=True, data_only=True)
notes_2026 = [r[0] for r in wb["À lire"].iter_rows(values_only=True)]
club_sheet = list(wb["Clubs et stades"].iter_rows(values_only=True))
xlsx_totals = [[c for c in r if c is not None] for r in club_sheet[1:] if r[0] is None and any(c is not None for c in r)]

extra_scores = list(csv.DictReader(open(os.path.join(SRC, "src/data/extra-scores.csv"), encoding="utf-8")))

core = {
    "edition": ts["edition"]["EDITION"],
    "labels": {"rayon": ts["edition"]["RAYON_LABEL"], "rarity": ts["edition"]["RARITY_LABEL"]},
    "album": album,
    "gameCards": game_cards,
    "playerFacts": load_json("src/data/player-facts.json"),
    "changements": load_json("src/data/saison-2026/changements.json"),
    "portraits2026": load_json("src/data/saison-2026/portraits.json"),
    "portraits": ts["portraits"]["portraits"],
    "matches": ts["matches"]["matches"],
    "clubs": ts["clubs"]["clubs"],
    "coupes": ts["coupes"]["coupes"],
    "lexique": ts["learn"]["lexique"],
    "quiz": ts["learn"]["quiz"],
    "updates": {"day": ts["updates"]["UPDATE_DAY"], "items": ts["updates"]["updates"]},
    "saison": {"grounds": ts["saison"]["grounds"], "nextFixtures": ts["saison"]["nextFixtures"]},
    "effectifs": load_json("src/data/effectifs-2026.json"),
    "notes2026": notes_2026,
    "xlsxTotals": xlsx_totals,
    "certitude": route["certitude"],
    "rayonsOld": route["plus"],
    "manifest": load_json("public/archive/manifest.json"),
    "extraScores": extra_scores,
}
dump("core.json", core)

# ------------------------------------------------------------ game players (EA)
reel = load_json("src/data/reel.json")
dump("card-doubts.json", card_doubts)

FC24_COLS = ["id", "name", "name_fold", "born", "height", "weight", "foot", "positions", "overall",
             "potential", "wage", "value", "nation", "club", "league", "number", "attrs"]
FC26_COLS = ["id", "name", "name_fold", "positions", "overall", "potential", "club", "nation", "pace",
             "shooting", "passing", "dribbling", "defending", "physic", "foot", "height"]
first_attrs = json.loads(next(iter(jeu.values()))["attrs"])
ATTR_KEYS = list(first_attrs.keys())
SKILL_KEYS = list(first_attrs["skills"].keys())


def pack_attrs(text):
    obj = json.loads(text)
    assert list(obj.keys()) == ATTR_KEYS, obj.keys()
    assert list(obj["skills"].keys()) == SKILL_KEYS
    return [obj[k] for k in ATTR_KEYS if k != "skills"] + [[obj["skills"][k] for k in SKILL_KEYS]]


def ovr(eid):
    r = jeu26.get(eid) or jeu.get(eid)
    return r["overall"] or 0


linked = sorted((e for e in ea_to_album if e in jeu), key=lambda e: (-ovr(e), e))
rest = sorted((e for e in jeu if e not in ea_to_album), key=lambda e: (-(jeu[e]["overall"] or 0), e))
order24 = linked + rest
chunk_of = {eid: i // CHUNK for i, eid in enumerate(order24)}
n_chunks = (len(order24) + CHUNK - 1) // CHUNK

album_faces = {}
for eid, album_ids in ea_to_album.items():
    if eid in jeu and jeu[eid]["face"] is not None:
        for aid in album_ids:
            album_faces[aid] = [eid, chunk_of[eid]]
dump("album-faces.json", album_faces)

for k in range(n_chunks):
    ids = order24[k * CHUNK:(k + 1) * CHUNK]
    rows, faces = [], {}
    for eid in ids:
        r = jeu[eid]
        row = []
        for col in FC24_COLS:
            v = r[col]
            if col == "name_fold":
                v = None if v == fold(r["name"]) else v
            elif col == "attrs":
                v = pack_attrs(v)
            row.append(v)
        rows.append(row)
        if r["face"] is not None:
            faces[str(eid)] = base64.b64encode(r["face"]).decode("ascii")
    dump(f"fc24-{k}.json", {"cols": FC24_COLS, "attrKeys": ATTR_KEYS, "skillKeys": SKILL_KEYS, "rows": rows})
    dump(f"faces-{k}.json", faces)

CHUNK26 = 2400
ids26 = sorted(jeu26)
chunk26_of = {eid: i // CHUNK26 for i, eid in enumerate(ids26)}
n26 = (len(ids26) + CHUNK26 - 1) // CHUNK26
for k in range(n26):
    rows = []
    for eid in ids26[k * CHUNK26:(k + 1) * CHUNK26]:
        r = jeu26[eid]
        rows.append([(None if (c == "name_fold" and r[c] == fold(r["name"])) else r[c]) for c in FC26_COLS])
    dump(f"fc26-{k}.json", {"cols": FC26_COLS, "rows": rows})

wiki_rows = [dict(r) for r in db.execute("select * from players")]
squad_at = {}
for w in wiki_rows:
    squad_at.setdefault((fold(w["club"]), w["number"] or ""), []).append(w["name"])
reel_doubts = {}
for eid, r in reel.items():
    if not r["source"].startswith("Wikipédia") or "effectif " not in r["source"]:
        continue
    club = r["source"].split("effectif ", 1)[1].rsplit(",", 1)[0]
    cands = squad_at.get((fold(club), r["num"] or ""), [])
    ea_name = (jeu.get(int(eid)) or jeu26.get(int(eid)))["name"]
    if not any(same_person(cand, ea_name) for cand in cands):
        reel_doubts[eid] = {"listed": cands, "club": r["club"], "num": r["num"], "source": r["source"]}
dump("reel-doubts.json", reel_doubts)

PEOPLE_COLS = ["id", "name", "pos", "ovr", "club", "clubYear", "nation", "chunk", "face", "rep", "born", "album",
               "ovr24", "ovr26", "pot", "chunk26", "league"]
people = []
for eid in sorted(set(jeu) | set(jeu26)):
    r24, r26, rr = jeu.get(eid), jeu26.get(eid), reel.get(str(eid))
    if str(eid) in reel_doubts:
        rr = None
    name = r24["name"] if r24 else r26["name"]
    if rr:
        club, year = rr["club"], 2026
    elif r26:
        club, year = r26["club"], 2025
    else:
        club, year = r24["club"], 2023
    rep = json.loads(r24["attrs"])["reputation"] if r24 else 0
    people.append([
        eid, name, (r26 or r24)["positions"], (r26 or r24)["overall"], club, year, (r26 or r24)["nation"],
        chunk_of.get(eid, -1), 1 if (r24 and r24["face"] is not None) else 0, rep,
        french_date_iso(r24["born"]) if r24 else "", ea_to_album.get(eid, []),
        r24["overall"] if r24 else None, r26["overall"] if r26 else None, (r26 or r24)["potential"],
        chunk26_of.get(eid, -1), r24["league"] if r24 else "",
    ])
dump("people.json", {"cols": PEOPLE_COLS, "chunks": n_chunks, "chunks26": n26, "rows": people})

# --------------------------------------------------------- Ligue 1 / Ligue 2 scores
M_COLS = ["id", "season", "league", "date", "home", "away", "hg", "ag", "htg", "atg", "hs", "away_shots",
          "hst", "ast", "hc", "ac", "hy", "ay", "hr", "ar"]
teams, seasons, leagues, team_fold = [], [], [], {}
t_ix, s_ix, l_ix = {}, {}, {}


def ix(table, index, value):
    if value not in index:
        index[value] = len(table)
        table.append(value)
    return index[value]


m_rows = []
for r in db.execute("select * from matches order by date, id"):
    for side in ("home", "away"):
        stored = r[f"{side}_fold"]
        if stored != fold(r[side]):
            assert team_fold.get(r[side], stored) == stored
            team_fold[r[side]] = stored
    row = [r["id"], ix(seasons, s_ix, r["season"]), ix(leagues, l_ix, r["league"]), r["date"],
           ix(teams, t_ix, r["home"]), ix(teams, t_ix, r["away"])] + [r[c] for c in M_COLS[6:]]
    m_rows.append(row)
dump("ligues.json", {"cols": M_COLS, "teams": teams, "seasons": seasons, "leagues": leagues,
                     "teamFold": team_fold, "rows": m_rows})

# ------------------------------------------------------------- national teams
N_COLS = ["id", "date", "home", "away", "hg", "ag", "tournament", "world_cup", "city", "scorers", "shootout",
          "scorers_fold"]
n_teams, n_tix, n_fold = [], {}, {}
tours, tour_ix, cities, city_ix = [], {}, [], {}
periods = [("1872-01-01", "1959-12-31"), ("1960-01-01", "1989-12-31"), ("1990-01-01", "2009-12-31"),
           ("2010-01-01", "2099-12-31")]
period_rows = [[] for _ in periods]
for r in db.execute("select * from nations order by date, id"):
    for side in ("home", "away"):
        stored = r[f"{side}_fold"]
        assert n_fold.get(r[side], stored) == stored, (r[side], stored)
        n_fold[r[side]] = stored
        ix(n_teams, n_tix, r[side])
    tour = ix(tours, tour_ix, (r["tournament"], r["tournament_fr"]))
    row = [r["id"], r["date"], n_tix[r["home"]], n_tix[r["away"]], r["hg"], r["ag"], tour, r["world_cup"],
           ix(cities, city_ix, r["city"]), r["scorers"], r["shootout"],
           None if r["scorers_fold"] == fold(r["scorers"]) else r["scorers_fold"]]
    for p, (lo, hi) in enumerate(periods):
        if lo <= r["date"] <= hi:
            period_rows[p].append(row)
            break
    else:
        raise SystemExit(f"date hors périodes: {r['date']}")
n_fold_extra = {t: f for t, f in n_fold.items() if f != fold(t)}
dump("pays-meta.json", {"cols": N_COLS, "teams": n_teams, "teamFold": n_fold_extra,
                        "tournaments": [list(t) for t in tours], "cities": cities,
                        "periods": [{"from": lo[:4], "to": min(hi[:4], "2026"), "file": f"pays-{i}.json",
                                     "count": len(period_rows[i])} for i, (lo, hi) in enumerate(periods)]})
for i, rows in enumerate(period_rows):
    dump(f"pays-{i}.json", {"rows": rows})

# ----------------------------------------------- Wikipedia squads, reel clubs, history
wiki_players = [dict(r) for r in db.execute("select * from players order by id")]
with open(os.path.join(SRC, "attachments/Pasted Text-8ad88fbc-e30f-4137-993f-b786fa6eca33.txt"), encoding="utf-8") as fh:
    history = json.load(fh)
dump("wiki.json", {
    "players": wiki_players,
    "squads": load_json("src/data/squads.json"),
    "reel": reel,
    "fifaHistory": history,
})

# --------------------------------------------------------------------- images
img_dir = os.path.join(OUT, "img", "players")
os.makedirs(os.path.join(img_dir, "sm"), exist_ok=True)
for sub in ("", "sm"):
    folder = os.path.join(SRC, "public/players", sub)
    for name in sorted(os.listdir(folder)):
        if name.endswith(".webp"):
            shutil.copyfile(os.path.join(folder, name), os.path.join(img_dir, sub, name))

dump("portraits-small.json", sorted(n[:-5] for n in os.listdir(os.path.join(img_dir, "sm")) if n.endswith(".webp")))

# --------------------------------------------------------------------- manifest
summary = {
    "album": len(album), "gameCards": len(game_cards), "fc24": len(jeu), "fc26": len(jeu26),
    "people": len(people), "faces": sum(1 for r in jeu.values() if r["face"] is not None),
    "fc24Chunks": n_chunks, "ligues": len(m_rows), "pays": sum(len(r) for r in period_rows),
    "wikiPlayers": len(wiki_players), "reel": len(reel), "fifaHistory": len(history),
    "portraits": len(os.listdir(img_dir)) - 1, "portraitsSmall": len(os.listdir(os.path.join(img_dir, "sm"))),
}
files = {}
for base, _, names in os.walk(OUT):
    for name in names:
        path = os.path.join(base, name)
        rel = os.path.relpath(path, OUT)
        with open(path, "rb") as fh:
            blob = fh.read()
        files[rel] = {"bytes": len(blob), "sha256": hashlib.sha256(blob).hexdigest()}
json.dump({"summary": summary, "files": files}, open(os.path.join(WORK, "build-manifest.json"), "w"), indent=1)
print(json.dumps(summary, indent=1))
total = sum(f["bytes"] for f in files.values())
print(f"{len(files)} fichiers, {total / 1e6:.1f} Mo")
for rel, f in sorted(files.items(), key=lambda kv: -kv[1]["bytes"])[:12]:
    print(f"  {rel}: {f['bytes'] / 1e6:.2f} Mo")
