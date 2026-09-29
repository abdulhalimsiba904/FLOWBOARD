import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Icon } from '../../shared/Icon'
import { normalizeSearchText } from '../../utils/taskSelectors'

export interface PaletteCommand {
  id: string
  label: string
  keywords: string[]
  group: string
  shortcutHint?: string
  disabledReason?: string
  action: () => void
}

interface CommandPaletteProps {
  commands: PaletteCommand[]
  onClose: (restoreFocus: boolean) => void
  onRun: (command: PaletteCommand) => void
}

export function CommandPalette({ commands, onClose, onRun }: CommandPaletteProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const normalizedQuery = normalizeSearchText(query)
  const filtered = useMemo(() => commands.filter(command => !normalizedQuery || normalizeSearchText(`${command.label} ${command.group} ${command.keywords.join(' ')}`).includes(normalizedQuery)), [commands, normalizedQuery])
  const selectable = filtered.filter(command => !command.disabledReason)
  const activeCommand = selectable.find(command => command.id === activeId) ?? selectable[0]

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    dialog.showModal()
    inputRef.current?.focus()
    return () => dialog.close()
  }, [])

  useEffect(() => {
    if (!activeCommand) return
    document.getElementById(`palette-command-${activeCommand.id}`)?.scrollIntoView({ block: 'nearest' })
  }, [activeCommand?.id])

  function moveSelection(direction: 1 | -1) {
    if (selectable.length === 0) return
    const currentIndex = selectable.findIndex(command => command.id === activeCommand?.id)
    const nextIndex = currentIndex < 0
      ? direction > 0 ? 0 : selectable.length - 1
      : (currentIndex + direction + selectable.length) % selectable.length
    setActiveId(selectable[nextIndex].id)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      moveSelection(1)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      moveSelection(-1)
    } else if (event.key === 'Enter' && activeCommand) {
      event.preventDefault()
      onRun(activeCommand)
    }
  }

  const groups = [...new Set(filtered.map(command => command.group))]

  return <dialog ref={dialogRef} className="command-palette-dialog" aria-labelledby="command-palette-title" onCancel={event => { event.preventDefault(); onClose(true) }} onClick={event => { if (event.target === event.currentTarget) onClose(true) }}>
    <div className="command-palette">
      <h2 id="command-palette-title" className="sr-only">Command palette</h2>
      <div className="command-palette-search"><Icon name="search" size={19}/><label className="sr-only" htmlFor="command-palette-search">Search commands</label><input ref={inputRef} id="command-palette-search" type="search" placeholder="Search commands…" value={query} onChange={event => { setQuery(event.target.value); setActiveId(null) }} onKeyDown={handleKeyDown} autoComplete="off" aria-controls="command-palette-results" aria-activedescendant={activeCommand ? `palette-command-${activeCommand.id}` : undefined}/><kbd>Esc</kbd><button type="button" className="icon-button" aria-label="Close command palette" onClick={() => onClose(true)}><Icon name="close" size={16}/></button></div>
      {!normalizedQuery && <p className="command-palette-prompt">Choose a command or type to search. Use the arrow keys to move through the list.</p>}
      <div id="command-palette-results" className="command-palette-results" role="listbox" aria-label="Available commands" aria-live="polite">
        {filtered.length === 0 ? <div className="command-palette-empty"><strong>No matching commands</strong><span>Try another search term.</span></div> : groups.map(group => <div className="command-group" key={group} role="group" aria-label={group}>
          <h3>{group}</h3>
          {filtered.filter(command => command.group === group).map(command => {
            const selected = activeCommand?.id === command.id
            return <div id={`palette-command-${command.id}`} key={command.id} role="option" aria-selected={selected} aria-disabled={Boolean(command.disabledReason)} className={`command-option${selected ? ' command-option-selected' : ''}${command.disabledReason ? ' command-option-disabled' : ''}`} onMouseEnter={() => { if (!command.disabledReason) setActiveId(command.id) }} onMouseDown={event => event.preventDefault()} onClick={() => { if (!command.disabledReason) onRun(command) }}>
              <span className="command-option-label">{command.label}{command.disabledReason && <small>{command.disabledReason}</small>}</span>
              {command.shortcutHint && <kbd>{command.shortcutHint}</kbd>}
              {!command.shortcutHint && <Icon name="chevron" size={14}/>}
            </div>
          })}
        </div>)}
      </div>
      <footer className="command-palette-footer"><span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span><span><kbd>Enter</kbd> Run</span><span><kbd>Esc</kbd> Close</span></footer>
    </div>
  </dialog>
}
