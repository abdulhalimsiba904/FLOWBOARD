import type { Project } from '../types/project'
import type { Task, TaskPriority, TaskStatus } from '../types/task'
import { getDueDateCategory, type DueDateCategory } from './taskDates'

export type TaskSort = 'manual' | 'priority' | 'due-date' | 'created-date' | 'title'

export interface TaskFilters {
  status: TaskStatus | ''
  priority: TaskPriority | ''
  tag: string
  dueDate: DueDateCategory | ''
}

export const emptyTaskFilters: TaskFilters = { status: '', priority: '', tag: '', dueDate: '' }

const priorityRank: Record<TaskPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 }

/** Shared normalization ensures query and indexed text use the same matching rules. */
export function normalizeSearchText(value: string): string {
  return value.normalize('NFKC').trim().toLocaleLowerCase()
}

export function selectSearchResults(tasks: readonly Task[], projects: readonly Project[], query: string) {
  const normalizedQuery = normalizeSearchText(query)
  if (!normalizedQuery) return []
  const projectById = new Map(projects.map(project => [project.id, project]))

  return tasks.flatMap(task => {
    const project = projectById.get(task.projectId)
    if (!project) return []
    const statusLabel = project.columns.find(column => column.id === task.status)?.name
    if (!statusLabel) return []
    const searchable = normalizeSearchText([
      task.title,
      task.description,
      task.tags.join(' '),
      project.name,
      statusLabel,
    ].join(' '))
    return searchable.includes(normalizedQuery) ? [{ task, project, statusLabel }] : []
  }).sort((a, b) => a.project.name.localeCompare(b.project.name)
    || a.task.title.localeCompare(b.task.title)
    || a.task.id.localeCompare(b.task.id))
}

export function selectProjectTaskTags(tasks: readonly Task[]): string[] {
  const unique = new Map<string, string>()
  tasks.forEach(task => task.tags.forEach(tag => {
    const normalized = normalizeSearchText(tag)
    if (normalized && !unique.has(normalized)) unique.set(normalized, tag.trim())
  }))
  return [...unique.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, tag]) => tag)
}

export function filterProjectTasks(tasks: readonly Task[], filters: TaskFilters, now = new Date()): Task[] {
  return tasks.filter(task =>
    (!filters.status || task.status === filters.status)
    && (!filters.priority || task.priority === filters.priority)
    && (!filters.tag || task.tags.some(tag => normalizeSearchText(tag) === normalizeSearchText(filters.tag)))
    && (!filters.dueDate || getDueDateCategory(task.dueDate, now) === filters.dueDate),
  )
}

export function countActiveTaskFilters(filters: TaskFilters): number {
  return Number(Boolean(filters.status)) + Number(Boolean(filters.priority)) + Number(Boolean(filters.tag)) + Number(Boolean(filters.dueDate))
}

/** Sorts one already status-scoped group, keeping manual positions out of persistence. */
export function sortTasksForList(tasks: readonly Task[], sort: TaskSort): Task[] {
  return tasks.slice().sort((a, b) => {
    if (sort === 'manual') return a.position - b.position || a.id.localeCompare(b.id)
    if (sort === 'priority') return priorityRank[a.priority] - priorityRank[b.priority] || a.title.localeCompare(b.title) || a.id.localeCompare(b.id)
    if (sort === 'due-date') return compareOptionalDate(a.dueDate, b.dueDate) || a.title.localeCompare(b.title) || a.id.localeCompare(b.id)
    if (sort === 'created-date') return b.createdAt.localeCompare(a.createdAt) || a.title.localeCompare(b.title) || a.id.localeCompare(b.id)
    return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
      || a.createdAt.localeCompare(b.createdAt)
      || a.id.localeCompare(b.id)
  })
}

export function projectColumnsInOrder<T extends { position: number }>(columns: readonly T[]): T[] {
  return columns.slice().sort((a, b) => a.position - b.position)
}

export function isTaskStatus(value: string, columns: readonly { id: string }[]): value is TaskStatus {
  return columns.some(column => column.id === value)
}

function compareOptionalDate(a: string | null, b: string | null): number {
  if (a === b) return 0
  if (a === null) return 1
  if (b === null) return -1
  return a.localeCompare(b)
}
