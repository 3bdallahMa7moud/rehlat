import { createContext } from 'react'
import type { AppState, Celebration, DayRecord, Language, Participant, ParticipantRole, Theme } from '../types'

export type PinResult = { ok: true } | { ok: false; message: string }

export type AppContextValue = {
  state: AppState
  now: number
  currentParticipant: Participant | null
  activeCelebration: Celebration | null
  setLanguage: (language: Language) => void
  setTheme: (theme: Theme) => void
  signOut: () => void
  signIn: (pid: number, pin: string) => PinResult
  setPinAndSignIn: (pid: number, pin: string) => PinResult
  clearCelebration: () => void
  setReportMonth: (month: string) => void
  startDay: (pid: number) => void
  endDay: (pid: number, reason?: DayRecord['endReason']) => void
  startTask: (pid: number, taskId: number) => void
  pauseTask: (pid: number, taskId: number) => void
  finishTask: (pid: number, taskId: number, outcome: 'completed' | 'attempted') => void
  finishAllRemaining: (pid: number) => number
  reopenTask: (pid: number, taskId: number) => void
  updateNote: (pid: number, taskId: number, note: string) => void
  addParticipant: (name: string, role: ParticipantRole) => void
  bulkAddParticipants: (names: string[]) => void
  renameParticipant: (pid: number, name: string) => void
  resetPin: (pid: number) => void
  setParticipantRole: (pid: number, role: ParticipantRole) => void
  setParticipantActive: (pid: number, active: boolean) => void
  addTask: (name: string, counts: boolean) => void
  renameTask: (taskId: number, name: string) => void
  reorderTask: (taskId: number, direction: 'up' | 'down') => void
  toggleTaskCounts: (taskId: number) => void
  setTaskArchived: (taskId: number, archived: boolean) => void
  updateSettings: (settings: { dailyTarget?: number; weeklyRequiredDays?: number; monthlyRequiredWeeks?: number }) => void
  resetDemoData: () => void
  exportMock: (kind: 'excel' | 'pdf') => void
}

export const AppContext = createContext<AppContextValue | null>(null)
