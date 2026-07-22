# -*- coding: utf-8 -*-
"""
ピクセル値プローブ: 指定PNGの指定座標のRGBA実値を出力する。
画像座標を目視だけで確定させない(裏取り用、cto-handoff.md 17.1-1/2/6 の教訓)。

  python pipeline/probe.py <画像パス> <x1> <y1> [<x2> <y2> ...]

例: python pipeline/probe.py out/qc-s1c1.png 823 1500 868 1500
"""
import sys
from PIL import Image

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")  # Windows既定cpでの日本語文字化け対策


def main():
    if len(sys.argv) < 4 or (len(sys.argv) - 2) % 2 != 0:
        print("使い方: python pipeline/probe.py <画像パス> <x1> <y1> [<x2> <y2> ...]")
        sys.exit(1)
    path = sys.argv[1]
    coords = [int(v) for v in sys.argv[2:]]
    im = Image.open(path).convert("RGBA")
    print(f"画像: {path} ({im.width}x{im.height})")
    for i in range(0, len(coords), 2):
        x, y = coords[i], coords[i + 1]
        if not (0 <= x < im.width and 0 <= y < im.height):
            print(f"  ({x},{y}): 範囲外")
            continue
        r, g, b, a = im.getpixel((x, y))
        print(f"  ({x},{y}): RGBA=({r},{g},{b},{a})")


if __name__ == "__main__":
    main()
