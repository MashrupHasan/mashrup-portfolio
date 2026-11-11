#!/usr/bin/env python3
"""Add a graphic to the Contributions > Graphics tab.

    python scripts/add_graphic.py path/to/design.png "Event poster" --client "Shikorh" --cat illus

Writes a 720px thumbnail and a 1400px full image (WebP) into assets/graphics/
and puts the entry at the top of assets/graphics-data.js (at the top of the list; move the line to reposition it).
Categories: pack, illus, ps, ui, banner, thumb, tee (see GRAPHIC_CATS in the data file).
Needs Pillow:  pip install pillow
"""
import argparse, json, os, re, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "graphics")
DATA = os.path.join(ROOT, "assets", "graphics-data.js")

ap = argparse.ArgumentParser()
ap.add_argument("image")
ap.add_argument("title")
ap.add_argument("--client", default="")
ap.add_argument("--cat", required=True)
a = ap.parse_args()

text = open(DATA, encoding="utf-8").read()
cats = re.search(r"GRAPHIC_CATS = \{([^}]*)\}", text).group(1)
valid = re.findall(r"(\w+)\s*:", cats)
if a.cat not in valid:
    sys.exit(f"Unknown category '{a.cat}'. Choose one of: {', '.join(valid)}")

base = re.sub(r"[^a-z0-9]+", "-", f"{a.client} {a.title}".lower()).strip("-") or "graphic"
slug, n = base, 2
while os.path.exists(os.path.join(OUT, slug + ".webp")):
    slug, n = f"{base}-{n}", n + 1

im = Image.open(a.image)
if im.mode in ("RGBA", "LA", "P"):
    im = im.convert("RGBA")
    bg = Image.new("RGB", im.size, "white")
    bg.paste(im, mask=im.split()[-1])
    im = bg
else:
    im = im.convert("RGB")

os.makedirs(OUT, exist_ok=True)
full = im.copy(); full.thumbnail((1400, 1400), Image.LANCZOS)
full.save(os.path.join(OUT, slug + ".webp"), "WEBP", quality=80, method=6)
thumb = im.copy(); thumb.thumbnail((720, 720), Image.LANCZOS)
thumb.save(os.path.join(OUT, slug + "-thumb.webp"), "WEBP", quality=78, method=6)

entry = json.dumps({"slug": slug, "title": a.title, "client": a.client, "cat": a.cat,
                    "w": thumb.size[0], "h": thumb.size[1]}, ensure_ascii=False)
marker = "window.GRAPHICS = ["
text = text.replace(marker, marker + "\n  " + entry + ",", 1)
open(DATA, "w", encoding="utf-8").write(text)
print(f"Added '{a.title}' as {slug}. Commit assets/graphics/ and assets/graphics-data.js.")
