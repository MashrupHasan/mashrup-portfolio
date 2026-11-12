#!/usr/bin/env python3
"""Add a YouTube video to the Contributions > Videos tab.

    python scripts/add_video.py "https://youtu.be/XXXXXXXXXXX" "Event promo" --sub "Shikorh" --cat story

Downloads the video's thumbnail into assets/videos/ (WebP, 16:9) and puts the entry at the
top of assets/videos-data.js (move the line to reposition it).
Categories: story, anim (see VIDEO_CATS in the data file). Needs Pillow:  pip install pillow
"""
import argparse, io, json, os, re, sys, urllib.request
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "videos")
DATA = os.path.join(ROOT, "assets", "videos-data.js")

ap = argparse.ArgumentParser()
ap.add_argument("url"); ap.add_argument("title")
ap.add_argument("--sub", default=""); ap.add_argument("--cat", required=True)
a = ap.parse_args()

text = open(DATA, encoding="utf-8").read()
valid = re.findall(r"(\w+)\s*:", re.search(r"VIDEO_CATS = \{([^}]*)\}", text).group(1))
if a.cat not in valid:
    sys.exit(f"Unknown category '{a.cat}'. Choose one of: {', '.join(valid)}")
m = re.search(r"(?:youtu\.be/|v=|embed/|shorts/)([A-Za-z0-9_-]{11})", a.url)
if not m:
    sys.exit("Could not find a YouTube video ID in that URL.")
vid = m.group(1)
if f'"id": "{vid}"' in text:
    sys.exit("That video is already in the list.")

def fetch(name):
    try:
        return Image.open(io.BytesIO(urllib.request.urlopen(f"https://img.youtube.com/vi/{vid}/{name}.jpg", timeout=20).read())).convert("RGB")
    except Exception:
        return None

im, letterboxed = None, False
for name, lb in (("maxresdefault", False), ("sddefault", True), ("hqdefault", True)):
    im = fetch(name)
    if im and im.size[0] > 200:      # YouTube serves a tiny grey placeholder when a size is missing
        letterboxed = lb; break
if not im:
    sys.exit("Could not download a thumbnail. Is the video public?")
if letterboxed:                      # 4:3 frame with black bars top and bottom -> 16:9
    w, h = im.size; nh = round(w * 9 / 16); t = (h - nh) // 2; im = im.crop((0, t, w, t + nh))
g = im.convert("L"); W, H = g.size; px = g.load()
colmax = lambda x: max(px[x, y] for y in range(0, H, 6))
l = 0
while l < W // 3 and colmax(l) < 18: l += 1
r = W - 1
while r > W * 2 // 3 and colmax(r) < 18: r -= 1
if l > W * 0.04:                     # baked-in pillarbox bars (non-16:9 video)
    im = im.crop((l, 0, r + 1, H)); W, H = im.size; nh = round(W * 9 / 16)
    if nh < H: t = (H - nh) // 2; im = im.crop((0, t, W, t + nh))
os.makedirs(OUT, exist_ok=True)
im.resize((640, 360), Image.LANCZOS).save(os.path.join(OUT, vid + ".webp"), "WEBP", quality=78, method=6)

entry = json.dumps({"id": vid, "title": a.title, "sub": a.sub, "cat": a.cat}, ensure_ascii=False)
marker = "window.VIDEOS = ["
open(DATA, "w", encoding="utf-8").write(text.replace(marker, marker + "\n  " + entry + ",", 1))
print(f"Added '{a.title}' ({vid}). Commit assets/videos/ and assets/videos-data.js.")
