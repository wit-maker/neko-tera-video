export const BASELINE_SOURCE_COMMIT = "e43ebb29148216216bd85c3d681f46e1d3b2fa13";
export const ARTIFACT_RELATIVE_PATH = "out/p0/a-s7c6-e43ebb2";

export const BASELINE = {
  composition: "Main",
  cutId: "s7c6",
  clipStart: 17617,
  clipEnd: 18235,
  frameCount: 619,
  fps: 60,
  width: 1080,
  height: 1920,
  crop: { x: 400, y: 1056, width: 320, height: 320, displayWidth: 640, displayHeight: 640 },
  stills: [
    { localFrame: 0, globalFrame: 17617 },
    { localFrame: 309, globalFrame: 17926 },
    { localFrame: 618, globalFrame: 18235 },
  ],
} as const;

/** Git blob IDs are canonical identities; never substitute raw worktree text hashes. */
export const TRACKED_TEXT_BLOBS: Record<string, string> = {
  "video.json": "584664349ee8d025aa3ada9a16ed2378141486b1",
  "public/audio-manifest.json": "24c1eff15b646430a36e9db0880aeb27ef703fd3",
  "public/alignment/s7c6-01.json": "4cd46efcf96bf3eb907eb63e60d8f2394ff60408",
  "src/patch-config.json": "66710f11c54f9ecd0295a8c659344d6f48ba6d9e",
  "src/index.ts": "f31c790edb3e2f1611a701c7637cc396353d1ff7",
  "src/Root.tsx": "9c77598daeb404e2cc480c2556e4bba30d37fc6f",
  "src/Main.tsx": "6ef0d105363a01c07acc7861eccae8c889945dc1",
  "src/schema.ts": "10cb46edd4cc921ca26ab7e4094f7c546fec7f40",
  "src/lib/timing.ts": "159de51448b43861bf79f807bd4a1cb72bb60538",
  "src/lib/useAlignments.ts": "d5cf41a897e040d4ce6234841f66528b46b0ca6e",
  "src/lib/viseme.ts": "ae1d076b42b2b19d08dfe8bd0146042ac5c1bd5b",
  "src/lib/chalk.ts": "558f372cadf8ff2bf5b3c9472e8103e220b6be3f",
  "src/components/Character.tsx": "7a9a217c1b1108f58e2a76d90b1e602fdda84e12",
  "src/components/CutView.tsx": "504ffeb83c30e7d879372106b54451faf6b90005",
  "src/components/ChalkBoard.tsx": "ad9b5505b4916cf1defbada9a15929d23b40fd9b",
  "src/components/Effects.tsx": "06d37b3c5a89bfc0d669f92a27a3d65fcd3f021f",
  "src/components/Grade.tsx": "ba3d060198e1fe8ee8fcab66ec64d50715793d34",
  "src/components/KaraokeSubtitle.tsx": "0f41b8a2aedc0bc56799925e5eee1c74dcc77d37",
  "src/components/Steam.tsx": "c18ef529fb45cff103171ba5b1d7b27556e2e934",
  "remotion.config.ts": "3f193a018eec5d2fae7ce45b796baa94ad68e779",
  "package-lock.json": "905bd87772e0aefc7eb7edf2e435987e73694fe0",
};

export const BINARY_SHA256: Record<string, string> = {
  "public/assets/cutout/chars/sensei-tea.png": "457882E83297ACD1CB3A2B13C63D1BBF50966907B383D953DEAFE79441F63F2E",
  "public/assets/cutout/mouth/sensei-a.png": "AF575A19263351E80825708DB3C8F9E0B9BC3DD76DFB2ED7A1E03661F30118F0",
  "public/assets/cutout/mouth/sensei-e.png": "7E068480C5B40F115246CD1B18B437A503A96C67540A1ADA3D1F3AB3B57D1F42",
  "public/assets/cutout/mouth/sensei-i.png": "1139E5F93527C64FE816053A02F666F2C05E19B8437DF10CE2497DACF5153E39",
  "public/assets/cutout/mouth/sensei-o.png": "103F81A953CC053FC8C89876949FFE602F73322EEFF2775C451E1D12F775D236",
  "public/assets/cutout/mouth/sensei-u.png": "34A58D7D3F79C7ADB4976B0D961D3F74C67E4A0E3D5A09F67978A65BC7D0DE25",
  "public/assets/cutout/mouth/sensei-closed.png": "52D7796802D21F1CE42CA7E72521EA294C35E26F64D6DFD73BB8C3EE69AB283F",
  "public/assets/cutout/mouth/sensei-blink.png": "3165FBB1ED5000F5C21E15E88C5FEC918F588297C2B7462B56F7918F5179BA0B",
  "public/assets/cutout/bg/study-evening.png": "282D6B53D26F4027F5DA412B768BD4A8A0211F14E4DEA2F94B3D66174B13EB15",
  "public/audio/s7c6-01.mp3": "6AA42965C755A6785CA25CDEE4BDE366F39466E337FB12E556DE80D7C317C8DB",
  "public/bgm/outro.mp3": "4DDC8C7B761D42A85AD54832C71931A8FAC51470CA7275F804F764817A748090",
  "public/ambience/garden-evening.mp3": "6EC903508FE3EA329966712B7733FEF05903DEC07D936A54111913BB770CF253",
  "public/sfx/tea-pour.mp3": "E100E551B202C2B1199ACFFDF2FBA7FC85737303E8115721D0588F85D3527359",
};

/** Approved P0-only additions. These do not change representation-A baseline assets. */
export const P0_LOCAL_FONT_SHA256: Record<string, string> = {
  "public/fonts/YuseiMagic-Regular.ttf": "82098615F39ED9DA6A8CCC674B9006E49C70DD5B775A7A1697F6BEDD22CE25A2",
  "public/fonts/KleeOne-SemiBold.ttf": "9DBB25466C575F6DC8768A28845798F67FA5D47A5D20A6408C30C58D700A1044",
  "public/fonts/licenses/YuseiMagic-OFL.txt": "C74E8C47951DDD9C902F07097761CFA0457993E28D8E1E946E273C0250BE77C9",
  "public/fonts/licenses/KleeOne-OFL.txt": "E376B0DF8E8A2345A9533DB6F0A5333A1107975569AD9D1973A7EE557161CA38",
};

/**
 * Exact P0-only deviations from e43ebb2. Each remains clean and is compared by
 * canonical blob identity; this is not a general exception to baseline identity.
 */
export const P0_APPROVED_TRACKED_OVERRIDE_BLOBS: Record<string, string> = {
  "src/components/ChalkBoard.tsx": "beb3f7e94e0e7c2bd4f65f3ae13360068698f5c7",
  "src/components/KaraokeSubtitle.tsx": "37d3baf10e5fddec32dffc5aa3bbba176a5413d0",
  "src/schema.ts": "c357fd311841cf52f0989d8d4016e8e4849789fa",
  "package-lock.json": "808bdd1a6f6188fa55671f373bfa4f67be9036c8",
};

export type ConformanceStatus = "pass" | "fail";
export type EvaluationStatus = "evaluated" | "not_evaluated";
export type ReviewStatus = "review-ready" | "invalid" | "not-evaluated" | "known-failure";

export function reviewStatus(
  conformance: ConformanceStatus,
  evaluation: EvaluationStatus,
  knownFailureIds: readonly string[],
): ReviewStatus {
  if (conformance === "fail") return "invalid";
  if (evaluation === "not_evaluated") return "not-evaluated";
  return knownFailureIds.length > 0 ? "known-failure" : "review-ready";
}
