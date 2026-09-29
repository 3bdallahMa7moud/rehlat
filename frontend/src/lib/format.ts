export const arabicNumber = new Intl.NumberFormat("ar-EG");
const twoDigitArabicNumber = new Intl.NumberFormat("ar-EG", { minimumIntegerDigits: 2, maximumFractionDigits: 0, useGrouping: false });

export function formatDurationClock(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainder = safeSeconds % 60;
  return `${twoDigitArabicNumber.format(hours)}:${twoDigitArabicNumber.format(minutes)}:${twoDigitArabicNumber.format(remainder)}`;
}

export function formatMinutes(minutes: number) {
  if (minutes < 60) return `${arabicNumber.format(minutes)} دقيقة`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${arabicNumber.format(hours)} س ${arabicNumber.format(remainder)} د` : `${arabicNumber.format(hours)} ساعة`;
}

export function formatPercentage(value: number) {
  return `${arabicNumber.format(Math.round(value))}%`;
}

export function formatDate(date = new Date()) {
  return new Intl.DateTimeFormat("ar-SA", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}
