import { useEffect, useRef } from 'react'

interface ShortcutHelpDialogProps {
  onClose: () => void
}

const shortcutGroups = [
  {
    title: 'Workspace',
    rows: [
      ['Open command palette', 'Ctrl+K / ⌘K'],
      ['Focus global task search', '/'],
      ['Create a task in the active project', 'Ctrl+Alt+N / ⌘⌥N'],
    ],
  },
  {
    title: 'Command palette',
    rows: [
      ['Move through commands', '↑ / ↓'],
      ['Run the selected command', 'Enter'],
      ['Close the palette or dialog', 'Escape'],
      ['Open Board or List view', 'Ctrl+K / ⌘K, then choose a view'],
      ['Toggle Board / List view', 'Ctrl+K / ⌘K, then choose Toggle view'],
    ],
  },
]

export function ShortcutHelpDialog({ onClose }: ShortcutHelpDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    dialog.showModal()
    closeButtonRef.current?.focus()
    return () => dialog.close()
  }, [])

  return <dialog ref={dialogRef} className="shortcut-help-dialog" aria-labelledby="shortcut-help-title" onCancel={event => { event.preventDefault(); onClose() }} onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    <div className="shortcut-help-content">
      <header className="shortcut-help-heading"><div><div className="eyebrow">QUICK REFERENCE</div><h2 id="shortcut-help-title">Keyboard shortcuts</h2><p>Shortcuts available in FlowBoard and its command palette.</p></div><button ref={closeButtonRef} type="button" className="icon-button" aria-label="Close keyboard shortcuts" onClick={onClose}>×</button></header>
      {shortcutGroups.map(group => <section className="shortcut-group" key={group.title} aria-labelledby={`shortcut-group-${group.title.toLowerCase().replaceAll(' ', '-')}`}><h3 id={`shortcut-group-${group.title.toLowerCase().replaceAll(' ', '-')}`}>{group.title}</h3><dl>{group.rows.map(([label, shortcut]) => <div key={label}><dt>{label}</dt><dd>{shortcut.split(' / ').map(part => <kbd key={part}>{part}</kbd>)}</dd></div>)}</dl></section>)}
      <p className="shortcut-note">Text shortcuts are ignored while you type in a field or while a dialog is open.</p>
      <div className="shortcut-help-actions"><button type="button" className="button button-primary" onClick={onClose}>Done</button></div>
    </div>
  </dialog>
}
