"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { Check, Download, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useInstallPrompt, useOnlineStatus, useServiceWorkerRegistration } from "@/hooks/use-online-status";

export function OfflineBanner() {
  const { isOnline } = useOnlineStatus();
  const { canInstall, promptInstall } = useInstallPrompt();
  useServiceWorkerRegistration();
  const [showReconnect, setShowReconnect] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

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
  if (canInstall) {
    return <aside className="offline-banner offline-banner-install" role="status" aria-live="polite"><Download size={17} aria-hidden="true" /><span>ثبّت رحلة التغيير للوصول السريع من جهازك.</span><button type="button" onClick={() => void promptInstall()}>تثبيت التطبيق</button></aside>;
  }
  return null;
}
