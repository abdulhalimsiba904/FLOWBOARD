import { useEffect, useRef, useState } from 'react'
import type { Project } from '../../types/project'
import type { Task } from '../../types/task'
import type { TaskDraft } from '../../hooks/useTasks'
import { Icon } from '../../shared/Icon'
import { TaskDialog } from './TaskDialog'
import { TaskDetailsDrawer } from './TaskDetailsDrawer'
import type { ChecklistItem } from '../../types/task'
import type { TaskStatus } from '../../types/task'
import { ProjectBoard } from './board/ProjectBoard'
import { TaskFilterBar } from './TaskFilterBar'
import { countActiveTaskFilters, emptyTaskFilters, filterProjectTasks, projectColumnsInOrder, sortTasksForList, type TaskFilters, type TaskSort } from '../../utils/taskSelectors'
import { formatTaskDueDate } from '../../utils/taskDates'

type TaskDialogState = { kind: 'create'; status?: TaskStatus } | { kind: 'edit'; task: Task }
type TaskChange = { task: Task | null; persisted: boolean }

interface ProjectTaskWorkspaceProps {
  project: Project
  tasks: Task[]
  onCreateTask: (projectId: string, draft: TaskDraft) => TaskChange
  onUpdateTask: (taskId: string, projectId: string, draft: TaskDraft) => TaskChange
  onTaskSaved: (kind: 'created' | 'updated', persisted: boolean) => void
  onChecklistChange: (taskId: string, projectId: string, checklist: ChecklistItem[]) => { updated: boolean; persisted: boolean }
  onDeleteTask: (taskId: string, projectId: string) => { deleted: boolean; persisted: boolean }
  onTaskDeleted: (title: string, persisted: boolean) => void
  onMoveTask: (taskId: string, projectId: string, status: TaskStatus, position: number) => { moved: boolean; persisted: boolean }
  initialTaskId?: string | null
}

const priorityLabels = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' } as const

export function ProjectTaskWorkspace({ project, tasks, initialTaskId, onCreateTask, onUpdateTask, onTaskSaved, onChecklistChange, onDeleteTask, onTaskDeleted, onMoveTask }: ProjectTaskWorkspaceProps) {
  const [dialog, setDialog] = useState<TaskDialogState | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(initialTaskId ?? null)
  const [view, setView] = useState<'board' | 'list'>('board')
  const [filters, setFilters] = useState<TaskFilters>(emptyTaskFilters)
  const [sort, setSort] = useState<TaskSort>('manual')
  const addTaskButtonRef = useRef<HTMLButtonElement>(null)
  const projectTasks = tasks.filter(task => task.projectId === project.id)
  const selectedTask = projectTasks.find(task => task.id === selectedTaskId) ?? null
  const activeFilterCount = countActiveTaskFilters(filters)
  const visibleTasks = filterProjectTasks(projectTasks, filters)

  useEffect(() => {
    if (initialTaskId) setSelectedTaskId(initialTaskId)
  }, [initialTaskId])

  function saveTask(draft: TaskDraft) {
    const editing = dialog?.kind === 'edit'
    const result = editing
      ? onUpdateTask(dialog.task.id, project.id, draft)
      : onCreateTask(project.id, draft)
    if (!result.task) return
    setDialog(null)
    onTaskSaved(editing ? 'updated' : 'created', result.persisted)
  }

  function handleChecklistChange(taskId: string, projectId: string, checklist: ChecklistItem[]) {
    if (projectId !== project.id || !projectTasks.some(task => task.id === taskId)) return
    onChecklistChange(taskId, projectId, checklist)
  }

  function handleTaskDeleted(title: string, persisted: boolean) {
    setSelectedTaskId(null)
    window.requestAnimationFrame(() => addTaskButtonRef.current?.focus())
    onTaskDeleted(title, persisted)
  }

  return <section className="task-workspace" aria-labelledby="task-section-title">
    <div className="task-section-heading"><div><div className="eyebrow">PROJECT WORK</div><h2 id="task-section-title">Tasks <span className="count-pill">{projectTasks.length}</span></h2></div><div className="task-heading-actions"><div className="view-switch" role="group" aria-label="Task view"><button type="button" aria-pressed={view === 'board'} className={view === 'board' ? 'selected' : ''} onClick={() => setView('board')}>Board</button><button type="button" aria-pressed={view === 'list'} className={view === 'list' ? 'selected' : ''} onClick={() => setView('list')}>List</button></div><button ref={addTaskButtonRef} type="button" className="button button-primary" onClick={() => setDialog({ kind: 'create' })}><Icon name="plus" size={15}/>Add task</button></div></div>
    <TaskFilterBar project={project} tasks={projectTasks} filters={filters} activeCount={activeFilterCount} onChange={setFilters} onClear={() => setFilters(emptyTaskFilters)} />
    {view === 'list' && <div className="task-sort-control"><label htmlFor="task-sort">Sort list by</label><select id="task-sort" value={sort} onChange={event => setSort(event.target.value as TaskSort)}><option value="manual">Manual order</option><option value="priority">Priority</option><option value="due-date">Due date</option><option value="created-date">Created date</option><option value="title">Title A to Z</option></select></div>}
    {visibleTasks.length === 0 && activeFilterCount > 0 ? <div className="task-filter-empty"><h3>No tasks match these filters</h3><p>Clear filters to see all tasks in this project.</p><button type="button" className="button button-secondary" onClick={() => setFilters(emptyTaskFilters)}>Clear filters</button></div> : view === 'board' ? <ProjectBoard project={project} tasks={visibleTasks} allProjectTasks={projectTasks} isProjectEmpty={projectTasks.length === 0} dragDisabled={activeFilterCount > 0} onOpenTask={setSelectedTaskId} onEditTask={task => setDialog({ kind: 'edit', task })} onAddTask={status => setDialog({ kind: 'create', status })} onMoveTask={(taskId, status, position) => onMoveTask(taskId, project.id, status, position)} /> : projectTasks.length === 0 ? <div className="task-empty"><div className="empty-icon"><Icon name="projects" size={23}/></div><h3>No tasks in this project yet</h3><p>Add a task to capture the next thing you want to work on.</p><button type="button" className="button button-primary" onClick={() => setDialog({ kind: 'create' })}><Icon name="plus" size={15}/>Add the first task</button></div> : <div className="task-groups" aria-label={`Tasks grouped by status in ${project.name}`}>
      {projectColumnsInOrder(project.columns).map(column => {
        const columnTasks = sortTasksForList(visibleTasks.filter(task => task.status === column.id), sort)
        return <section className="task-group" key={column.id} aria-labelledby={`task-group-${column.id}`}>
          <div className="task-group-heading"><h3 id={`task-group-${column.id}`}>{column.name}</h3><span className="task-count">{columnTasks.length}</span></div>
          {columnTasks.length > 0 ? <div className="task-card-list">{columnTasks.map(task => <article className="task-card" key={task.id}>
            <div className="task-card-row"><div className="task-card-content">
              <button type="button" className="task-title-button" aria-label={`Open details for ${task.title}`} onClick={() => setSelectedTaskId(task.id)}>{task.title}</button>
              {task.description && <p className="task-card-description">{task.description}</p>}
              <div className="task-card-meta"><span className={`priority-label priority-${task.priority}`}>Priority: {priorityLabels[task.priority]}</span>{task.dueDate && <span className="task-due-date">Due {formatTaskDueDate(task.dueDate)}</span>}</div>
              {task.tags.length > 0 && <ul className="task-tags" aria-label="Tags">{task.tags.map((tag, index) => <li key={`${tag.toLowerCase()}-${index}`}>{tag}</li>)}</ul>}
            </div><button type="button" className="icon-button action-button task-card-edit" aria-label={`Edit ${task.title}`} title="Edit task" onClick={() => setDialog({ kind: 'edit', task })}><Icon name="edit" size={16}/></button></div>
          </article>)}</div> : <p className="task-group-empty">No tasks in this status.</p>}
        </section>
      })}
    </div>}
    {dialog && <TaskDialog key={dialog.kind === 'edit' ? dialog.task.id : `new-task-${dialog.status ?? 'default'}`} project={project} task={dialog.kind === 'edit' ? dialog.task : undefined} initialStatus={dialog.kind === 'create' ? dialog.status : undefined} onClose={() => setDialog(null)} onSave={saveTask} />}
    {selectedTask && <TaskDetailsDrawer key={selectedTask.id} project={project} task={selectedTask} onClose={() => setSelectedTaskId(null)} onEdit={task => setDialog({ kind: 'edit', task })} onChecklistChange={checklist => handleChecklistChange(selectedTask.id, project.id, checklist)} onDelete={onDeleteTask} onDeleted={handleTaskDeleted} />}
  </section>
}
