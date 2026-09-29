import type { Task } from '../types/task'

export type DueDateCategory = 'overdue' | 'today' | 'upcoming' | 'no-date'

function localCalendarDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Categories compare ISO due-date days against the user's local calendar day. */
export function getDueDateCategory(dueDate: Task['dueDate'], now = new Date()): DueDateCategory {
  if (!dueDate) return 'no-date'
  const parsed = new Date(dueDate)
  if (!Number.isFinite(parsed.getTime())) return 'no-date'
  const dueDay = dueDate.slice(0, 10)
  const today = localCalendarDate(now)
  if (dueDay < today) return 'overdue'
  if (dueDay === today) return 'today'
  return 'upcoming'
}

export function formatTaskDueDate(value: string): string {
  const parsed = new Date(value)
  return Number.isFinite(parsed.getTime())
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'UTC' }).format(parsed)
    : ''
}
