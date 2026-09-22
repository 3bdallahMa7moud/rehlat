import type { Participant } from "../../types/models.ts";

export function verifyLocalPin(participants: readonly Participant[], participantId: string, pin: string): boolean {
  return /^\d{4}$/.test(pin) && participants.some((participant) => participant.id === participantId && participant.pin === pin);
}
