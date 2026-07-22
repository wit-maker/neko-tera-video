# QC検分レポート

## フレーム早見表(npx tsx pipeline/print-timing.ts の出力、現行値・2026-07-23取得)

```
s1c1	from=0	dur=240	(0.0s)
s1c2	from=240	dur=494	(4.0s)
s1c3	from=734	dur=462	(12.2s)
s1c4	from=1196	dur=377	(19.9s)
s1c5	from=1573	dur=291	(26.2s)
s1c6	from=1864	dur=711	(31.1s)
s2c1	from=2575	dur=373	(42.9s)
s2c2	from=2948	dur=192	(49.1s)
s2c3	from=3140	dur=401	(52.3s)
s2c4	from=3541	dur=391	(59.0s)
s2c5	from=3932	dur=757	(65.5s)
s2c6	from=4689	dur=670	(78.2s)
s3c1	from=5359	dur=252	(89.3s)
s3c2	from=5611	dur=351	(93.5s)
s3c3	from=5962	dur=623	(99.4s)
s3c4	from=6585	dur=597	(109.8s)
s3c5	from=7182	dur=467	(119.7s)
s3c6	from=7649	dur=501	(127.5s)
s4c1	from=8150	dur=504	(135.8s)
s4c2	from=8654	dur=193	(144.2s)
s4c3	from=8847	dur=715	(147.4s)
s4c4	from=9562	dur=301	(159.4s)
s4c5	from=9863	dur=305	(164.4s)
s4c6	from=10168	dur=454	(169.5s)
s5c1	from=10622	dur=253	(177.0s)
s5c2	from=10875	dur=205	(181.3s)
s5c3	from=11080	dur=241	(184.7s)
s5c4	from=11321	dur=755	(188.7s)
s5c5	from=12076	dur=336	(201.3s)
s5c6	from=12412	dur=784	(206.9s)
s6c1	from=13196	dur=328	(219.9s)
s6c2	from=13524	dur=188	(225.4s)
s6c3	from=13712	dur=602	(228.5s)
s6c4	from=14314	dur=672	(238.6s)
s6c5	from=14986	dur=405	(249.8s)
s6c6	from=15391	dur=573	(256.5s)
s7c1	from=15964	dur=180	(266.1s)
s7c2	from=16144	dur=259	(269.1s)
s7c3	from=16403	dur=458	(273.4s)
s7c4	from=16861	dur=370	(281.0s)
s7c5	from=17231	dur=386	(287.2s)
s7c6	from=17617	dur=619	(293.6s)
total 18236 frames = 303.9s
```

以降、シーン別・特別判定の検分結果は docs/qc-report/*.md に格納し、F1-Mで本ファイルへ統合する。

## F1〜F4 統合状況（2026-07-23）

- F1: 全42カットとK1〜K3を検査。詳細は `docs/qc-report/s1.md`〜`s7.md`、`k1.md`〜`k3.md`、統合一覧は `f1-merge.md`。
- F2: 3連続mediumの2箇所を修正し、`camera.shot`を実際の基本画角へ反映。再検証は `f2-shot-sequence.md`。
- F4: 修正後の全編レンダーを完了。`C:\dev\github\wit-maker\neko-tera-video\out\master.mp4` は 495,248,218 bytes、303.978667秒、1080×1920、60fps、H.264/AAC。SHA-256は `20C12D9EF1D8AA487599C6C9BDA8D34BE8873EB2C243D285C2F083686041373C`。
- F3/F5: 正式outro未配置のため、最終mix・encode・納品AACの独立音量検収は未実行。詳細は `docs/qc-report/external-blocker-outro.md`。
