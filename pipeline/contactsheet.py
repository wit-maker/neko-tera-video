# -*- coding: utf-8 -*-
"""
複数の検分用stillを1枚のコンタクトシート(合成プレビュー)に並べる。
表示スケールでの目視検収用(cto-handoff.md 17.2-4: 検証は最終表示系で行う)。

  python pipeline/contactsheet.py <出力パス> <画像1> <画像2> ...

例: python pipeline/contactsheet.py out/contact-s1.png out/qc-s1c1-head.png out/qc-s1c1-mid.png out/qc-s1c1-tail.png
"""
import sys
from PIL import Image, ImageDraw

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")  # Windows既定cpでの日本語文字化け対策

COLS = 3
THUMB_W = 360


def main():
    if len(sys.argv) < 3:
        print("使い方: python pipeline/contactsheet.py <出力パス> <画像1> [<画像2> ...]")
        sys.exit(1)
    out_path = sys.argv[1]
    paths = sys.argv[2:]
    thumbs = []
    for p in paths:
        im = Image.open(p).convert("RGB")
        w, h = im.size
        th = round(h * THUMB_W / w)
        thumbs.append((p, im.resize((THUMB_W, th), Image.LANCZOS)))

    row_h = max(t[1].height for t in thumbs) + 28
    rows = (len(thumbs) + COLS - 1) // COLS
    sheet = Image.new("RGB", (THUMB_W * COLS + 8 * (COLS + 1), row_h * rows + 8), (30, 30, 30))
    draw = ImageDraw.Draw(sheet)
    for i, (p, th) in enumerate(thumbs):
        cx = 8 + (i % COLS) * (THUMB_W + 8)
        cy = 8 + (i // COLS) * row_h
        sheet.paste(th, (cx, cy))
        name = p.replace("\\", "/").split("/")[-1]
        draw.text((cx, cy + th.height + 4), name, fill=(255, 220, 0))
    sheet.save(out_path)
    print(f"contact sheet -> {out_path} ({len(thumbs)} images, {COLS} cols)")


if __name__ == "__main__":
    main()
