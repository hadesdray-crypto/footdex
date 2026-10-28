"""Applique tools/corrections.json aux données d'origine (ts-current.json).

Chaque opération a un `chemin` (liste : clés, indices, ou {"id": "..."} pour choisir
un élément d'une liste), une `op`, un `ancien` obligatoire (contrôle : la correction
échoue si le texte actuel ne correspond pas) et une `source`.
  remplacer        : `ancien` (sous-texte, présent exactement 1 fois) -> `nouveau`
  definir          : valeur actuelle == `ancien` -> `nouveau`
  inserer          : insère `valeur` à `index` ; `ancien` = élément actuellement à cet index (None = fin de liste)
  retirer_element  : retire de la liste l'élément égal à `ancien`
"""
import json, os


def _walk(root, chemin):
    cur = root
    for k in chemin:
        if isinstance(k, dict):
            (cle, val), = k.items()
            hits = [x for x in cur if x.get(cle) == val]
            if len(hits) != 1:
                raise SystemExit(f"corrections : {cle}={val} trouvé {len(hits)} fois")
            cur = hits[0]
        else:
            cur = cur[k]
    return cur


def apply_corrections(ts, path=None):
    path = path or os.path.join(os.path.dirname(os.path.abspath(__file__)), "corrections.json")
    ops = json.load(open(path, encoding="utf-8"))["operations"]
    for n, o in enumerate(ops, 1):
        ch, op = o["chemin"], o["op"]
        if op in ("remplacer", "definir"):
            parent, last = _walk(ts, ch[:-1]), ch[-1]
            cur = parent[last]
            if op == "remplacer":
                if cur.count(o["ancien"]) != 1:
                    raise SystemExit(f"corrections #{n} {ch} : « {o['ancien'][:50]} » trouvé {cur.count(o['ancien'])} fois")
                parent[last] = cur.replace(o["ancien"], o["nouveau"])
            else:
                if cur != o["ancien"]:
                    raise SystemExit(f"corrections #{n} {ch} : valeur actuelle différente")
                parent[last] = o["nouveau"]
        elif op == "inserer":
            lst, i = _walk(ts, ch), o["index"]
            if o["ancien"] is None:
                if i != len(lst):
                    raise SystemExit(f"corrections #{n} {ch} : la liste a {len(lst)} éléments, index {i}")
            elif lst[i] != o["ancien"]:
                raise SystemExit(f"corrections #{n} {ch} : l'élément à l'index {i} a changé")
            lst.insert(i, o["valeur"])
        elif op == "retirer_element":
            lst = _walk(ts, ch)
            if lst.count(o["ancien"]) != 1:
                raise SystemExit(f"corrections #{n} {ch} : élément introuvable")
            lst.remove(o["ancien"])
        else:
            raise SystemExit(f"corrections #{n} : opération inconnue {op}")
        if not o.get("source"):
            raise SystemExit(f"corrections #{n} : source manquante")
    return len(ops)
