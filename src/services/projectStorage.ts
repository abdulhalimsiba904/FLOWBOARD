import { DEFAULT_PROJECT_COLUMN_IDS, type Project, type ProjectColumn } from '../types/project'

export const PROJECT_STORAGE_KEY = 'flowboard:projects:v1'
const DATA_VERSION = 1

const defaultColumnNames = ['Todo', 'In Progress', 'Review', 'Done'] as const

export function createDefaultColumns(): ProjectColumn[] {
  return defaultColumnNames.map((name, position) => ({
    id: DEFAULT_PROJECT_COLUMN_IDS[position],
    name,
    position,
  }))
}

/** Static sample records keep first-run IDs and dates stable across renders and reloads. */
export const sampleProjects: Project[] = [
  {
    id: 'sample-study-planner',
    name: 'Study planner',
    description: 'Organize course reading, assignments, and exam preparation.',
    createdAt: '2026-09-01T09:00:00.000Z',
    updatedAt: '2026-09-26T14:30:00.000Z',
    favorite: true,
    columns: createDefaultColumns(),
  },
  {
    id: 'sample-portfolio-refresh',
    name: 'Portfolio refresh',
    description: 'Plan a focused update to a personal developer portfolio.',
    createdAt: '2026-09-08T10:15:00.000Z',
    updatedAt: '2026-09-24T16:00:00.000Z',
    favorite: false,
    columns: createDefaultColumns(),
  },
  {
    id: 'sample-weekly-routine',
    name: 'Weekly routine',
    description: 'Keep recurring personal and learning goals in view.',
    createdAt: '2026-09-12T08:00:00.000Z',
    updatedAt: '2026-09-25T11:45:00.000Z',
    favorite: false,
    columns: createDefaultColumns(),
  },
]

export const sampleProjectIds = new Set(sampleProjects.map(project => project.id))

interface ProjectStoreV1 {
  version: 1
  projects: Project[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const date = new Date(value)
  return Number.isFinite(date.getTime()) && date.toISOString() === value
}

function isProjectColumn(value: unknown): value is ProjectColumn {
  return isRecord(value)
    && isNonEmptyString(value.id)
    && isNonEmptyString(value.name)
    && typeof value.position === 'number'
    && Number.isInteger(value.position)
    && value.position >= 0
}

function isProject(value: unknown): value is Project {
  if (!isRecord(value)) return false
  if (!isNonEmptyString(value.id) || !isNonEmptyString(value.name)) return false
  if (typeof value.description !== 'string' || !isIsoDate(value.createdAt) || !isIsoDate(value.updatedAt)) return false
  if (typeof value.favorite !== 'boolean' || !Array.isArray(value.columns) || value.columns.length === 0) return false
  if (!value.columns.every(isProjectColumn)) return false
  const columns = value.columns as ProjectColumn[]
  return new Set(columns.map(column => column.id)).size === columns.length
    && new Set(columns.map(column => column.position)).size === columns.length
}

function getStorage(): Storage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage
  } catch {
    return undefined
  }
}

function writeStore(storage: Storage | undefined, projects: Project[]): void {
  if (!storage) return
  try {
    const data: ProjectStoreV1 = { version: DATA_VERSION, projects }
    storage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Storage can be disabled or full; callers still receive usable in-memory data.
  }
}

/** Loads saved projects, seeding stable examples only when there is no usable saved state. */
export function loadProjects(): Project[] {
  const storage = getStorage()
  if (!storage) return cloneProjects(sampleProjects)

  let raw: string | null
  try {
    raw = storage.getItem(PROJECT_STORAGE_KEY)
  } catch {
    return cloneProjects(sampleProjects)
  }

  if (raw === null) {
    const initial = cloneProjects(sampleProjects)
    writeStore(storage, initial)
    return initial
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return seedFallback(storage)
  }

  if (!isRecord(parsed) || parsed.version !== DATA_VERSION || !Array.isArray(parsed.projects)) {
    return seedFallback(storage)
  }

  const validProjects = parsed.projects.filter(isProject)
  if (parsed.projects.length > 0 && validProjects.length === 0) return seedFallback(storage)

  const uniqueProjects = validProjects.filter((project, index, projects) =>
    projects.findIndex(candidate => candidate.id === project.id) === index,
  )
  if (uniqueProjects.length !== parsed.projects.length) writeStore(storage, uniqueProjects)
  return cloneProjects(uniqueProjects)
}

/** Saves a complete project snapshot. Returns false when browser storage is unavailable. */
export function saveProjects(projects: Project[]): boolean {
  const storage = getStorage()
  if (!storage) return false
  if (!Array.isArray(projects) || !projects.every(isProject)) return false
  try {
    const data: ProjectStoreV1 = { version: DATA_VERSION, projects }
    storage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

function seedFallback(storage: Storage): Project[] {
  const fallback = cloneProjects(sampleProjects)
  writeStore(storage, fallback)
  return fallback
}

function cloneProjects(projects: Project[]): Project[] {
  return projects.map(project => ({
    ...project,
    columns: project.columns.map(column => ({ ...column })),
  }))
}
