"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { ArrowLeft, ChevronLeft, Info, Moon, Search, ShieldCheck, Sun, Eye, EyeOff, X } from "lucide-react";
import { Button, Input, PinInput, UserAvatar } from "@/components/ui";
import { useDemo } from "@/state/DemoContext";
import { useTheme } from "@/state/ThemeContext";
import { cn } from "@/lib/cn";

const pinHelpLabel = "نسيت رمز الدخول؟";
const pinHelpBody = "تواصل مع المشرف لإعادة تعيين رمز الدخول.";
type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => { finished: Promise<void> };
};

function AuthBrandHeader() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="auth-header-wrapper">
      <div className="auth-top-controls">
        <button
          type="button"
          onClick={toggleTheme}
          className="auth-theme-btn"
          aria-label={theme === "light" ? "تفعيل الوضع الداكن" : "تفعيل الوضع الفاتح"}
          title={theme === "light" ? "الوضع الداكن" : "الوضع الفاتح"}
        >
          {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          <span>{theme === "light" ? "داكن" : "فاتح"}</span>
        </button>
      </div>

      <div className="auth-brand-lockup">
        <div className="auth-logo-aura">
          <Image
            src="/brand/journey-mark.png"
            alt="شعار رحلة التغيير"
            width={88}
            height={88}
            priority
            className="auth-logo-img"
          />
        </div>
        <div className="auth-brand-text">
          <h2 className="auth-project-title">رِحْلَةُ التَّغْيِير</h2>
          <p className="auth-project-subtitle">منصة الالتزام بالعادات والتقدم اليومي</p>
        </div>
      </div>
    </header>
  );
}
export function LoginView() {
  const router = useRouter();
  const {
    loginParticipant,
    participants,
    selectedParticipantId,
    setSelectedParticipantId,
  } = useDemo();

  const [step, setStep] = useState<"participant" | "pin">("participant");
  const [search, setSearch] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [showPinHelp, setShowPinHelp] = useState(false);
  const participantStepRef = useRef<HTMLElement | null>(null);
  const pinStepRef = useRef<HTMLElement | null>(null);

  const participantList = useMemo(() => participants, [participants]);

  const selected = useMemo(() => {
    return (
      participantList.find((p) => p.id === selectedParticipantId) ??
      participantList[0]
    );
  }, [participantList, selectedParticipantId]);

  const visible = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("ar");
    if (!query) return participantList;
    return participantList.filter((participant) =>
      participant.name.toLocaleLowerCase("ar").includes(query)
    );
  }, [participantList, search]);

  useEffect(() => {
    if (step !== "pin") return;
    const frame = window.requestAnimationFrame(() => pinStepRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [step]);

  const updateStepWithTransition = (update: () => void) => {
    const transitionDocument = document as ViewTransitionDocument;
    if (!transitionDocument.startViewTransition) {
      update();
      return;
    }
    transitionDocument.startViewTransition(() => flushSync(update));
  };

  const chooseParticipant = (participantId: string, continueToPin = false) => {
    const updateSelection = () => {
      setSelectedParticipantId(participantId);
      setError("");
      setShowPinHelp(false);
    };
    if (continueToPin) {
      updateStepWithTransition(() => {
        updateSelection();
        setShowPinHelp(false);
        setStep("pin");
      });
      return;
    }
    updateSelection();
  };

  const verify = (submittedPin = pin) => {
    if (!selected || submittedPin.length !== 4 || loading) return;
    setError("");
    setLoading(true);

    if (!loginParticipant(selected.id, submittedPin)) {
      setPin("");
      setLoading(false);
      setError("رمز الدخول غير صحيح، حاول مرة أخرى.");
      return;
    }
    setSuccess(true);
    router.push(selected.role === "admin" ? "/admin" : "/dashboard");
  };

  return (
    <main dir="rtl" className={cn("auth-page-container auth-login-page", step === "pin" && "auth-pin-mode", loading && "auth-is-loading")} aria-busy={loading}>
      <aside className="auth-brand-panel" aria-label="هوية رحلة التغيير">
        <div className="auth-brand-panel-inner">
          <Image src="/brand/journey-mark.png" alt="شعار رحلة التغيير" width={76} height={76} priority className="auth-brand-panel-logo" />
          <p className="auth-brand-panel-name">رحلة التغيير</p>
          <p className="auth-brand-panel-tagline">خطوة صغيرة اليوم تصنع تغييرًا كبيرًا</p>
          <svg className="auth-route-illustration" viewBox="0 0 360 180" aria-hidden="true">
            <path d="M24 144C75 130 86 78 139 92c38 10 46 55 85 36 31-15 47-57 112-40" />
            <path d="M24 144h312" />
            <circle cx="139" cy="92" r="5" />
            <circle cx="224" cy="128" r="5" />
          </svg>
        </div>
      </aside>

      <section className="auth-login-column">
      <div className="auth-card-panel">
        <AuthBrandHeader />

        {step === "participant" ? (
          <section ref={participantStepRef} tabIndex={-1} aria-labelledby="login-participant-heading" className="auth-body-section auth-focus-section auth-participant-step-transition">
            <div className="auth-headline">
              <h1 id="login-participant-heading">مرحبًا بك في رحلة التغيير</h1>
              <p>اختر حسابك للمتابعة</p>
            </div>

            {(participantList.length > 6 || search) &&             <div className="auth-search-box">
              <Search size={22} />
              <Input
                aria-label="البحث عن مشارك"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && visible[0]) chooseParticipant(visible[0].id, true);
                }}
                placeholder="ابحث عن حسابك"
                autoFocus
              />
              {search && (
                <button type="button" className="auth-search-clear" onClick={() => setSearch("")} aria-label="مسح البحث">
                  <X size={17} />
                </button>
              )}
            </div>}

            <div className="auth-participants-grid auth-participant-list-transition" role="radiogroup" aria-label="قائمة المشاركين">
              {visible.map((p) => {
                const isSelected = selected?.id === p.id;
                return (
                  <button
                    type="button"
                    key={p.id}
                    role="radio"
                    aria-checked={isSelected}
                    className={cn(
                      "participant-luxury-card",
                      p.role === "admin" && "participant-card-admin",
                      isSelected && "participant-card-selected"
                    )}
                    onClick={() => chooseParticipant(p.id)}
                  >
                    <div className={cn("participant-card-header", isSelected && "auth-shared-avatar")}>
                      <UserAvatar initials={p.initials} color={p.avatarColor} size="lg" />
                    </div>
                    <div className="participant-card-info">
                      <strong className={cn("participant-name", isSelected && "auth-shared-name")}>{p.name}</strong>
                      {p.role === "admin" ? (
                        <div className="participant-admin-meta">
                          <span className="participant-streak-pill participant-role-badge"><ShieldCheck size={13} /> مشرف</span>
                          <span className="participant-admin-caption">إدارة المجموعة</span>
                        </div>
                      ) : (
                        <span className="participant-streak-pill">{p.streak} أيام متتالية</span>
                      )}
                    </div>
                    <span className="auth-radio-indicator" aria-hidden="true"><span /></span>
                  </button>
                );
              })}
              {visible.length === 0 && (
                <div className="auth-empty-results">
                  <Search size={22} />
                  <strong>لم نجد حسابًا بهذا الاسم</strong>
                  <button type="button" onClick={() => setSearch("")}>مسح البحث</button>
                </div>
              )}
            </div>

            <div className="auth-selection-actions auth-selection-actions-transition">
              <Button
                size="lg"
                className="auth-primary-btn auth-continue-btn"
                disabled={!selected}
                onClick={() => updateStepWithTransition(() => {
                  setShowPinHelp(false);
                  setStep("pin");
                })}
              >
                <span>المتابعة إلى رمز الدخول</span>
                <ChevronLeft size={22} aria-hidden="true" />
              </Button>
              <p className="auth-account-note">يمكنك تغيير الحساب لاحقًا</p>
            </div>
          </section>
        ) : (
          <section ref={pinStepRef} tabIndex={-1} aria-labelledby="login-pin-heading" className="auth-body-section auth-pin-section auth-focus-section auth-pin-step-transition">
            <button
              type="button"
              className="auth-return-btn auth-pin-return-transition"
              onClick={() => updateStepWithTransition(() => {
                setPin("");
                setError("");
                setStep("participant");
              })}
            >
              <ArrowLeft size={16} />
              <span>تغيير الحساب</span>
            </button>

            <div className="auth-user-banner">
              <div className="auth-shared-avatar auth-pin-avatar-transition">
                <UserAvatar initials={selected?.initials ?? ""} color={selected?.avatarColor} size="xl" />
              </div>
              <div>
                <h1 id="login-pin-heading" className="user-banner-name auth-shared-name">{selected?.name}</h1>
                <p className="auth-user-welcome">أهلًا بك مجددًا</p>
                <p className="user-banner-hint">أدخل رمز الدخول المكوّن من 4 أرقام للمتابعة</p>
              </div>
            </div>

            <div className="auth-pin-wrapper auth-pin-controls-transition">
              <PinInput
                value={pin}
                onChange={(value) => {
                  setError("");
                  setPin(value);
                }}
                onSubmit={(value) => setPin(value ?? "")}
                error={error}
                loading={loading}
                success={success}
                masked={!showPin}
              />
              <button type="button" className="pin-visibility-toggle" onClick={() => setShowPin((value) => !value)} aria-pressed={showPin}>
                {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                {showPin ? "إخفاء PIN" : "إظهار PIN"}
              </button>
            </div>

            <div className="auth-actions-group auth-pin-actions-transition">
              <Button
                size="lg"
                className="auth-primary-btn"
                loading={loading}
                disabled={pin.length !== 4 || success}
                onClick={() => verify()}
              >
                {loading || success ? "جارٍ الدخول..." : "دخول"}
              </Button>

              <button type="button" className="auth-pin-help-btn" onClick={() => setShowPinHelp((value) => !value)} aria-expanded={showPinHelp}>{pinHelpLabel}</button>
              {showPinHelp && <div className="auth-pin-help" role="note"><Info size={18} aria-hidden="true" /><span>{pinHelpBody}</span></div>}
            </div>
          </section>
        )}
      </div>
      </section>
    </main>
  );
}

export function SetupPinView() {
  const router = useRouter();
  const { activeParticipant, isAuthenticated, setParticipantPin, pushToast } = useDemo();
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const [phase, setPhase] = useState<"first" | "confirm">("first");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAuthenticated) router.replace("/login");
  }, [isAuthenticated, router]);

  const submit = (submittedCode = current) => {
    if (phase === "first" && submittedCode.length === 4) {
      setFirst(submittedCode);
      setPhase("confirm");
      return;
    }
    if (submittedCode !== first) {
      setSecond("");
      setError("الرمزان غير متطابقين. حاول مرة أخرى.");
      return;
    }
    if (!activeParticipant || !setParticipantPin(activeParticipant.id, first)) {
      setError("تعذر حفظ الرمز. استخدم أربعة أرقام فقط.");
      return;
    }
    pushToast({ tone: "success", title: "تم تحديث PIN", body: "يمكنك استخدام الرمز الجديد في تسجيل الدخول القادم." });
    router.push(activeParticipant.role === "admin" ? "/admin" : "/dashboard");
  };

  const current = phase === "first" ? first : second;

  return (
    <main className="auth-page-container">
      <div className="auth-backdrop-glow" />
      <div className="auth-card-panel setup-pin-card">
        <AuthBrandHeader />
        <section className="auth-body-section">
          <div className="setup-pin-badge">
            <ShieldCheck size={32} />
          </div>
          <div className="auth-headline">
            <span className="auth-badge-welcome">حماية الحساب</span>
            <h1>{phase === "first" ? "أنشئ رمز PIN جديد" : "تأكيد رمز PIN"}</h1>
            <p>
              {phase === "first"
                ? "اختر رمزاً من 4 أرقام لتسجيل الدخول السريع لاحقاً."
                : "أعد إدخال نفس الرمز للتأكيد والتثبيت."}
            </p>
          </div>

          <div className="auth-pin-wrapper">
            <PinInput
              value={current}
              onChange={(value) => {
                setError("");
                if (phase === "first") setFirst(value);
                else setSecond(value);
              }}
              onSubmit={submit}
              error={error}
            />
          </div>

          <div className="auth-actions-group">
            <Button
              size="lg"
              className="auth-primary-btn"
              disabled={current.length !== 4}
              onClick={() => submit()}
            >
              {phase === "first" ? "متابعة" : "تأكيد والبدء"}
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}

