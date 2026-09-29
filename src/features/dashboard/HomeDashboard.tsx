import type { Project } from '../../types/project'
import type { Task } from '../../types/task'
import { Icon } from '../../shared/Icon'
import { formatTaskDueDate } from '../../utils/taskDates'
import type { DashboardTask } from './dashboardSelectors'

export type DashboardData = ReturnType<typeof import('./dashboardSelectors').selectDashboardData>

interface HomeDashboardProps {
  data: DashboardData
  onOpenTask: (project: Project, task: Task) => void
}

export function HomeDashboard({ data, onOpenTask }: HomeDashboardProps) {
  return <div className="home-dashboard">
    <section className="dashboard-metrics" aria-label="Workspace summary">
      <MetricCard label="Active projects" value={data.activeProjects} detail="Projects in this workspace" icon="projects" />
      <MetricCard label="Open tasks" value={data.openTasks} detail="Across all projects" icon="grip" />
      <MetricCard label="Completed tasks" value={data.completedTasks} detail="In the Done column" icon="spark" />
      <MetricCard label="Overdue tasks" value={data.overdueTasks} detail="Open and past their due date" icon="chevron" subdued={data.overdueTasks === 0} />
    </section>

    <div className="dashboard-task-panels">
      <TaskPanel title="Overdue" description="Past due dates that may need attention." items={data.overdue} emptyTitle="Nothing overdue" emptyText="There are no overdue open tasks." tone="overdue" onOpenTask={onOpenTask} />
      <TaskPanel title="Upcoming" description="Open tasks due today or later." items={data.upcoming} emptyTitle={data.hasTasks ? 'No upcoming due dates' : 'No tasks yet'} emptyText={data.hasTasks ? 'Tasks with a due date will appear here.' : 'Add tasks to your projects to see what is coming up.'} onOpenTask={onOpenTask} />
    </div>
  </div>
}

function MetricCard({ label, value, detail, icon, subdued = false }: { label: string; value: number; detail: string; icon: 'projects' | 'grip' | 'spark' | 'chevron'; subdued?: boolean }) {
  return <article className={`dashboard-metric${subdued ? ' dashboard-metric-calm' : ''}`}>
    <div className="dashboard-metric-icon"><Icon name={icon} size={17}/></div>
    <div className="dashboard-metric-copy"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>
  </article>
}

function TaskPanel({ title, description, items, emptyTitle, emptyText, tone, onOpenTask }: { title: string; description: string; items: DashboardTask[]; emptyTitle: string; emptyText: string; tone?: 'overdue'; onOpenTask: (project: Project, task: Task) => void }) {
  const headingId = `dashboard-${title.toLocaleLowerCase()}-title`
  return <section className={`dashboard-task-panel${tone ? ` dashboard-task-panel-${tone}` : ''}`} aria-labelledby={headingId}>
    <header className="dashboard-panel-heading"><div><h2 id={headingId}>{title}</h2><p>{description}</p></div><span className="dashboard-panel-count">{items.length}</span></header>
    {items.length ? <ul className="dashboard-task-list">{items.slice(0, 5).map(item => <li key={item.task.id}><button type="button" className="dashboard-task-link" onClick={() => onOpenTask(item.project, item.task)} aria-label={`Open ${item.task.title} in ${item.project.name}`}>
      <span className="dashboard-task-main"><strong>{item.task.title}</strong><small>{item.project.name}</small></span>
      <span className="dashboard-task-meta"><span className="dashboard-task-status">{item.statusLabel}</span><span className="dashboard-task-date">{item.task.dueDate ? formatTaskDueDate(item.task.dueDate) : ''}</span></span>
    </button></li>)}</ul> : <div className="dashboard-list-empty"><strong>{emptyTitle}</strong><span>{emptyText}</span></div>}
  </section>
}
