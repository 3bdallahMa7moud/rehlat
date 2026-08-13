import { useState } from 'react'
import { Archive, Download, MoreVertical, Plus, RotateCcw, Settings, Shield, Trash2, UserPlus, Users } from 'lucide-react'
import { useApp } from '../app/useApp'
import { Avatar, Badge, Button, EmptyState, Menu, Metric, Modal, PageHeader } from '../components/ui'
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
  const [renameTarget, setRenameTarget] = useState<RenameTarget>(null)
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget>(null)

  if (!currentParticipant) return null
  const language = state.language
  const activeCount = state.participants.filter((participant) => participant.active).length
  const activeTasks = state.tasks.filter((task) => !task.archived).length

  const submitParticipant = () => {
    const name = newParticipant.trim()
    if (!name) return
    addParticipant(name, newRole)
    setNewParticipant('')
    setNewRole('participant')
  }

  const submitBulk = () => {
    const names = bulkNames.split('\n').map((name) => name.trim()).filter(Boolean)
    if (!names.length) return
    bulkAddParticipants(names)
    setBulkNames('')
  }

  const submitTask = () => {
    const name = newTask.trim()
    if (!name) return
    addTask(name, newTaskCounts)
    setNewTask('')
    setNewTaskCounts(true)
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

      <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label={text(language, 'تبويبات الإدارة', 'Admin tabs')}>
        {[
          ['participants', text(language, 'المشاركون', 'Participants'), <Users size={17} />],
          ['tasks', text(language, 'المهام', 'Tasks'), <Archive size={17} />],
          ['settings', text(language, 'الإعدادات', 'Settings'), <Settings size={17} />],
        ].map(([id, label, icon]) => (
          <Button key={id as string} variant={tab === id ? 'primary' : 'default'} onClick={() => setTab(id as Tab)} aria-selected={tab === id} role="tab">
            {icon}
            {label}
          </Button>
        ))}
      </div>

      {tab === 'participants' ? (
        <section className="grid gap-5 xl:grid-cols-[380px_1fr]">
          <div className="grid content-start gap-5">
            <div className="panel p-5">
              <div className="section-title">
                <h2 className="text-xl font-black">{text(language, 'إضافة مشارك', 'Add participant')}</h2>
                <UserPlus className="text-[var(--accent)]" size={21} />
              </div>
              <div className="grid gap-3">
                <label className="field">
                  <span>{text(language, 'اسم المشارك', 'Participant name')}</span>
                  <input className="input" value={newParticipant} onChange={(event) => setNewParticipant(event.target.value)} />
                </label>
                <label className="field">
                  <span>{text(language, 'الدور', 'Role')}</span>
                  <select className="input" value={newRole} onChange={(event) => setNewRole(event.target.value as ParticipantRole)}>
                    <option value="participant">{text(language, 'مشارك', 'Participant')}</option>
                    <option value="admin">{text(language, 'مشرف', 'Admin')}</option>
                  </select>
                </label>
                <Button variant="primary" onClick={submitParticipant}>
                  <Plus size={17} />
                  {text(language, 'إضافة مشارك', 'Add participant')}
                </Button>
              </div>
            </div>

            <div className="panel p-5">
              <h2 className="text-xl font-black">{text(language, 'إضافة مجموعة أسماء', 'Bulk add names')}</h2>
              <label className="field mt-3">
                <span>{text(language, 'اسم في كل سطر', 'One name per line')}</span>
                <textarea className="input" value={bulkNames} onChange={(event) => setBulkNames(event.target.value)} placeholder={text(language, 'سامي\nعبدالله\nخالد', 'Sami\nAbdallah\nKhaled')} />
              </label>
              <Button className="mt-3" onClick={submitBulk}>{text(language, 'إضافة الأسماء', 'Add names')}</Button>
            </div>
          </div>

          <div className="panel p-5">
            <div className="section-title">
              <h2 className="text-xl font-black">{text(language, 'المشاركون', 'Participants')}</h2>
              <Badge>{activeCount} / {state.participants.length}</Badge>
            </div>
            {state.participants.length ? (
              <div className="grid gap-2">
                {state.participants.map((participant) => (
                  <div key={participant.id} className={cx('grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg border border-[var(--line)] p-3', !participant.active && 'opacity-60')}>
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
          </div>
        </section>
      ) : null}

      {tab === 'tasks' ? (
        <section className="grid gap-5 xl:grid-cols-[380px_1fr]">
          <div className="panel p-5">
            <div className="section-title">
              <h2 className="text-xl font-black">{text(language, 'إضافة مهمة', 'Add task')}</h2>
              <Plus className="text-[var(--accent)]" size={21} />
            </div>
            <div className="grid gap-3">
              <label className="field">
                <span>{text(language, 'اسم المهمة', 'Task name')}</span>
                <input className="input" value={newTask} onChange={(event) => setNewTask(event.target.value)} />
              </label>
              <label className="flex items-center gap-2 text-sm font-bold text-[var(--ink-2)]">
                <input type="checkbox" checked={newTaskCounts} onChange={(event) => setNewTaskCounts(event.target.checked)} />
                {text(language, 'تُحتسب ضمن النسبة', 'Counts toward completion')}
              </label>
              <Button variant="primary" onClick={submitTask}>
                <Plus size={17} />
                {text(language, 'إضافة مهمة', 'Add task')}
              </Button>
            </div>
          </div>

          <div className="panel p-5">
            <div className="section-title">
              <h2 className="text-xl font-black">{text(language, 'المهام', 'Tasks')}</h2>
              <Badge>{activeTasks} / {state.tasks.length}</Badge>
            </div>
            {state.tasks.length ? (
              <div className="grid gap-2">
                {state.tasks.slice().sort((a, b) => a.pos - b.pos).map((task) => (
                  <div key={task.id} className={cx('grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg border border-[var(--line)] p-3', task.archived && 'opacity-60')}>
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
          </div>
        </section>
      ) : null}

      {tab === 'settings' ? (
        <section className="grid gap-5">
          <div className="hero-panel p-5 md:p-6">
            <div className="grid gap-5 md:grid-cols-3">
              <Metric label={text(language, 'هدف اليوم', 'Daily target')} value={<span className="num">{state.settings.dailyTarget}%</span>} tone="gold" />
              <Metric label={text(language, 'أيام الأسبوع المطلوبة', 'Weekly required days')} value={<span className="num">{state.settings.weeklyRequiredDays}</span>} />
              <Metric label={text(language, 'أسابيع الشهر المطلوبة', 'Monthly required weeks')} value={<span className="num">{state.settings.monthlyRequiredWeeks}</span>} />
            </div>
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
            <div className="panel border-[color-mix(in_srgb,var(--bad)_30%,var(--line))] p-5">
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
