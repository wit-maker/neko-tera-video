# -*- coding: utf-8 -*-
"""
口パク/目パチ用パッチ生成。
口形差分・目閉じ差分は基準ポーズ(stand)と顔の位置・スケールが揃っていないため、
各差分から口(目)だけを楕円フェザー付きで切り出し、スケール正規化して
stand座標系のパッチPNGとして書き出す。

  python pipeline/mouthpatch.py            # パッチ+検証プレビュー生成
  python pipeline/mouthpatch.py --preview  # プレビューのみ(座標調整用)

出力:
  public/assets/cutout/mouth/{who}-{viseme}.png   (stand座標系、キャンバス=PATCH_CANVAS)
  public/assets/cutout/mouth/{who}-blink.png      (目閉じパッチ、同上)
  public/assets/cutout/mouth/patch-config.json    (Remotion側で使う配置情報)

座標はすべて元画像(1280x1920)ピクセル。scale は「差分の顔が standの何倍か」。
"""
import json
import os
import sys
import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")
CUT = os.path.join(ROOT, "public", "assets", "cutout", "chars")
OUT = os.path.join(ROOT, "public", "assets", "cutout", "mouth")
SCRATCH = os.environ.get("PREVIEW_DIR", os.path.join(ROOT, "out"))

# ---- 手動計測した座標(プレビューで検証しながら調整する) ----
CONFIG = {
    "sensei": {
        # standの口の中心(貼り付け先アンカー)
        "mouthAnchor": (762, 638),
        # 差分ごとの: 口を含む切り出し箱 / 顔スケール(stand比)
        "mouth": {
            "closed": {"box": (710, 575, 855, 660), "scale": 1.09},
            "a": {"box": (615, 535, 815, 715), "scale": 1.17},
            "i": {"box": (605, 560, 785, 680), "scale": 1.13},
            "u": {"box": (700, 505, 820, 615), "scale": 1.09},
            "e": {"box": (630, 530, 780, 650), "scale": 1.09},
            "o": {"box": (650, 540, 775, 670), "scale": 1.13},
        },
        # 目パチ: standの左右目アンカーと、eyes-closed内の切り出し箱
        "eyeAnchors": [(596, 506), (818, 492)],
        "eyes": {
            "boxes": [(560, 478, 692, 562), (808, 468, 932, 548)],
            "scale": 1.09,
        },
    },
    "mike": {
        "mouthAnchor": (925, 695),
        "mouth": {
            "closed": {"box": (880, 675, 1020, 760), "scale": 1.06},
            "a": {"box": (795, 625, 975, 770), "scale": 0.94},
            "i": {"box": (790, 685, 1005, 790), "scale": 1.0},
            "u": {"box": (855, 690, 975, 780), "scale": 1.0},
            "e": {"box": (845, 685, 970, 790), "scale": 1.0},
            "o": {"box": (815, 645, 990, 790), "scale": 1.0},
        },
        "eyeAnchors": [(765, 605), (990, 540)],
        "eyes": {
            "boxes": [(650, 530, 880, 720), (900, 455, 1100, 620)],
            "scale": 1.0,
        },
    },
}

# 非standポーズの口アンカーと顔スケール(stand比)。口パッチをこの位置・倍率で重ねる。
# scaleは覆い残し防止のため実測よりやや大きめに設定しているものがある。
POSES = {
    "sensei": {
        "stand": {"anchor": None, "scale": 1.0},  # anchor=None → mouthAnchor を使う
        "point": {"anchor": (742, 556), "scale": 0.95},
        "tea": {"anchor": (570, 682), "scale": 1.04},  # 目は元絵で閉じている
    },
    "mike": {
        "stand": {"anchor": None, "scale": 1.0},
        "point": {"anchor": (830, 620), "scale": 1.15},  # 元絵の口が開いているため大きめに覆う
        "think": {"anchor": (840, 668), "scale": 1.0},
        "tablet": {"anchor": (600, 818), "scale": 1.2},
    },
}

# パッチの出力キャンバス(stand座標系・口アンカー中心)。表示側はこの矩形を配置するだけ。
PATCH_CANVAS = 260  # 口: 260x260 / 目: 目アンカー中心 180x140 x2


def feather_ellipse(w: int, h: int, feather: float = 0.22) -> np.ndarray:
    """中心1.0、縁0.0の楕円フェザーマスク"""
    yy, xx = np.mgrid[0:h, 0:w]
    nx = (xx - (w - 1) / 2) / (w / 2)
    ny = (yy - (h - 1) / 2) / (h / 2)
    r = np.sqrt(nx * nx + ny * ny)
    return np.clip((1.0 - r) / feather, 0.0, 1.0)


def extract_patch(img: Image.Image, box, scale: float) -> Image.Image:
    """箱で切り出し→1/scaleに縮小→楕円フェザーをアルファに乗算"""
    patch = img.crop(box)
    w = round(patch.width / scale)
    h = round(patch.height / scale)
    patch = patch.resize((w, h), Image.LANCZOS)
    arr = np.asarray(patch.convert("RGBA")).astype(np.float32)
    arr[..., 3] *= feather_ellipse(w, h)
    return Image.fromarray(arr.astype(np.uint8), "RGBA")


def centered_canvas(patch: Image.Image, size: int) -> Image.Image:
    cv = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    cv.paste(patch, ((size - patch.width) // 2, (size - patch.height) // 2), patch)
    return cv


def main():
    preview_only = "--preview" in sys.argv
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(SCRATCH, exist_ok=True)
    config_out = {}

    for who, cfg in CONFIG.items():
        stand = Image.open(os.path.join(CUT, f"{who}-stand.png")).convert("RGBA")
        ax, ay = cfg["mouthAnchor"]
        tiles = []

        for viseme, spec in cfg["mouth"].items():
            src = Image.open(os.path.join(CUT, f"{who}-mouth-{viseme}.png")).convert("RGBA")
            patch = extract_patch(src, spec["box"], spec["scale"])
            if not preview_only:
                centered_canvas(patch, PATCH_CANVAS).save(os.path.join(OUT, f"{who}-{viseme}.png"))
            # プレビュー: standに貼って顔まわりを切り出す
            comp = stand.copy()
            comp.alpha_composite(patch, (ax - patch.width // 2, ay - patch.height // 2))
            face = comp.crop((ax - 330, ay - 420, ax + 330, ay + 220))
            tiles.append((viseme, face))

        # 目パチプレビュー(閉じ目パッチをstandに貼る)
        eyes_src = Image.open(os.path.join(CUT, f"{who}-eyes-closed.png")).convert("RGBA")
        blink = Image.new("RGBA", stand.size, (0, 0, 0, 0))
        for (ex, ey), ebox in zip(cfg["eyeAnchors"], cfg["eyes"]["boxes"]):
            ep = extract_patch(eyes_src, ebox, cfg["eyes"]["scale"])
            blink.alpha_composite(ep, (ex - ep.width // 2, ey - ep.height // 2))
        if not preview_only:
            bx0, by0 = min(e[0] for e in cfg["eyeAnchors"]), min(e[1] for e in cfg["eyeAnchors"])
            bx1, by1 = max(e[0] for e in cfg["eyeAnchors"]), max(e[1] for e in cfg["eyeAnchors"])
            box = (bx0 - 130, by0 - 100, bx1 + 130, by1 + 100)
            blink.crop(box).save(os.path.join(OUT, f"{who}-blink.png"))
            poses = {}
            for pose, pspec in POSES[who].items():
                pim = Image.open(os.path.join(CUT, f"{who}-{pose}.png"))
                anchor = pspec["anchor"] or (ax, ay)
                poses[pose] = {
                    "anchor": list(anchor),
                    "scale": pspec["scale"],
                    "imgW": pim.width,
                    "imgH": pim.height,
                }
            config_out[who] = {
                "mouthAnchor": [ax, ay],
                "mouthCanvas": PATCH_CANVAS,
                "blinkBox": list(box),
                "poses": poses,
            }
        comp = stand.copy()
        comp.alpha_composite(blink)
        tiles.append(("blink", comp.crop((ax - 330, ay - 420, ax + 330, ay + 220))))

        # 非standポーズ検証: aとclosedのパッチをポーズ絵へ重ねる
        for pose, pspec in POSES[who].items():
            if pspec["anchor"] is None:
                continue
            pim = Image.open(os.path.join(CUT, f"{who}-{pose}.png")).convert("RGBA")
            px, py = pspec["anchor"]
            for viseme in ["a", "closed"]:
                patch = extract_patch(
                    Image.open(os.path.join(CUT, f"{who}-mouth-{viseme}.png")),
                    cfg["mouth"][viseme]["box"],
                    cfg["mouth"][viseme]["scale"] / pspec["scale"],
                )
                pc = pim.copy()
                pc.alpha_composite(patch, (px - patch.width // 2, py - patch.height // 2))
                r = round(330 * pspec["scale"])
                tiles.append((f"{pose}-{viseme}", pc.crop((px - r, py - round(r * 1.27), px + r, py + round(r * 0.67)))))

        # コンタクトシート(表示スケール相当より大きめの1/1)
        w, h = tiles[0][1].size
        rows = (len(tiles) + 3) // 4
        sheet = Image.new("RGB", (w * 4 + 24, (h + 6) * rows), (40, 40, 40))
        from PIL import ImageDraw
        for i, (name, tile) in enumerate(tiles):
            tile = tile.resize((w, h), Image.LANCZOS)
            bg = Image.new("RGB", (w, h), (70, 85, 75))
            bg.paste(tile, (0, 0), tile)
            ImageDraw.Draw(bg).text((8, 8), name, fill=(255, 220, 0))
            sheet.paste(bg, ((i % 4) * (w + 6), (i // 4) * (h + 6)))
        sheet.save(os.path.join(SCRATCH, f"patch-preview-{who}.png"))
        print(f"preview: {SCRATCH}\\patch-preview-{who}.png")

    if not preview_only:
        for dst in [os.path.join(OUT, "patch-config.json"), os.path.join(ROOT, "src", "patch-config.json")]:
            with open(dst, "w", encoding="utf-8") as f:
                json.dump(config_out, f, ensure_ascii=False, indent=2)
        print(f"patches -> {OUT}")


if __name__ == "__main__":
    main()
