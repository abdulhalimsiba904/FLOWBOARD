import { useCallback, useMemo, useState } from 'react'
import type { Project } from '../types/project'
import type { Task, TaskPriority, TaskStatus } from '../types/task'
import { loadTasks, saveTasks as saveTaskSnapshot } from '../services/taskStorage'

export interface TaskDraft {
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  dueDate: string | null
  tags: string[]
}

function newId(prefix: string): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}-${crypto.randomUUID()}`
  } catch {
    // Fall back to a timestamp plus random suffix in restricted browser contexts.
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`
}

function normalizeGroupPositions(group: Task[], status: TaskStatus, updatedAt: string): Task[] {
  return group.map((task, position) => task.status === status && task.position === position
    ? task
    : { ...task, status, position, updatedAt })
}

function replaceTaskRecords(tasks: Task[], replacements: Task[]): Task[] {
  const replacementById = new Map(replacements.map(task => [task.id, task]))
  return tasks.map(task => replacementById.get(task.id) ?? task)
}

/** Loads once for the supplied projects; task changes persist only through explicit methods. */
export function useTasks(projects: readonly Project[]) {
  const [initialTasks] = useState<Task[]>(() => loadTasks(projects))
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const projectMap = useMemo(() => new Map(projects.map(project => [project.id, project])), [projects])

  const saveTasks = useCallback((nextTasks: Task[]): boolean => {
    const ids = new Set<string>()
    // If a project was deleted during this session, keep its orphan tasks out of future snapshots.
    const availableTasks = nextTasks.filter(task => projectMap.has(task.projectId))
    const valid = availableTasks.every(task => {
      const project = projectMap.get(task.projectId)
      if (!project || !project.columns.some(column => column.id === task.status) || ids.has(task.id)) return false
      ids.add(task.id)
      return true
    })
    if (!valid) return false
    const saved = saveTaskSnapshot(availableTasks)
    setTasks(availableTasks)
    return saved
  }, [projectMap])

  const createTask = useCallback((projectId: string, draft: TaskDraft) => {
    const project = projectMap.get(projectId)
    if (!project || !project.columns.some(column => column.id === draft.status)) return { task: null, persisted: false }

    const now = new Date().toISOString()
    const groupTasks = tasks.filter(task => task.projectId === projectId && task.status === draft.status).slice().sort((a, b) => a.position - b.position)
    const task: Task = {
      ...draft,
      id: newId('task'),
      projectId,
      title: draft.title.trim(),
      description: draft.description.trim(),
      tags: [...draft.tags],
      checklist: [],
      position: groupTasks.length,
      createdAt: now,
      updatedAt: now,
    }
    const nowForOrder = new Date().toISOString()
    const normalizedGroup = normalizeGroupPositions([...groupTasks, task], draft.status, nowForOrder)
    const persisted = saveTasks([...replaceTaskRecords(tasks, normalizedGroup), task])
    return { task, persisted }
  }, [projectMap, saveTasks, tasks])

  const updateTask = useCallback((taskId: string, projectId: string, draft: TaskDraft) => {
    const existing = tasks.find(task => task.id === taskId)
    const project = existing ? projectMap.get(existing.projectId) : undefined
    if (!existing || existing.projectId !== projectId || !project || !project.columns.some(column => column.id === draft.status)) return { task: null, persisted: false }

    const groupChanged = existing.status !== draft.status
    const targetGroup = tasks.filter(task => task.projectId === projectId && task.status === draft.status && task.id !== taskId).slice().sort((a, b) => a.position - b.position)
    const nextPosition = groupChanged ? targetGroup.length : existing.position
    const updated: Task = {
      ...existing,
      ...draft,
      id: existing.id,
      projectId: existing.projectId,
      createdAt: existing.createdAt,
      checklist: existing.checklist,
      title: draft.title.trim(),
      description: draft.description.trim(),
      tags: [...draft.tags],
      position: nextPosition,
      updatedAt: new Date().toISOString(),
    }
    const affectedGroups = groupChanged
      ? [
        ...normalizeGroupPositions(tasks.filter(task => task.projectId === projectId && task.status === existing.status && task.id !== taskId).slice().sort((a, b) => a.position - b.position), existing.status, updated.updatedAt),
        ...normalizeGroupPositions([...targetGroup, updated], draft.status, updated.updatedAt),
      ]
      : normalizeGroupPositions(tasks.filter(task => task.projectId === projectId && task.status === draft.status).map(task => task.id === taskId ? updated : task).sort((a, b) => a.position - b.position), draft.status, updated.updatedAt)
    const persisted = saveTasks(replaceTaskRecords(tasks, affectedGroups))
    return { task: updated, persisted }
  }, [projectMap, saveTasks, tasks])

  const updateChecklist = useCallback((taskId: string, projectId: string, checklist: Task['checklist']) => {
    const existing = tasks.find(task => task.id === taskId)
    if (!existing || existing.projectId !== projectId) return { updated: false, persisted: false }
    const ids = new Set<string>()
    const valid = checklist.every(item => {
      if (!item.id.trim() || !item.text.trim() || ids.has(item.id)) return false
      ids.add(item.id)
      return typeof item.completed === 'boolean'
    })
    if (!valid) return { updated: false, persisted: false }
    const updated = { ...existing, checklist: checklist.map(item => ({ ...item, text: item.text.trim() })), updatedAt: new Date().toISOString() }
    const persisted = saveTasks(tasks.map(task => task.id === taskId ? updated : task))
    return { updated: true, persisted }
  }, [saveTasks, tasks])

  const deleteTask = useCallback((taskId: string, projectId: string) => {
    const existing = tasks.find(task => task.id === taskId)
    if (!existing || existing.projectId !== projectId) return { deleted: false, persisted: false }
    const remainingGroup = tasks.filter(task => task.projectId === projectId && task.status === existing.status && task.id !== taskId).slice().sort((a, b) => a.position - b.position)
    const normalized = normalizeGroupPositions(remainingGroup, existing.status, new Date().toISOString())
    const nextTasks = replaceTaskRecords(tasks.filter(task => task.id !== taskId), normalized)
    const persisted = saveTasks(nextTasks)
    return { deleted: true, persisted }
  }, [saveTasks, tasks])

  const removeProjectTasks = useCallback((projectId: string) => {
    const nextTasks = tasks.filter(task => task.projectId !== projectId)
    if (nextTasks.length === tasks.length) return { removed: 0, persisted: true }
    return { removed: tasks.length - nextTasks.length, persisted: saveTasks(nextTasks) }
  }, [saveTasks, tasks])

  /** Move within or between configured status groups, then normalize affected positions. */
  const moveTask = useCallback((taskId: string, projectId: string, status: TaskStatus, position: number) => {
    const existing = tasks.find(task => task.id === taskId)
    const project = projectMap.get(projectId)
    if (!existing || existing.projectId !== projectId || !project || !project.columns.some(column => column.id === status) || !Number.isFinite(position)) {
      return { moved: false, persisted: false }
    }

    const sourceStatus = existing.status
    const sourceGroup = tasks.filter(task => task.projectId === projectId && task.status === sourceStatus).slice().sort((a, b) => a.position - b.position)
    const sameGroup = sourceStatus === status
    const destinationGroup = sameGroup
      ? sourceGroup.slice()
      : tasks.filter(task => task.projectId === projectId && task.status === status).slice().sort((a, b) => a.position - b.position)
    const fromIndex = sourceGroup.findIndex(task => task.id === taskId)
    const targetIndex = Math.max(0, Math.min(Math.trunc(position), sameGroup ? destinationGroup.length - 1 : destinationGroup.length))
    if (fromIndex < 0 || targetIndex < 0) return { moved: false, persisted: false }

    if (sameGroup) {
      const [moving] = destinationGroup.splice(fromIndex, 1)
      destinationGroup.splice(targetIndex, 0, moving)
      if (destinationGroup.every((task, index) => task.id === sourceGroup[index]?.id && task.position === index)) {
        return { moved: false, persisted: false }
      }
    } else {
      sourceGroup.splice(fromIndex, 1)
      destinationGroup.splice(targetIndex, 0, existing)
    }

    const now = new Date().toISOString()
    const changed = new Map<string, Task>()
    const normalize = (group: Task[], targetStatus: TaskStatus) => group.forEach((task, index) => {
      if (task.status !== targetStatus || task.position !== index) {
        changed.set(task.id, { ...task, status: targetStatus, position: index, updatedAt: now })
      }
    })
    normalize(sourceGroup, sourceStatus)
    normalize(destinationGroup, status)
    const persisted = saveTasks(tasks.map(task => changed.get(task.id) ?? task))
    return { moved: changed.size > 0, persisted }
  }, [projectMap, saveTasks, tasks])

  return { tasks, saveTasks, createTask, updateTask, updateChecklist, deleteTask, removeProjectTasks, moveTask }
}
