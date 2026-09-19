import type { Streak } from "@/types/models";

const statuses: Streak["history"][number]["status"][] = [
  "successful", "successful", "unsuccessful", "successful", "successful", "successful", "successful",
  "successful", "successful", "successful", "successful", "successful", "today", "future",
];

export const streak: Streak = {
  current: 12,
  best: 21,
  successfulDays: 34,
  history: statuses.map((status, index) => ({ date: `${index + 6} سبتمبر`, status })),
};
