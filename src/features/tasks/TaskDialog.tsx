import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { Project } from '../../types/project'
import type { Task, TaskPriority, TaskStatus } from '../../types/task'
import type { TaskDraft } from '../../hooks/useTasks'

interface TaskDialogProps {
  project: Project
  task?: Task
  initialStatus?: TaskStatus
  onClose: () => void
  onSave: (draft: TaskDraft) => void
}

const priorityOptions: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

function parseTags(input: string): string[] {
  const seen = new Set<string>()
  return input.split(',').flatMap(part => {
    const tag = part.trim()
    const key = tag.toLowerCase()
    if (!tag || seen.has(key)) return []
    seen.add(key)
    return [tag]
  })
}

function toIsoDate(value: string): string | null {
  if (!value) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  if (!Number.isFinite(date.getTime())) return null
  try {
    return date.toISOString()
  } catch {
    return null
  }
}

export function TaskDialog({ project, task, initialStatus, onClose, onSave }: TaskDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? initialStatus ?? project.columns[0]?.id as TaskStatus ?? 'column-1')
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'medium')
  const [dueDate, setDueDate] = useState(task?.dueDate?.slice(0, 10) ?? '')
  const [tags, setTags] = useState(task?.tags.join(', ') ?? '')
  const [error, setError] = useState('')

  useEffect(() => {
    dialogRef.current?.showModal()
    return () => dialogRef.current?.close()
  }, [])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim()) {
      setError('Enter a task title to continue.')
      titleRef.current?.focus()
      return
    }
    onSave({
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      dueDate: toIsoDate(dueDate),
      tags: parseTags(tags),
    })
  }

  return <dialog ref={dialogRef} className="app-dialog task-dialog" aria-labelledby="task-dialog-title" onClose={onClose}>
    <form className="dialog-form task-form" onSubmit={submit} noValidate>
      <div className="dialog-heading"><div className="eyebrow">{project.name}</div><h2 id="task-dialog-title">{task ? 'Edit task' : 'Add a task'}</h2><p>{task ? 'Update the task details in this project.' : 'Add a clear next step to this project.'}</p></div>
      <div className="field-group"><label htmlFor="task-title">Title <span className="required-label" aria-hidden="true">*</span></label><input ref={titleRef} id="task-title" name="title" autoFocus value={title} onChange={event => { setTitle(event.target.value); if (error) setError('') }} aria-required="true" aria-invalid={Boolean(error)} aria-describedby={error ? 'task-title-error' : undefined} maxLength={120} /><div className="field-foot"><span>{error && <span className="field-error" id="task-title-error" role="alert">{error}</span>}</span><span>{title.length}/120</span></div></div>
      <div className="field-group"><label htmlFor="task-description">Description <span className="optional-label">Optional</span></label><textarea id="task-description" name="description" value={description} onChange={event => setDescription(event.target.value)} maxLength={500} rows={3} placeholder="Add a little context for this task."/><div className="field-foot"><span> </span><span>{description.length}/500</span></div></div>
      <div className="task-field-grid">
        <div className="field-group"><label htmlFor="task-status">Status</label><select id="task-status" name="status" value={status} onChange={event => setStatus(event.target.value as TaskStatus)}>{project.columns.slice().sort((a, b) => a.position - b.position).map(column => <option key={column.id} value={column.id}>{column.name}</option>)}</select></div>
        <div className="field-group"><label htmlFor="task-priority">Priority</label><select id="task-priority" name="priority" value={priority} onChange={event => setPriority(event.target.value as TaskPriority)}>{priorityOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
      </div>
      <div className="task-field-grid">
        <div className="field-group"><label htmlFor="task-due-date">Due date <span className="optional-label">Optional</span></label><input id="task-due-date" name="dueDate" type="date" value={dueDate} onChange={event => setDueDate(event.target.value)} /></div>
        <div className="field-group"><label htmlFor="task-tags">Tags <span className="optional-label">Optional</span></label><input id="task-tags" name="tags" value={tags} onChange={event => setTags(event.target.value)} placeholder="Planning, writing" aria-describedby="task-tags-hint"/><small className="field-hint" id="task-tags-hint">Separate tags with commas. Duplicate tags are removed.</small></div>
      </div>
      <div className="dialog-actions"><button className="button button-secondary" type="button" onClick={onClose}>Cancel</button><button className="button button-primary" type="submit">{task ? 'Save changes' : 'Create task'}</button></div>
    </form>
  </dialog>
}
