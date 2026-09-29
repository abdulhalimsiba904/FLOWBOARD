import type { Project } from '../../types/project'
import type { Task } from '../../types/task'
import { getDueDateCategory } from '../../utils/taskDates'

export interface DashboardTask {
  task: Task
  project: Project
  statusLabel: string
}

export interface ProjectProgress {
  completed: number
  total: number
  percent: number
}

function isCompletedStatus(project: Project, statusId: string): boolean {
  const name = project.columns.find(column => column.id === statusId)?.name.trim().toLocaleLowerCase()
  return name === 'done' || name === 'complete' || name === 'completed'
}

/** Dashboard values are derived from current project/task records; stale task references are omitted. */
export function selectDashboardData(projects: readonly Project[], tasks: readonly Task[], now = new Date()) {
  const projectById = new Map(projects.map(project => [project.id, project]))
  const scopedTasks: DashboardTask[] = tasks.flatMap(task => {
    const project = projectById.get(task.projectId)
    const statusLabel = project?.columns.find(column => column.id === task.status)?.name
    return project && statusLabel ? [{ task, project, statusLabel }] : []
  })
  const completed = scopedTasks.filter(item => isCompletedStatus(item.project, item.task.status))
  const open = scopedTasks.filter(item => !isCompletedStatus(item.project, item.task.status))
  const overdue = open.filter(item => getDueDateCategory(item.task.dueDate, now) === 'overdue')
    .sort(compareDueTasks)
  const upcoming = open.filter(item => {
    const category = getDueDateCategory(item.task.dueDate, now)
    return category === 'today' || category === 'upcoming'
  }).sort(compareDueTasks)
  const recentProjects = projects.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)
    || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    || a.id.localeCompare(b.id))
  const progressByProject = new Map<string, ProjectProgress>()

  projects.forEach(project => {
    const projectTasks = scopedTasks.filter(item => item.project.id === project.id)
    const projectCompleted = projectTasks.filter(item => isCompletedStatus(project, item.task.status)).length
    progressByProject.set(project.id, {
      completed: projectCompleted,
      total: projectTasks.length,
      percent: projectTasks.length ? Math.round((projectCompleted / projectTasks.length) * 100) : 0,
    })
  })

  return {
    activeProjects: projects.length,
    openTasks: open.length,
    completedTasks: completed.length,
    overdueTasks: overdue.length,
    overdue,
    upcoming,
    recentProjects,
    progressByProject,
    hasTasks: scopedTasks.length > 0,
  }
}

function compareDueTasks(a: DashboardTask, b: DashboardTask): number {
  return (a.task.dueDate ?? '').localeCompare(b.task.dueDate ?? '')
    || a.project.name.localeCompare(b.project.name, undefined, { sensitivity: 'base' })
    || a.task.title.localeCompare(b.task.title, undefined, { sensitivity: 'base' })
    || a.task.id.localeCompare(b.task.id)
}
