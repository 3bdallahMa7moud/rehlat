import { useState } from 'react'
import { Archive, Download, MoreVertical, Plus, RotateCcw, Search, Settings, Shield, Trash2, UserPlus, Users } from 'lucide-react'
import { useApp } from '../app/useApp'
import { Avatar, Badge, Button, EmptyState, KpiBand, Menu, Modal, PageHeader } from '../components/ui'
import type { ParticipantRole } from '../types'
import { text } from '../utils/text'
import { cx } from '../utils/cx'

type Tab = 'participants' | 'tasks' | 'settings'
type RenameTarget = { kind: 'participant' | 'task'; id: number; value: string } | null
type ConfirmTarget =
  | { kind: 'reset-pin'; id: number; label: string }
  | { kind: 'participant-active'; id: number; label: string; active: boolean }
  | { kind: 'task-archive'; id: number; label: string; archived: boolean }
  | { kind: 'reset-data'; label: string }
  | null

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
    toggleTaskCounts,
    setTaskArchived,
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

  if (!currentParticipant) return null
  const language = state.language
  const activeCount = state.participants.filter((participant) => participant.active).length
  const activeTasks = state.tasks.filter((task) => !task.archived).length
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
    if (confirmTarget.kind === 'task-archive') setTaskArchived(confirmTarget.id, confirmTarget.archived)
    if (confirmTarget.kind === 'reset-data') resetDemoData()
    setConfirmTarget(null)
  }

  return (
    <>
      <PageHeader
        eyebrow={text(language, 'أدوات المشرف', 'Admin tools')}
        title={text(language, 'الإدارة', 'Admin')}
        description={text(language, 'إدارة المشاركين والمهام والإعدادات التجريبية بدون تحويل الصفحة إلى قسم واحد ضخم.', 'Manage participants, tasks, and demo settings without one oversized admin section.')}
      />

      <div className="tabs-line mb-5" role="tablist" aria-label={text(language, 'تبويبات الإدارة', 'Admin tabs')}>
        {[
          ['participants', text(language, 'المشاركون', 'Participants'), <Users size={17} />],
          ['tasks', text(language, 'المهام', 'Tasks'), <Archive size={17} />],
          ['settings', text(language, 'الإعدادات', 'Settings'), <Settings size={17} />],
        ].map(([id, label, icon]) => (
          <button key={id as string} type="button" className="tab-line" onClick={() => setTab(id as Tab)} aria-selected={tab === id} role="tab">
            {icon}
            {label}
          </button>
        ))}
      </div>

      {tab === 'participants' ? (
        <section className="panel p-5">
          <div className="section-title">
            <div>
              <h2 className="text-xl font-black">{text(language, 'المشاركون', 'Participants')}</h2>
              <p className="text-sm text-[var(--ink-2)]">{text(language, 'إدارة الأسماء والأدوار وحالة الدخول من قائمة مرتبة.', 'Manage names, roles, and sign-in status from one organized list.')}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" onClick={() => setAddParticipantOpen(true)}>
                <Plus size={17} />
                {text(language, 'إضافة مشارك', 'Add participant')}
              </Button>
              <Button variant="secondary" onClick={() => setBulkOpen(true)}>
                <UserPlus size={17} />
                {text(language, 'إضافة مجموعة', 'Bulk add')}
              </Button>
              <Badge>{activeCount} / {state.participants.length}</Badge>
            </div>
          </div>
          <label className="field mb-4 max-w-md">
            <span>{text(language, 'بحث', 'Search')}</span>
            <span className="relative">
              <Search className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-[var(--ink-3)] ltr:left-3 rtl:right-3" size={17} />
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
                        <div className="truncate font-black">{language === 'ar' ? participant.name : participant.nameEn}</div>
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
                          <button type="button" role="menuitem" onClick={() => { setParticipantRole(participant.id, participant.role === 'admin' ? 'participant' : 'admin'); close() }}>{participant.role === 'admin' ? text(language, 'جعله مشاركاً', 'Make participant') : text(language, 'جعله مشرفاً', 'Make admin')}</button>
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
              body={text(language, 'أضف مشاركاً واحداً أو مجموعة أسماء لبدء العرض.', 'Add one participant or a list of names to begin.')}
            />
          )}
        </section>
      ) : null}

      {tab === 'tasks' ? (
        <section className="panel p-5">
          <div className="section-title">
            <div>
              <h2 className="text-xl font-black">{text(language, 'المهام', 'Tasks')}</h2>
              <p className="text-sm text-[var(--ink-2)]">{text(language, 'ترتيب واضح للمهام النشطة والمؤرشفة بدون جعل النموذج يسيطر على الصفحة.', 'A clear list of active and archived tasks without letting the form dominate the page.')}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" onClick={() => setAddTaskOpen(true)}>
                <Plus size={17} />
                {text(language, 'إضافة مهمة', 'Add task')}
              </Button>
              <Badge>{activeTasks} / {state.tasks.length}</Badge>
            </div>
          </div>
          <label className="field mb-4 max-w-md">
            <span>{text(language, 'بحث', 'Search')}</span>
            <span className="relative">
              <Search className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-[var(--ink-3)] ltr:left-3 rtl:right-3" size={17} />
              <input className="input ps-12" value={taskSearch} onChange={(event) => setTaskSearch(event.target.value)} placeholder={text(language, 'ابحث عن مهمة...', 'Search tasks...')} />
            </span>
          </label>
          {visibleTasks.length ? (
            <div className="list-panel">
              {visibleTasks.map((task) => (
                <div key={task.id} className={cx('interactive-row', task.archived && 'opacity-60')}>
                    <div className="min-w-0">
                      <div className="truncate font-black">{language === 'ar' ? task.name : task.nameEn}</div>
                      <div className="mt-1 flex gap-1">
                        <Badge tone={task.counts ? 'good' : 'neutral'}>{task.counts ? text(language, 'تُحتسب', 'Counts') : text(language, 'خارج النسبة', 'Not counted')}</Badge>
                        <Badge tone={task.archived ? 'bad' : 'gold'}>{task.archived ? text(language, 'مؤرشفة', 'Archived') : text(language, 'نشطة', 'Active')}</Badge>
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
              ))}
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
        <section className="grid gap-5">
          <div className="hero-panel p-5 md:p-6">
            <div className="mb-4">
              <p className="eyebrow">{text(language, 'الأهداف المعتمدة', 'Configured targets')}</p>
              <h2 className="mt-2 text-2xl font-black">{text(language, 'قواعد العرض الحالية', 'Current demo rules')}</h2>
            </div>
            <KpiBand
              items={[
                { label: text(language, 'هدف اليوم', 'Daily target'), value: <span className="num">{state.settings.dailyTarget}%</span>, tone: 'gold' },
                { label: text(language, 'أيام الأسبوع المطلوبة', 'Weekly required days'), value: <span className="num">{state.settings.weeklyRequiredDays}</span> },
                { label: text(language, 'أسابيع الشهر المطلوبة', 'Monthly required weeks'), value: <span className="num">{state.settings.monthlyRequiredWeeks}</span> },
              ]}
            />
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="panel p-5">
              <h2 className="text-xl font-black">{text(language, 'التصدير', 'Export')}</h2>
              <p className="mt-2 text-sm text-[var(--ink-2)]">{text(language, 'إجراءات وهمية مناسبة للعرض أمام العميل.', 'Mock actions suitable for client demos.')}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={() => exportMock('excel')}><Download size={17} />{text(language, 'إكسل', 'Excel')}</Button>
                <Button onClick={() => exportMock('pdf')}><Download size={17} />PDF</Button>
              </div>
            </div>
            <div className="panel danger-zone p-5">
              <h2 className="text-xl font-black text-[var(--bad)]">{text(language, 'منطقة خطرة', 'Danger zone')}</h2>
              <p className="mt-2 text-sm text-[var(--ink-2)]">{text(language, 'يعيد بيانات العرض إلى الحالة الافتراضية.', 'Resets demo data to its default state.')}</p>
              <Button className="mt-4" variant="danger" onClick={() => setConfirmTarget({ kind: 'reset-data', label: text(language, 'كل بيانات العرض', 'all demo data') })}>
                <Trash2 size={17} />
                {text(language, 'مسح كل البيانات', 'Reset all data')}
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
              <Plus size={17} />
              {text(language, 'إضافة', 'Add')}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={bulkOpen} onClose={() => setBulkOpen(false)} title={text(language, 'إضافة مجموعة أسماء', 'Bulk add names')} description={text(language, 'اكتب اسماً واحداً في كل سطر. كل الأسماء تُضاف كمشاركين.', 'Enter one name per line. All names are added as participants.')}>
        <div className="grid gap-4">
          <label className="field">
            <span>{text(language, 'الأسماء', 'Names')}</span>
            <textarea className="input" value={bulkNames} onChange={(event) => setBulkNames(event.target.value)} placeholder={text(language, 'سامي\nعبدالله\nخالد', 'Sami\nAbdallah\nKhaled')} />
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setBulkOpen(false)}>{text(language, 'إلغاء', 'Cancel')}</Button>
            <Button variant="primary" onClick={submitBulk}>
              <UserPlus size={17} />
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
          <label className="flex items-center gap-2 text-sm font-bold text-[var(--ink-2)]">
            <input type="checkbox" checked={newTaskCounts} onChange={(event) => setNewTaskCounts(event.target.checked)} />
            {text(language, 'تُحتسب ضمن النسبة', 'Counts toward completion')}
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setAddTaskOpen(false)}>{text(language, 'إلغاء', 'Cancel')}</Button>
            <Button variant="primary" onClick={submitTask}>
              <Plus size={17} />
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
            {confirmTarget?.kind === 'reset-pin' ? <RotateCcw className="text-[var(--warn)]" /> : confirmTarget?.kind === 'reset-data' ? <Trash2 className="text-[var(--bad)]" /> : <MoreVertical className="text-[var(--accent)]" />}
            <p className="font-bold text-[var(--ink-2)]">
              {confirmTarget
                ? text(language, `هل تريد تنفيذ الإجراء على ${confirmTarget.label}؟`, `Apply this action to ${confirmTarget.label}?`)
                : ''}
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmTarget(null)}>{text(language, 'إلغاء', 'Cancel')}</Button>
            <Button variant={confirmTarget?.kind === 'reset-data' ? 'danger' : 'primary'} onClick={runConfirm}>
              {confirmTarget?.kind === 'reset-data' ? <Trash2 size={17} /> : <Shield size={17} />}
              {text(language, 'تأكيد', 'Confirm')}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
