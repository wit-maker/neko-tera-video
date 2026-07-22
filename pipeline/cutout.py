# -*- coding: utf-8 -*-
"""
マゼンタ・クロマキー切り抜き(決定的処理)。
素材はマゼンタ(#FF00FF近傍)背景で納品されるため、rembgではなく色距離キーで抜く。

  python pipeline/cutout.py

入力: public/assets/{chars,bg,fx}/*.png
出力: public/assets/cutout/{chars,bg,fx}/*.png (同名・同キャンバス・透過PNG)

処理: 1) マゼンタ色距離→ソフトアルファ 2) 縁のディスピル(マゼンタ被り除去)
"""
import os
import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")
SRC = os.path.join(ROOT, "public", "assets")
DST = os.path.join(ROOT, "public", "assets", "cutout")


def key_magenta(im: Image.Image) -> Image.Image:
    rgba = np.asarray(im.convert("RGBA")).astype(np.float32)
    r, g, b = rgba[..., 0], rgba[..., 1], rgba[..., 2]
    src_alpha = rgba[..., 3] / 255.0  # 元の透過(素材によっては縁が透過済み)を尊重する

    # マゼンタらしさ: RとBが高く、Gが低い。0..1
    magenta = np.clip((np.minimum(r, b) - g) / 255.0, 0.0, 1.0)

    # ソフトアルファ: magenta 0.25以下=不透明, 0.55以上=完全透過。元アルファと乗算合成
    alpha = np.clip((0.55 - magenta) / (0.55 - 0.25), 0.0, 1.0) * src_alpha

    # ディスピル: 半透明の縁でマゼンタ被り(R,B過多)をGへ寄せて中和
    edge = (alpha > 0.0) & (alpha < 1.0)
    spill = np.clip(np.minimum(r, b) - g, 0.0, None)
    r = np.where(edge, r - spill * 0.7, r)
    b = np.where(edge, b - spill * 0.7, b)

    out = np.dstack([
        np.clip(r, 0, 255),
        np.clip(g, 0, 255),
        np.clip(b, 0, 255),
        alpha * 255.0,
    ]).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def main():
    total = 0
    for sub in ["chars", "bg", "fx"]:
        src_dir = os.path.join(SRC, sub)
        dst_dir = os.path.join(DST, sub)
        os.makedirs(dst_dir, exist_ok=True)
        for name in sorted(os.listdir(src_dir)):
            if not name.endswith(".png"):
                continue
            im = Image.open(os.path.join(src_dir, name))
            key_magenta(im).save(os.path.join(dst_dir, name))
            total += 1
            print(f"{sub}/{name}")
    print(f"done: {total} files -> {DST}")


if __name__ == "__main__":
    main()
