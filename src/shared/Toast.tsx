import { useEffect } from 'react'
import { Icon } from './Icon'

export function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    if (!message) return
    const timeout = window.setTimeout(onDismiss, 3600)
    return () => window.clearTimeout(timeout)
  }, [message, onDismiss])

  if (!message) return null
  return <div className="toast" role="status" aria-live="polite"><span className="toast-status" aria-hidden="true">✓</span><span>{message}</span><button type="button" aria-label="Dismiss notification" onClick={onDismiss}><Icon name="close" size={15}/></button></div>
}
