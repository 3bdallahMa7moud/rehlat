import type { Participant } from "../../types/models.ts";
import { createLocalId } from "../../data/local-id.ts";

function initials(name: string): string { return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join(""); }

export function addParticipant(participants: readonly Participant[], name: string, pin = "1234"): Participant[] {
  const cleanName = name.trim();
  if (!cleanName || !/^\d{4}$/.test(pin) || participants.length >= 30) return [...participants];
  return [...participants, { id: createLocalId("participant"), name: cleanName, initials: initials(cleanName), avatarColor: "teal", role: "participant", presence: "offline", currentStatus: "لم يبدأ اليوم", progress: 0, streak: 0, score: 0, pin }];
}

export function renameParticipant(participants: readonly Participant[], id: string, name: string): Participant[] {
  const cleanName = name.trim();
  return cleanName ? participants.map((participant) => participant.id === id ? { ...participant, name: cleanName, initials: initials(cleanName) } : participant) : participants as Participant[];
}

export function changeParticipantRole(participants: readonly Participant[], id: string, role: Participant["role"]): Participant[] { return participants.map((participant) => participant.id === id ? { ...participant, role } : participant); }
export function deleteParticipant(participants: readonly Participant[], id: string): Participant[] { return participants.filter((participant) => participant.id !== id); }
export function setParticipantPin(participants: readonly Participant[], id: string, pin: string): Participant[] { return /^\d{4}$/.test(pin) ? participants.map((participant) => participant.id === id ? { ...participant, pin } : participant) : [...participants]; }
