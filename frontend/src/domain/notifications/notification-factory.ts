import type { AppNotification } from "../../types/models.ts";
import { createLocalId } from "../../data/local-id.ts";

export function createNotification(input: Omit<AppNotification, "id" | "createdAt"> & { createdAt: string; id?: string }): AppNotification {
  const { id = createLocalId("notification"), ...notification } = input;
  return { id, ...notification };
}
