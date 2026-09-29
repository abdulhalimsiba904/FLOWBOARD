import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { Project } from '../../types/project'
import type { ProjectDraft } from '../../hooks/useProjects'

interface EditorProps {
  project?: Project
  onClose: () => void
  onSave: (draft: ProjectDraft) => void
}

export function ProjectEditorDialog({ project, onClose, onSave }: EditorProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(project?.name ?? '')
  const [description, setDescription] = useState(project?.description ?? '')
  const [error, setError] = useState('')

  useEffect(() => {
    dialogRef.current?.showModal()
    return () => dialogRef.current?.close()
  }, [])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim()) {
      setError('Enter a project name to continue.')
      nameRef.current?.focus()
      return
    }
    onSave({ name: name.trim(), description: description.trim() })
  }

  return <dialog ref={dialogRef} className="app-dialog" aria-labelledby="project-dialog-title" onClose={onClose}>
    <form className="dialog-form" onSubmit={submit}>
      <div className="dialog-heading"><div><div className="eyebrow">PROJECT DETAILS</div><h2 id="project-dialog-title">{project ? 'Edit project' : 'New project'}</h2></div><p>{project ? 'Update the name or description for this project.' : 'Give your next project a clear name and purpose.'}</p></div>
      <div className="field-group"><label htmlFor="project-name">Project name <span className="required-label" aria-hidden="true">*</span></label><input ref={nameRef} id="project-name" name="name" autoFocus value={name} onChange={event => { setName(event.target.value); if (error) setError('') }} aria-invalid={Boolean(error)} aria-describedby={error ? 'project-name-error' : undefined} maxLength={80} required /><div className="field-foot"><span>{error && <span className="field-error" id="project-name-error" role="alert">{error}</span>}</span><span>{name.length}/80</span></div></div>
      <div className="field-group"><label htmlFor="project-description">Description <span className="optional-label">Optional</span></label><textarea id="project-description" name="description" value={description} onChange={event => setDescription(event.target.value)} maxLength={240} rows={4} placeholder="What is this project about?"/><div className="field-foot"><span> </span><span>{description.length}/240</span></div></div>
      <div className="dialog-actions"><button className="button button-secondary" type="button" onClick={onClose}>Cancel</button><button className="button button-primary" type="submit">{project ? 'Save changes' : 'Create project'}</button></div>
    </form>
  </dialog>
}

export function ProjectDeleteDialog({ project, onClose, onDelete }: { project: Project; onClose: () => void; onDelete: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    dialogRef.current?.showModal()
    return () => dialogRef.current?.close()
  }, [])

  return <dialog ref={dialogRef} className="app-dialog delete-dialog" aria-labelledby="delete-dialog-title" aria-describedby="delete-dialog-description" onClose={onClose}>
    <div className="dialog-form"><div className="delete-icon"><span aria-hidden="true">!</span></div><div className="dialog-heading"><div className="eyebrow">DELETE PROJECT</div><h2 id="delete-dialog-title">Delete “{project.name}”?</h2><p id="delete-dialog-description">This will remove the project and its saved details from this device. This action cannot be undone.</p></div><div className="dialog-actions"><button className="button button-secondary" type="button" autoFocus onClick={onClose}>Cancel</button><button className="button button-danger" type="button" onClick={onDelete}>Delete project</button></div></div>
  </dialog>
}
