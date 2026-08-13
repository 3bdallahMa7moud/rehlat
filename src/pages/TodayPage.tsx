import { useState } from 'react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { Activity, ArrowLeft, ArrowRight, CheckCircle2, Clock3, History, ListChecks, Pause, Play, RotateCcw, TimerReset, Trophy, XCircle } from 'lucide-react'
import { useApp } from '../app/useApp'
import { Badge, Button, EmptyState, Metric, Modal, PageHeader, ProgressBar } from '../components/ui'
import type { TaskEntry, TaskStatus } from '../types'
import { addDays, formatClock, formatDay, formatDuration, todayKey } from '../utils/date'
import { eventLabel } from '../utils/events'
import { dailyStreak, dayStats, leaderboard, neededForTarget, openIntervalFor, successMap, taskById, taskEntriesForDay, taskMs } from '../utils/stats'
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
  locked,
  active,
  onFinish,
}: {
  entry: TaskEntry
  locked: boolean
  active: boolean
  onFinish: (taskId: number) => void
}) {
  const { state, currentParticipant, now, startTask, pauseTask, reopenTask, updateNote } = useApp()
  const language = state.language
  const task = taskById(state, entry.taskId)
  const record = currentParticipant ? dayStats(state, currentParticipant.id, todayKey(), now).record : null
  if (!task || !currentParticipant) return null
  const running = entry.status === 'running'
  const elapsed = taskMs(record, task.id, now)
  const open = openIntervalFor(record, task.id)
  const liveElapsed = running && open ? elapsed : elapsed
  const label = taskStatusLabel(entry.status, language)

  return (
    <div className={cx('task-row', running && 'running', entry.status === 'completed' && 'completed', entry.status === 'attempted' && 'attempted')}>
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
          <span className="num">{formatDuration(liveElapsed)}</span>
          {entry.pauses ? <span>{entry.pauses} {text(language, 'إيقاف', 'pauses')}</span> : null}
          {entry.reopens ? <span>{entry.reopens} {text(language, 'إعادة فتح', 'reopens')}</span> : null}
          {entry.completedAt ? <span>{text(language, 'أُنجزت', 'Completed at')} <span className="num">{formatClock(entry.completedAt, language)}</span></span> : null}
          {entry.status === 'attempted' ? <span>{text(language, 'وقت محفوظ ولا يحتسب إنجازاً', 'Time kept, not counted as complete')}</span> : null}
        </div>
      </div>
      <div className="task-actions">
        <span className={cx('num text-lg font-black', running && 'text-[var(--accent)]')}>{formatDuration(liveElapsed)}</span>
        {!locked && active && entry.status === 'running' ? (
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
        {!locked && active && (entry.status === 'idle' || entry.status === 'paused') ? (
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
        {!locked && active && (entry.status === 'completed' || entry.status === 'attempted') ? (
          <Button size="sm" onClick={() => reopenTask(currentParticipant.id, task.id)}>
            <RotateCcw size={15} />
            {text(language, 'إعادة فتح', 'Reopen')}
          </Button>
        ) : null}
      </div>
      {record ? (
        <div className="col-span-full">
          {!locked && active ? (
            <label className="field">
              <span className="sr-only">{text(language, 'ملاحظة على المهمة', 'Task note')}</span>
              <input
                className="input bg-[var(--surface-2)]"
                value={entry.note}
                onChange={(event) => updateNote(currentParticipant.id, task.id, event.target.value)}
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
    .filter((event) => event.day === todayKey() && ['day_started', 'day_ended', 'task_completed', 'task_attempted'].includes(event.type))
    .slice(-5)
    .reverse()

  const entries = taskEntriesForDay(state, currentRecord)
  const completed = entries.filter(({ entry }) => entry.status === 'completed')
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
        title={text(language, `مساء الخير، ${currentParticipant.name}`, `Good evening, ${currentParticipant.nameEn}`)}
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
        <div className="panel-soft mb-4 flex items-start gap-3 p-4">
          <History className="mt-1 text-[var(--accent)]" size={20} />
          <div>
            <h2 className="font-black">{text(language, 'عرض تاريخي للقراءة فقط', 'Read-only historical view')}</h2>
            <p className="text-sm text-[var(--ink-2)]">{text(language, 'لا تظهر أدوات التعديل عند استعراض يوم سابق.', 'Editing controls are hidden when viewing a past day.')}</p>
          </div>
        </div>
      ) : null}

      <section className="hero-panel mb-5 p-5 md:p-6">
        <div className="grid gap-6 lg:grid-cols-[220px_1fr_auto] lg:items-center">
          <div className="grid place-items-center">
            <div
              className="grid h-40 w-40 place-items-center rounded-full border border-[var(--line)] bg-[conic-gradient(var(--accent-bright)_var(--p),var(--surface-2)_0)]"
              style={{ '--p': `${Math.min(100, stats.percent)}%` } as CSSProperties}
              role="img"
              aria-label={`${text(language, 'نسبة الإنجاز', 'Completion')} ${stats.percent.toFixed(0)}%`}
            >
              <div className="grid h-32 w-32 place-items-center rounded-full border border-[var(--line)] bg-[var(--surface)] text-center">
                <div>
                  <div className="num text-4xl font-black">{stats.percent.toFixed(0)}%</div>
                  <div className="mt-1 text-sm font-bold text-[var(--ink-3)]">{stats.done} / {stats.total}</div>
                </div>
              </div>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <Metric label={text(language, 'وقت العمل', 'Work time')} value={<span className="num">{formatDuration(stats.ms)}</span>} tone="gold" />
            <Metric label={text(language, 'المتبقي للهدف', 'Needed for target')} value={stats.pass ? <CheckCircle2 className="text-[var(--good)]" /> : <span className="num">{need}</span>} tone={stats.pass ? 'good' : 'warn'} />
            <Metric label={text(language, 'الستريك اليومي', 'Daily streak')} value={<span className="num">{streak}</span>} detail={text(language, 'التفاصيل في صفحة الستريك', 'Full detail on Streaks')} />
            <Metric label={text(language, 'هدف اليوم', 'Daily target')} value={<span className="num">{state.settings.dailyTarget}%</span>} />
          </div>
          {today ? (
            <div className="flex flex-wrap gap-2 lg:justify-end">
              {dayState === 'not_started' ? (
                <Button variant="primary" onClick={() => startDay(currentParticipant.id)}>
                  <Play size={18} />
                  {text(language, 'ابدأ يومي', 'Start my day')}
                </Button>
              ) : dayState === 'active' ? (
                <>
                  <Button variant="primary" onClick={() => endDay(currentParticipant.id, 'manual')}>
                    <XCircle size={18} />
                    {text(language, 'إنهاء اليوم', 'End day')}
                  </Button>
                  {remaining.length ? (
                    <Button onClick={() => setConfirmAll(true)}>
                      <ListChecks size={18} />
                      {text(language, 'إنهاء كل المتبقي', 'Complete remaining')}
                    </Button>
                  ) : null}
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
      </section>

      {!today ? (
        <section className="panel mb-5 p-5">
          <div className="section-title">
            <h2 className="text-xl font-black">{text(language, 'ملخص المجموعة لذلك اليوم', 'Group summary for that day')}</h2>
            <Badge>{viewedDay}</Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Metric label={text(language, 'بلغوا الهدف', 'Reached target')} value={rows.filter((row) => row.pass).length} tone="good" />
            <Metric label={text(language, 'عملوا ولم يكملوا', 'Worked below target')} value={rows.filter((row) => !row.pass && (row.ms > 0 || row.done > 0)).length} tone="warn" />
            <Metric label={text(language, 'لم يبدأوا', 'Did not start')} value={rows.filter((row) => row.ms === 0 && row.done === 0).length} />
          </div>
        </section>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <div className="grid gap-5">
          <section className="panel p-5">
            <div className="section-title">
              <div>
                <h2 className="text-xl font-black">{text(language, 'مهامي اليوم', 'My tasks')}</h2>
                <p className="text-sm text-[var(--ink-2)]">
                  {active ? text(language, 'يمكن تشغيل أكثر من مهمة في نفس الوقت؛ لكل مهمة مؤقتها المستقل.', 'Multiple tasks can run at once; every task has its own timer.') : text(language, 'ابدأ اليوم لتفعيل أزرار المهام.', 'Start the day to enable task actions.')}
                </p>
              </div>
              <Badge tone={stats.pass ? 'good' : 'gold'}>{stats.done} / {stats.total}</Badge>
            </div>
            <div className="grid gap-3">
              {entries.length ? entries.map(({ entry }) => (
                <TaskRow key={entry.taskId} entry={entry} locked={locked} active={active} onFinish={setFinishingTask} />
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
              <div className="grid gap-4 md:grid-cols-2">
                <div className="panel-soft p-4">
                  <h3 className="mb-3 font-black text-[var(--good)]">{text(language, 'المنجز', 'Completed')}</h3>
                  {completed.length ? <ul className="grid gap-2 text-sm">{completed.map(({ taskId }) => <li key={taskId}>• {language === 'ar' ? taskById(state, taskId)?.name : taskById(state, taskId)?.nameEn}</li>)}</ul> : <p className="text-sm text-[var(--ink-3)]">—</p>}
                </div>
                <div className="panel-soft p-4">
                  <h3 className="mb-3 font-black text-[var(--ink-2)]">{text(language, 'المتبقي', 'Remaining')}</h3>
                  {remaining.length ? <ul className="grid gap-2 text-sm">{remaining.map(({ taskId, entry }) => <li key={taskId}>• {language === 'ar' ? taskById(state, taskId)?.name : taskById(state, taskId)?.nameEn} {entry.status === 'attempted' ? <Badge tone="warn">{text(language, 'دون إنجاز', 'Attempted')}</Badge> : null}</li>)}</ul> : <p className="text-sm text-[var(--ink-3)]">—</p>}
                </div>
              </div>
            </section>
          ) : null}
        </div>

        <aside className="grid content-start gap-5">
          <section className="panel p-5">
            <div className="section-title">
              <h2 className="text-lg font-black">{text(language, 'لمحة المجموعة', 'Community preview')}</h2>
              <Link className="btn ghost sm" to="/app/community">{text(language, 'عرض الكل', 'View all')}</Link>
            </div>
            <div className="grid gap-3">
              {rows.slice(0, 4).map((row, index) => (
                <div key={row.participant.id} className={cx('rounded-lg border border-[var(--line)] p-3', row.participant.id === currentParticipant.id && 'bg-[var(--accent-bg)]')}>
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
              <Link className="text-sm font-black text-[var(--accent)]" to="/app/activity">{text(language, 'السجل الكامل', 'Full log')}</Link>
            </div>
            <div className="grid gap-2">
              {recentEvents.length ? recentEvents.map((event) => {
                const participant = state.participants.find((person) => person.id === event.pid)
                const task = event.taskId ? taskById(state, event.taskId) : null
                return (
                  <div key={event.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-lg bg-[var(--surface-2)] p-3 text-sm">
                    <span className="dot live text-[var(--good)]" />
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
