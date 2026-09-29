import type { DefaultProjectColumnId } from './project'

/** Task status reuses the stable IDs of a project's workflow columns. */
export type TaskStatus = DefaultProjectColumnId
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TaskId = string
export type ChecklistItemId = string

export interface ChecklistItem {
  id: ChecklistItemId
  text: string
  completed: boolean
}

export interface Task {
  id: TaskId
  projectId: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  /** Optional due date stored as a UTC ISO 8601 date-time string. */
  dueDate: string | null
  /** Tag values are trimmed and empty strings are omitted. */
  tags: string[]
  checklist: ChecklistItem[]
  /** Numeric order within this task's project and status column. */
  position: number
  /** UTC ISO 8601 strings, matching the project date representation. */
  createdAt: string
  updatedAt: string
}
