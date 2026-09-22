"use client";
/* eslint-disable react-hooks/set-state-in-effect, react-hooks/refs */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

type InstallOutcome = "accepted" | "dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: InstallOutcome; platform: string }>;
}

export type ServiceWorkerState = "unsupported" | "idle" | "registering" | "registered" | "error";

const getOnlineSnapshot = () => (typeof navigator === "undefined" ? true : navigator.onLine);
const getServerOnlineSnapshot = () => true;

function subscribeToOnlineStatus(listener: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  return () => {
    window.removeEventListener("online", listener);
    window.removeEventListener("offline", listener);
  };
}

/** SSR-safe connectivity state that does not read browser globals on the server. */
export function useOnlineStatus() {
  const isOnline = useSyncExternalStore(subscribeToOnlineStatus, getOnlineSnapshot, getServerOnlineSnapshot);
  return { isOnline, isOffline: !isOnline };
}

function isStandaloneDisplayMode() {
  if (typeof window === "undefined") return false;
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || navigatorWithStandalone.standalone === true;
}

/** Capture the browser install event; promptInstall must be called by a user gesture. */
export function useInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setInstalled(isStandaloneDisplayMode());
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    const onAppInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt as EventListener);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt as EventListener);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!promptEvent) return false;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    setPromptEvent(null);
    if (choice.outcome === "accepted") setInstalled(true);
    return choice.outcome === "accepted";
  }, [promptEvent]);

  return { canInstall: Boolean(promptEvent) && !installed, installed, promptInstall };
}

/** Register the service worker only in production so dev HMR assets are never cached. */
export function useServiceWorkerRegistration(enabled = process.env.NODE_ENV === "production") {
  const [state, setState] = useState<ServiceWorkerState>("idle");
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      setState("unsupported");
      return;
    }
    if (!enabled) {
      setState("idle");
      // A worker installed by a previous production preview can otherwise keep
      // serving stale Next.js chunks when the same origin returns to dev mode.
      void navigator.serviceWorker.getRegistrations().then(async (registrations) => {
        const appRegistrations = registrations.filter((registration) => {
          const worker = registration.active ?? registration.waiting ?? registration.installing;
          return worker?.scriptURL.endsWith("/sw.js");
        });
        await Promise.all(appRegistrations.map((registration) => registration.unregister()));
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.filter((key) => key.startsWith("journey-of-change-")).map((key) => caches.delete(key)));
        }
      }).catch(() => undefined);
      return;
    }
    let cancelled = false;
    setState("registering");
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).then((registration) => {
      if (cancelled) return;
      registrationRef.current = registration;
      setState("registered");
      void registration.update();
    }).catch(() => {
      if (!cancelled) setState("error");
    });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { state, registration: registrationRef.current };
}

export type { BeforeInstallPromptEvent };
