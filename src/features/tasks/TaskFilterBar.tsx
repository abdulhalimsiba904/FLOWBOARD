import type { Project } from '../../types/project'
import type { Task, TaskPriority } from '../../types/task'
import { isTaskStatus, selectProjectTaskTags, type TaskFilters } from '../../utils/taskSelectors'

interface TaskFilterBarProps {
  project: Project
  tasks: readonly Task[]
  filters: TaskFilters
  activeCount: number
  onChange: (filters: TaskFilters) => void
  onClear: () => void
}

const priorityOptions: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

const dueDateOptions = [
  { value: 'overdue', label: 'Overdue' },
  { value: 'today', label: 'Today' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'no-date', label: 'No due date' },
] as const

export function TaskFilterBar({ project, tasks, filters, activeCount, onChange, onClear }: TaskFilterBarProps) {
  const tags = selectProjectTaskTags(tasks)
  const columns = project.columns.slice().sort((a, b) => a.position - b.position)

  return <section className="task-filter-panel" aria-label="Filter project tasks">
    <div className="task-filter-controls">
      <label className={filters.status ? 'filter-active' : ''}>Status<select aria-label="Filter by status" value={filters.status} onChange={event => onChange({ ...filters, status: isTaskStatus(event.target.value, columns) ? event.target.value : '' })}><option value="">All statuses</option>{columns.map(column => <option key={column.id} value={column.id}>{column.name}</option>)}</select></label>
      <label className={filters.priority ? 'filter-active' : ''}>Priority<select aria-label="Filter by priority" value={filters.priority} onChange={event => onChange({ ...filters, priority: event.target.value as TaskPriority | '' })}><option value="">All priorities</option>{priorityOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <label className={filters.tag ? 'filter-active' : ''}>Tag<select aria-label="Filter by tag" value={filters.tag} onChange={event => onChange({ ...filters, tag: event.target.value })}><option value="">All tags</option>{tags.map(tag => <option key={tag.toLowerCase()} value={tag}>{tag}</option>)}</select></label>
      <label className={filters.dueDate ? 'filter-active' : ''}>Due date<select aria-label="Filter by due date" value={filters.dueDate} onChange={event => onChange({ ...filters, dueDate: event.target.value as TaskFilters['dueDate'] })}><option value="">Any due date</option>{dueDateOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
    </div>
    <div className="task-filter-summary"><span aria-live="polite">{activeCount ? `${activeCount} filter${activeCount === 1 ? '' : 's'} active` : 'All project tasks'}</span><button type="button" className="button button-quiet" disabled={activeCount === 0} onClick={onClear}>Clear filters</button></div>
  </section>
}
