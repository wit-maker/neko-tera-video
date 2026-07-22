/** かな→母音口形(あ/い/う/え/お)。口パクは5口形+閉口で表現する。 */
export type Viseme = "a" | "i" | "u" | "e" | "o" | "closed";

const VOWEL_OF: Record<string, Viseme> = {};

function register(vowel: Viseme, kana: string) {
  for (const ch of kana) VOWEL_OF[ch] = vowel;
}

register("a", "あかさたなはまやらわがざだばぱぁゃアカサタナハマヤラワガザダバパァャ");
register("i", "いきしちにひみりぎじぢびぴぃイキシチニヒミリギジヂビピィ");
register("u", "うくすつぬふむゆるぐずづぶぷぅゅっウクスツヌフムユルグズヅブプゥュッヴ");
register("e", "えけせてねへめれげぜでべぺぇェエケセテネヘメレゲゼデベペ");
register("o", "おこそとのほもよろをごぞどぼぽぉょオコソトノホモヨロヲゴゾドボポォョ");
register("u", "んンー");

/** 文字に対応する口形。かな以外(漢字・記号)は null = 直前の口形を維持する。 */
export function visemeOf(char: string): Viseme | null {
  return VOWEL_OF[char] ?? null;
}

export type AlignedChar = { char: string; startMs: number; endMs: number };
export type Alignment = {
  lineId: string;
  text: string;
  displayText: string;
  chars: AlignedChar[];
};

/**
 * アラインメント(読み上げテキスト基準)から、時刻→口形の関数を作る。
 * 漢字は読みが不明なため、直前のかな口形を引き継ぐ(なければ "a")。
 */
export function visemeAt(alignment: Alignment, timeMs: number): Viseme {
  let current: Viseme = "closed";
  let lastVowel: Viseme = "a";
  for (const c of alignment.chars) {
    if (timeMs < c.startMs) break;
    if (timeMs <= c.endMs) {
      const v = visemeOf(c.char);
      current = v ?? lastVowel;
      break;
    }
    const v = visemeOf(c.char);
    if (v) lastVowel = v;
    current = "closed"; // 文字間の無音は閉口
  }
  return current;
}
