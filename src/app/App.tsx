import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import type { ThemePreference } from '../types/theme'
import type { Project } from '../types/project'
import { readThemePreference, saveThemePreference } from '../services/themePreference'
import { sampleProjectIds } from '../services/projectStorage'
import { useProjects, type ProjectDraft } from '../hooks/useProjects'
import { useTasks, type TaskDraft } from '../hooks/useTasks'
import type { ChecklistItem, Task, TaskStatus } from '../types/task'
import { Icon } from '../shared/Icon'
import { Toast } from '../shared/Toast'
import { ProjectDeleteDialog, ProjectEditorDialog } from '../features/projects/ProjectDialogs'
import { ProjectTaskWorkspace, type ProjectTaskView, type ProjectWorkspaceCommand } from '../features/tasks/ProjectTaskWorkspace'
import { GlobalTaskSearch } from '../features/search/GlobalTaskSearch'
import { CommandPalette, type PaletteCommand } from '../features/commands/CommandPalette'
import { ShortcutHelpDialog } from '../features/commands/ShortcutHelpDialog'

type DialogState = { kind: 'create' } | { kind: 'edit' | 'delete'; project: Project }

const mainNav = [
  { label: 'Home', to: '/', icon: 'home' as const, end: true },
  { label: 'Search', to: '/search', icon: 'search' as const },
  { label: 'Settings', to: '/settings', icon: 'settings' as const },
]

function App() {
  const [theme, setTheme] = useState<ThemePreference>(readThemePreference)
  const [menuOpen, setMenuOpen] = useState(false)
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const [toast, setToast] = useState('')
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false)
  const [projectView, setProjectView] = useState<ProjectTaskView>('board')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const paletteTriggerRef = useRef<HTMLButtonElement>(null)
  const paletteReturnFocusRef = useRef<HTMLElement | null>(null)
  const shortcutReturnFocusRef = useRef<HTMLElement | null>(null)
  const { projects, orderedProjects, activeProjectId, createProject, updateProject, deleteProject, toggleFavorite, selectProject } = useProjects()
  const { tasks, createTask, updateTask, updateChecklist, deleteTask, removeProjectTasks, moveTask } = useTasks(projects)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    saveThemePreference(theme)
  }, [theme])

  useEffect(() => setMenuOpen(false), [location.pathname])
  useEffect(() => {
    const projectId = location.pathname.match(/^\/projects\/([^/]+)/)?.[1]
    if (!projectId) return
    selectProject(decodeURIComponent(projectId))
    const routeState = location.state as { projectView?: unknown } | null
    setProjectView(routeState?.projectView === 'list' ? 'list' : 'board')
  }, [location.key, location.pathname, location.state, selectProject])

  const navigateToSearch = useCallback(() => {
    navigate('/search')
    window.requestAnimationFrame(() => searchInputRef.current?.focus())
  }, [navigate])

  const openPalette = useCallback((trigger?: HTMLElement | null) => {
    const active = trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null)
    paletteReturnFocusRef.current = active && active !== document.body ? active : paletteTriggerRef.current
    setPaletteOpen(true)
  }, [])

  const closePalette = useCallback((restoreFocus: boolean) => {
    setPaletteOpen(false)
    if (restoreFocus) window.requestAnimationFrame(() => {
      if (paletteReturnFocusRef.current?.isConnected) paletteReturnFocusRef.current.focus()
    })
  }, [])

  const openShortcutHelp = useCallback((trigger?: HTMLElement | null) => {
    const active = trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null)
    shortcutReturnFocusRef.current = active && active !== document.body ? active : paletteTriggerRef.current
    setShortcutHelpOpen(true)
  }, [])

  const closeShortcutHelp = useCallback(() => {
    setShortcutHelpOpen(false)
    window.requestAnimationFrame(() => {
      if (shortcutReturnFocusRef.current?.isConnected) shortcutReturnFocusRef.current.focus()
    })
  }, [])

  const navigateToProjectCommand = useCallback((command: ProjectWorkspaceCommand) => {
    if (!activeProjectId) return
    navigate(`/projects/${encodeURIComponent(activeProjectId)}`, { state: { projectCommand: command, projectView } })
  }, [activeProjectId, navigate, projectView])

  const openActiveProjectView = useCallback((view: ProjectTaskView) => {
    if (!activeProjectId) return
    setProjectView(view)
    navigate(`/projects/${encodeURIComponent(activeProjectId)}`, { state: { projectView: view } })
  }, [activeProjectId, navigate])

  const consumeProjectCommand = useCallback(() => {
    const routeState = location.state as { projectCommand?: unknown; projectView?: unknown } | null
    if (!routeState?.projectCommand) return
    navigate(location.pathname, { replace: true, state: { projectView: routeState.projectView === 'list' ? 'list' : 'board' } })
  }, [location.pathname, location.state, navigate])

  useEffect(() => {
    function handleGlobalShortcuts(event: KeyboardEvent) {
      const key = event.key.toLowerCase()
      if (event.repeat) return
      const target = event.target instanceof Element ? event.target : null
      if (target?.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]')) return
      if (document.querySelector('dialog[open], [role="dialog"]')) return

      if (key === 'k' && (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey) {
        event.preventDefault()
        openPalette(target instanceof HTMLElement ? target : null)
      } else if (key === 'n' && (event.ctrlKey || event.metaKey) && event.altKey && !event.shiftKey && activeProjectId) {
        event.preventDefault()
        navigateToProjectCommand('create-task')
      } else if (event.key === '/' && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
        event.preventDefault()
        navigateToSearch()
      }
    }

    window.addEventListener('keydown', handleGlobalShortcuts)
    return () => window.removeEventListener('keydown', handleGlobalShortcuts)
  }, [activeProjectId, navigateToProjectCommand, navigateToSearch, openPalette])

  const closeDialog = useCallback(() => setDialog(null), [])
  const showToast = useCallback((message: string) => setToast(message), [])
  const taskSaved = useCallback((kind: 'created' | 'updated', persisted: boolean) => {
    const action = kind === 'created' ? 'created' : 'updated'
    showToast(persisted ? `Task ${action}.` : `Task ${action} for this session; device storage is unavailable.`)
  }, [showToast])
  const taskDeleted = useCallback((title: string, persisted: boolean) => {
    showToast(persisted ? `“${title}” deleted.` : 'Task deleted for this session; device storage is unavailable.')
  }, [showToast])
  const openCreate = useCallback(() => setDialog({ kind: 'create' }), [])
  const openEdit = useCallback((project: Project) => setDialog({ kind: 'edit', project }), [])
  const openDelete = useCallback((project: Project) => setDialog({ kind: 'delete', project }), [])

  const saveDraft = useCallback((draft: ProjectDraft) => {
    if (!dialog) return
    if (dialog.kind === 'edit') {
      const result = updateProject(dialog.project.id, draft)
      closeDialog()
      if (result.changed) showToast(result.persisted ? 'Project updated.' : 'Project updated for this session; device storage is unavailable.')
      return
    }
    if (dialog.kind === 'create') {
      const result = createProject(draft)
      closeDialog()
      navigate(`/projects/${result.project.id}`)
      showToast(result.persisted ? 'Project created.' : 'Project created for this session; device storage is unavailable.')
    }
  }, [closeDialog, createProject, dialog, navigate, showToast, updateProject])

  const confirmDelete = useCallback((project: Project) => {
    const result = deleteProject(project.id)
    closeDialog()
    if (!result.changed) return
    removeProjectTasks(project.id)
    navigate(result.nextId ? `/projects/${result.nextId}` : '/')
    showToast(result.persisted ? `“${project.name}” deleted.` : 'Project deleted for this session; device storage is unavailable.')
  }, [closeDialog, deleteProject, navigate, removeProjectTasks, showToast])

  const openProject = useCallback((project: Project) => {
    selectProject(project.id)
    navigate(`/projects/${project.id}`)
  }, [navigate, selectProject])

  const activeProject = projects.find(project => project.id === activeProjectId) ?? null
  const projectPathId = location.pathname.match(/^\/projects\/([^/]+)/)?.[1]
  const currentProjectId = projectPathId ? decodeURIComponent(projectPathId) : null
  const canClearProjectFilters = Boolean(activeProject && currentProjectId === activeProject.id)
  const paletteCommands = useMemo<PaletteCommand[]>(() => [
    {
      id: 'create-task', label: 'Create task in active project', group: 'Create', keywords: ['new task', 'add task'], shortcutHint: 'Ctrl+Alt+N / ⌘⌥N',
      disabledReason: activeProject ? undefined : 'Create a project first to add a task.', action: () => navigateToProjectCommand('create-task'),
    },
    { id: 'create-project', label: 'Create project', group: 'Create', keywords: ['new project', 'add project'], action: openCreate },
    { id: 'focus-search', label: 'Focus global search', group: 'Navigation', keywords: ['find task', 'search'], shortcutHint: '/', action: navigateToSearch },
    { id: 'home', label: 'Open Home', group: 'Navigation', keywords: ['workspace', 'projects'], action: () => navigate('/') },
    {
      id: 'open-board', label: 'Open active project Board view', group: 'Project', keywords: ['kanban', 'board'],
      disabledReason: activeProject ? undefined : 'Create or select a project first.', action: () => openActiveProjectView('board'),
    },
    {
      id: 'open-list', label: 'Open active project List view', group: 'Project', keywords: ['tasks', 'list'],
      disabledReason: activeProject ? undefined : 'Create or select a project first.', action: () => openActiveProjectView('list'),
    },
    {
      id: 'toggle-view', label: 'Toggle between Board and List', group: 'Project', keywords: ['switch view', 'board', 'list'],
      disabledReason: activeProject ? undefined : 'Create or select a project first.', action: () => openActiveProjectView(projectView === 'board' ? 'list' : 'board'),
    },
    {
      id: 'toggle-theme', label: 'Toggle light / dark theme', group: 'Appearance', keywords: ['appearance', 'color theme'],
      action: () => {
        const current = theme === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme
        setTheme(current === 'dark' ? 'light' : 'dark')
      },
    },
    {
      id: 'clear-filters', label: 'Clear project filters', group: 'Project', keywords: ['reset filters', 'show all tasks'],
      disabledReason: canClearProjectFilters ? undefined : 'Open the active project first to clear its filters.', action: () => navigateToProjectCommand('clear-filters'),
    },
    { id: 'settings', label: 'Open Settings', group: 'Navigation', keywords: ['preferences', 'appearance'], action: () => navigate('/settings') },
    { id: 'shortcut-help', label: 'Show keyboard shortcut help', group: 'Help', keywords: ['shortcuts', 'keyboard reference'], action: () => openShortcutHelp(paletteReturnFocusRef.current) },
  ], [activeProject, canClearProjectFilters, navigate, navigateToProjectCommand, navigateToSearch, openActiveProjectView, openCreate, openShortcutHelp, projectView, theme])

  const runPaletteCommand = useCallback((command: PaletteCommand) => {
    closePalette(false)
    command.action()
  }, [closePalette])

  return (
    <div className="app-shell">
      {menuOpen && <button className="scrim" aria-label="Close navigation menu" onClick={() => setMenuOpen(false)} />}
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`} aria-label="Primary navigation">
        <div className="brand"><span className="brand-mark"><Icon name="spark" size={20} /></span><span>flowboard</span></div>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="primary-nav" aria-label="Main navigation">
          {mainNav.slice(0, 1).map(item => <NavLink key={item.label} to={item.to} end={item.end} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}><Icon name={item.icon} /><span>{item.label}</span></NavLink>)}
          <NavLink to={projects.length ? `/projects/${activeProjectId ?? orderedProjects[0].id}` : '/'} className={({ isActive }) => `nav-link${isActive && location.pathname.startsWith('/projects') ? ' active' : ''}`}><Icon name="projects" /><span>Projects</span></NavLink>
          {mainNav.slice(1).map(item => <NavLink key={item.label} to={item.to} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}><Icon name={item.icon} /><span>{item.label}</span></NavLink>)}
        </nav>
        <div className="section-heading"><span>YOUR PROJECTS</span><span className="sample-tag">{projects.some(project => sampleProjectIds.has(project.id)) ? 'SAMPLE' : 'LOCAL'}</span></div>
        {orderedProjects.some(project => project.favorite) && <div className="project-group-label">FAVORITES</div>}
        {orderedProjects.filter(project => project.favorite).map(project => <SidebarProject key={project.id} project={project} active={activeProjectId === project.id} onSelect={openProject} />)}
        {orderedProjects.some(project => !project.favorite) && <div className="project-group-label">ALL PROJECTS</div>}
        {orderedProjects.filter(project => !project.favorite).map(project => <SidebarProject key={project.id} project={project} active={activeProjectId === project.id} onSelect={openProject} />)}
        {projects.length === 0 && <div className="sidebar-empty">No saved projects yet.</div>}
        <button className="sidebar-new-project" type="button" onClick={openCreate}><Icon name="plus" size={15}/>New project</button>
        <div className="sidebar-note">{projects.some(project => sampleProjectIds.has(project.id)) ? 'Sample projects are included for preview.' : 'Projects are stored on this device.'}</div>
        <div className="sidebar-bottom"><div className="avatar" aria-hidden="true">Y</div><div className="profile-copy"><strong>Your workspace</strong><span>Personal account</span></div><span className="version-label">V1</span></div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><Icon name={menuOpen ? 'close' : 'menu'} /></button>
          <div className="breadcrumb"><span>Workspace</span><Icon name="chevron" size={14}/><strong>{location.pathname.startsWith('/projects') ? 'Project workspace' : location.pathname === '/search' ? 'Search' : location.pathname === '/settings' ? 'Settings' : 'Home'}</strong></div>
          <button className="icon-button global-search-trigger" type="button" aria-label="Search tasks" aria-keyshortcuts="/" title="Search tasks ( / )" onClick={navigateToSearch}><Icon name="search" size={17}/></button>
          <button ref={paletteTriggerRef} className="icon-button command-palette-trigger" type="button" aria-label="Open command palette" aria-keyshortcuts="Control+k Meta+k" title="Command palette (Ctrl+K / ⌘K)" onClick={event => openPalette(event.currentTarget)}><Icon name="spark" size={17}/></button>
          <button className="button button-primary topbar-create" type="button" onClick={openCreate}><Icon name="plus" size={16}/>New project</button>
        </header>
        <main id="main-content" className="main-content" tabIndex={-1}>
          <Routes>
            <Route path="/" element={<HomePage projects={orderedProjects} activeProjectId={activeProjectId} onOpen={openProject} onCreate={openCreate} onEdit={openEdit} onDelete={openDelete} onFavorite={toggleFavorite} />} />
            <Route path="/projects/:projectId" element={<ProjectPage projects={projects} tasks={tasks} activeProjectId={activeProjectId} projectView={projectView} onProjectViewChange={setProjectView} onConsumeRouteCommand={consumeProjectCommand} onCreateTask={createTask} onUpdateTask={updateTask} onChecklistChange={updateChecklist} onDeleteTask={deleteTask} onMoveTask={moveTask} onTaskSaved={taskSaved} onTaskDeleted={taskDeleted} onOpen={openProject} onEdit={openEdit} onDelete={openDelete} onFavorite={toggleFavorite} />} />
            <Route path="/search" element={<GlobalTaskSearch projects={projects} tasks={tasks} inputRef={searchInputRef} onOpenTask={(project, task) => navigate(`/projects/${project.id}`, { state: { openTaskId: task.id } })} />} />
            <Route path="/settings" element={<SettingsPage theme={theme} onThemeChange={setTheme} onOpenShortcuts={openShortcutHelp} />} />
            <Route path="*" element={<PlaceholderPage eyebrow="NOT FOUND" title="This page isn’t here" text="The address may be incorrect, or this area may not be part of the current foundation." icon="home" />} />
          </Routes>
        </main>
      </div>
      {dialog?.kind === 'create' && <ProjectEditorDialog onClose={closeDialog} onSave={saveDraft} />}
      {dialog?.kind === 'edit' && <ProjectEditorDialog project={dialog.project} onClose={closeDialog} onSave={saveDraft} />}
      {dialog?.kind === 'delete' && <ProjectDeleteDialog project={dialog.project} onClose={closeDialog} onDelete={() => confirmDelete(dialog.project)} />}
      {paletteOpen && <CommandPalette commands={paletteCommands} onClose={closePalette} onRun={runPaletteCommand} />}
      {shortcutHelpOpen && <ShortcutHelpDialog onClose={closeShortcutHelp} />}
      <Toast message={toast} onDismiss={() => setToast('')} />
    </div>
  )
}

function SidebarProject({ project, active, onSelect }: { project: Project; active: boolean; onSelect: (project: Project) => void }) {
  return <button type="button" className={`project-link${active ? ' active' : ''}`} aria-current={active ? 'page' : undefined} onClick={() => onSelect(project)}><span className="project-dot"/><span>{project.name}</span></button>
}

function PageIntro({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return <div className="page-intro"><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{children}</p></div>
}

interface ProjectActions {
  onOpen: (project: Project) => void
  onEdit: (project: Project) => void
  onDelete: (project: Project) => void
  onFavorite: (id: string) => unknown
}

function HomePage({ projects, activeProjectId, onOpen, onCreate, onEdit, onDelete, onFavorite }: ProjectActions & { projects: Project[]; activeProjectId: string | null; onCreate: () => void }) {
  return <div className="page-wrap">
    <PageIntro eyebrow="YOUR WORKSPACE" title="A little more clarity.">Keep your projects together in one focused place. Create a project to give your work a home.</PageIntro>
    <section className="welcome-card" aria-labelledby="welcome-title"><div className="welcome-content"><div className="card-kicker"><span className="sparkle-small"><Icon name="spark" size={15}/></span> YOUR WORKSPACE, AT A GLANCE</div><h2 id="welcome-title">A calm place to get things moving.</h2><p>Your project list is stored on this device and ready for the work you bring to it.</p><span className="preview-label">PROJECT WORKSPACE</span></div><div className="welcome-art" aria-hidden="true"><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="art-card"><span className="art-icon"><Icon name="projects" size={20}/></span><div className="art-lines"><i/><i/><i/></div><span className="art-check">✓</span></div><div className="art-spark"><Icon name="spark" size={25}/></div></div></section>
    <section className="section-block" aria-labelledby="projects-heading"><div className="section-title-row"><div><div className="eyebrow">YOUR WORK</div><h2 id="projects-heading">Projects <span className="count-pill">{projects.length}</span></h2></div><button type="button" className="button button-secondary" onClick={onCreate}><Icon name="plus" size={15}/>New project</button></div>
      {projects.length ? <div className="project-list">{projects.map(project => <ProjectCard key={project.id} project={project} active={activeProjectId === project.id} {...{ onOpen, onEdit, onDelete, onFavorite }} />)}</div> : <div className="project-empty"><div className="empty-icon"><Icon name="projects" size={23}/></div><h2>No projects yet</h2><p>Create a project to start organizing your work.</p><button type="button" className="button button-primary" onClick={onCreate}><Icon name="plus" size={15}/>Create your first project</button></div>}
    </section>
  </div>
}

function ProjectCard({ project, active, onOpen, onEdit, onDelete, onFavorite }: ProjectActions & { project: Project; active: boolean }) {
  const sample = sampleProjectIds.has(project.id)
  return <article className={`project-preview project-card${active ? ' selected' : ''}`}>
    <div className="project-symbol"><Icon name="projects"/></div>
    <div className="project-preview-copy"><strong>{project.name}</strong><span>{project.description || 'No description added.'}</span>{sample && <small className="sample-inline">Sample project</small>}</div>
    <div className="project-card-actions">
      <button type="button" className={`icon-button action-button${project.favorite ? ' favorite-on' : ''}`} aria-label={`${project.favorite ? 'Remove' : 'Add'} ${project.name} ${project.favorite ? 'from' : 'to'} favorites`} aria-pressed={project.favorite} title={project.favorite ? 'Remove from favorites' : 'Add to favorites'} onClick={() => onFavorite(project.id)}><Icon name="star" size={17}/></button>
      <button type="button" className="icon-button action-button" aria-label={`Edit ${project.name}`} title="Edit project" onClick={() => onEdit(project)}><Icon name="edit" size={16}/></button>
      <button type="button" className="icon-button action-button delete-action" aria-label={`Delete ${project.name}`} title="Delete project" onClick={() => onDelete(project)}><Icon name="trash" size={16}/></button>
      <button type="button" className="button button-secondary open-project-button" onClick={() => onOpen(project)}>Open project<Icon name="chevron" size={14}/></button>
    </div>
  </article>
}

function ProjectPage({ projects, tasks, activeProjectId, projectView, onProjectViewChange, onConsumeRouteCommand, onCreateTask, onUpdateTask, onChecklistChange, onDeleteTask, onMoveTask, onTaskSaved, onTaskDeleted, onOpen, onEdit, onDelete, onFavorite }: ProjectActions & { projects: Project[]; tasks: Task[]; activeProjectId: string | null; projectView: ProjectTaskView; onProjectViewChange: (view: ProjectTaskView) => void; onConsumeRouteCommand: () => void; onCreateTask: (projectId: string, draft: TaskDraft) => { task: Task | null; persisted: boolean }; onUpdateTask: (taskId: string, projectId: string, draft: TaskDraft) => { task: Task | null; persisted: boolean }; onChecklistChange: (taskId: string, projectId: string, checklist: ChecklistItem[]) => { updated: boolean; persisted: boolean }; onDeleteTask: (taskId: string, projectId: string) => { deleted: boolean; persisted: boolean }; onMoveTask: (taskId: string, projectId: string, status: TaskStatus, position: number) => { moved: boolean; persisted: boolean }; onTaskSaved: (kind: 'created' | 'updated', persisted: boolean) => void; onTaskDeleted: (title: string, persisted: boolean) => void }) {
  const { projectId } = useParams()
  const routeLocation = useLocation()
  const routeState = routeLocation.state as { openTaskId?: unknown; projectCommand?: unknown } | null
  const initialTaskId = typeof routeState?.openTaskId === 'string' ? routeState.openTaskId : null
  const projectCommand: ProjectWorkspaceCommand | null = routeState?.projectCommand === 'create-task' || routeState?.projectCommand === 'clear-filters' ? routeState.projectCommand : null
  const project = projects.find(item => item.id === projectId)
  if (!project) return <div className="page-wrap"><PageIntro eyebrow="PROJECT WORKSPACE" title="Project not found">No saved project matches this address. Choose an existing project or return to your workspace.</PageIntro><div className="empty-panel"><div className="empty-icon"><Icon name="projects" size={23}/></div><h2>There is no project data here</h2><p>The project may have been deleted or the address may be outdated.</p><Link className="button button-primary" to="/">Back to Home</Link></div></div>
  return <div className="page-wrap">
    <PageIntro eyebrow={sampleProjectIds.has(project.id) ? 'SAMPLE PROJECT' : 'PROJECT WORKSPACE'} title={project.name}>{project.description || 'No description added.'}</PageIntro>
    <div className="project-toolbar"><span className="project-state">{activeProjectId === project.id ? 'Selected project' : 'Project'}</span><div className="project-toolbar-actions"><button type="button" className={`button button-secondary${project.favorite ? ' favorite-on' : ''}`} aria-label={`${project.favorite ? 'Remove' : 'Add'} ${project.name} ${project.favorite ? 'from' : 'to'} favorites`} aria-pressed={project.favorite} onClick={() => onFavorite(project.id)}><Icon name="star" size={15}/>{project.favorite ? 'Favorited' : 'Add to favorites'}</button><button type="button" className="button button-secondary" onClick={() => onEdit(project)}><Icon name="edit" size={15}/>Edit</button><button type="button" className="button button-danger-outline" onClick={() => onDelete(project)}><Icon name="trash" size={15}/>Delete</button></div></div>
    <ProjectTaskWorkspace key={project.id} project={project} tasks={tasks.filter(task => task.projectId === project.id)} initialTaskId={initialTaskId} view={projectView} onViewChange={onProjectViewChange} routeCommand={projectCommand} routeCommandKey={routeLocation.key} onConsumeRouteCommand={onConsumeRouteCommand} onCreateTask={onCreateTask} onUpdateTask={onUpdateTask} onChecklistChange={onChecklistChange} onDeleteTask={onDeleteTask} onMoveTask={onMoveTask} onTaskSaved={onTaskSaved} onTaskDeleted={onTaskDeleted} />
    {projects.length > 1 && <section className="section-block" aria-labelledby="switch-project-heading"><div className="section-title-row"><div><div className="eyebrow">SWITCH WORKSPACE</div><h2 id="switch-project-heading">Other projects</h2></div></div><div className="project-list">{projects.filter(item => item.id !== project.id).map(item => <ProjectCard key={item.id} project={item} active={activeProjectId === item.id} {...{ onOpen, onEdit, onDelete, onFavorite }} />)}</div></section>}
  </div>
}

function PlaceholderPage({ eyebrow, title, text, icon }: { eyebrow: string; title: string; text: string; icon: 'search' | 'home' }) {
  return <div className="page-wrap"><PageIntro eyebrow={eyebrow} title={title}>{text}</PageIntro><div className="empty-panel"><div className="empty-icon"><Icon name={icon} size={23}/></div><h2>Coming in a future step</h2><p>This page is part of the application shell. Its tools are not implemented yet.</p><span className="preview-label">PLACEHOLDER</span></div></div>
}

function SettingsPage({ theme, onThemeChange, onOpenShortcuts }: { theme: ThemePreference; onThemeChange: (theme: ThemePreference) => void; onOpenShortcuts: (trigger?: HTMLElement | null) => void }) {
  const options: { value: ThemePreference; label: string; description: string; icon: 'sun' | 'moon' | 'monitor' }[] = [
    { value: 'light', label: 'Light', description: 'A bright, clear workspace.', icon: 'sun' },
    { value: 'dark', label: 'Dark', description: 'Easy on the eyes in low light.', icon: 'moon' },
    { value: 'system', label: 'System', description: 'Follow your device appearance.', icon: 'monitor' },
  ]
  return <div className="page-wrap"><PageIntro eyebrow="PREFERENCES" title="Settings">A few ways to make this workspace feel like yours.</PageIntro><section className="settings-card" aria-labelledby="appearance-title"><div className="settings-heading"><div className="settings-icon"><Icon name="sun"/></div><div><h2 id="appearance-title">Appearance</h2><p>Choose how FlowBoard looks on this device.</p></div></div><fieldset className="theme-options"><legend>Color theme</legend>{options.map(option => <label key={option.value} className={`theme-option${theme === option.value ? ' selected' : ''}`}><input type="radio" name="theme" value={option.value} checked={theme === option.value} onChange={() => onThemeChange(option.value)}/><span className="theme-icon"><Icon name={option.icon}/></span><span className="theme-copy"><strong>{option.label}</strong><small>{option.description}</small></span><span className="radio-mark"/></label>)}</fieldset><p className="settings-footnote">Your choice is saved on this device.</p></section><section className="settings-shortcuts" aria-labelledby="settings-shortcuts-title"><div><h2 id="settings-shortcuts-title">Keyboard shortcuts</h2><p>View the shortcuts for search, tasks, and command navigation.</p></div><button type="button" className="button button-secondary" onClick={event => onOpenShortcuts(event.currentTarget)}>View shortcuts</button></section><div className="foundation-note"><span className="note-icon"><Icon name="spark" size={17}/></span><p><strong>More settings will follow.</strong> This foundation step includes appearance only.</p></div></div>
}

export default App
