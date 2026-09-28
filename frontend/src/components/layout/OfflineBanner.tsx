"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { Check, Download, WifiOff, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useInstallPrompt, useOnlineStatus, useServiceWorkerRegistration } from "@/hooks/use-online-status";
import { useDemo } from "@/state/DemoContext";

const installRoutes = /^\/(?:dashboard|tasks(?:\/.*)?|focus|competition|honors|streaks|analytics|reports|history|ai|messages|notifications|settings|quran|admin(?:\/.*)?)$/;
const installSnoozeMs = 7 * 24 * 60 * 60 * 1000;

export function OfflineBanner() {
  const pathname = usePathname();
  const { isAuthenticated, sessionReady } = useDemo();
  const { isOnline } = useOnlineStatus();
  const { canInstall, promptInstall } = useInstallPrompt();
  useServiceWorkerRegistration();
  const [showReconnect, setShowReconnect] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const [installDismissed, setInstallDismissed] = useState(false);

  useEffect(() => {
    try {
      const dismissedAt = Number(window.localStorage.getItem("joc-install-dismissed-at"));
      setInstallDismissed((dismissedAt > 0 && Date.now() - dismissedAt < installSnoozeMs) || window.sessionStorage.getItem("joc-install-dismissed") === "1");
    } catch {
      // The prompt remains dismissible when session storage is unavailable.
    }
  }, []);

  const dismissInstall = () => {
    setInstallDismissed(true);
    try {
      window.localStorage.setItem("joc-install-dismissed-at", String(Date.now()));
    } catch {
      // Keeping the prompt hidden for this render is sufficient.
    }
  };

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      return;
    }
    if (!wasOffline) return;
    setShowReconnect(true);
    setWasOffline(false);
    const timeout = window.setTimeout(() => setShowReconnect(false), 3600);
    return () => window.clearTimeout(timeout);
  }, [isOnline, wasOffline]);

  if (!isOnline) {
    return <aside className="offline-banner offline-banner-offline" role="status" aria-live="polite"><WifiOff size={17} aria-hidden="true" /><span>أنت غير متصل الآن. ستبقى تعديلاتك المحلية محفوظة.</span></aside>;
  }
  if (showReconnect) {
    return <aside className="offline-banner offline-banner-online" role="status" aria-live="polite"><Check size={17} aria-hidden="true" /><span>عاد الاتصال. نتابع مزامنة الرحلة.</span></aside>;
  }
  if (canInstall && !installDismissed && sessionReady && isAuthenticated && installRoutes.test(pathname)) {
    return <aside className="offline-banner offline-banner-install" role="status" aria-live="polite"><Download size={17} aria-hidden="true" /><span>ثبّت رحلة التغيير للوصول السريع من جهازك.</span><button type="button" onClick={() => void promptInstall()}>تثبيت التطبيق</button><button type="button" className="offline-banner-dismiss" aria-label="تأجيل اقتراح التثبيت أسبوعًا" onClick={dismissInstall}><X size={16} aria-hidden="true" /></button></aside>;
  }
  return null;
}
