import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { BUILDINGS, HIDDEN_CARD, cardDef, type CardId } from '../game/cards'
import { useI18n } from '../i18n/I18n'
import { MESSAGES } from '../i18n/messages'
import { CardView } from './CardView'

const CardInfoContext = createContext<(id: CardId) => void>(() => {})

/** Lets any card open a details dialog (right-click / long-press). */
export function useShowCardInfo() {
  return useContext(CardInfoContext)
}

export function CardInfoProvider({ children }: { children: ReactNode }) {
  const [card, setCard] = useState<CardId | null>(null)
  const show = (id: CardId) => {
    if (id !== HIDDEN_CARD) setCard(id)
  }
  return (
    <CardInfoContext.Provider value={show}>
      {children}
      {card !== null && <CardInfoDialog id={card} onClose={() => setCard(null)} />}
    </CardInfoContext.Provider>
  )
}

function CardInfoDialog({ id, onClose }: { id: CardId; onClose: () => void }) {
  const { t, lang } = useI18n()
  const def = cardDef(id)
  const [name, text] = t.cards[def.type]
  // Show the name in the other language too, to help players who know the game in another language.
  const otherName = MESSAGES[lang === 'en' ? 'zh-TW' : 'en'].cards[def.type][0]
  const kind = def.kind === 'production' ? 'production' : def.monument ? 'monument' : 'violet'
  const color = def.kind === 'production' ? def.good : def.monument ? 'monument' : def.bonus ? 'six' : 'violet'

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-backdrop" onClick={onClose} onContextMenu={(e) => e.preventDefault()}>
      <div
        className={`modal card-info c-${color}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-info-title"
        data-testid="card-info"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="card-info-card">
          <CardView id={id} width="min(240px, 70vw)" />
        </div>
        <h2 id="card-info-title">{name}</h2>
        <p className="muted">
          {otherName} · {t.kind[kind]}
        </p>
        <p className="card-info-text">{text}</p>
        <dl>
          <dt>{t.cost}</dt>
          <dd>{def.cost}</dd>
          <dt>{t.vp}</dt>
          <dd>{def.bonus ? t.vpVariable : def.vp}</dd>
          {def.good && (
            <>
              <dt>{t.produces}</dt>
              <dd>{t.goods[def.good]}</dd>
            </>
          )}
          <dt>{t.copies}</dt>
          <dd>
            {BUILDINGS[def.type].count}
            {BUILDINGS[def.type].expansion ? ` (+${BUILDINGS[def.type].expansion})` : ''}
          </dd>
        </dl>
        <button className="primary" onClick={onClose} autoFocus>
          {t.close}
        </button>
      </div>
    </div>
  )
}
