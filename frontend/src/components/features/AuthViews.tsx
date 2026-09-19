"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowRight, Check, Flame, KeyRound, Moon, Search, ShieldCheck, Sparkles, Sun } from "lucide-react";
import { Button, Input, PinInput, UserAvatar } from "@/components/ui";
import { useDemo } from "@/state/DemoContext";
import { useTheme } from "@/state/ThemeContext";
import { cn } from "@/lib/cn";

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
    participants,
    recentParticipantIds,
    selectedParticipantId,
    setSelectedParticipantId,
  } = useDemo();

  const [step, setStep] = useState<"participant" | "pin">("participant");
  const [search, setSearch] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const participantList = useMemo(
    () => participants.filter((p) => p.role === "participant"),
    [participants]
  );

  const selected = useMemo(() => {
    return (
      participantList.find((p) => p.id === selectedParticipantId) ??
      participantList[0]
    );
  }, [participantList, selectedParticipantId]);

  const visible = useMemo(() => {
    if (!search.trim()) return participantList;
    return participantList.filter((p) => p.name.includes(search.trim()));
  }, [participantList, search]);

  const recent = useMemo(() => {
    return participantList.filter((p) => recentParticipantIds.includes(p.id));
  }, [participantList, recentParticipantIds]);

  // Direct 1-Click Login for immediate demo/evaluator review
  const instantLogin = (participantId?: string) => {
    const targetId = participantId ?? selected?.id;
    if (!targetId) return;
    setSelectedParticipantId(targetId);
    setSuccess(true);
    window.setTimeout(() => router.push("/dashboard"), 350);
  };

  const verify = () => {
    if (!selected || pin.length !== 4 || loading) return;
    setError("");
    setLoading(true);

    window.setTimeout(() => {
      if (pin !== selected.pin) {
        setPin("");
        setLoading(false);
        setError("رمز PIN غير صحيح. جرّب الرمز المعروض أسفل.");
        return;
      }
      setSuccess(true);
      window.setTimeout(() => router.push("/dashboard"), 450);
    }, 500);
  };

  return (
    <main className="auth-page-container">
      <div className="auth-backdrop-glow" />

      <div className="auth-card-panel">
        <AuthBrandHeader />

        <div className="auth-stepper-bar">
          <div className={cn("auth-step-pill", step === "participant" && "step-active")}>
            <span className="step-num">١</span>
            <span>اختيار المشارك</span>
          </div>
          <div className="step-divider-line" />
          <div className={cn("auth-step-pill", step === "pin" && "step-active")}>
            <span className="step-num">٢</span>
            <span>رمز الدخول</span>
          </div>
        </div>

        {step === "participant" ? (
          <section className="auth-body-section">
            <div className="auth-headline">
              <span className="auth-badge-welcome">
                <Sparkles size={14} /> دخول سريع للرحلة
              </span>
              <h1>من يبدأ الإنجاز اليوم؟</h1>
              <p>اختر حسابك للمتابعة والاطلاع على تقدمك وسلسلتك اليومية.</p>
            </div>

            {participantList.length > 4 && (
              <div className="auth-search-box">
                <Search size={18} />
                <Input
                  aria-label="البحث عن مشارك"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ابحث بالاسم..."
                />
              </div>
            )}

            <div className="auth-participants-grid" role="radiogroup" aria-label="قائمة المشاركين">
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
                      isSelected && "participant-card-selected"
                    )}
                    onClick={() => setSelectedParticipantId(p.id)}
                  >
                    <div className="participant-card-header">
                      <UserAvatar initials={p.initials} color={p.avatarColor} size="lg" />
                      {isSelected && (
                        <span className="selected-check-badge">
                          <Check size={14} />
                        </span>
                      )}
                    </div>
                    <div className="participant-card-info">
                      <strong className="participant-name">{p.name}</strong>
                      <span className="participant-streak-pill">
                        <Flame size={13} /> {p.streak} يوماً متواصلاً
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {recent.length > 0 && (
              <div className="auth-recent-strip">
                <span className="recent-label">آخر المسجلين:</span>
                <div className="recent-chips">
                  {recent.map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      className={cn("recent-chip-btn", selected?.id === p.id && "recent-chip-active")}
                      onClick={() => setSelectedParticipantId(p.id)}
                    >
                      <UserAvatar initials={p.initials} color={p.avatarColor} size="sm" />
                      <span>{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="auth-actions-group">
              <Button
                size="lg"
                className="auth-primary-btn"
                disabled={!selected}
                onClick={() => {
                  setError("");
                  setStep("pin");
                }}
              >
                <span>متابعة بالرمز السري</span>
                <ArrowRight size={18} />
              </Button>

              <button
                type="button"
                className="auth-quick-bypass-btn"
                onClick={() => instantLogin()}
              >
                ⚡ دخول فوري كـ <strong>{selected?.name}</strong> (بدون رمز)
              </button>
            </div>
          </section>
        ) : (
          <section className="auth-body-section auth-pin-section">
            <button
              type="button"
              className="auth-return-btn"
              onClick={() => {
                setPin("");
                setError("");
                setStep("participant");
              }}
            >
              <ArrowRight size={16} />
              <span>اختيار مشارك آخر</span>
            </button>

            <div className="auth-user-banner">
              <UserAvatar initials={selected?.initials ?? ""} color={selected?.avatarColor} size="xl" />
              <div>
                <span className="welcome-tag">أهلاً بك مجدداً</span>
                <h2 className="user-banner-name">{selected?.name}</h2>
                <p className="user-banner-hint">أدخل رمز الـ PIN المكوّن من 4 أرقام للوصول</p>
              </div>
            </div>

            <div className="auth-pin-wrapper">
              <PinInput
                value={pin}
                onChange={(value) => {
                  setError("");
                  setPin(value);
                }}
                onSubmit={verify}
                error={error}
                loading={loading}
                success={success}
              />
            </div>

            <div className="auth-actions-group">
              <Button
                size="lg"
                className="auth-primary-btn"
                loading={loading}
                disabled={pin.length !== 4 || success}
                onClick={verify}
              >
                {success ? "جارٍ تسجيل الدخول..." : "دخول إلى لوحة التحكم"}
              </Button>

              <div className="auth-demo-hint-box">
                <div className="demo-hint-content">
                  <KeyRound size={16} className="text-amber-500" />
                  <span>رمز PIN التجريبي لـ {selected?.name} هو:</span>
                  <code className="demo-pin-code">{selected?.pin}</code>
                </div>
                <button
                  type="button"
                  className="quick-fill-btn"
                  onClick={() => {
                    if (selected?.pin) {
                      setPin(selected.pin);
                      setError("");
                    }
                  }}
                >
                  تعبئة تلقائية
                </button>
              </div>

              <button
                type="button"
                className="auth-quick-bypass-btn"
                onClick={() => instantLogin()}
              >
                ⚡ تخطي الرمز والدخول المباشر
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

export function SetupPinView() {
  const router = useRouter();
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const [phase, setPhase] = useState<"first" | "confirm">("first");
  const [error, setError] = useState("");

  const submit = () => {
    if (phase === "first" && first.length === 4) {
      setPhase("confirm");
      return;
    }
    if (second !== first) {
      setSecond("");
      setError("الرمزان غير متطابقين. حاول مرة أخرى.");
      return;
    }
    router.push("/dashboard");
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
              onClick={submit}
            >
              {phase === "first" ? "متابعة" : "تأكيد والبدء"}
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}