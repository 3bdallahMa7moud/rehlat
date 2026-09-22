const SESSION_KEY = "joc-session-participant";
const listeners = new Set<() => void>();
let cachedParticipantId: string | null | undefined;

export function getLocalSessionParticipantId(): string | null | undefined {
  if (cachedParticipantId !== undefined) return cachedParticipantId;
  cachedParticipantId = window.localStorage.getItem(SESSION_KEY);
  return cachedParticipantId;
}

export function subscribeToLocalSession(listener: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== SESSION_KEY) return;
    cachedParticipantId = undefined;
    listener();
  };
  listeners.add(listener);
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(listener); window.removeEventListener("storage", onStorage); };
}

export function setLocalSessionParticipantId(participantId: string | null): void {
  cachedParticipantId = participantId;
  if (participantId) window.localStorage.setItem(SESSION_KEY, participantId);
  else window.localStorage.removeItem(SESSION_KEY);
  listeners.forEach((listener) => listener());
}
