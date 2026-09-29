import { useState, type ReactNode } from 'react'
import { DragDropProvider, useDroppable, type DragEndEvent } from '@dnd-kit/react'
import { isSortable, useSortable } from '@dnd-kit/react/sortable'
import type { Project } from '../../../types/project'
import type { Task, TaskStatus } from '../../../types/task'
import { Icon } from '../../../shared/Icon'
import { formatTaskDueDate } from '../../../utils/taskDates'

interface ProjectBoardProps {
  project: Project
  tasks: Task[]
  allProjectTasks: Task[]
  isProjectEmpty: boolean
  dragDisabled: boolean
  onOpenTask: (taskId: string) => void
  onEditTask: (task: Task) => void
  onAddTask: (status: TaskStatus) => void
  onMoveTask: (taskId: string, status: TaskStatus, position: number) => { moved: boolean; persisted: boolean }
}

const priorityLabels = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' } as const

export function ProjectBoard(props: ProjectBoardProps) {
  const [announcement, setAnnouncement] = useState('')
  const columns = props.project.columns.slice().sort((a, b) => a.position - b.position)
  const projectTasks = props.tasks.filter(task => task.projectId === props.project.id)

  function commitMove(taskId: string, status: TaskStatus, position: number) {
    const task = projectTasks.find(item => item.id === taskId)
    const column = columns.find(item => item.id === status)
    if (!task || !column) return
    const result = props.onMoveTask(taskId, status, position)
    if (result.moved) setAnnouncement(`Moved ${task.title} to ${column.name}.`)
  }

  function finishDrag(event: DragEndEvent) {
    if (event.canceled) return
    const { source, target } = event.operation
    if (!source || !target || !isSortable(source)) return
    const task = projectTasks.find(item => item.id === String(source.id))
    if (!task) return
    const targetColumn = columns.find(column => `column-drop-${column.id}` === String(target.id))
    const destination = isSortable(target) && target.group !== undefined
      ? { status: String(target.group), position: target.index }
      : targetColumn
        ? { status: targetColumn.id, position: projectTasks.filter(item => item.status === targetColumn.id && item.id !== task.id).length }
        : null
    if (!destination || !columns.some(column => column.id === destination.status)) return
    commitMove(task.id, destination.status as TaskStatus, destination.position)
  }

  return <div className="project-board-feature">
    <p className="board-instructions">Drag a card with its move handle, or use the status menu on each card. Keyboard users can focus a move handle and use Space or Enter, then the arrow keys.</p>
    {props.isProjectEmpty && <div className="board-empty-project"><strong>No tasks yet</strong><span>Add a task to any column to start this board.</span></div>}
    {props.dragDisabled && <p className="board-filter-drag-note" role="note">Drag reordering is paused while filters are active. Clear filters to reorder tasks; the status menu remains available.</p>}
    <DragDropProvider onDragEnd={finishDrag}>
      <div className="project-board" aria-label={`${props.project.name} task board`}>
        {columns.map(column => {
          const columnTasks = projectTasks.filter(task => task.status === column.id).slice().sort((a, b) => a.position - b.position)
          return <BoardColumn key={column.id} id={column.id} name={column.name} count={columnTasks.length}>
            <div className="board-card-stack">
              {columnTasks.map((task, index) => <BoardTaskCard key={task.id} task={task} index={index} group={column.id} columnName={column.name} columns={columns} onOpen={() => props.onOpenTask(task.id)} onEdit={() => props.onEditTask(task)} onMove={(status) => {
                const endPosition = props.allProjectTasks.filter(item => item.status === status && item.id !== task.id).length
                commitMove(task.id, status, endPosition)
              }} dragDisabled={props.dragDisabled} />)}
              {columnTasks.length === 0 && <p className="board-column-empty">{props.dragDisabled && !props.isProjectEmpty ? 'No matching tasks.' : 'No tasks here yet.'}</p>}
            </div>
            <button type="button" className="board-add-task" onClick={() => props.onAddTask(column.id as TaskStatus)}><Icon name="plus" size={14}/>Add task</button>
          </BoardColumn>
        })}
      </div>
    </DragDropProvider>
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</div>
  </div>
}

function BoardColumn({ id, name, count, children }: { id: string; name: string; count: number; children: ReactNode }) {
  const { ref, isDropTarget } = useDroppable({ id: `column-drop-${id}`, type: 'column', accept: 'task' })
  return <section ref={ref} className={`board-column${isDropTarget ? ' board-column-target' : ''}`} aria-labelledby={`board-heading-${id}`}>
    <header className="board-column-heading"><h3 id={`board-heading-${id}`}>{name}</h3><span className="task-count" aria-label={`${count} tasks`}>{count}</span></header>
    {children}
  </section>
}

function BoardTaskCard({ task, index, group, columnName, columns, onOpen, onEdit, onMove, dragDisabled }: {
  task: Task
  index: number
  group: string
  columnName: string
  columns: Project['columns']
  onOpen: () => void
  onEdit: () => void
  onMove: (status: TaskStatus) => void
  dragDisabled: boolean
}) {
  const { ref, handleRef, isDragging, isDropTarget } = useSortable({ id: task.id, index, group, type: 'task', accept: 'task', disabled: dragDisabled })
  return <article ref={ref} className={`board-task-card${isDragging ? ' board-task-dragging' : ''}${isDropTarget ? ' board-task-target' : ''}`}>
    <div className="board-card-top"><span className={`priority-label priority-${task.priority}`}>Priority: {priorityLabels[task.priority]}</span><button ref={handleRef} type="button" className="board-drag-handle" disabled={dragDisabled} aria-label={dragDisabled ? `Reordering ${task.title} is paused while filters are active` : `Move ${task.title} with keyboard or drag`} title={dragDisabled ? 'Clear filters to reorder tasks' : 'Drag to move; keyboard: Space or Enter, then arrows'}><Icon name="grip" size={16}/></button></div>
    <button type="button" className="board-task-title" aria-label={`Open details for ${task.title}`} onClick={onOpen}>{task.title}</button>
    {task.description && <p className="board-task-description">{task.description}</p>}
    {(task.dueDate || task.tags.length > 0) && <div className="board-task-meta">{task.dueDate && <span>Due {formatTaskDueDate(task.dueDate)}</span>}{task.tags.length > 0 && <span>{task.tags.join(' · ')}</span>}</div>}
    {task.checklist.length > 0 && <div className="board-checklist-progress">{task.checklist.filter(item => item.completed).length} of {task.checklist.length} checklist items complete</div>}
    <div className="board-card-actions"><button type="button" className="icon-button action-button" aria-label={`Edit ${task.title}`} title="Edit task" onClick={onEdit}><Icon name="edit" size={15}/></button>
      <label className="sr-only" htmlFor={`move-task-${task.id}`}>Move {task.title} to status</label><select id={`move-task-${task.id}`} className="board-status-select" aria-label={`Move ${task.title} to status`} value={group} onChange={event => onMove(event.target.value as TaskStatus)}>{columns.map(column => <option key={column.id} value={column.id}>{column.name}</option>)}</select>
    </div>
    <span className="sr-only">Currently in {columnName}.</span>
  </article>
}
