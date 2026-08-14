import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, ArrowLeft, ArrowRight, CheckCircle2, Clock3, History, ListChecks, MessageSquare, Pause, Play, RotateCcw, TimerReset, Trophy, XCircle } from 'lucide-react'
import { useApp } from '../app/useApp'
import { Badge, Button, EmptyState, KpiBand, Modal, PageHeader, ProgressBar } from '../components/ui'
import type { DayRecord, TaskEntry, TaskStatus } from '../types'
import { addDays, formatClock, formatDay, formatDuration, todayKey } from '../utils/date'
import { eventLabel } from '../utils/events'
import { dailyStreak, dayStats, leaderboard, neededForTarget, successMap, taskById, taskEntriesForDay, taskMs } from '../utils/stats'
import { taskStatusLabel, text } from '../utils/text'
import { cx } from '../utils/cx'

function statusTone(status: TaskStatus) {
  if (status === 'completed') return 'good'
  if (status === 'attempted') return 'warn'
  if (status === 'running') return 'gold'
  return 'neutral'
}

function TaskRow({
  entry,
  record,
  locked,
  active,
  onFinish,
}: {
  entry: TaskEntry
  record: DayRecord | null
  locked: boolean
  active: boolean
  onFinish: (taskId: number) => void
}) {
  const { state, currentParticipant, now, startTask, pauseTask, reopenTask, updateNote } = useApp()
  const [noteOpen, setNoteOpen] = useState(false)
  const language = state.language
  const task = taskById(state, entry.taskId)
  if (!task || !currentParticipant) return null
  const running = entry.status === 'running'
  const paused = entry.status === 'paused'
  const idle = entry.status === 'idle'
  const elapsed = taskMs(record, task.id, now)
  const label = taskStatusLabel(entry.status, language)
  const canEdit = !locked && active

  return (
    <div className={cx('task-row', running && 'running', paused && 'paused', idle && 'idle', entry.status === 'completed' && 'completed', entry.status === 'attempted' && 'attempted')}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="min-w-0 text-base font-black text-[var(--ink)]">{language === 'ar' ? task.name : task.nameEn}</h3>
          <Badge tone={statusTone(entry.status)}>
            {running ? <span className="dot live" /> : null}
            {label}
          </Badge>
          {!entry.counts ? <Badge>{text(language, 'خارج النسبة', 'Not counted')}</Badge> : null}
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-[var(--ink-3)]">
          {!idle || elapsed > 0 ? <span className="num">{formatDuration(elapsed)}</span> : <span>{text(language, 'لم يبدأ بعد', 'Not started yet')}</span>}
          {entry.pauses ? <span>{entry.pauses} {text(language, 'إيقاف', 'pauses')}</span> : null}
          {entry.reopens ? <span>{entry.reopens} {text(language, 'إعادة فتح', 'reopens')}</span> : null}
          {entry.completedAt ? <span>{text(language, 'أُنجزت', 'Completed at')} <span className="num">{formatClock(entry.completedAt, language)}</span></span> : null}
          {entry.status === 'attempted' ? <span>{text(language, 'وقت محفوظ ولا يحتسب إنجازاً', 'Time kept, not counted as complete')}</span> : null}
        </div>
      </div>
      <div className="task-actions">
        {!idle || elapsed > 0 ? <span className="task-clock num font-black">{formatDuration(elapsed)}</span> : null}
        {canEdit && entry.status === 'running' ? (
          <>
            <Button size="sm" onClick={() => pauseTask(currentParticipant.id, task.id)}>
              <Pause size={15} />
              {text(language, 'إيقاف', 'Pause')}
            </Button>
            <Button size="sm" variant="primary" onClick={() => onFinish(task.id)}>
              <CheckCircle2 size={15} />
              {text(language, 'إنهاء', 'Finish')}
            </Button>
          </>
        ) : null}
        {canEdit && (entry.status === 'idle' || entry.status === 'paused') ? (
          <>
            <Button size="sm" variant="primary" onClick={() => startTask(currentParticipant.id, task.id)}>
              <Play size={15} />
              {entry.status === 'paused' ? text(language, 'استئناف', 'Resume') : text(language, 'ابدأ', 'Start')}
            </Button>
            {entry.status === 'paused' ? (
              <Button size="sm" onClick={() => onFinish(task.id)}>
                {text(language, 'إنهاء', 'Finish')}
              </Button>
            ) : null}
          </>
        ) : null}
        {canEdit && (entry.status === 'completed' || entry.status === 'attempted') ? (
          <Button size="sm" onClick={() => reopenTask(currentParticipant.id, task.id)}>
            <RotateCcw size={15} />
            {text(language, 'إعادة فتح', 'Reopen')}
          </Button>
        ) : null}
        {canEdit && !noteOpen && !entry.note ? (
          <Button size="sm" variant="ghost" onClick={() => setNoteOpen(true)}>
            <MessageSquare size={15} />
            {text(language, 'ملاحظة', 'Note')}
          </Button>
        ) : null}
      </div>
      {record ? (
        <div className="col-span-full">
          {canEdit && (noteOpen || entry.note) ? (
            <label className="field">
              <span className="sr-only">{text(language, 'ملاحظة على المهمة', 'Task note')}</span>
              <input
                className="input bg-[var(--surface-2)]"
                value={entry.note}
                onChange={(event) => updateNote(currentParticipant.id, task.id, event.target.value)}
                onBlur={() => !entry.note && setNoteOpen(false)}
                placeholder={text(language, 'اكتب ملاحظة قصيرة على هذه المهمة...', 'Write a short note on this task...')}
              />
            </label>
          ) : entry.note ? (
            <p className="rounded-lg bg-[var(--surface-2)] p-3 text-sm text-[var(--ink-2)]">{entry.note}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export function TodayPage() {
  const { state, now, currentParticipant, startDay, endDay, finishTask, finishAllRemaining, clearCelebration, activeCelebration } = useApp()
  const [dayOffset, setDayOffset] = useState(0)
  const [finishingTask, setFinishingTask] = useState<number | null>(null)
  const [confirmAll, setConfirmAll] = useState(false)
  const language = state.language
  if (!currentParticipant) return null

  const viewedDay = addDays(todayKey(), dayOffset)
  const today = dayOffset === 0
  const stats = dayStats(state, currentParticipant.id, viewedDay, now)
  const currentRecord = stats.record
  const dayState = currentRecord?.state ?? 'not_started'
  const map = successMap(state, currentParticipant.id, now)
  const streak = dailyStreak(map, viewedDay)
  const need = neededForTarget(stats.done, stats.total, state.settings.dailyTarget)
  const rows = leaderboard(state, viewedDay, now)
  const recentEvents = state.events
    .filter((event) => event.day === viewedDay && ['day_started', 'day_ended', 'task_completed', 'task_attempted'].includes(event.type))
    .slice(-5)
    .reverse()

  const entries = taskEntriesForDay(state, currentRecord)
  const completed = entries.filter(({ entry }) => entry.status === 'completed')
  const attempted = entries.filter(({ entry }) => entry.status === 'attempted')
  const remaining = entries.filter(({ entry }) => entry.status !== 'completed')
  const locked = !today || dayState !== 'active'
  const active = today && dayState === 'active'

  const pageDescription = text(
    language,
    'هذه الصفحة مخصصة للتنفيذ اليومي فقط: ما المطلوب الآن، وما الخطوة التالية؟',
    'This page is focused on daily execution: what is needed now, and what should happen next?',
  )

  const previousIcon = language === 'ar' ? <ArrowRight size={16} /> : <ArrowLeft size={16} />
  const nextIcon = language === 'ar' ? <ArrowLeft size={16} /> : <ArrowRight size={16} />

  return (
    <>
      <PageHeader
        eyebrow={formatDay(viewedDay, language, true)}
        title={text(language, `مرحباً، ${currentParticipant.name}`, `Hello, ${currentParticipant.nameEn}`)}
        description={pageDescription}
        actions={(
          <>
            <Button size="sm" onClick={() => setDayOffset((value) => value - 1)}>
              {previousIcon}
              {text(language, 'اليوم السابق', 'Previous day')}
            </Button>
            <Button size="sm" disabled={dayOffset >= 0} onClick={() => setDayOffset((value) => Math.min(0, value + 1))}>
              {text(language, 'اليوم التالي', 'Next day')}
              {nextIcon}
            </Button>
            {!today ? <Button size="sm" variant="primary" onClick={() => setDayOffset(0)}>{text(language, 'العودة لليوم', 'Back to today')}</Button> : null}
          </>
        )}
      />

      {!today ? (
        <div className="history-banner mb-4">
          <History className="mt-1 text-[var(--accent)]" size={20} />
          <div className="min-w-0">
            <h2 className="font-black">{text(language, 'عرض تاريخي للقراءة فقط', 'Read-only historical view')}</h2>
            <p className="text-sm text-[var(--ink-2)]">
              {text(
                language,
                `أنت تستعرض ${formatDay(viewedDay, language, true)}. التعديل غير متاح لهذا اليوم.`,
                `You are viewing ${formatDay(viewedDay, language, true)}. Editing is unavailable for this day.`,
              )}
            </p>
          </div>
          <Badge>{viewedDay}</Badge>
        </div>
      ) : null}

      <section className="hero-panel mb-5 p-5 md:p-6">
        <div className="grid gap-5">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div className="min-w-0">
              <p className="eyebrow">{text(language, 'تقدمك اليوم', 'Today progress')}</p>
              <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="num text-5xl font-black leading-none text-[var(--ink)]">{stats.percent.toFixed(0)}%</div>
                  <div className="mt-2 text-base font-black text-[var(--ink-2)]">{stats.done} / {stats.total} {text(language, 'مهام', 'tasks')}</div>
                </div>
                <div className={cx('state-text', stats.pass ? 'good' : need <= 1 ? 'gold' : 'warn')}>
                  {stats.pass ? <CheckCircle2 size={18} /> : <Clock3 size={18} />}
                  {stats.pass
                    ? text(language, 'وصلت إلى هدف اليوم', 'Daily target reached')
                    : text(language, `تحتاج ${need} للوصول للهدف`, `${need} needed for target`)}
                </div>
              </div>
              <div className="mt-5">
                <ProgressBar value={stats.percent} good={stats.pass} label={text(language, 'نسبة إنجاز اليوم', 'Today completion')} />
              </div>
            </div>
            {today ? (
              <div className="flex flex-wrap gap-2 lg:max-w-64 lg:justify-end">
                {dayState === 'not_started' ? (
                  <Button variant="primary" onClick={() => startDay(currentParticipant.id)}>
                    <Play size={18} />
                    {text(language, 'ابدأ يومي', 'Start my day')}
                  </Button>
                ) : dayState === 'active' ? (
                  <>
                    {remaining.length ? (
                      <Button variant="primary" onClick={() => setConfirmAll(true)}>
                        <ListChecks size={18} />
                        {text(language, 'إنهاء المتبقي', 'Complete remaining')}
                      </Button>
                    ) : null}
                    <Button variant={remaining.length ? 'secondary' : 'primary'} onClick={() => endDay(currentParticipant.id, 'manual')}>
                      <XCircle size={18} />
                      {text(language, 'إنهاء اليوم', 'End day')}
                    </Button>
                  </>
                ) : (
                  <Button variant="primary" onClick={() => startDay(currentParticipant.id)}>
                    <TimerReset size={18} />
                    {text(language, 'استئناف اليوم', 'Resume day')}
                  </Button>
                )}
              </div>
            ) : null}
          </div>
          <KpiBand
            flush
            items={[
              { label: text(language, 'وقت العمل', 'Work time'), value: <span className="num">{formatDuration(stats.ms)}</span>, tone: 'gold' },
              { label: text(language, 'السلسلة الحالية', 'Current streak'), value: <span className="num">{streak}</span>, detail: text(language, 'يوم', 'days') },
              { label: text(language, 'المتبقي للهدف', 'Needed for target'), value: stats.pass ? <CheckCircle2 size={26} /> : <span className="num">{need}</span>, tone: stats.pass ? 'good' : 'warn' },
              { label: text(language, 'هدف اليوم', 'Daily target'), value: <span className="num">{state.settings.dailyTarget}%</span> },
            ]}
          />
        </div>
      </section>

      {!today ? (
        <section className="panel mb-5 p-5">
          <div className="section-title">
            <h2 className="text-xl font-black">{text(language, 'ملخص المجموعة لذلك اليوم', 'Group summary for that day')}</h2>
            <Badge>{viewedDay}</Badge>
          </div>
          <KpiBand
            items={[
              { label: text(language, 'بلغوا الهدف', 'Reached target'), value: rows.filter((row) => row.pass).length, tone: 'good' },
              { label: text(language, 'عملوا ولم يكملوا', 'Worked below target'), value: rows.filter((row) => !row.pass && (row.ms > 0 || row.done > 0)).length, tone: 'warn' },
              { label: text(language, 'لم يبدأوا', 'Did not start'), value: rows.filter((row) => row.ms === 0 && row.done === 0).length },
            ]}
          />
        </section>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <div className="grid gap-5">
          <section className="panel p-5">
            <div className="section-title">
              <div>
                <h2 className="text-xl font-black">{text(language, 'مهامي اليوم', 'My tasks')}</h2>
                <p className="text-sm text-[var(--ink-2)]">
                  {active
                    ? text(language, 'يمكن تشغيل أكثر من مهمة في نفس الوقت؛ لكل مهمة مؤقتها المستقل.', 'Multiple tasks can run at once; every task has its own timer.')
                    : today
                      ? text(language, 'ابدأ اليوم لتفعيل أزرار المهام.', 'Start the day to enable task actions.')
                      : text(language, 'سجل اليوم المحدد ظاهر للقراءة فقط.', 'The selected day history is read-only.')}
                </p>
              </div>
              <Badge tone={stats.pass ? 'good' : 'gold'}>{stats.done} / {stats.total}</Badge>
            </div>
            <div className="grid gap-3">
              {entries.length ? entries.map(({ entry }) => (
                <TaskRow key={entry.taskId} entry={entry} record={currentRecord} locked={locked} active={active} onFinish={setFinishingTask} />
              )) : (
                <EmptyState
                  icon={<ListChecks size={28} />}
                  title={text(language, 'لا توجد مهام', 'No tasks')}
                  body={text(language, 'يمكن للمشرف إضافة مهام جديدة من صفحة الإدارة.', 'An admin can add tasks from the Admin page.')}
                />
              )}
            </div>
          </section>

          {currentRecord ? (
            <section className="panel p-5">
              <div className="section-title">
                <h2 className="text-xl font-black">{text(language, 'تفصيل الإنجاز', 'Completion breakdown')}</h2>
                <Badge>{completed.length} / {entries.length}</Badge>
              </div>
              <div className="breakdown-strip">
                <div className="breakdown-item">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h3 className="font-black text-[var(--good)]">{text(language, 'المنجز', 'Completed')}</h3>
                    <span className="num text-sm font-black text-[var(--good)]">{completed.length}</span>
                  </div>
                  {completed.length ? <ul className="grid gap-1 text-sm text-[var(--ink-2)]">{completed.map(({ taskId }) => <li key={taskId}>{language === 'ar' ? taskById(state, taskId)?.name : taskById(state, taskId)?.nameEn}</li>)}</ul> : <p className="text-sm text-[var(--ink-3)]">—</p>}
                </div>
                <div className="breakdown-item">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h3 className="font-black text-[var(--warn)]">{text(language, 'المحاولات', 'Attempted')}</h3>
                    <span className="num text-sm font-black text-[var(--warn)]">{attempted.length}</span>
                  </div>
                  {attempted.length ? <ul className="grid gap-1 text-sm text-[var(--ink-2)]">{attempted.map(({ taskId }) => <li key={taskId}>{language === 'ar' ? taskById(state, taskId)?.name : taskById(state, taskId)?.nameEn}</li>)}</ul> : <p className="text-sm text-[var(--ink-3)]">—</p>}
                </div>
                <div className="breakdown-item">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h3 className="font-black text-[var(--ink-2)]">{text(language, 'المتبقي', 'Remaining')}</h3>
                    <span className="num text-sm font-black text-[var(--ink-3)]">{remaining.length}</span>
                  </div>
                  {remaining.length ? <ul className="grid gap-1 text-sm text-[var(--ink-2)]">{remaining.map(({ taskId }) => <li key={taskId}>{language === 'ar' ? taskById(state, taskId)?.name : taskById(state, taskId)?.nameEn}</li>)}</ul> : <p className="text-sm text-[var(--ink-3)]">—</p>}
                </div>
              </div>
            </section>
          ) : null}
        </div>

        <aside className="grid content-start gap-5">
          <section className="panel p-5">
            <div className="section-title">
              <h2 className="text-lg font-black">{text(language, 'لمحة المجموعة', 'Community preview')}</h2>
              <Link className="btn ghost sm" to="/app/community">{text(language, 'عرض المجموعة', 'View community')}</Link>
            </div>
            <div className="list-panel">
              {rows.slice(0, 3).map((row, index) => (
                <div key={row.participant.id} className={cx('list-row', row.participant.id === currentParticipant.id && 'bg-[var(--accent-bg)]')}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 font-black">{index + 1}. {language === 'ar' ? row.participant.name : row.participant.nameEn}</div>
                    <div className="num font-black">{row.percent.toFixed(0)}%</div>
                  </div>
                  <div className="mt-2"><ProgressBar value={row.percent} good={row.pass} /></div>
                </div>
              ))}
            </div>
          </section>

          <section className="panel p-5">
            <div className="section-title">
              <h2 className="text-lg font-black">{text(language, 'نشاط مباشر', 'Live activity')}</h2>
              <Link className="btn ghost sm" to="/app/activity">{text(language, 'عرض سجل الأحداث', 'View event log')}</Link>
            </div>
            <div className="timeline-list">
              {recentEvents.length ? recentEvents.map((event) => {
                const participant = state.participants.find((person) => person.id === event.pid)
                const task = event.taskId ? taskById(state, event.taskId) : null
                return (
                  <div key={event.id} className="timeline-item text-sm">
                    <span className="timeline-dot text-[var(--good)]" />
                    <span className="min-w-0">
                      <strong>{participant ? (language === 'ar' ? participant.name : participant.nameEn) : '—'}</strong> {eventLabel(event.type, language)}
                      {task ? <span className="block truncate text-xs text-[var(--ink-3)]">{language === 'ar' ? task.name : task.nameEn}</span> : null}
                    </span>
                    <span className="num text-xs text-[var(--ink-3)]">{formatClock(event.at, language)}</span>
                  </div>
                )
              }) : (
                <EmptyState
                  icon={<Activity size={24} />}
                  title={text(language, 'لا يوجد نشاط اليوم', 'No activity today')}
                  body={text(language, 'سيظهر هنا آخر ما يحدث بعد بدء الأيام أو إنهاء المهام.', 'Recent events appear here after days start or tasks are finished.')}
                />
              )}
            </div>
          </section>
        </aside>
      </div>

      <Modal open={finishingTask != null} onClose={() => setFinishingTask(null)} title={text(language, 'كيف انتهت المهمة؟', 'How did this task end?')}>
        <div className="grid gap-3">
          <Button variant="primary" className="justify-start" onClick={() => {
            if (finishingTask != null) finishTask(currentParticipant.id, finishingTask, 'completed')
            setFinishingTask(null)
          }}>
            <CheckCircle2 size={18} />
            <span>
              <strong className="block">{text(language, 'أنجزتها', 'I completed it')}</strong>
              <span className="text-sm font-medium opacity-80">{text(language, 'تُحتسب ضمن نسبة اليوم.', 'Counts toward today’s percentage.')}</span>
            </span>
          </Button>
          <Button className="justify-start" onClick={() => {
            if (finishingTask != null) finishTask(currentParticipant.id, finishingTask, 'attempted')
            setFinishingTask(null)
          }}>
            <Clock3 size={18} />
            <span>
              <strong className="block">{text(language, 'أنهيتها دون إنجاز', 'Finished without completion')}</strong>
              <span className="text-sm font-medium text-[var(--ink-3)]">{text(language, 'يحفظ الوقت ولا يحتسبها منجزة.', 'Keeps time but does not count as complete.')}</span>
            </span>
          </Button>
        </div>
      </Modal>

      <Modal open={confirmAll} onClose={() => setConfirmAll(false)} title={text(language, 'إنهاء كل المتبقي؟', 'Complete all remaining?')} description={text(language, 'سيتم احتساب كل المهام المتبقية كمنجزة في هذا اليوم.', 'All remaining tasks will be marked completed for today.')}>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmAll(false)}>{text(language, 'إلغاء', 'Cancel')}</Button>
          <Button variant="primary" onClick={() => { finishAllRemaining(currentParticipant.id); setConfirmAll(false) }}>{text(language, 'تأكيد', 'Confirm')}</Button>
        </div>
      </Modal>

      <Modal open={!!activeCelebration} onClose={clearCelebration} title={activeCelebration?.title ?? ''}>
        <div className="celebration rounded-lg p-5 text-center">
          <Trophy className="mx-auto mb-3 text-[var(--accent)]" size={42} />
          <p className="text-base font-bold text-[var(--ink-2)]">{activeCelebration?.body}</p>
          <Button variant="primary" className="mt-5" onClick={clearCelebration}>{text(language, 'تمام', 'Nice')}</Button>
        </div>
      </Modal>
    </>
  )
}
