# -*- coding: utf-8 -*-
"""
背景素材の修正: 画像内に描き込まれた小さな黒板(メイン黒板と重複)を消す。
構造が規則的なので決定的インペイントで対応する:
  1) 戸口の穴(マゼンタ)を下方へ延長
  2) 戸口の木枠(左右の柱)を上部から垂直タイルで延長
  3) 畳は右側の無傷領域を水平ミラータイル(継ぎ目はクロスフェード)

  python pipeline/fixbg.py     →  public/assets/bg/*.png を上書き(元は bg/_orig/ に退避)

実行後は cutout.py を再実行すること。
"""
import os
import shutil
import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")
BG = os.path.join(ROOT, "public", "assets", "bg")
ORIG = os.path.join(BG, "_orig")

MAGENTA = np.array([255, 0, 255, 255], dtype=np.uint8)

# 小黒板の占有域と再構築パラメータ(study-day / study-evening 共通構図)
HOLE = (310, 1440, 823, 1640)          # マゼンタで埋める矩形 (x0,y0,x1,y1) 戸口開口の実測値
# 柱: (paste_x0, paste_x1, donor_x0, donor_x1, donor_y0, donor_y1)
# 右柱donorは12px右へシフト(マゼンタ縁の半透過画素の混入を避ける)
COLS = [(283, 310, 283, 310, 1300, 1450), (823, 908, 835, 920, 1385, 1445)]
COL_FILL_Y = (1440, 1648)              # 柱を埋める y範囲
SILL_Y = (1640, 1688)                  # 敷居(棚脚と同じ高さの木帯)y範囲
TATAMI_Y = (1688, 1892)                # 畳を埋める y範囲
FILL_X = (290, 905)                    # 水平フィルの x範囲(小黒板の占有域)
SILL_DONOR_X = (915, 1050)             # 敷居の複製元(右棚の脚部)
TATAMI_DONOR_L = (180, 288)            # 畳の複製元(左側の無傷領域)
TATAMI_DONOR_R = (915, 1048)           # 畳の複製元(右側の無傷領域)
FADE = 18                              # 元画素との境界クロスフェード幅


def fix(path: str):
    im = Image.open(path).convert("RGBA")
    a = np.asarray(im).copy()

    # 1) 穴の延長
    x0, y0, x1, y1 = HOLE
    a[y0:y1, x0:x1] = MAGENTA

    # 2) 柱の延長(donor帯を縦タイル)
    fy0, fy1 = COL_FILL_Y
    for cx0, cx1, dxx0, dxx1, dy0, dy1 in COLS:
        donor_h = dy1 - dy0
        donor = a[dy0:dy1, dxx0:dxx1].copy()
        cw = cx1 - cx0
        ramp = np.ones((cw, 1), dtype=np.float32)  # 左右端は元画素とクロスフェード
        f = min(8, cw // 3)
        ramp[:f, 0] = np.linspace(0.35, 1, f)
        ramp[-f:, 0] = np.linspace(1, 0.35, f)
        y = fy0
        while y < fy1:
            h = min(donor_h, fy1 - y)
            block = donor[:h].astype(np.float32)
            orig = a[y : y + h, cx0:cx1].astype(np.float32)
            a[y : y + h, cx0:cx1] = (orig * (1 - ramp) + block * ramp).astype(a.dtype)
            y += h

    # 3) 敷居+畳: 各行、右側donorを水平ストレッチ(畳は横縞なので伸長が自然)。
    #    元画素との境界は左右 FADE px をクロスフェード。
    tx0, tx1 = FILL_X
    width = tx1 - tx0
    xs = np.linspace(0.0, 1.0, width)

    def stretch(donor: np.ndarray) -> np.ndarray:
        pos = xs * (donor.shape[0] - 1)
        i0 = pos.astype(int)
        i1 = np.minimum(i0 + 1, donor.shape[0] - 1)
        frac = (pos - i0)[:, None]
        return donor[i0] * (1 - frac) + donor[i1] * frac

    # 中央クロスフェード(左donor→右donor)と、元画素との左右端なじませ
    mix = np.clip((xs - 0.35) / 0.3, 0, 1)[:, None]  # 0.35..0.65 で遷移
    edge = np.ones((width, 1), dtype=np.float32)
    edge[:FADE, 0] = np.linspace(0, 1, FADE)
    edge[-FADE:, 0] = np.linspace(1, 0, FADE)

    for band, donors, vfade in [
        (SILL_Y, (SILL_DONOR_X, SILL_DONOR_X), 4),
        (TATAMI_Y, (TATAMI_DONOR_L, TATAMI_DONOR_R), 8),
    ]:
        y0b, y1b = band
        for y in range(y0b, y1b):
            dl = stretch(a[y, donors[0][0] : donors[0][1]].astype(np.float32))
            dr = stretch(a[y, donors[1][0] : donors[1][1]].astype(np.float32))
            # 上端付近は左donorに棚脚の木が写るため右donorのみで埋める
            w = float(np.clip((y - 1725) / 35.0, 0.0, 1.0))
            m = mix * w + (1.0 - w)
            row = dl * (1 - m) + dr * m
            orig = a[y, tx0:tx1].astype(np.float32)
            # 帯の下端 vfade 行は元画素へ戻していく(水平の継ぎ目消し)
            v = 1.0
            if y >= y1b - vfade:
                v = (y1b - 1 - y) / vfade
            a[y, tx0:tx1] = np.clip(orig * (1 - edge * v) + row * edge * v, 0, 255).astype(np.uint8)

    Image.fromarray(a, "RGBA").save(path)
    print(f"fixed: {os.path.basename(path)}")


def fix_evening(path: str):
    """夕方背景: 別構図(閉じた部屋)。中央の小黒板+その影を消す。
    光条が縦方向なので、黒板の上の無傷帯を縦ミラータイルで下へ敷き詰め、
    行ごとに左右の実画素の平均明度へ合わせて自然な減光を再現する。"""
    im = Image.open(path).convert("RGBA")
    a = np.asarray(im).astype(np.float32)

    from PIL import ImageFilter

    FX = (355, 715)      # 埋める x範囲(黒板+影)
    FY = (1305, 1815)    # 埋める y範囲(枠上端・つまみ含む)
    DY = (1788, 1843)    # テクスチャ複製元(影より下の無傷帯)
    TOP_BAND = (1252, 1300)   # 照明マップ参照: 上帯(黒板より上の無傷行)
    BOT_BAND = (1818, 1848)   # 照明マップ参照: 下帯
    SEAMS = [(1323, 1345), (1618, 1622)]  # 畳の縁線 (左端y, 右端y)
    FADE = 16

    width = FX[1] - FX[0]
    height = FY[1] - FY[0]

    # 1) テクスチャ: donor帯を下端位相ロックで順方向タイル(巻き継ぎフェード)
    donor = a[DY[0] : DY[1], FX[0] : FX[1], :3].copy()
    dh = donor.shape[0]
    tex = np.zeros((height, width, 3), dtype=np.float32)
    for j, y in enumerate(range(FY[0], FY[1])):
        idx = (y - DY[0]) % dh
        row = donor[idx].copy()
        if idx >= dh - FADE:
            t = (idx - (dh - FADE)) / FADE
            row = row * (1 - t) + donor[(idx + FADE) % dh] * t
        tex[j] = row

    # 2) ディテール分離: tex / lowpass(tex)
    def blur(arr: np.ndarray, radius: float) -> np.ndarray:
        im8 = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGB")
        return np.asarray(im8.filter(ImageFilter.GaussianBlur(radius))).astype(np.float32)

    detail = tex / np.maximum(blur(tex, 18), 1.0)

    # 3) 照明マップ: 上帯/下帯の列平均色を縦方向に線形補間(光条は縦なので列単位でよく再現される)
    tb = a[TOP_BAND[0] : TOP_BAND[1], FX[0] : FX[1], :3].mean(axis=0)
    bb = a[BOT_BAND[0] : BOT_BAND[1], FX[0] : FX[1], :3].mean(axis=0)
    k = np.ones(13) / 13.0  # 列方向の軽い平滑化
    tb = np.stack([np.convolve(tb[:, c], k, mode="same") for c in range(3)], axis=1)
    bb = np.stack([np.convolve(bb[:, c], k, mode="same") for c in range(3)], axis=1)
    v = np.linspace(0.0, 1.0, height)[:, None, None]
    light = tb[None, :, :] * (1 - v) + bb[None, :, :] * v

    fill = np.clip(detail * light, 0, 255)

    # 4) 縁線の復元: 左右の実測yを結ぶ傾き付きの線。左右donorの縦断面プロファイルを合成して敷く
    HALF = 12
    xs2 = np.linspace(0.0, 1.0, width)
    mix2 = np.clip((xs2 - 0.4) / 0.2, 0, 1)
    for yl, yr in SEAMS:
        pl = a[yl - HALF : yl + HALF + 1, 300:352, :3].mean(axis=1)   # (2H+1,3)
        pr = a[yr - HALF : yr + HALF + 1, 718:780, :3].mean(axis=1)
        win = (np.sin(np.linspace(0, np.pi, 2 * HALF + 1)) ** 1.5)[:, None]
        for xi in range(width):
            yc = yl + (yr - yl) * xs2[xi]
            prof = pl * (1 - mix2[xi]) + pr * mix2[xi]
            y0 = int(round(yc)) - HALF - FY[0]
            for pj in range(2 * HALF + 1):
                fj = y0 + pj
                if 0 <= fj < height:
                    w = float(win[pj, 0])
                    fill[fj, xi] = fill[fj, xi] * (1 - w) + prof[pj] * w

    # 5) 貼り込み: 外周をクロスフェード
    edge = np.ones((width,), dtype=np.float32)
    edge[:FADE] = np.linspace(0, 1, FADE)
    edge[-FADE:] = np.linspace(1, 0, FADE)
    vf = np.ones((height,), dtype=np.float32)
    vf[:FADE] = np.linspace(0, 1, FADE)
    vf[-FADE:] = np.linspace(1, 0, FADE)
    w2d = (vf[:, None] * edge[None, :])[..., None]
    region = a[FY[0] : FY[1], FX[0] : FX[1], :3]
    a[FY[0] : FY[1], FX[0] : FX[1], :3] = region * (1 - w2d) + fill * w2d

    Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), "RGBA").save(path)
    print(f"fixed: {os.path.basename(path)}")


def main():
    os.makedirs(ORIG, exist_ok=True)
    for name, fn in [("study-day.png", fix), ("study-evening.png", fix_evening)]:
        src = os.path.join(BG, name)
        bak = os.path.join(ORIG, name)
        if not os.path.exists(bak):
            shutil.copy2(src, bak)
        else:  # 再実行時は退避済みの元画像から作り直す(冪等)
            shutil.copy2(bak, src)
        fn(src)


if __name__ == "__main__":
    main()
