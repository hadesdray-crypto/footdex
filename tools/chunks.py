#!/usr/bin/env python3
"""Cuts a tall screenshot into pieces that can be looked at one by one."""
import sys
from PIL import Image
src, height = sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 1600
im = Image.open(src)
w, h = im.size
n = 0
for top in range(0, h, height):
    im.crop((0, top, w, min(h, top + height))).save(src.replace(".png", f"-{n}.png"))
    n += 1
print(f"{n} morceaux ({w}x{h})")
