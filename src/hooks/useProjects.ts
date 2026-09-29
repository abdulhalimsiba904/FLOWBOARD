import { useCallback, useMemo, useState } from 'react'
import type { Project } from '../types/project'
import { createDefaultColumns, loadProjects, saveProjects } from '../services/projectStorage'

export interface ProjectDraft {
  name: string
  description: string
}

function newProjectId(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  } catch {
    // Fall back to a timestamp plus random suffix in restricted browser contexts.
  }
  return `project-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`
}

/** Loads once; mutations save a full snapshot and selection remains valid in memory. */
export function useProjects() {
  const [initialProjects] = useState<Project[]>(loadProjects)
  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [activeProjectId, setActiveProjectId] = useState<string | null>(() => {
    return initialProjects.find(project => project.favorite)?.id ?? initialProjects[0]?.id ?? null
  })

  const commit = useCallback((nextProjects: Project[]): boolean => {
    const persisted = saveProjects(nextProjects)
    setProjects(nextProjects)
    return persisted
  }, [])

  const createProject = useCallback((draft: ProjectDraft) => {
    const now = new Date().toISOString()
    const project: Project = {
      id: newProjectId(),
      name: draft.name.trim(),
      description: draft.description.trim(),
      createdAt: now,
      updatedAt: now,
      favorite: false,
      columns: createDefaultColumns(),
    }
    const persisted = commit([...projects, project])
    setActiveProjectId(project.id)
    return { project, persisted }
  }, [commit, projects])

  const updateProject = useCallback((id: string, draft: ProjectDraft) => {
    const nextProjects = projects.map(project => project.id === id
      ? { ...project, name: draft.name.trim(), description: draft.description.trim(), updatedAt: new Date().toISOString() }
      : project)
    if (nextProjects.every((project, index) => project === projects[index])) return { changed: false, persisted: true }
    return { changed: true, persisted: commit(nextProjects) }
  }, [commit, projects])

  const toggleFavorite = useCallback((id: string) => {
    const nextProjects = projects.map(project => project.id === id
      ? { ...project, favorite: !project.favorite, updatedAt: new Date().toISOString() }
      : project)
    if (nextProjects.every((project, index) => project === projects[index])) return { changed: false, persisted: true }
    return { changed: true, persisted: commit(nextProjects) }
  }, [commit, projects])

  const deleteProject = useCallback((id: string) => {
    const nextProjects = projects.filter(project => project.id !== id)
    if (nextProjects.length === projects.length) return { changed: false, nextId: activeProjectId, persisted: true }
    const nextActiveId = activeProjectId === id
      ? nextProjects.find(project => project.favorite)?.id ?? nextProjects[0]?.id ?? null
      : activeProjectId
    const persisted = commit(nextProjects)
    setActiveProjectId(nextActiveId)
    return { changed: true, nextId: nextActiveId, persisted }
  }, [activeProjectId, commit, projects])

  const selectProject = useCallback((id: string | null) => {
    if ((id === null && projects.length === 0) || (id !== null && projects.some(project => project.id === id))) setActiveProjectId(id)
  }, [projects])

  const activeProject = useMemo(
    () => projects.find(project => project.id === activeProjectId) ?? null,
    [activeProjectId, projects],
  )

  const orderedProjects = useMemo(() => [
    ...projects.filter(project => project.favorite),
    ...projects.filter(project => !project.favorite),
  ], [projects])

  return { projects, orderedProjects, activeProjectId, activeProject, createProject, updateProject, deleteProject, toggleFavorite, selectProject }
}
