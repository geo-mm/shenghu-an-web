import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'

interface Option<T extends string> {
  value: T
  label: string
}

interface Props<T extends string> {
  value: T
  options: Option<T>[]
  onChange: (value: T) => void
  'aria-label'?: string
  'data-testid'?: string
  className?: string
}

/**
 * A dropdown in the game's style. Native <select> lists are drawn by the
 * operating system and can't be themed, so this is a button with a listbox.
 * The list is rendered on top of the page (portal, fixed position) so a
 * scrolling window doesn't clip it; it opens upwards near the bottom edge.
 * Keyboard: Enter/Space/↓ open, ↑/↓ move, Enter picks, Esc closes.
 */
export function Select<T extends string>({ value, options, onChange, className = '', ...aria }: Props<T>) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const root = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const [place, setPlace] = useState<CSSProperties>({})
  const listId = useId()
  const current = options.find((o) => o.value === value) ?? options[0]

  // Close when clicking anywhere else.
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node
      if (!root.current?.contains(target) && !list.current?.contains(target)) setOpen(false)
    }
    // The list is fixed to where the button was; close it if the page moves underneath.
    const onScroll = (e: Event) => {
      if (!list.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [open])

  const show = () => {
    const rect = root.current!.getBoundingClientRect()
    const below = window.innerHeight - rect.bottom
    setPlace({
      position: 'fixed',
      left: rect.left,
      minWidth: rect.width,
      ...(below < 260 && rect.top > below ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
    })
    setActive(Math.max(0, options.findIndex((o) => o.value === value)))
    setOpen(true)
  }
  const pick = (i: number) => {
    setOpen(false)
    if (options[i] && options[i].value !== value) onChange(options[i].value)
  }
  const onKeyDown = (e: KeyboardEvent) => {
    if (!open) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
        e.preventDefault()
        show()
      }
      return
    }
    if (e.key === 'Escape') setOpen(false)
    else if (e.key === 'ArrowDown') setActive((a) => Math.min(options.length - 1, a + 1))
    else if (e.key === 'ArrowUp') setActive((a) => Math.max(0, a - 1))
    else if (e.key === 'Enter' || e.key === ' ') pick(active)
    else return
    e.preventDefault()
  }

  return (
    <div className={`sj-select ${open ? 'open' : ''} ${className}`} ref={root}>
      <button
        type="button"
        className="sj-select-button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={aria['aria-label']}
        data-testid={aria['data-testid']}
        data-value={value}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKeyDown}
      >
        <span>{current?.label}</span>
        <span className="sj-select-arrow" aria-hidden>
          ▾
        </span>
      </button>
      {open &&
        createPortal(
          <ul className="sj-select-list" role="listbox" id={listId} aria-label={aria['aria-label']} ref={list} style={place}>
            {options.map((o, i) => (
              <li
                key={o.value}
                role="option"
                aria-selected={o.value === value}
                className={`${i === active ? 'active' : ''} ${o.value === value ? 'selected' : ''}`}
                data-value={o.value}
                onPointerEnter={() => setActive(i)}
                onClick={() => pick(i)}
              >
                {o.label}
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </div>
  )
}
