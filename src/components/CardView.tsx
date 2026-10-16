import { HIDDEN_CARD, cardDef, type CardId } from '../game/cards'

interface Props {
  id: CardId
  selected?: boolean
  /** Visual tag, e.g. "build" for the card being built. */
  tag?: string
  hasGood?: boolean
  onClick?: () => void
  disabled?: boolean
}

export function CardView({ id, selected, tag, hasGood, onClick, disabled }: Props) {
  if (id === HIDDEN_CARD) return <div className="sj-card back" aria-label="Hidden card" />
  const def = cardDef(id)
  const color = def.kind === 'production' ? def.good : def.monument ? 'monument' : def.cost === 6 ? 'six' : 'violet'
  const className = `sj-card c-${color} ${selected ? 'selected' : ''} ${onClick && !disabled ? 'clickable' : ''}`
  const content = (
    <>
      <div className="sj-card-top">
        <span className="cost" title="Cost">{def.cost}</span>
        <span className="vp" title="Victory points">{def.cost === 6 ? '?' : def.vp}★</span>
      </div>
      <div className="sj-card-name">{def.name}</div>
      <div className="sj-card-zh">{def.nameZh}</div>
      {hasGood && <div className="sj-good" title="Good">● good</div>}
      {tag && <div className="sj-tag">{tag}</div>}
    </>
  )
  return onClick ? (
    <button type="button" className={className} title={def.text} onClick={onClick} disabled={disabled}>
      {content}
    </button>
  ) : (
    <div className={className} title={def.text}>
      {content}
    </div>
  )
}
