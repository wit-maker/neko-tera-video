"""video.json + 生成済み音声から、文字レベルのタイムスタンプを出力する。

使い方:
    python pipeline/align.py            # 未処理の行のみ
    python pipeline/align.py --force    # 全行を再アラインメント
    python pipeline/align.py --only s1c2-01

出力: public/alignment/<lineId>.json
    { "lineId": ..., "text": ..., "chars": [ { "char": "先", "startMs": 0, "endMs": 180 }, ... ] }

依存: pip install stable-ts  (Whisperベースの強制アラインメント。初回はモデルDLが走る)
口パク(viseme)とカラオケ字幕は、このJSONをRemotion側(src/lib)で読んで導出する。
"""

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
AUDIO_DIR = ROOT / "public" / "audio"
OUT_DIR = ROOT / "public" / "alignment"

# 日本語はスペースを含まないため、word単位ではなく文字単位に展開する
MODEL_NAME = "large-v3-turbo"


def load_lines():
    project = json.loads((ROOT / "video.json").read_text(encoding="utf-8"))
    lines = []
    for scene in project["scenes"]:
        for cut in scene["cuts"]:
            for d in cut.get("dialogue", []):
                # アラインメント対象は実際に読み上げたテキスト(ttsText優先)
                text = (d.get("ttsText") or d["text"]).replace("\n", "")
                lines.append({"id": d["id"], "text": text, "displayText": d["text"]})
    return lines


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--only", type=str, default=None)
    args = parser.parse_args()

    try:
        import stable_whisper
    except ImportError:
        print("stable-ts が未インストールです: pip install stable-ts", file=sys.stderr)
        sys.exit(1)

    lines = load_lines()
    if args.only:
        lines = [l for l in lines if l["id"] == args.only]
        if not lines:
            print(f"行ID {args.only} が見つかりません", file=sys.stderr)
            sys.exit(1)

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    todo = []
    for line in lines:
        audio = AUDIO_DIR / f"{line['id']}.mp3"
        out = OUT_DIR / f"{line['id']}.json"
        if not audio.exists():
            print(f"skip {line['id']}: 音声未生成 ({audio})", file=sys.stderr)
            continue
        if out.exists() and not args.force and not args.only:
            continue
        todo.append((line, audio, out))

    if not todo:
        print("処理対象なし(すべてアラインメント済み)")
        return

    print(f"モデル読み込み中: {MODEL_NAME}")
    model = stable_whisper.load_model(MODEL_NAME)

    for line, audio, out in todo:
        print(f"アラインメント: {line['id']} 「{line['text']}」")
        # 既知テキストへの強制アラインメント。日本語なので1文字≒1トークンに近い粒度になる
        result = model.align(str(audio), line["text"], language="ja")
        chars = []
        for seg in result.segments:
            for w in seg.words:
                for ch in w.word:
                    # word内の文字は等分配分(かな1-2文字程度なので誤差は小さい)
                    pass
        # 文字単位へ展開: word→文字に時間を等分割
        for seg in result.segments:
            for w in seg.words:
                word = w.word
                if not word:
                    continue
                dur = (w.end - w.start) / len(word)
                for i, ch in enumerate(word):
                    chars.append(
                        {
                            "char": ch,
                            "startMs": round((w.start + dur * i) * 1000),
                            "endMs": round((w.start + dur * (i + 1)) * 1000),
                        }
                    )
        out.write_text(
            json.dumps(
                {"lineId": line["id"], "text": line["text"], "displayText": line["displayText"], "chars": chars},
                ensure_ascii=False,
                indent=1,
            ),
            encoding="utf-8",
        )

    print(f"完了: {len(todo)}行 → {OUT_DIR}")


if __name__ == "__main__":
    main()
