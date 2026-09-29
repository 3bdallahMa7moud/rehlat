import { useCallback, useState, useSyncExternalStore } from "react";
import { validReciter } from "@/lib/quran-recitation";

type Preference = { participantId: string; reciter: string };

export function useQuranReciter(participantId: string, defaultReciter: string) {
  const [temporaryPreference, setTemporaryPreference] = useState<Preference | null>(null);
  const storageKey = `joc.quran.reciter.${participantId}`;

  const subscribe = useCallback((notify: () => void) => {
    const onStorage = (event: StorageEvent) => { if (event.key === storageKey) notify(); };
    window.addEventListener("storage", onStorage);
    window.addEventListener("joc-quran-reciter-changed", notify);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("joc-quran-reciter-changed", notify);
    };
  }, [storageKey]);
  const getSnapshot = useCallback(() => {
    try {
      return window.localStorage.getItem(storageKey);
    } catch {
      return null;
    }
  }, [storageKey]);
  const savedReciter = useSyncExternalStore(subscribe, getSnapshot, () => null);

  const reciter = temporaryPreference?.participantId === participantId
    ? temporaryPreference.reciter
    : validReciter(savedReciter ?? defaultReciter);

  const chooseReciter = (next: string) => {
    const selected = validReciter(next);
    try {
      window.localStorage.setItem(storageKey, selected);
      setTemporaryPreference(null);
      window.dispatchEvent(new Event("joc-quran-reciter-changed"));
    } catch {
      setTemporaryPreference({ participantId, reciter: selected });
    }
  };

  return { reciter, chooseReciter };
}
