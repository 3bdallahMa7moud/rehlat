import { useState } from 'react'
import {
  Archive,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Download,
  MoreVertical,
  Plus,
  RotateCcw,
  Save,
  Search,
  Settings as SettingsIcon,
  Shield,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react'
import { useApp } from '../app/useApp'
import { Avatar, Badge, Button, EmptyState, IconButton, KpiBand, Menu, Modal, PageHeader } from '../components/ui'
import type { ParticipantRole, Settings } from '../types'
import { text, unitLabel } from '../utils/text'
import { cx } from '../utils/cx'

type Tab = 'participants' | 'tasks' | 'settings'
type RenameTarget = { kind: 'participant' | 'task'; id: number; value: string } | null
type ConfirmTarget =
  | { kind: 'reset-pin'; id: number; label: string }
  | { kind: 'participant-active'; id: number; label: string; active: boolean }
  | { kind: 'participant-role'; id: number; label: string; role: ParticipantRole }
  | { kind: 'task-archive'; id: number; label: string; archived: boolean }
  | null

function TargetSettingsEditor({
  settings,
  language,
  onSave,
}: {
  settings: Settings
  language: 'ar' | 'en'
  onSave: (newSettings: Settings) => void
}) {
  const [dailyTarget, setDailyTarget] = useState(settings.dailyTarget)
  const [weeklyDays, setWeeklyDays] = useState(settings.weeklyRequiredDays)
  const [monthlyWeeks, setMonthlyWeeks] = useState(settings.monthlyRequiredWeeks)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const hasChanges =
    dailyTarget !== settings.dailyTarget ||
    weeklyDays !== settings.weeklyRequiredDays ||
    monthlyWeeks !== settings.monthlyRequiredWeeks

  const handleSave = () => {
    if (dailyTarget < 1 || dailyTarget > 100) {
      setError(text(language, 'نسبة هدف اليوم يجب أن تكون بين 1% و 100%.', 'Daily completion target must be between 1% and 100%.'))
      return
    }
    if (weeklyDays < 1 || weeklyDays > 7) {
      setError(text(language, 'أيام الأسبوع المطلوبة يجب أن تكون بين 1 و 7 أيام.', 'Required days per week must be between 1 and 7.'))
      return
    }
    if (monthlyWeeks < 1 || monthlyWeeks > 5) {
      setError(text(language, 'أسابيع الشهر المطلوبة يجب أن تكون بين 1 و 5 أسابيع.', 'Required weeks per month must be between 1 and 5.'))
      return
    }
    setError('')
    onSave({
      dailyTarget,
      weeklyRequiredDays: weeklyDays,
      monthlyRequiredWeeks: monthlyWeeks,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 3500)
  }

  const handleReset = () => {
    setDailyTarget(settings.dailyTarget)
    setWeeklyDays(settings.weeklyRequiredDays)
    setMonthlyWeeks(settings.monthlyRequiredWeeks)
    setError('')
  }

  return (
    <div className="panel p-5 md:p-6">
      <div className="section-title">
        <div>
          <h2 className="text-lg font-bold">{text(language, 'تعديل قواعد الأهداف', 'Edit target rules')}</h2>
          <p className="text-xs text-[var(--ink-2)]">
            {text(
              language,
              'تتحكم هذه الإعدادات في حساب نسب النجاح اليومية والأسبوعية والشهرية لجميع المشاركين.',
              'These settings control daily, weekly, and monthly success calculations for all participants.',
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saved ? (
            <div className="flex items-center gap-1.5 rounded-full bg-[var(--good-bg)] px-3 py-1 text-xs font-bold text-[var(--good)]">
              <CheckCircle2 size={16} />
              <span>{text(language, 'تم حفظ الإعدادات بنجاح', 'Settings saved successfully')}</span>
            </div>
          ) : null}
          {hasChanges ? <Badge tone="warn">{text(language, 'تغييرات غير محفوظة', 'Unsaved changes')}</Badge> : null}
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-[var(--bad-bg)] bg-[var(--bad-bg)] p-3 text-xs font-semibold text-[var(--bad)]" role="alert">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="field">
          <span>{text(language, 'نسبة الإنجاز اليومي (%)', 'Daily completion target (%)')}</span>
          <input
            type="number"
            min={1}
            max={100}
            step={1}
            className="input num font-bold text-base"
            value={dailyTarget}
            onChange={(e) => setDailyTarget(Number(e.target.value))}
          />
          <span className="text-[11px] text-[var(--ink-3)]">{text(language, 'الموصى به: 90% (من 1 إلى 100)', 'Recommended: 90% (1 to 100)')}</span>
        </label>

        <label className="field">
          <span>{text(language, 'الأيام المطلوبة أسبوعياً', 'Required days per week')}</span>
          <input
            type="number"
            min={1}
            max={7}
            step={1}
            className="input num font-bold text-base"
            value={weeklyDays}
            onChange={(e) => setWeeklyDays(Number(e.target.value))}
          />
          <span className="text-[11px] text-[var(--ink-3)]">{text(language, 'الموصى به: 3 أيام (من 1 إلى 7)', 'Recommended: 3 days (1 to 7)')}</span>
        </label>

        <label className="field">
          <span>{text(language, 'الأسابيع المطلوبة شهرياً', 'Required weeks per month')}</span>
          <input
            type="number"
            min={1}
            max={5}
            step={1}
            className="input num font-bold text-base"
            value={monthlyWeeks}
            onChange={(e) => setMonthlyWeeks(Number(e.target.value))}
          />
          <span className="text-[11px] text-[var(--ink-3)]">{text(language, 'الموصى به: 4 أسابيع (من 1 إلى 5)', 'Recommended: 4 weeks (1 to 5)')}</span>
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-[var(--line)] pt-4">
        <Button variant="ghost" size="sm" onClick={handleReset} disabled={!hasChanges}>
          <RotateCcw size={15} />
          {text(language, 'تراجع / استعادة', 'Reset changes')}
        </Button>
        <Button variant="primary" size="sm" onClick={handleSave} disabled={!hasChanges}>
          <Save size={15} />
          {text(language, 'حفظ التغييرات', 'Save changes')}
        </Button>
      </div>
    </div>
  )
}

export function AdminPage() {
  const {
    state,
    currentParticipant,
    addParticipant,
    bulkAddParticipants,
    renameParticipant,
    resetPin,
    setParticipantRole,
    setParticipantActive,
    addTask,
    renameTask,
    reorderTask,
    toggleTaskCounts,
    setTaskArchived,
    updateSettings,
    resetDemoData,
    exportMock,
  } = useApp()
  const [tab, setTab] = useState<Tab>('participants')
  const [newParticipant, setNewParticipant] = useState('')
  const [newRole, setNewRole] = useState<ParticipantRole>('participant')
  const [bulkNames, setBulkNames] = useState('')
  const [newTask, setNewTask] = useState('')
  const [newTaskCounts, setNewTaskCounts] = useState(true)
  const [participantSearch, setParticipantSearch] = useState('')
  const [taskSearch, setTaskSearch] = useState('')
  const [addParticipantOpen, setAddParticipantOpen] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [addTaskOpen, setAddTaskOpen] = useState(false)
  const [renameTarget, setRenameTarget] = useState<RenameTarget>(null)
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget>(null)
  const [resetDataStep, setResetDataStep] = useState<0 | 1 | 2>(0)

  if (!currentParticipant) return null
  const language = state.language
  const activeCount = state.participants.filter((participant) => participant.active).length
  const activeTasksList = state.tasks.filter((task) => !task.archived).sort((a, b) => a.pos - b.pos)
  const activeTasks = activeTasksList.length

  const visibleParticipants = state.participants.filter((participant) => {
    const query = participantSearch.trim().toLowerCase()
    if (!query) return true
    return `${participant.name} ${participant.nameEn}`.toLowerCase().includes(query)
  })

  const visibleTasks = state.tasks.slice().sort((a, b) => a.pos - b.pos).filter((task) => {
    const query = taskSearch.trim().toLowerCase()
    if (!query) return true
    return `${task.name} ${task.nameEn}`.toLowerCase().includes(query)
  })

  const submitParticipant = () => {
    const name = newParticipant.trim()
    if (!name) return
    addParticipant(name, newRole)
    setNewParticipant('')
    setNewRole('participant')
    setAddParticipantOpen(false)
  }

  const submitBulk = () => {
    const names = bulkNames.split('\n').map((name) => name.trim()).filter(Boolean)
    if (!names.length) return
    bulkAddParticipants(names)
    setBulkNames('')
    setBulkOpen(false)
  }

  const submitTask = () => {
    const name = newTask.trim()
    if (!name) return
    addTask(name, newTaskCounts)
    setNewTask('')
    setNewTaskCounts(true)
    setAddTaskOpen(false)
  }

  const runRename = () => {
    if (!renameTarget || !renameTarget.value.trim()) return
    if (renameTarget.kind === 'participant') renameParticipant(renameTarget.id, renameTarget.value.trim())
    else renameTask(renameTarget.id, renameTarget.value.trim())
    setRenameTarget(null)
  }

  const runConfirm = () => {
    if (!confirmTarget) return
    if (confirmTarget.kind === 'reset-pin') resetPin(confirmTarget.id)
    if (confirmTarget.kind === 'participant-active') setParticipantActive(confirmTarget.id, confirmTarget.active)
    if (confirmTarget.kind === 'participant-role') setParticipantRole(confirmTarget.id, confirmTarget.role)
    if (confirmTarget.kind === 'task-archive') setTaskArchived(confirmTarget.id, confirmTarget.archived)
    setConfirmTarget(null)
  }

  const executeDataReset = () => {
    resetDemoData()
    setResetDataStep(0)
  }

  return (
    <>
      <PageHeader
        eyebrow={text(language, 'أدوات المشرف', 'Admin tools')}
        title={text(language, 'الإدارة', 'Admin')}
        description={text(language, 'إدارة المشاركين والمهام وإعدادات الأهداف من مساحة منظمة ومباشرة.', 'Manage participants, tasks, and target settings from one organized workspace.')}
      />

      <div className="tabs-line mb-5" role="tablist" aria-label={text(language, 'تبويبات الإدارة', 'Admin tabs')}>
        {[
          ['participants', text(language, 'المشاركون', 'Participants'), <Users size={16} />],
          ['tasks', text(language, 'المهام', 'Tasks'), <Archive size={16} />],
          ['settings', text(language, 'الإعدادات', 'Settings'), <SettingsIcon size={16} />],
        ].map(([id, label, icon]) => (
          <button
            key={id as string}
            type="button"
            id={`admin-tab-${id}`}
            className="tab-line"
            onClick={() => setTab(id as Tab)}
            aria-selected={tab === id}
            aria-controls={`admin-panel-${id}`}
            role="tab"
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {tab === 'participants' ? (
        <section id="admin-panel-participants" role="tabpanel" aria-labelledby="admin-tab-participants" className="panel p-5">
          <div className="section-title">
            <div>
              <h2 className="text-lg font-bold">{text(language, 'المشاركون', 'Participants')}</h2>
              <p className="text-xs text-[var(--ink-2)]">{text(language, 'إدارة الأسماء والأدوار وحالة الدخول من قائمة مرتبة.', 'Manage names, roles, and sign-in status from one organized list.')}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" size="sm" onClick={() => setAddParticipantOpen(true)}>
                <Plus size={16} />
                {text(language, 'إضافة مشارك', 'Add participant')}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setBulkOpen(true)}>
                <UserPlus size={16} />
                {text(language, 'إضافة مجموعة', 'Bulk add')}
              </Button>
              <Badge>{activeCount} / {state.participants.length}</Badge>
            </div>
          </div>
          <label className="field mb-4 max-w-md">
            <span>{text(language, 'بحث', 'Search')}</span>
            <span className="relative">
              <Search className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-[var(--ink-3)] ltr:left-3 rtl:right-3" size={16} />
              <input className="input ps-12" value={participantSearch} onChange={(event) => setParticipantSearch(event.target.value)} placeholder={text(language, 'ابحث عن مشارك...', 'Search participants...')} />
            </span>
          </label>
          {visibleParticipants.length ? (
            <div className="list-panel">
              {visibleParticipants.map((participant) => (
                <div key={participant.id} className={cx('interactive-row', !participant.active && 'opacity-60')}>
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={participant.name} color={participant.avatar} />
                    <div className="min-w-0">
                      <div className="truncate font-bold text-sm">{language === 'ar' ? participant.name : participant.nameEn}</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <Badge tone={participant.role === 'admin' ? 'gold' : 'neutral'}>{participant.role === 'admin' ? text(language, 'مشرف', 'Admin') : text(language, 'مشارك', 'Participant')}</Badge>
                        <Badge tone={participant.active ? 'good' : 'bad'}>{participant.active ? text(language, 'نشط', 'Active') : text(language, 'متوقف', 'Inactive')}</Badge>
                        {participant.mustSetPin || !participant.pin ? <Badge tone="warn">{text(language, 'رمز جديد', 'New PIN')}</Badge> : null}
                      </div>
                    </div>
                  </div>
                  <Menu label={text(language, 'إجراءات المشارك', 'Participant actions')} language={language}>
                    {(close) => (
                      <>
                        <button type="button" role="menuitem" onClick={() => { setRenameTarget({ kind: 'participant', id: participant.id, value: participant.name }); close() }}>{text(language, 'إعادة تسمية', 'Rename')}</button>
                        <button type="button" role="menuitem" onClick={() => { setConfirmTarget({ kind: 'reset-pin', id: participant.id, label: participant.name }); close() }}>{text(language, 'تصفير الرمز', 'Reset PIN')}</button>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setConfirmTarget({
                              kind: 'participant-role',
                              id: participant.id,
                              label: language === 'ar' ? participant.name : participant.nameEn,
                              role: participant.role === 'admin' ? 'participant' : 'admin',
                            })
                            close()
                          }}
                        >
                          {participant.role === 'admin' ? text(language, 'جعله مشاركاً', 'Make participant') : text(language, 'جعله مشرفاً', 'Make admin')}
                        </button>
                        <button type="button" role="menuitem" onClick={() => { setConfirmTarget({ kind: 'participant-active', id: participant.id, label: participant.name, active: !participant.active }); close() }}>
                          {participant.active ? text(language, 'إيقاف', 'Deactivate') : text(language, 'استعادة', 'Restore')}
                        </button>
                      </>
                    )}
                  </Menu>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Users size={30} />}
              title={text(language, 'لا يوجد مشاركون', 'No participants')}
              body={text(language, 'أضف مشاركاً واحداً أو مجموعة أسماء لبدء الاستخدام.', 'Add one participant or a list of names to begin using the workspace.')}
            />
          )}
        </section>
      ) : null}

      {tab === 'tasks' ? (
        <section id="admin-panel-tasks" role="tabpanel" aria-labelledby="admin-tab-tasks" className="panel p-5">
          <div className="section-title">
            <div>
              <h2 className="text-lg font-bold">{text(language, 'المهام', 'Tasks')}</h2>
              <p className="text-xs text-[var(--ink-2)]">{text(language, 'ترتيب المهام اليومية باستخدام أزرار الترتيب، وتعديل حالة الاحتساب والأرشفة.', 'Reorder daily tasks using up/down controls, toggle completion counting, and manage archives.')}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" size="sm" onClick={() => setAddTaskOpen(true)}>
                <Plus size={16} />
                {text(language, 'إضافة مهمة', 'Add task')}
              </Button>
              <Badge>{activeTasks} / {state.tasks.length}</Badge>
            </div>
          </div>
          <label className="field mb-4 max-w-md">
            <span>{text(language, 'بحث', 'Search')}</span>
            <span className="relative">
              <Search className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-[var(--ink-3)] ltr:left-3 rtl:right-3" size={16} />
              <input className="input ps-12" value={taskSearch} onChange={(event) => setTaskSearch(event.target.value)} placeholder={text(language, 'ابحث عن مهمة...', 'Search tasks...')} />
            </span>
          </label>
          {visibleTasks.length ? (
            <div className="list-panel">
              {visibleTasks.map((task) => {
                const activeIndex = activeTasksList.findIndex((t) => t.id === task.id)
                return (
                  <div key={task.id} className={cx('interactive-row', task.archived && 'opacity-60')}>
                    <div className="flex min-w-0 items-center gap-3">
                      {!task.archived && !taskSearch.trim() ? (
                        <div className="flex flex-col gap-0.5" aria-label={text(language, 'ترتيب المهمة', 'Task position controls')}>
                          <IconButton
                            label={text(language, 'نقل المهمة للأعلى', 'Move task up')}
                            disabled={activeIndex <= 0}
                            onClick={() => reorderTask(task.id, 'up')}
                            className="h-7 w-7 min-h-0 min-w-0"
                          >
                            <ArrowUp size={14} />
                          </IconButton>
                          <IconButton
                            label={text(language, 'نقل المهمة للأسفل', 'Move task down')}
                            disabled={activeIndex === -1 || activeIndex >= activeTasksList.length - 1}
                            onClick={() => reorderTask(task.id, 'down')}
                            className="h-7 w-7 min-h-0 min-w-0"
                          >
                            <ArrowDown size={14} />
                          </IconButton>
                        </div>
                      ) : null}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {!task.archived ? (
                            <span className="num text-xs font-bold text-[var(--ink-3)]">#{activeIndex + 1}</span>
                          ) : null}
                          <div className="truncate font-bold text-sm">{language === 'ar' ? task.name : task.nameEn}</div>
                        </div>
                        <div className="mt-1 flex gap-1">
                          <Badge tone={task.counts ? 'good' : 'neutral'}>{task.counts ? text(language, 'تُحتسب', 'Counts') : text(language, 'خارج النسبة', 'Not counted')}</Badge>
                          <Badge tone={task.archived ? 'bad' : 'gold'}>{task.archived ? text(language, 'مؤرشفة', 'Archived') : text(language, 'نشطة', 'Active')}</Badge>
                        </div>
                      </div>
                    </div>
                    <Menu label={text(language, 'إجراءات المهمة', 'Task actions')} language={language}>
                      {(close) => (
                        <>
                          <button type="button" role="menuitem" onClick={() => { setRenameTarget({ kind: 'task', id: task.id, value: task.name }); close() }}>{text(language, 'إعادة تسمية', 'Rename')}</button>
                          <button type="button" role="menuitem" onClick={() => { toggleTaskCounts(task.id); close() }}>{task.counts ? text(language, 'إخراج من النسبة', 'Do not count') : text(language, 'احتساب في النسبة', 'Count')}</button>
                          <button type="button" role="menuitem" onClick={() => { setConfirmTarget({ kind: 'task-archive', id: task.id, label: task.name, archived: !task.archived }); close() }}>{task.archived ? text(language, 'استعادة', 'Restore') : text(language, 'أرشفة', 'Archive')}</button>
                        </>
                      )}
                    </Menu>
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState
              icon={<Archive size={30} />}
              title={text(language, 'لا توجد مهام', 'No tasks')}
              body={text(language, 'أضف مهاماً ليتمكن المشاركون من بدء أيامهم.', 'Add tasks so participants can start their days.')}
            />
          )}
        </section>
      ) : null}

      {tab === 'settings' ? (
        <section id="admin-panel-settings" role="tabpanel" aria-labelledby="admin-tab-settings" className="grid gap-5">
          {/* Target Settings Summary & Live KPIs */}
          <div className="hero-panel p-5 md:p-6">
            <div className="mb-3">
              <p className="eyebrow">{text(language, 'الأهداف المعتمدة', 'Configured targets')}</p>
              <h2 className="mt-1 text-xl font-bold">{text(language, 'قواعد الأهداف الحالية', 'Current target rules')}</h2>
            </div>
            <KpiBand
              items={[
                { label: text(language, 'هدف اليوم', 'Daily target'), value: <span className="num">{state.settings.dailyTarget}%</span>, tone: 'gold' },
                { label: text(language, 'أيام الأسبوع المطلوبة', 'Weekly required days'), value: <span className="num">{state.settings.weeklyRequiredDays}</span>, unit: unitLabel(language, state.settings.weeklyRequiredDays, 'يوم', 'أيام', 'day') },
                { label: text(language, 'أسابيع الشهر المطلوبة', 'Monthly required weeks'), value: <span className="num">{state.settings.monthlyRequiredWeeks}</span>, unit: unitLabel(language, state.settings.monthlyRequiredWeeks, 'أسبوع', 'أسابيع', 'week') },
              ]}
            />
          </div>

          {/* Interactive Target Settings Editor */}
          <TargetSettingsEditor
            key={`${state.settings.dailyTarget}-${state.settings.weeklyRequiredDays}-${state.settings.monthlyRequiredWeeks}`}
            settings={state.settings}
            language={language}
            onSave={updateSettings}
          />

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="panel p-5">
              <p className="eyebrow">{text(language, 'البيانات', 'Data')}</p>
              <h2 className="mt-1 text-lg font-bold">{text(language, 'تصدير البيانات', 'Data export')}</h2>
              <p className="mt-1.5 text-xs text-[var(--ink-2)]">
                {text(
                  language,
                  'تصدير فوري من المتصفح لبيانات الجلسة الحالية بصيغة CSV ملائمة لبرنامج Excel أو استعراض التقرير المطبوع.',
                  'Instant client-side export for current session data in Excel-compatible CSV or printable report view.',
                )}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => exportMock('excel')}>
                  <Download size={16} />
                  {text(language, 'تصدير CSV (إكسل)', 'CSV Export (Excel)')}
                </Button>
                <Button size="sm" onClick={() => exportMock('pdf')}>
                  <Download size={16} />
                  {text(language, 'تصدير CSV (تقرير)', 'CSV Export (Report)')}
                </Button>
              </div>
            </div>

            <div className="panel danger-zone p-5">
              <p className="eyebrow text-[var(--bad)]">{text(language, 'إجراء حرج', 'Critical action')}</p>
              <h2 className="mt-1 text-lg font-bold text-[var(--bad)]">{text(language, 'منطقة العمليات الحساسة', 'Danger Zone')}</h2>
              <p className="mt-1.5 text-xs text-[var(--ink-2)]">
                {text(
                  language,
                  'يعيد البيانات الحالية والمؤقتات وسجلات المشاركين إلى الحالة الافتراضية التجريبية.',
                  'Resets current activity, task timers, and participant records to initial demo state.',
                )}
              </p>
              <Button className="mt-4" size="sm" variant="danger" onClick={() => setResetDataStep(1)}>
                <Trash2 size={16} />
                {text(language, 'مسح وإعادة ضبط البيانات', 'Reset demo data')}
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      <Modal open={addParticipantOpen} onClose={() => setAddParticipantOpen(false)} title={text(language, 'إضافة مشارك', 'Add participant')} description={text(language, 'سيُطلب من المشارك اختيار رمز جديد عند أول دخول.', 'The participant will choose a new PIN on first sign-in.')}>
        <div className="grid gap-4">
          <label className="field">
            <span>{text(language, 'اسم المشارك', 'Participant name')}</span>
            <input className="input" value={newParticipant} onChange={(event) => setNewParticipant(event.target.value)} autoFocus />
          </label>
          <label className="field">
            <span>{text(language, 'الدور', 'Role')}</span>
            <select className="input" value={newRole} onChange={(event) => setNewRole(event.target.value as ParticipantRole)}>
              <option value="participant">{text(language, 'مشارك', 'Participant')}</option>
              <option value="admin">{text(language, 'مشرف', 'Admin')}</option>
            </select>
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setAddParticipantOpen(false)}>{text(language, 'إلغاء', 'Cancel')}</Button>
            <Button variant="primary" onClick={submitParticipant}>
              <Plus size={16} />
              {text(language, 'إضافة', 'Add')}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={bulkOpen} onClose={() => setBulkOpen(false)} title={text(language, 'إضافة مجموعة أسماء', 'Bulk add names')} description={text(language, 'اكتب اسماً واحداً في كل سطر. كل الأسماء تُضاف كمشاركين.', 'Enter one name per line. All names are added as participants.')}>
        <div className="grid gap-4">
          <label className="field">
            <span>{text(language, 'الأسماء', 'Names')}</span>
            <textarea className="input min-h-28" value={bulkNames} onChange={(event) => setBulkNames(event.target.value)} placeholder={text(language, 'سامي\nعبدالله\nخالد', 'Sami\nAbdallah\nKhaled')} />
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setBulkOpen(false)}>{text(language, 'إلغاء', 'Cancel')}</Button>
            <Button variant="primary" onClick={submitBulk}>
              <UserPlus size={16} />
              {text(language, 'إضافة الأسماء', 'Add names')}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={addTaskOpen} onClose={() => setAddTaskOpen(false)} title={text(language, 'إضافة مهمة', 'Add task')} description={text(language, 'ستظهر المهمة الجديدة ضمن أيام المشاركين القادمة.', 'The new task appears in future participant days.')}>
        <div className="grid gap-4">
          <label className="field">
            <span>{text(language, 'اسم المهمة', 'Task name')}</span>
            <input className="input" value={newTask} onChange={(event) => setNewTask(event.target.value)} autoFocus />
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold text-[var(--ink-2)]">
            <input type="checkbox" checked={newTaskCounts} onChange={(event) => setNewTaskCounts(event.target.checked)} />
            {text(language, 'تُحتسب ضمن النسبة', 'Counts toward completion')}
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setAddTaskOpen(false)}>{text(language, 'إلغاء', 'Cancel')}</Button>
            <Button variant="primary" onClick={submitTask}>
              <Plus size={16} />
              {text(language, 'إضافة', 'Add')}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!renameTarget} onClose={() => setRenameTarget(null)} title={text(language, 'تعديل الاسم', 'Rename')}>
        <div className="grid gap-4">
          <label className="field">
            <span>{text(language, 'الاسم الجديد', 'New name')}</span>
            <input className="input" value={renameTarget?.value ?? ''} onChange={(event) => setRenameTarget((target) => target ? { ...target, value: event.target.value } : target)} autoFocus />
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRenameTarget(null)}>{text(language, 'إلغاء', 'Cancel')}</Button>
            <Button variant="primary" onClick={runRename}>{text(language, 'حفظ', 'Save')}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!confirmTarget} onClose={() => setConfirmTarget(null)} title={text(language, 'تأكيد الإجراء', 'Confirm action')}>
        <div className="grid gap-4">
          <div className="flex items-start gap-3 rounded-lg bg-[var(--surface-2)] p-4">
            {confirmTarget?.kind === 'reset-pin' ? (
              <RotateCcw className="mt-0.5 shrink-0 text-[var(--warn)]" size={20} />
            ) : confirmTarget?.kind === 'participant-role' ? (
              <Shield className="mt-0.5 shrink-0 text-[var(--accent)]" size={20} />
            ) : (
              <MoreVertical className="mt-0.5 shrink-0 text-[var(--accent)]" size={20} />
            )}
            <div className="text-sm font-semibold text-[var(--ink)]">
              {confirmTarget?.kind === 'participant-role' ? (
                confirmTarget.role === 'admin' ? (
                  <div>
                    <p>{text(language, `هل تريد ترقية «${confirmTarget.label}» إلى مشرف؟`, `Promote "${confirmTarget.label}" to administrator?`)}</p>
                    <p className="mt-1.5 text-xs font-normal text-[var(--ink-2)]">
                      {text(
                        language,
                        'المشرفون يملكون صلاحيات كاملة لإدارة المشاركين، تعديل المهام، تغيير إعدادات الأهداف، وتصفير البيانات.',
                        'Administrators have full permissions to manage participants, modify tasks, change target settings, and reset data.',
                      )}
                    </p>
                  </div>
                ) : (
                  <div>
                    <p>{text(language, `هل تريد إزالة صلاحيات المشرف من «${confirmTarget.label}»؟`, `Remove administrator role from "${confirmTarget.label}"?`)}</p>
                    <p className="mt-1.5 text-xs font-normal text-[var(--ink-2)]">
                      {text(
                        language,
                        'سيصبح حساباً عادياً للمشاركة اليومية ولن يتمكن من الوصول إلى لوحة الإدارة.',
                        'This account will become a standard participant and will not be able to access the admin panel.',
                      )}
                    </p>
                  </div>
                )
              ) : confirmTarget?.kind === 'reset-pin' ? (
                <div>
                  <p>{text(language, `هل تريد تصفير رمز الدخول للمشارك «${confirmTarget.label}»؟`, `Reset PIN for "${confirmTarget.label}"?`)}</p>
                  <p className="mt-1.5 text-xs font-normal text-[var(--ink-2)]">
                    {text(
                      language,
                      'سيُطلب من المشارك اختيار رمز دخول جديد من 4 أرقام عند أول دخول قادم.',
                      'The participant will be prompted to create a new 4-digit PIN upon next sign-in.',
                    )}
                  </p>
                </div>
              ) : confirmTarget ? (
                text(language, `هل تريد تنفيذ الإجراء على ${confirmTarget.label}؟`, `Apply this action to ${confirmTarget.label}?`)
              ) : ''}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmTarget(null)}>{text(language, 'إلغاء', 'Cancel')}</Button>
            <Button variant="primary" onClick={runConfirm}>
              <Shield size={16} />
              {text(language, 'تأكيد', 'Confirm')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Step 1 Danger Zone Modal */}
      <Modal
        open={resetDataStep === 1}
        onClose={() => setResetDataStep(0)}
        title={text(language, 'إعادة ضبط كل بيانات العرض التجريبي؟', 'Reset all demo data?')}
        description={text(
          language,
          'سيؤدي هذا الإجراء إلى حذف جميع السجلات والملاحظات والمؤقتات المحدثة واستعادة البيانات التجريبية الأولية.',
          'This action will delete all recorded days, updated timers, and custom notes, restoring the initial demo dataset.',
        )}
      >
        <div className="grid gap-4">
          <div className="rounded-lg border border-[var(--bad-bg)] bg-[var(--bad-bg)] p-4 text-xs font-medium text-[var(--bad)]">
            {text(
              language,
              'تنبيه: لا يمكن التراجع عن هذا الإجراء بعد تنفيذه. يُرجى التأكيد للمتابعة إلى الخطوة النهائية.',
              'Warning: This action cannot be undone. Please confirm to proceed to the final confirmation.',
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setResetDataStep(0)}>{text(language, 'إلغاء', 'Cancel')}</Button>
            <Button variant="danger" onClick={() => setResetDataStep(2)}>
              {text(language, 'متابعة إلى التأكيد النهائي', 'Proceed to final confirm')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Step 2 Final Danger Zone Modal */}
      <Modal
        open={resetDataStep === 2}
        onClose={() => setResetDataStep(0)}
        title={text(language, 'تأكيد نهائي لمسح البيانات', 'Final Confirmation')}
        description={text(
          language,
          'أنت على وشك مسح جميع البيانات وإعادة تعيين النظام بالكامل.',
          'You are about to wipe all data and reset the entire system.',
        )}
      >
        <div className="grid gap-4">
          <div className="flex items-center gap-3 rounded-lg bg-[var(--surface-2)] p-4 text-xs font-semibold text-[var(--ink)]">
            <Trash2 className="text-[var(--bad)] shrink-0" size={20} />
            <span>{text(language, 'اضغط على الزر أدناه لتأكيد إعادة التعيين.', 'Click the button below to confirm the system reset.')}</span>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setResetDataStep(0)}>{text(language, 'إلغاء', 'Cancel')}</Button>
            <Button variant="danger" onClick={executeDataReset}>
              <Trash2 size={16} />
              {text(language, 'نعم، قم بإعادة التعيين الآن', 'Yes, reset now')}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

