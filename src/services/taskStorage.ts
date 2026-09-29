import { sampleProjectIds } from './projectStorage'
import type { Project } from '../types/project'
import type { Task } from '../types/task'
import { normalizeTask, normalizeTasks } from '../utils/taskValidation'

export const TASK_STORAGE_KEY = 'flowboard:tasks:v1'
const DATA_VERSION = 1

interface TaskStoreV1 {
  version: 1
  tasks: Task[]
}

/** Demo-only seed records use stable IDs and timestamps, and are filtered to available sample projects. */
export const sampleTasks: Task[] = [
  {
    id: 'demo-study-outline-readings',
    projectId: 'sample-study-planner',
    title: 'Outline week five readings',
    description: 'Capture the main ideas from the assigned chapters.',
    status: 'column-1',
    priority: 'medium',
    dueDate: '2026-10-02T00:00:00.000Z',
    tags: ['reading', 'coursework'],
    checklist: [
      { id: 'demo-reading-chapter-1', text: 'Review chapter one', completed: false },
      { id: 'demo-reading-notes', text: 'Write a short summary', completed: false },
    ],
    position: 0,
    createdAt: '2026-09-25T09:00:00.000Z',
    updatedAt: '2026-09-27T12:00:00.000Z',
  },
  {
    id: 'demo-study-assignment-draft',
    projectId: 'sample-study-planner',
    title: 'Draft the research assignment',
    description: 'Prepare an outline and first pass for the course paper.',
    status: 'column-2',
    priority: 'high',
    dueDate: '2026-10-05T00:00:00.000Z',
    tags: ['writing', 'coursework'],
    checklist: [{ id: 'demo-assignment-sources', text: 'Collect two source references', completed: true }],
    position: 0,
    createdAt: '2026-09-20T10:00:00.000Z',
    updatedAt: '2026-09-28T15:00:00.000Z',
  },
  {
    id: 'demo-portfolio-review-copy',
    projectId: 'sample-portfolio-refresh',
    title: 'Review the About page copy',
    description: 'Check the introduction for clarity and a consistent voice.',
    status: 'column-3',
    priority: 'low',
    dueDate: null,
    tags: ['portfolio', 'writing'],
    checklist: [],
    position: 0,
    createdAt: '2026-09-22T08:30:00.000Z',
    updatedAt: '2026-09-26T11:30:00.000Z',
  },
  {
    id: 'demo-routine-learning-blocks',
    projectId: 'sample-weekly-routine',
    title: 'Schedule focused learning blocks',
    description: 'Set aside a few uninterrupted sessions for the week.',
    status: 'column-4',
    priority: 'medium',
    dueDate: null,
    tags: ['learning', 'weekly'],
    checklist: [],
    position: 0,
    createdAt: '2026-09-18T07:00:00.000Z',
    updatedAt: '2026-09-25T07:15:00.000Z',
  },
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getStorage(): Storage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage
  } catch {
    return undefined
  }
}

function cloneTasks(tasks: Task[]): Task[] {
  return tasks.map(task => ({
    ...task,
    tags: [...task.tags],
    checklist: task.checklist.map(item => ({ ...item })),
  }))
}

function availableDemoTasks(projects: readonly Project[]): Task[] {
  const projectIds = new Set(projects.map(project => project.id))
  return cloneTasks(sampleTasks.filter(task => sampleProjectIds.has(task.projectId) && projectIds.has(task.projectId)))
}

function writeStore(storage: Storage | undefined, tasks: Task[]): boolean {
  if (!storage) return false
  try {
    const data: TaskStoreV1 = { version: DATA_VERSION, tasks }
    storage.setItem(TASK_STORAGE_KEY, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

/** Loads tasks once, seeding available demo rows only when no valid saved value exists. */
export function loadTasks(projects: readonly Project[]): Task[] {
  const storage = getStorage()
  const fallback = availableDemoTasks(projects)
  if (!storage) return fallback

  let raw: string | null
  try {
    raw = storage.getItem(TASK_STORAGE_KEY)
  } catch {
    return fallback
  }

  if (raw === null) {
    writeStore(storage, fallback)
    return fallback
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return seedFallback(storage, fallback)
  }
  if (!isRecord(parsed) || parsed.version !== DATA_VERSION || !Array.isArray(parsed.tasks)) {
    return seedFallback(storage, fallback)
  }

  const normalized = normalizeTasks(parsed.tasks)
  if (parsed.tasks.length > 0 && normalized.length === 0) return seedFallback(storage, fallback)

  const validProjectIds = new Set(projects.map(project => project.id))
  const seenIds = new Set<string>()
  const availableTasks = normalized.filter(task => {
    if (!validProjectIds.has(task.projectId) || seenIds.has(task.id)) return false
    seenIds.add(task.id)
    return true
  })
  if (JSON.stringify(parsed.tasks) !== JSON.stringify(availableTasks)) writeStore(storage, availableTasks)
  return cloneTasks(availableTasks)
}

/** Validates and saves a complete task snapshot; empty arrays are persisted as intentional data. */
export function saveTasks(tasks: Task[]): boolean {
  const storage = getStorage()
  if (!storage || !Array.isArray(tasks)) return false
  const normalized = tasks.map(task => normalizeTask(task))
  if (normalized.some(task => task === null)) return false
  const validTasks = normalized as Task[]
  if (new Set(validTasks.map(task => task.id)).size !== validTasks.length) return false
  return writeStore(storage, cloneTasks(validTasks))
}

function seedFallback(storage: Storage, fallback: Task[]): Task[] {
  writeStore(storage, fallback)
  return fallback
}
