export const quranReciters = [
  { id: "ar.alafasy", label: "مشاري راشد العفاسي", bitrate: 128 },
  { id: "ar.abdulbasit", label: "عبد الباسط عبد الصمد", bitrate: 192 },
  { id: "ar.husary", label: "محمود خليل الحصري", bitrate: 128 },
  { id: "ar.minshawi", label: "محمد صديق المنشاوي", bitrate: 128 },
  { id: "ar.sudais", label: "عبد الرحمن السديس", bitrate: 192 },
] as const;

const legacyReciters: Record<string, string> = {
  "ar.abdulbasitmurattal": "ar.abdulbasit",
  "ar.abdurrahmaansudais": "ar.sudais",
};

export function validReciter(id: string | undefined): string {
  const normalized = id ? legacyReciters[id] ?? id : "";
  return quranReciters.find((item) => item.id === normalized)?.id ?? quranReciters[0].id;
}

export function reciterLabel(id: string) {
  return quranReciters.find((item) => item.id === validReciter(id))?.label ?? quranReciters[0].label;
}

export function quranAudioUrl(reciterId: string, ayahNumber: number) {
  const reciter = quranReciters.find((item) => item.id === validReciter(reciterId)) ?? quranReciters[0];
  return `https://cdn.islamic.network/quran/audio/${reciter.bitrate}/${reciter.id}/${ayahNumber}.mp3`;
}
