import { useEffect, useState, type RefObject } from 'react'
import { useLocation } from 'react-router-dom'
import type { Project } from '../../types/project'
import type { Task } from '../../types/task'
import { Icon } from '../../shared/Icon'
import { formatTaskDueDate } from '../../utils/taskDates'
import { selectSearchResults } from '../../utils/taskSelectors'

interface GlobalTaskSearchProps {
  projects: readonly Project[]
  tasks: readonly Task[]
  inputRef: RefObject<HTMLInputElement | null>
  onOpenTask: (project: Project, task: Task) => void
}

const priorityLabels = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' } as const

export function GlobalTaskSearch({ projects, tasks, inputRef, onOpenTask }: GlobalTaskSearchProps) {
  const [query, setQuery] = useState('')
  const location = useLocation()
  const results = selectSearchResults(tasks, projects, query)
  const normalizedQuery = query.trim()

  useEffect(() => {
    inputRef.current?.focus()
  }, [inputRef, location.key])

  return <div className="page-wrap global-search-page">
    <div className="page-intro"><div className="eyebrow">WORKSPACE TOOL</div><h1>Search tasks</h1><p>Find tasks by title, description, tag, project, or status.</p></div>
    <div className="global-search-box"><Icon name="search" size={19}/><label className="sr-only" htmlFor="global-task-search">Search all tasks</label><input ref={inputRef} id="global-task-search" type="search" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Escape' && query) { event.preventDefault(); setQuery('') } }} placeholder="Search tasks, projects, tags…" autoComplete="off"/><kbd aria-hidden="true">Esc to clear</kbd>{query && <button type="button" className="icon-button" aria-label="Clear search" onClick={() => { setQuery(''); inputRef.current?.focus() }}><Icon name="close" size={16}/></button>}</div>
    {!normalizedQuery ? <div className="search-empty"><div className="empty-icon"><Icon name="search" size={22}/></div><h2>Search across your workspace</h2><p>Enter a title, detail, tag, project name, or status to find a task.</p></div> : results.length === 0 ? <div className="search-empty"><div className="empty-icon"><Icon name="search" size={22}/></div><h2>No tasks found</h2><p>Try a different word or check the spelling of “{normalizedQuery}”.</p></div> : <section className="search-results" aria-label="Task search results">
      <div className="search-results-heading"><h2>Results</h2><span>{results.length} task{results.length === 1 ? '' : 's'}</span></div>
      <ul>{results.map(({ task, project, statusLabel }) => <li key={`${project.id}-${task.id}`}><button type="button" className="search-result" onClick={() => onOpenTask(project, task)}>
        <span className="search-result-main"><strong>{task.title}</strong><span>{project.name}</span></span>
        <span className="search-result-status">{statusLabel}</span>
        <span className={`priority-label priority-${task.priority}`}>Priority: {priorityLabels[task.priority]}</span>
        {task.dueDate ? <span className="search-result-date">Due {formatTaskDueDate(task.dueDate)}</span> : <span className="search-result-date">No due date</span>}
        <Icon name="chevron" size={15}/>
      </button></li>)}</ul>
    </section>}
  </div>
}
