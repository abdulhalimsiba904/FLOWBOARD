import { DEFAULT_PROJECT_COLUMN_IDS } from '../types/project'
import type { ChecklistItem, Task, TaskPriority, TaskStatus } from '../types/task'

const priorities: readonly TaskPriority[] = ['low', 'medium', 'high', 'urgent']
const epoch = '1970-01-01T00:00:00.000Z'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function trimmedString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function isoDate(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return null
  try {
    return date.toISOString() === value ? value : null
  } catch {
    return null
  }
}

function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === 'string' && DEFAULT_PROJECT_COLUMN_IDS.some(id => id === value)
}

function isTaskPriority(value: unknown): value is TaskPriority {
  return typeof value === 'string' && priorities.some(priority => priority === value)
}

function normalizeChecklist(value: unknown): ChecklistItem[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item): ChecklistItem[] => {
    if (!isRecord(item)) return []
    const id = trimmedString(item.id)
    const text = trimmedString(item.text)
    if (!id || !text || typeof item.completed !== 'boolean') return []
    return [{ id, text, completed: item.completed }]
  })
}

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.flatMap(tag => {
    const normalized = trimmedString(tag)
    return normalized ? [normalized] : []
  })
}

/** Purely validates required task identity/enums and safely normalizes optional fields. */
export function normalizeTask(value: unknown): Task | null {
  if (!isRecord(value)) return null

  const id = trimmedString(value.id)
  const projectId = trimmedString(value.projectId)
  const title = trimmedString(value.title)
  if (!id || !projectId || !title || !isTaskStatus(value.status) || !isTaskPriority(value.priority)) return null

  const createdAt = isoDate(value.createdAt) ?? isoDate(value.updatedAt) ?? epoch
  const updatedAt = isoDate(value.updatedAt) ?? createdAt
  const dueDate = value.dueDate === null || value.dueDate === undefined || value.dueDate === ''
    ? null
    : isoDate(value.dueDate)
  const position = typeof value.position === 'number' && Number.isFinite(value.position) && value.position >= 0
    ? value.position
    : 0

  return {
    id,
    projectId,
    title,
    description: typeof value.description === 'string' ? value.description.trim() : '',
    status: value.status,
    priority: value.priority,
    dueDate,
    tags: normalizeTags(value.tags),
    checklist: normalizeChecklist(value.checklist),
    position,
    createdAt,
    updatedAt,
  }
}

/** Returns only valid records, with optional fields normalized and invalid records ignored. */
export function normalizeTasks(value: unknown): Task[] {
  if (!Array.isArray(value)) return []
  return value.flatMap(record => {
    const task = normalizeTask(record)
    return task ? [task] : []
  })
}
