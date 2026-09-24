export const quranReciters = [
  { id: "ar.alafasy", label: "\u0645\u0634\u0627\u0631\u064a \u0627\u0644\u0639\u0641\u0627\u0633\u064a" },
  { id: "ar.abdulbasitmurattal", label: "\u0639\u0628\u062f \u0627\u0644\u0628\u0627\u0633\u0637 \u0639\u0628\u062f \u0627\u0644\u0635\u0645\u062f" },
  { id: "ar.husary", label: "\u0645\u062d\u0645\u0648\u062f \u062e\u0644\u064a\u0644 \u0627\u0644\u062d\u0635\u0631\u064a" },
  { id: "ar.minshawi", label: "\u0645\u062d\u0645\u062f \u0635\u062f\u064a\u0642 \u0627\u0644\u0645\u0646\u0634\u0627\u0648\u064a" },
  { id: "ar.abdurrahmaansudais", label: "\u0639\u0628\u062f \u0627\u0644\u0631\u062d\u0645\u0646 \u0627\u0644\u0633\u062f\u064a\u0633" },
] as const;
export function reciterLabel(id: string) { return quranReciters.find((item) => item.id === id)?.label ?? quranReciters[0].label; }
