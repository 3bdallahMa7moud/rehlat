const DEFAULT_BASMALA = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";
const ARABIC_MARKS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/gu;

export function quranReadingText(surah: number, ayahNumber: number, text: string) {
  // Al-Fatiha counts the basmala as its first ayah; At-Tawbah has no opening basmala.
  if (ayahNumber !== 1 || surah === 1 || surah === 9) return { openingBasmala: null, verse: text };

  const source = text.trimStart();
  const opening = source.match(/^(\S+(?:\s+\S+){3})(?:\s+|$)/u);
  const normalized = opening?.[1].replace(ARABIC_MARKS, "").replaceAll("ٱ", "ا");
  if (!opening || normalized !== "بسم الله الرحمن الرحيم") return { openingBasmala: DEFAULT_BASMALA, verse: text };

  return { openingBasmala: opening[1], verse: source.slice(opening[0].length).trimStart() };
}
