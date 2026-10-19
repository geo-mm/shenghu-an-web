import { useRef } from 'react'
import { buildingArt } from '../art'
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
  /** Card width, e.g. "280px" (the layout scales with it; effect text shows on large cards). */
  width?: string
}

/**
 * A card laid out like the physical one: cost medallions in the top corners,
 * art, name ribbon, effect text and the VP badge at the bottom.
 */
export function CardView({ id, selected, tag, hasGood, onClick, disabled, width }: Props) {
  const { t } = useI18n()
  const showInfo = useShowCardInfo()
  const pressTimer = useRef<number | undefined>(undefined)
  // Set when a long-press opened the details, so the click that follows is ignored.
  const longPressed = useRef(false)
  const style = width ? ({ '--card-w': width } as React.CSSProperties) : undefined

  if (id === HIDDEN_CARD)
    return (
      <div className="sj-card back" style={style} aria-label="Hidden card">
        <span className="sj-frame" aria-hidden />
      </div>
    )
  const def = cardDef(id)
  const [name, text] = t.cards[def.type]
  const art = buildingArt(def.type)
  const color = def.kind === 'production' ? def.good : def.monument ? 'monument' : def.bonus ? 'six' : 'violet'
  const className = `sj-card c-${color} ${selected ? 'selected' : ''} ${onClick && !disabled ? 'clickable' : ''}`

  const handlers = {
    title: `${name} — ${text}`,
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
      <span className="sj-frame" aria-hidden />
      <div className="sj-art">
        {art ? (
          <>
            {/* Blurred copy behind, sharp copy fading out from the centre: keeps busy backgrounds calm. */}
            <img className="sj-art-bg" src={art} alt="" draggable={false} loading="lazy" />
            <img className="sj-art-fg" src={art} alt="" draggable={false} loading="lazy" />
          </>
        ) : (
          <span className="sj-art-ph" aria-hidden />
        )}
      </div>
      <span className="sj-cost left" title={t.cost}>
        {def.cost}
      </span>
      <span className="sj-cost right" aria-hidden>
        {def.cost}
      </span>
      <div className="sj-name">
        <span>{name}</span>
      </div>
      <div className="sj-text">{text}</div>
      <span className="sj-vp" title={t.vp}>
        {def.bonus ? '?' : def.vp}
      </span>
      {hasGood && (
        <span className="sj-good" title={t.good}>
          {t.good}
        </span>
      )}
      {tag && <span className="sj-tag">{tag}</span>}
    </>
  )

  return onClick ? (
    <button
      type="button"
      className={className}
      style={style}
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
    <div className={className} style={style} {...handlers}>
      {content}
    </div>
  )
}
