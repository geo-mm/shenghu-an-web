import { createContext, useContext, useState, type ReactNode } from 'react'
import { combosFor, phaseBoosts } from '../game/combos'
import type { EngineCtx } from '../game/engine'
import type { PlayerID, PlayerState, SanJuanState } from '../game/state'
import { BUILDINGS, type BuildingType, type RoleId } from '../game/cards'
import { useI18n } from '../i18n/I18n'

const STORAGE_KEY = 'sanjuan-hints'

const HintsContext = createContext<[boolean, (on: boolean) => void]>([true, () => {}])

/** Whether combo hints are shown (on by default; remembered per browser). */
export function HintsProvider({ children }: { children: ReactNode }) {
  const [on, setOn] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) !== 'off'
    } catch {
      return true
    }
  })
  const set = (value: boolean) => {
    setOn(value)
    try {
      localStorage.setItem(STORAGE_KEY, value ? 'on' : 'off')
    } catch {
      // Not remembered in private mode etc.
    }
  }
  return <HintsContext.Provider value={[on, set]}>{children}</HintsContext.Provider>
}

export const useHints = () => useContext(HintsContext)

/** The header switch. */
export function HintsToggle() {
  const { t } = useI18n()
  const [on, setOn] = useHints()
  return (
    <label className="hints-toggle" title={t.hintsToggleTitle}>
      <input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} data-testid="hints-toggle" />
      <span aria-hidden>💡</span> <span className="hints-label">{t.hintsToggle}</span>
    </label>
  )
}

/** "Produce up to 3: base 1, privilege +1, aqueduct +1…" for `p` in a role phase. */
export function PhaseHints({ G, ctx, p, role, asChooser }: { G: SanJuanState; ctx: EngineCtx; p: PlayerID; role: RoleId; asChooser: boolean }) {
  const { t } = useI18n()
  const boosts = phaseBoosts(G, ctx, p, role, asChooser)
  const name = (s: string) => (s in BUILDINGS ? t.cards[s as BuildingType][0] : '')
  if (boosts.sources.length === 0) return null
  return (
    <div className="phase-hints" data-testid="phase-hints">
      <strong>💡 {t.phaseHintsTitle}</strong>
      {boosts.total && (role !== 'builder' || boosts.total.a > 0) && <span> · {t.boostTotal(role, boosts.total.a, boosts.total.b)}</span>}
      <ul>
        {boosts.sources.map((s, i) => (
          <li key={i}>{t.boost(role, s.source, s.amount, name(s.source))}</li>
        ))}
      </ul>
    </div>
  )
}

/** For a role tile: what choosing it would give `p` (a headline, and every source for the tooltip). */
export function useRoleHint() {
  const { t } = useI18n()
  return (G: SanJuanState, ctx: EngineCtx, p: PlayerID, role: RoleId) => {
    const boosts = phaseBoosts(G, ctx, p, role, true)
    const name = (s: string) => (s in BUILDINGS ? t.cards[s as BuildingType][0] : '')
    const fromBuildings = boosts.sources.some((s) => s.source !== 'base' && s.source !== 'privilege')
    return {
      head: (boosts.total ? t.boostTotal(role, boosts.total.a, boosts.total.b) : '') + (fromBuildings ? ' ✦' : ''),
      details: boosts.sources.map((s) => t.boost(role, s.source, s.amount, name(s.source))),
    }
  }
}

/** The combos a card would make with `player`'s buildings, as sentences. */
export function useCombos() {
  const { t } = useI18n()
  return (player: PlayerState | undefined, type: BuildingType) => (player ? combosFor(player, type).map((c) => t.combos[c.id]) : [])
}
