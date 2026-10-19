import { useState } from 'react'
import { roleArt } from '../art'
import { BUILDINGS, CARD_LIST, ROLES, type BuildingType } from '../game/cards'
import { useI18n } from '../i18n/I18n'
import { CardInfoProvider } from './CardInfo'
import { CardView } from './CardView'

/** One card id per building type, for showing each building once. */
const FIRST_CARD = Object.keys(BUILDINGS).map((t) => CARD_LIST.indexOf(t as BuildingType))

/**
 * Card gallery (open the app with ?gallery): every building and role, to
 * review new artwork at playing size and at full size.
 */
export function Gallery() {
  const { t } = useI18n()
  const [large, setLarge] = useState(false)
  return (
    <CardInfoProvider>
      <section className="panel gallery">
        <div className="gallery-head">
          <h2>{t.galleryTitle}</h2>
          <label>
            <input type="checkbox" checked={large} onChange={(e) => setLarge(e.target.checked)} /> {t.galleryLarge}
          </label>
        </div>
        <div className="cards-row gallery-cards">
          {FIRST_CARD.map((id) => (
            <CardView key={id} id={id} width={large ? '240px' : undefined} />
          ))}
          <CardView id={-1} width={large ? '240px' : undefined} />
        </div>
        <h3>{t.galleryRoles}</h3>
        <div className="roles">
          {ROLES.map((r) => (
            <div key={r} className="role">
              {roleArt(r) && <img className="role-art" src={roleArt(r)} alt="" />}
              <strong>{t.roles[r].name}</strong>
              <span className="small">{t.roles[r].privilege}</span>
            </div>
          ))}
          <div className="role">
            {roleArt('governor') && <img className="role-art" src={roleArt('governor')} alt="" />}
            <strong>{t.governor}</strong>
          </div>
        </div>
      </section>
    </CardInfoProvider>
  )
}
