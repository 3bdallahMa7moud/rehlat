import { useMemo, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent as ReactKeyboardEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Check, LockKeyhole, Moon, Search, Shield, Sun, UserRound, Users, X } from 'lucide-react'
import { useApp } from '../app/useApp'
import { Brand } from '../components/Brand'
import { Avatar, Badge, Button, EmptyState, IconButton, OtpPinInput } from '../components/ui'
import { text } from '../utils/text'
import { cx } from '../utils/cx'

type RoleFilter = 'all' | 'admin' | 'participant'

export function LoginPage() {
  const { state, currentParticipant, setLanguage, setTheme, signIn, setPinAndSignIn } = useApp()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [focusedIndex, setFocusedIndex] = useState(0)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const language = state.language

  const activeParticipants = useMemo(() => {
    const query = search.trim().toLowerCase()
    return state.participants.filter((participant) => {
      if (!participant.active) return false
      if (roleFilter !== 'all' && participant.role !== roleFilter) return false
      if (!query) return true
      return `${participant.name} ${participant.nameEn}`.toLowerCase().includes(query)
    })
  }, [search, roleFilter, state.participants])

  const handleSearchKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!activeParticipants.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedIndex((prev) => (prev + 1) % activeParticipants.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedIndex((prev) => (prev - 1 + activeParticipants.length) % activeParticipants.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const target = activeParticipants[focusedIndex] ?? activeParticipants[0]
      if (target) {
        setSelectedId(target.id)
        setPin('')
        setConfirmPin('')
        setError('')
      }
    } else if (e.key === 'Escape') {
      setSearch('')
    }
  }

  if (currentParticipant) return <Navigate to="/app/today" replace />

  const selected = selectedId ? state.participants.find((participant) => participant.id === selectedId) ?? null : null
  const setupMode = !!selected && (selected.mustSetPin || !selected.pin)

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    if (!selected) return
    if (pin.length < 4) {
      setError(text(language, 'الرجاء إدخال الرمز المكوّن من 4 أرقام.', 'Please enter the 4-digit PIN.'))
      return
    }
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
                  <span className="text-xs font-bold">{language === 'ar' ? 'EN' : 'AR'}</span>
                </IconButton>
                <IconButton label={text(language, 'تبديل الوضع', 'Switch theme')} onClick={() => setTheme(state.theme === 'light' ? 'dark' : 'light')}>
                  {state.theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                </IconButton>
              </div>
            </div>
            <div className="mt-10 max-w-xl md:mt-16">
              <p className="eyebrow">{text(language, 'بوابة المشاركين', 'Participant portal')}</p>
              <h1 className="mt-3 text-2xl font-bold leading-tight text-[var(--ink)] md:text-4xl">
                {text(language, 'ادخل إلى رحلتك اليومية بوضوح وهدوء.', 'Enter your daily journey with clarity and calm.')}
              </h1>
              <p className="mt-4 text-sm font-normal text-[var(--ink-2)] md:text-base">
                {text(
                  language,
                  'اختر اسمك، أدخل رمزك، وتابع مهامك وتقدم المجموعة من مكان واحد منظم.',
                  'Choose your name, enter your PIN, and follow your tasks and group progress from one organized place.',
                )}
              </p>
            </div>
          </div>
          <div className="login-proofline mt-8">
            <div>
              <div className="text-xl font-bold num">{state.participants.filter((p) => p.active).length}</div>
              <div className="mt-1 text-xs font-medium text-[var(--ink-3)]">{text(language, 'مشاركون نشطون', 'Active participants')}</div>
            </div>
            <div>
              <div className="text-xl font-bold num">90%</div>
              <div className="mt-1 text-xs font-medium text-[var(--ink-3)]">{text(language, 'هدف اليوم', 'Daily target')}</div>
            </div>
          </div>
        </section>

        <section className="panel bg-[var(--surface)] p-5 md:p-6">
          {!selected ? (
            <>
              <div className="section-title">
                <div>
                  <p className="eyebrow">{text(language, 'الدخول', 'Sign in')}</p>
                  <h2 className="text-xl font-bold">{text(language, 'اختر اسمك', 'Choose your name')}</h2>
                </div>
                <Badge tone="gold">{activeParticipants.length} / {state.participants.filter((p) => p.active).length}</Badge>
              </div>

              {/* Role filter chips */}
              <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label={text(language, 'تصفية الأدوار', 'Role filter')}>
                <button
                  type="button"
                  onClick={() => { setRoleFilter('all'); setFocusedIndex(0) }}
                  className={cx(
                    'flex min-h-[30px] items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                    roleFilter === 'all'
                      ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                      : 'border border-[var(--line)] bg-[var(--surface-2)] text-[var(--ink-2)] hover:text-[var(--ink)]',
                  )}
                >
                  <Users size={13} />
                  {text(language, 'الكل', 'All')}
                </button>
                <button
                  type="button"
                  onClick={() => { setRoleFilter('admin'); setFocusedIndex(0) }}
                  className={cx(
                    'flex min-h-[30px] items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                    roleFilter === 'admin'
                      ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                      : 'border border-[var(--line)] bg-[var(--surface-2)] text-[var(--ink-2)] hover:text-[var(--ink)]',
                  )}
                >
                  <Shield size={13} />
                  {text(language, 'المشرفون', 'Admins')}
                </button>
                <button
                  type="button"
                  onClick={() => { setRoleFilter('participant'); setFocusedIndex(0) }}
                  className={cx(
                    'flex min-h-[30px] items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                    roleFilter === 'participant'
                      ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                      : 'border border-[var(--line)] bg-[var(--surface-2)] text-[var(--ink-2)] hover:text-[var(--ink)]',
                  )}
                >
                  <UserRound size={13} />
                  {text(language, 'المشاركون', 'Participants')}
                </button>
              </div>

              {/* Combobox Search Input */}
              <label className="field mb-3">
                <span className="sr-only">{text(language, 'بحث عن مشارك', 'Search participants')}</span>
                <span className="relative">
                  <Search className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-[var(--ink-3)] ltr:left-3 rtl:right-3" size={17} />
                  <input
                    ref={searchInputRef}
                    className="input ps-11 pe-9"
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value)
                      setFocusedIndex(0)
                    }}
                    onKeyDown={handleSearchKeyDown}
                    placeholder={text(language, 'ابحث بالاسم أو استخدم الأسهم للاختيار...', 'Search by name or use arrows to select...')}
                    role="combobox"
                    aria-expanded={activeParticipants.length > 0}
                    aria-controls="participants-listbox"
                    aria-autocomplete="list"
                    autoFocus
                  />
                  {search ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSearch('')
                        searchInputRef.current?.focus()
                      }}
                      className="absolute top-1/2 -translate-y-1/2 text-[var(--ink-3)] hover:text-[var(--ink)] ltr:right-3 rtl:left-3"
                      aria-label={text(language, 'مسح البحث', 'Clear search')}
                    >
                      <X size={16} />
                    </button>
                  ) : null}
                </span>
              </label>

              {/* Scrollable listbox */}
              <div
                id="participants-listbox"
                role="listbox"
                aria-label={text(language, 'قائمة المشاركين', 'Participants list')}
                className="grid max-h-[500px] gap-2 overflow-y-auto pe-1"
              >
                {activeParticipants.length ? (
                  activeParticipants.map((participant, index) => {
                    const isFocused = index === focusedIndex
                    return (
                      <button
                        key={participant.id}
                        type="button"
                        role="option"
                        aria-selected={isFocused}
                        onMouseEnter={() => setFocusedIndex(index)}
                        className={cx(
                          'flex min-h-[56px] items-center justify-between gap-3 rounded-lg border p-3 text-start transition-all cursor-pointer',
                          isFocused
                            ? 'border-[var(--accent)] bg-[var(--accent-bg)]/35 shadow-sm'
                            : 'border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-2)]',
                        )}
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
                            <span className="block truncate font-bold text-sm">
                              {language === 'ar' ? participant.name : participant.nameEn}
                            </span>
                            <span className="block text-xs font-medium text-[var(--ink-3)]">
                              {participant.mustSetPin
                                ? text(language, 'يحتاج رمزاً جديداً', 'Needs new PIN')
                                : text(language, 'جاهز للدخول (1234)', 'Ready for sign in')}
                            </span>
                          </span>
                        </span>
                        <div className="flex items-center gap-2">
                          {participant.role === 'admin' ? (
                            <Badge tone="gold">{text(language, 'مشرف', 'Admin')}</Badge>
                          ) : null}
                          {isFocused ? (
                            <Check size={16} className="text-[var(--accent)] shrink-0 hidden sm:block" />
                          ) : null}
                        </div>
                      </button>
                    )
                  })
                ) : (
                  <EmptyState
                    icon={<UserRound size={28} />}
                    title={text(language, 'لا يوجد مشاركون مطابقون', 'No matching participants')}
                    body={text(language, 'غيّر البحث أو الفلتر للعثور على المشارك المطلوب.', 'Try adjusting your search query or role filter.')}
                  />
                )}
              </div>
            </>
          ) : (
            <form onSubmit={submit} className="mx-auto grid max-w-md gap-4 py-6">
              <div className="text-center">
                <div className="mx-auto mb-3 flex justify-center">
                  <Avatar name={selected.name} color={selected.avatar} size="lg" />
                </div>
                <p className="eyebrow">{setupMode ? text(language, 'إعداد الرمز', 'PIN setup') : text(language, 'رمز الدخول', 'Enter PIN')}</p>
                <h2 className="mt-1 text-xl font-bold">{language === 'ar' ? selected.name : selected.nameEn}</h2>
                <p className="mt-1.5 text-sm font-normal text-[var(--ink-2)]">
                  {setupMode
                    ? selected.pinReset
                      ? text(language, 'صفّر المشرف رمزك. اختر رمزاً جديداً.', 'An admin reset your PIN. Choose a new one.')
                      : text(language, 'أول دخول لك. الرمز الذي تختاره الآن سيصبح رمزك.', 'First sign in. The PIN you choose now becomes yours.')
                    : text(language, 'أدخل رمزك المكوّن من 4 أرقام.', 'Enter your 4-digit PIN.')}
                </p>
              </div>

              <OtpPinInput
                value={pin}
                onChange={setPin}
                length={4}
                error={!!error}
                autoFocus
                label={setupMode ? text(language, 'اختر رمزاً من 4 أرقام', 'Choose a 4-digit PIN') : text(language, 'الرمز السري', 'PIN')}
                id="login-pin-input"
              />

              {!setupMode ? (
                <span className="text-center text-xs font-medium text-[var(--ink-3)]">
                  {text(language, 'للعرض التجريبي يمكنك استخدام 1234', 'For preview, you can use 1234')}
                </span>
              ) : null}

              {setupMode ? (
                <OtpPinInput
                  value={confirmPin}
                  onChange={setConfirmPin}
                  length={4}
                  error={!!error}
                  label={text(language, 'تأكيد الرمز', 'Confirm PIN')}
                  id="login-confirm-pin-input"
                />
              ) : null}

              <p role="alert" className="min-h-5 text-center text-sm font-semibold text-[var(--bad)]">{error}</p>
              <div className="grid grid-cols-[1fr_auto] gap-2 pt-2">
                <Button type="submit" variant="primary">
                  <LockKeyhole size={17} />
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

