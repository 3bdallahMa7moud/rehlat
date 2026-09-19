export const arabicNumber = new Intl.NumberFormat("ar-EG");

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
