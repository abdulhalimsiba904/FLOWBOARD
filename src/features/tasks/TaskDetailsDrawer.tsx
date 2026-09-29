import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { Project } from '../../types/project'
import type { ChecklistItem, Task } from '../../types/task'
import { Icon } from '../../shared/Icon'

interface TaskDetailsDrawerProps {
  project: Project
  task: Task
  onClose: () => void
  onEdit: (task: Task) => void
  onChecklistChange: (checklist: ChecklistItem[]) => void
  onDelete: (taskId: string, projectId: string) => { deleted: boolean; persisted: boolean }
  onDeleted: (title: string, persisted: boolean) => void
}

const priorityLabels = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' } as const

function createChecklistId(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `check-${crypto.randomUUID()}`
  } catch {
    // Use a timestamp and random suffix in restricted browser contexts.
  }
  return `check-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`
}

function formatDueDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value))
}

export function TaskDetailsDrawer({ project, task, onClose, onEdit, onChecklistChange, onDelete, onDeleted }: TaskDetailsDrawerProps) {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const checklist = task.checklist
  const completeCount = checklist.filter(item => item.completed).length
  const statusName = project.columns.find(column => column.id === task.status)?.name ?? 'Unknown status'

  useEffect(() => {
    dialogRef.current?.showModal()
    return () => dialogRef.current?.close()
  }, [])

  function setChecklistItem(updated: ChecklistItem) {
    onChecklistChange(checklist.map(item => item.id === updated.id ? updated : item))
  }

  function addChecklistItem(text: string) {
    const trimmed = text.trim()
    if (!trimmed) return false
    onChecklistChange([...checklist, { id: createChecklistId(), text: trimmed, completed: false }])
    return true
  }

  function confirmDelete() {
    const result = onDelete(task.id, project.id)
    if (!result.deleted) return
    setDeleteConfirmOpen(false)
    onClose()
    onDeleted(task.title, result.persisted)
  }

  return <dialog ref={dialogRef} className="task-drawer" aria-labelledby="task-details-title" onClose={onClose}>
    <div className="task-drawer-header"><div><div className="eyebrow">{project.name}</div><h2 id="task-details-title">Task details</h2></div><button type="button" className="icon-button" autoFocus aria-label="Close task details" onClick={onClose}><Icon name="close"/></button></div>
    <div className="task-drawer-content">
      <div className="task-detail-title"><h3>{task.title}</h3><button type="button" className="button button-secondary" onClick={() => onEdit(task)}><Icon name="edit" size={15}/>Edit task</button></div>
      <p className="task-detail-description">{task.description || 'No description added.'}</p>
      <dl className="task-detail-fields">
        <div><dt>Status</dt><dd>{statusName}</dd></div>
        <div><dt>Priority</dt><dd>{priorityLabels[task.priority]}</dd></div>
        <div><dt>Due date</dt><dd>{task.dueDate ? formatDueDate(task.dueDate) : 'No due date'}</dd></div>
      </dl>
      {task.tags.length > 0 && <section className="detail-section" aria-labelledby="detail-tags-title"><h3 id="detail-tags-title">Tags</h3><ul className="task-tags detail-tags">{task.tags.map((tag, index) => <li key={`${tag.toLowerCase()}-${index}`}>{tag}</li>)}</ul></section>}
      <ChecklistEditor checklist={checklist} completeCount={completeCount} onAdd={addChecklistItem} onUpdate={setChecklistItem} onRemove={id => onChecklistChange(checklist.filter(item => item.id !== id))}/>
      <div className="task-detail-danger-zone"><div><strong>Delete this task</strong><span>This removes it from this project.</span></div><button type="button" className="button button-danger-outline" onClick={() => setDeleteConfirmOpen(true)}><Icon name="trash" size={15}/>Delete task</button></div>
    </div>
    {deleteConfirmOpen && <TaskDeleteConfirmation task={task} onClose={() => setDeleteConfirmOpen(false)} onConfirm={confirmDelete}/>}
  </dialog>
}

function ChecklistEditor({ checklist, completeCount, onAdd, onUpdate, onRemove }: { checklist: ChecklistItem[]; completeCount: number; onAdd: (text: string) => boolean; onUpdate: (item: ChecklistItem) => void; onRemove: (id: string) => void }) {
  const addRef = useRef<HTMLInputElement>(null)
  const editRef = useRef<HTMLInputElement>(null)
  const [newText, setNewText] = useState('')
  const [addError, setAddError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const [editError, setEditError] = useState('')

  function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!newText.trim()) {
      setAddError('Enter checklist item text before adding it.')
      addRef.current?.focus()
      return
    }
    if (onAdd(newText)) {
      setNewText('')
      setAddError('')
    }
  }

  function saveEdit(event: FormEvent<HTMLFormElement>, item: ChecklistItem) {
    event.preventDefault()
    if (!editingText.trim()) {
      setEditError('Checklist item text cannot be empty.')
      editRef.current?.focus()
      return
    }
    onUpdate({ ...item, text: editingText.trim() })
    setEditingId(null)
    setEditingText('')
    setEditError('')
  }

  return <section className="detail-section checklist-section" aria-labelledby="checklist-title">
    <div className="checklist-heading"><div><h3 id="checklist-title">Checklist</h3><span>{checklist.length ? `${completeCount} of ${checklist.length} complete` : 'No items yet'}</span></div>{checklist.length > 0 && <progress max={checklist.length} value={completeCount} aria-label={`${completeCount} of ${checklist.length} checklist items complete`}/>}</div>
    {checklist.length > 0 && <ul className="checklist-list">{checklist.map(item => <li key={item.id} className={`checklist-item${item.completed ? ' complete' : ''}`}>
      <input type="checkbox" checked={item.completed} aria-label={`${item.completed ? 'Mark' : 'Mark'} ${item.text} ${item.completed ? 'incomplete' : 'complete'}`} onChange={event => onUpdate({ ...item, completed: event.target.checked })}/>
      {editingId === item.id ? <form className="checklist-edit-form" onSubmit={event => saveEdit(event, item)}><input ref={editRef} autoFocus value={editingText} onChange={event => { setEditingText(event.target.value); if (editError) setEditError('') }} aria-label={`Edit checklist item ${item.text}`} aria-invalid={Boolean(editError)} aria-describedby={editError ? `check-edit-error-${item.id}` : undefined}/>{editError && <span className="field-error" id={`check-edit-error-${item.id}`} role="alert">{editError}</span>}<button type="submit" className="button button-primary">Save</button><button type="button" className="button button-secondary" onClick={() => { setEditingId(null); setEditError('') }}>Cancel</button></form> : <><span className="checklist-text">{item.text}</span><div className="checklist-actions"><button type="button" className="icon-button action-button" aria-label={`Edit checklist item ${item.text}`} onClick={() => { setEditingId(item.id); setEditingText(item.text); setEditError('') }}><Icon name="edit" size={15}/></button><button type="button" className="icon-button action-button delete-action" aria-label={`Remove checklist item ${item.text}`} onClick={() => onRemove(item.id)}><Icon name="trash" size={15}/></button></div></>}
    </li>)}</ul>}
    <form className="checklist-add-form" onSubmit={addItem} noValidate><label htmlFor="new-checklist-item">Add an item</label><div><input ref={addRef} id="new-checklist-item" value={newText} onChange={event => { setNewText(event.target.value); if (addError) setAddError('') }} aria-invalid={Boolean(addError)} aria-describedby={addError ? 'check-add-error' : undefined} placeholder="Write a checklist item"/><button type="submit" className="button button-secondary"><Icon name="plus" size={14}/>Add</button></div>{addError && <span id="check-add-error" className="field-error" role="alert">{addError}</span>}</form>
  </section>
}

function TaskDeleteConfirmation({ task, onClose, onConfirm }: { task: Task; onClose: () => void; onConfirm: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    dialogRef.current?.showModal()
    return () => dialogRef.current?.close()
  }, [])

  return <dialog ref={dialogRef} className="app-dialog delete-dialog task-delete-dialog" aria-labelledby="task-delete-title" aria-describedby="task-delete-description" onClose={onClose}>
    <div className="dialog-form"><div className="delete-icon"><span aria-hidden="true">!</span></div><div className="dialog-heading"><div className="eyebrow">DELETE TASK</div><h2 id="task-delete-title">Delete “{task.title}”?</h2><p id="task-delete-description">This task and its checklist will be removed permanently. This action cannot be undone.</p></div><div className="dialog-actions"><button type="button" className="button button-secondary" autoFocus onClick={onClose}>Cancel</button><button type="button" className="button button-danger" onClick={onConfirm}>Delete task</button></div></div>
  </dialog>
}
