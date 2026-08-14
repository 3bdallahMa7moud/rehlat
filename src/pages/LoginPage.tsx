import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { LockKeyhole, Moon, Search, Shield, Sun, UserRound } from 'lucide-react'
import { useApp } from '../app/useApp'
import { Brand } from '../components/Brand'
import { Avatar, Badge, Button, EmptyState, IconButton } from '../components/ui'
import { text } from '../utils/text'

export function LoginPage() {
  const { state, currentParticipant, setLanguage, setTheme, signIn, setPinAndSignIn } = useApp()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')
  const language = state.language

  const activeParticipants = useMemo(() => {
    const query = search.trim().toLowerCase()
    return state.participants.filter((participant) => {
      if (!participant.active) return false
      if (!query) return true
      return `${participant.name} ${participant.nameEn}`.toLowerCase().includes(query)
    })
  }, [search, state.participants])

  if (currentParticipant) return <Navigate to="/app/today" replace />

  const selected = selectedId ? state.participants.find((participant) => participant.id === selectedId) ?? null : null
  const setupMode = !!selected && (selected.mustSetPin || !selected.pin)

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    if (!selected) return
    if (setupMode && pin !== confirmPin) {
      setError(text(language, 'الرمزان غير متطابقين.', 'The PINs do not match.'))
      return
    }
    const result = setupMode ? setPinAndSignIn(selected.id, pin) : signIn(selected.id, pin)
    if (!result.ok) {
      setError(result.message)
      return
    }
    navigate('/app/today')
  }

  return (
    <main className="min-h-screen px-4 py-5 md:px-8">
      <div className="mx-auto grid min-h-[calc(100svh-40px)] max-w-6xl grid-cols-1 gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-stretch">
        <section className="hero-panel flex flex-col justify-between p-6 md:p-8">
          <div>
            <div className="flex items-start justify-between gap-3">
              <Brand language={language} variant="login" />
              <div className="flex gap-1">
                <IconButton label={text(language, 'تبديل اللغة', 'Switch language')} onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}>
                  <span className="text-xs font-black">{language === 'ar' ? 'EN' : 'AR'}</span>
                </IconButton>
                <IconButton label={text(language, 'تبديل الوضع', 'Switch theme')} onClick={() => setTheme(state.theme === 'light' ? 'dark' : 'light')}>
                  {state.theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                </IconButton>
              </div>
            </div>
            <div className="mt-10 max-w-xl md:mt-16">
              <p className="eyebrow">{text(language, 'مساحة تقدم خاصة', 'Private progress workspace')}</p>
              <h1 className="mt-3 text-3xl font-black leading-tight text-[var(--ink)] md:text-5xl">
                {text(language, 'ادخل إلى رحلتك اليومية بوضوح وهدوء.', 'Enter your daily journey with clarity and calm.')}
              </h1>
              <p className="mt-5 text-base text-[var(--ink-2)]">
                {text(
                  language,
                  'اختر اسمك، أدخل رمزك، وتابع مهامك وتقدم المجموعة من مكان واحد منظم.',
                  'Choose your name, enter your PIN, and follow your tasks and group progress from one organized place.',
                )}
              </p>
            </div>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-3">
            <div className="panel-soft p-4">
              <div className="text-2xl font-black num">{state.participants.filter((p) => p.active).length}</div>
              <div className="mt-1 text-xs font-bold text-[var(--ink-3)]">{text(language, 'مشاركون', 'Participants')}</div>
            </div>
            <div className="panel-soft p-4">
              <div className="text-2xl font-black num">90%</div>
              <div className="mt-1 text-xs font-bold text-[var(--ink-3)]">{text(language, 'هدف اليوم', 'Daily target')}</div>
            </div>
          </div>
        </section>

        <section className="panel bg-[var(--surface)] p-5 md:p-6">
          {!selected ? (
            <>
              <div className="section-title">
                <div>
                  <p className="eyebrow">{text(language, 'الدخول', 'Sign in')}</p>
                  <h2 className="text-2xl font-black">{text(language, 'اختر اسمك', 'Choose your name')}</h2>
                </div>
                <Badge tone="gold">
                  <Shield size={14} />
                  {text(language, 'محلي فقط', 'Local only')}
                </Badge>
              </div>
              <label className="field mb-4">
                <span>{text(language, 'بحث عن مشارك', 'Search participants')}</span>
                <span className="relative">
                  <Search className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-[var(--ink-3)] ltr:left-3 rtl:right-3" size={17} />
                  <input
                    className="input ps-12"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={text(language, 'اكتب الاسم...', 'Type a name...')}
                  />
                </span>
              </label>
              <div className="grid max-h-[560px] gap-2 overflow-y-auto pe-1">
                {activeParticipants.length ? activeParticipants.map((participant) => (
                  <button
                    key={participant.id}
                    type="button"
                    className="flex min-h-[58px] items-center justify-between gap-3 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3 text-start hover:bg-[var(--surface-2)]"
                    onClick={() => {
                      setSelectedId(participant.id)
                      setPin('')
                      setConfirmPin('')
                      setError('')
                    }}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <Avatar name={participant.name} color={participant.avatar} />
                      <span className="min-w-0">
                        <span className="block truncate font-black">{language === 'ar' ? participant.name : participant.nameEn}</span>
                        <span className="block text-xs text-[var(--ink-3)]">{participant.mustSetPin ? text(language, 'يحتاج رمزاً جديداً', 'Needs new PIN') : text(language, 'جاهز للدخول', 'Ready')}</span>
                      </span>
                    </span>
                    {participant.role === 'admin' ? <Badge tone="gold">{text(language, 'مشرف', 'Admin')}</Badge> : null}
                  </button>
                )) : (
                  <EmptyState
                    icon={<UserRound size={28} />}
                    title={text(language, 'لا يوجد مشاركون', 'No participants')}
                    body={text(language, 'غيّر البحث أو أضف مشاركين من أدوات المشرف لاحقاً.', 'Adjust the search or add participants later from Admin tools.')}
                  />
                )}
              </div>
            </>
          ) : (
            <form onSubmit={submit} className="mx-auto grid max-w-md gap-5 py-8">
              <div className="text-center">
                <div className="mx-auto mb-3 flex justify-center">
                  <Avatar name={selected.name} color={selected.avatar} size="lg" />
                </div>
                <p className="eyebrow">{setupMode ? text(language, 'إعداد الرمز', 'PIN setup') : text(language, 'رمز الدخول', 'Enter PIN')}</p>
                <h2 className="mt-1 text-2xl font-black">{language === 'ar' ? selected.name : selected.nameEn}</h2>
                <p className="mt-2 text-sm text-[var(--ink-2)]">
                  {setupMode
                    ? selected.pinReset
                      ? text(language, 'صفّر المشرف رمزك. اختر رمزاً جديداً.', 'An admin reset your PIN. Choose a new one.')
                      : text(language, 'أول دخول لك. الرمز الذي تختاره الآن سيصبح رمزك.', 'First sign in. The PIN you choose now becomes yours.')
                    : text(language, 'أدخل رمزك المكوّن من 4 أرقام.', 'Enter your 4-digit PIN.')}
                </p>
              </div>
              <label className="field">
                <span>{setupMode ? text(language, 'اختر رمزاً من 4 أرقام', 'Choose a 4-digit PIN') : text(language, 'الرمز السري', 'PIN')}</span>
                <input
                  className="input num text-center text-xl tracking-[0.45em]"
                  value={pin}
                  onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
                  inputMode="numeric"
                  autoComplete="off"
                  type="password"
                  maxLength={4}
                  aria-invalid={!!error}
                  autoFocus
                />
                {!setupMode ? <span className="text-xs font-bold text-[var(--ink-3)]">{text(language, 'للعرض التجريبي استخدم 1234', 'For the demo, use 1234')}</span> : null}
              </label>
              {setupMode ? (
                <label className="field">
                  <span>{text(language, 'تأكيد الرمز', 'Confirm PIN')}</span>
                  <input
                    className="input num text-center text-xl tracking-[0.45em]"
                    value={confirmPin}
                    onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
                    inputMode="numeric"
                    autoComplete="off"
                    type="password"
                    maxLength={4}
                    aria-invalid={!!error}
                  />
                </label>
              ) : null}
              <p role="alert" className="min-h-5 text-sm font-bold text-[var(--bad)]">{error}</p>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <Button type="submit" variant="primary">
                  <LockKeyhole size={18} />
                  {text(language, 'دخول', 'Sign in')}
                </Button>
                <Button variant="ghost" onClick={() => setSelectedId(null)}>
                  {text(language, 'رجوع', 'Back')}
                </Button>
              </div>
            </form>
          )}
        </section>
      </div>
    </main>
  )
}
