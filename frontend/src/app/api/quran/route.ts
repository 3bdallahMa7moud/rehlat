import { NextResponse } from "next/server";

const API_BASE = "https://api.alquran.cloud/v1/surah";

export async function GET(request: Request) {
  const surah = Number(new URL(request.url).searchParams.get("surah") ?? 1);
  if (!Number.isInteger(surah) || surah < 1 || surah > 114) {
    return NextResponse.json({ error: "رقم السورة غير صالح" }, { status: 400 });
  }

  try {
    const [arabicResponse, tafsirResponse] = await Promise.all([
      fetch(`${API_BASE}/${surah}/quran-uthmani`, { next: { revalidate: 86400 } }),
      fetch(`${API_BASE}/${surah}/ar.muyassar`, { next: { revalidate: 86400 } }),
    ]);
    if (!arabicResponse.ok || !tafsirResponse.ok) throw new Error("Quran source unavailable");
    const [arabicPayload, tafsirPayload] = await Promise.all([arabicResponse.json(), tafsirResponse.json()]);
    return NextResponse.json({
      surah: {
        number: arabicPayload.data.number,
        name: arabicPayload.data.name,
        englishName: arabicPayload.data.englishName,
        revelationType: arabicPayload.data.revelationType,
        ayahs: arabicPayload.data.ayahs.map((ayah: { number: number; numberInSurah: number; text: string; juz: number; page: number }, index: number) => ({
          number: ayah.numberInSurah,
          audioNumber: ayah.number,
          juz: ayah.juz,
          page: ayah.page,
          text: ayah.text,
          tafsir: tafsirPayload.data.ayahs[index]?.text ?? "",
        })),
      },
    }, { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } });
  } catch {
    return NextResponse.json({ error: "تعذر تحميل السورة الآن. حاول مرة أخرى بعد قليل." }, { status: 502 });
  }
}
