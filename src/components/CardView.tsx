import { useRef } from 'react'
import { HIDDEN_CARD, cardDef, type CardId } from '../game/cards'
import { useI18n } from '../i18n/I18n'
import { useShowCardInfo } from './CardInfo'

const LONG_PRESS_MS = 500

interface Props {
  id: CardId
  selected?: boolean
  /** Visual tag, e.g. "build" for the card being built (already translated). */
  tag?: string
  hasGood?: boolean
  onClick?: () => void
  disabled?: boolean
}

export function CardView({ id, selected, tag, hasGood, onClick, disabled }: Props) {
  const { t } = useI18n()
  const showInfo = useShowCardInfo()
  const pressTimer = useRef<number | undefined>(undefined)
  // Set when a long-press opened the details, so the click that follows is ignored.
  const longPressed = useRef(false)

  if (id === HIDDEN_CARD) return <div className="sj-card back" aria-label="Hidden card" />
  const def = cardDef(id)
  const [name, text] = t.cards[def.type]
  const color = def.kind === 'production' ? def.good : def.monument ? 'monument' : def.bonus ? 'six' : 'violet'
  const className = `sj-card c-${color} ${selected ? 'selected' : ''} ${onClick && !disabled ? 'clickable' : ''}`

  const handlers = {
    title: text,
    'data-card': def.type,
    onContextMenu: (e: React.MouseEvent) => {
      // Right-click (and long-press on Android) opens the card details.
      e.preventDefault()
      showInfo(id)
    },
    // iOS Safari doesn't fire contextmenu on long-press, so time it ourselves.
    onTouchStart: () => {
      longPressed.current = false
      pressTimer.current = window.setTimeout(() => {
        longPressed.current = true
        showInfo(id)
      }, LONG_PRESS_MS)
    },
    onTouchEnd: () => window.clearTimeout(pressTimer.current),
    onTouchMove: () => window.clearTimeout(pressTimer.current),
  }

  const content = (
    <>
      <div className="sj-card-top">
        <span className="cost" title={t.cost}>
          {def.cost}
        </span>
        <span className="vp" title={t.vp}>
          {def.bonus ? '?' : def.vp}★
        </span>
      </div>
      <div className="sj-card-name">{name}</div>
      {hasGood && <div className="sj-good">● {t.good}</div>}
      {tag && <div className="sj-tag">{tag}</div>}
    </>
  )

  return onClick ? (
    <button
      type="button"
      className={className}
      disabled={disabled}
      {...handlers}
      onClick={() => {
        if (longPressed.current) {
          longPressed.current = false
          return
        }
        onClick()
      }}
    >
      {content}
    </button>
  ) : (
    <div className={className} {...handlers}>
      {content}
    </div>
  )
}
