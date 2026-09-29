/** IDs are stable strings (seed projects use slugs; future projects may use UUIDs). */
export type ProjectId = string
/** Dates are UTC ISO 8601 strings, for example `2026-09-29T00:00:00.000Z`. */
export type ProjectDate = string

/** Stable V1 IDs used by default columns and task statuses. */
export const DEFAULT_PROJECT_COLUMN_IDS = ['column-1', 'column-2', 'column-3', 'column-4'] as const
export type DefaultProjectColumnId = typeof DEFAULT_PROJECT_COLUMN_IDS[number]
export type ProjectColumnId = string

export interface ProjectColumn {
  id: ProjectColumnId
  name: string
  position: number
}

export interface Project {
  id: ProjectId
  name: string
  description: string
  createdAt: ProjectDate
  updatedAt: ProjectDate
  favorite: boolean
  columns: ProjectColumn[]
}
