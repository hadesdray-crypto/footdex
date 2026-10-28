"""Puts the Google fonts inside the app (dist/site and dist/apk), so the titles look right with no internet.
Run by the GitHub robots (they have internet). If anything fails, the page keeps its online fonts."""
import re, sys, urllib.request, pathlib

UA = "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Mobile Safari/537.36"
def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=30).read()

for target in sys.argv[1:]:
    root = pathlib.Path(target)
    index = root / "index.html"
    html = index.read_text(encoding="utf-8")
    links = re.findall(r'<link rel="stylesheet" href="(https://fonts\.googleapis\.com/[^"]+)">', html)
    if not links:
        continue
    try:
        (root / "fonts").mkdir(exist_ok=True)
        css_all, n = "", 0
        for href in links:
            css = get(href.replace("&amp;", "&")).decode()
            for url in sorted(set(re.findall(r"url\((https://fonts\.gstatic\.com/[^)]+)\)", css))):
                n += 1
                name = f"f{n}.woff2"
                (root / "fonts" / name).write_bytes(get(url))
                css = css.replace(url, name)
            css_all += css
        (root / "fonts" / "polices.css").write_text(css_all, encoding="utf-8")
        for href in links:
            html = html.replace(f'<link rel="stylesheet" href="{href}">', "", 1)
        html = re.sub(r'<link rel="preconnect" href="https://fonts\.g[^"]+"( crossorigin)?>\n?', "", html)
        html = html.replace("</head>", '<link rel="stylesheet" href="fonts/polices.css">\n</head>', 1)
        index.write_text(html, encoding="utf-8")
        print(f"{target}: {n} polices locales")
    except Exception as e:  # keep the online fonts
        print(f"{target}: polices en ligne gardées ({e})")
