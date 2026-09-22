import type { ActivityEvent, Participant } from "../../types/models.ts";
import { createLocalId } from "../../data/local-id.ts";

export function createActivityEvent(input: Pick<ActivityEvent, "kind" | "action" | "task"> & { participant: Participant; createdAt: string; id?: string }): ActivityEvent {
  const { participant, createdAt, id = createLocalId("activity"), ...event } = input;
  return { id, participantId: participant.id, participantName: participant.name, initials: participant.initials, avatarColor: participant.avatarColor, createdAt, ...event };
}
