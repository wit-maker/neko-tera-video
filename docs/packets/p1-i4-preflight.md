# p1-i4 · 汎用 preflight gate（fixed-input / font-network / enforcement）

**カード:** なし（共有インフラ）
**branch:** `codex/p1-i4-preflight`。`main` から分岐
**担当:** Forge
**読むもの:** [README](README.md) → `AGENTS.md` → **`docs/anti-patterns.md` の AP-009 / AP-010 / AP-012** → `pipeline/p0/fixed-input.ts` と `verify-network.ts` → 本 packet

## ⚠️ この packet は波の中で最も危険である

**誤った実装は「通ってしまう」。** 落ちないので気づかない。
AP-009 は「ローカルレンダーはオフラインだと仮定したが、フォントローダがネットワークへ121+124回アクセスしていた」
という**実際に起きた失敗**である。その封じ込めが現行の gate であり、**それは一般化しない**。

安易な実装は「2ファイルをもっと厳しく grep する」形になる。**それでは新しい P1 コンポーネントを見られない。**
この packet の受入条件は、**落ちる fixture が存在すること**である。落ちる fixture が無い PR はテストされていない。

## 背景（実測済み）

### 1. fixed-input gate が方式A専用に固い

`pipeline/p0/render-baseline.ts` は `assertFixedInputs()` を**無条件で**呼ぶ。
`TRACKED_TEXT_BLOBS` は `src/Root.tsx`、`src/Main.tsx`、`src/schema.ts`、`package-lock.json` まで blob 固定している。
**C/D/E の composition を登録した瞬間に render が中断する。**

`main` の `src/Root.tsx` は pin 値と一致しており（`9c77598d…`）、承認済み override 3件も適用済みである。
つまり `assertFixedInputs()` は**今日通る**。理論上の問題ではない。

### 2. font/network gate が2ファイル・literal 文字列に固定

`pipeline/p0/verify-network.ts` の `fontBoundaryFiles` は `ChalkBoard.tsx` と `KaraokeSubtitle.tsx` の2つだけ。
検査は `loadLocalFont(...)` や `timeoutInMilliseconds: 60_000` といった**リテラル文字列の有無**である。

**新しい P1 コンポーネントがフォントを読み込んでも、この gate からは見えない。** 通過しながらネットワークへ出る。

### 3. enforcement 証跡が実行ファイル1つしか覆っていない

`out/m3/network-enforcement.json` が名指しするのは `chrome-headless-shell.exe` のみで `"enforced": false`。
**D/E は `blender.exe` を使う。** 対象集合を contract registry から導出しないと、方式を足すたびに穴が開く。

## 承認済み範囲

- P0 の挙動は**一切変えない**。P0 の policy は今日の定数とバイト等価であることをテストで示す
- 新規 dependency は不可

## 依存

| 種別 | 内容 |
| --- | --- |
| 先行 packet | `p1-i3`（対象実行ファイルを registry から導出するため） |
| merge 済み PR | **PR #33 必須**（`pipeline/m3/network/enforcement.ts` を使う） |
| owner 判断 | なし（決定① は render 時に効く。この packet は gate を作るだけ） |

## 実装対象

```
pipeline/m3/p1/preflight/fixed-input.ts
pipeline/m3/p1/preflight/network.ts
pipeline/m3/p1/preflight/enforcement.ts
pipeline/m3/p1/preflight/check.ts          （CLI）
pipeline/m3/p1/preflight/*.test.ts
pipeline/m3/p1/preflight/fixtures/**       （否定 fixture。必須）
```

## 触ってはいけないもの

- **`pipeline/p0/**` を変更しない。** P0a の証跡が blob 固定されている
- kanban、`docs/anti-patterns.md`、`package.json`、他 packet のディレクトリ

## 実装内容

### 3-1. fixed-input を per-run policy 化

module グローバルの `TRACKED_TEXT_BLOBS` / `BASELINE_SOURCE_COMMIT` を、引数で渡す policy オブジェクトへ変える。

```
{ baselineCommit, trackedBlobs, approvedOverrides, binaries }
```

- **P0 の policy** は今日の定数と**バイト等価**。テストで現行 `assertFixedInputs()` と同一結果を出すことを示す
- **P1-A の policy** は `src/Root.tsx` の期待 blob が異なり、その差分を provenance として記録する。
  これは `M3-02` のカードが求めている「P0aとの差分をprovenanceで明示」そのものである

`pipeline/p0/fixed-input.ts` の override の作法を踏襲する。override は**逃げ道ではなく2つ目の固定 identity** であり、
「baseline commit に元の blob があること」「worktree が override と一致すること」「`git diff --quiet` が clean」の
3点を同時に満たす必要がある。

### 3-2. font / network gate の論理を反転させる

**現行:** 「この2ファイルがこれらの文字列を含むこと」
**新:** 「**承認された単一のフォントモジュール以外、フォント API に触れてはならない**」

- 検査対象は、render 対象の composition から到達可能なモジュールグラフ + P1 ソースディレクトリを glob で走査して得る。ファイル名の列挙をやめる
- **拒否する:** `@remotion/google-fonts` の import、`http`/`https` のリテラルおよびテンプレートリテラル URL、`fetch(`、`XMLHttpRequest`、`@import url(`、リモート href を持つ `<link rel="stylesheet">`、承認モジュール外での `document.fonts`
- **許可する条件はただ一つ:** すべてのフォント読み込みが、canonical blob で pin された単一の承認済みモジュールを経由すること

### 3-3. enforcement を fail closed にする

render の入口が、これから spawn する実行ファイルに対して
`pipeline/m3/network/enforcement.ts` の `validateEvidence()` を呼び、**errors があれば起動しない**。
対象実行ファイルの集合は **contract registry の `renderer.executablePath` から導出する**。
方式を足したのに証跡が無ければ**自動的に落ちる**。

## 受入証拠

| コマンド | 期待 |
| --- | --- |
| `npm run m3:p1-preflight` | 現状では**落ちる**（enforcement 未成立のため）。落ち方が正しいことを確認する |
| `npx vitest run pipeline/m3/p1/preflight` | pass |
| `npm run typecheck` / `npm test` | pass |

### 必須の否定 fixture（**5種すべて**）

各 fixture は**別々の回避経路**であり、**すべて落ちなければならない**。

| # | fixture | 回避の形 |
| --- | --- | --- |
| 1 | `@remotion/google-fonts` を import するコンポーネント | 現行 gate も捕まえる |
| 2 | `fetch("https://fonts.example/x.woff2")` を直接呼ぶ | 現行 gate は**見逃す** |
| 3 | テンプレートリテラルで URL を組み立てる（`` fetch(`https://${host}/f.woff2`) ``） | 文字列 grep を回避する |
| 4 | **2つ目**のフォント読み込みヘルパモジュールを追加する | ファイル列挙型の gate を回避する |
| 5 | CSS の `@import url(https://…)` | JS の検査だけでは見えない |

### その他の必須テスト

| 検査 | 内容 |
| --- | --- |
| P0 policy 等価 | 現行ツリーに対し、今日の `assertFixedInputs()` と**同一結果** |
| P1-A policy | `src/Root.tsx` への composition 追加は**受理**し、`src/Main.tsx` への無関係な編集は**拒否** |
| 構造的失敗 | fixture のコピーから承認済みフォント行を削除すると落ちる。**文字列一致ではなく構造的な理由で**落ちること |
| fail closed | 証跡の無い実行ファイルを持つ方式で precondition が落ちる |
| 証跡は許可ではない | 証跡を記録しただけでは render が許可されないこと |

## STOP 条件

- モジュールグラフの走査に新規 dependency が要る（**手書きの静的走査で足りるはず。足りなければ止めて報告**）
- P0 の policy 等価テストが、P0 を変えないと通らない
- 承認済みフォントモジュールの pin 方法が決まらない

## 非対象

- firewall rule の適用（**mi3san の作業**）
- P0 のリファクタリング
- render の実行

## PR 本文に書くこと

- **5つの否定 fixture がそれぞれ何を回避しようとして、どう落ちたか**
- P0 policy 等価テストの結果
- 走査が到達できない範囲があるか（あるなら、それが残存リスクである）
- gate が「文字列一致」ではなく「構造」で判定していることの説明
