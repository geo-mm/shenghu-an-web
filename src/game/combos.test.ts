import { describe, expect, it } from 'vitest'
import { actChooseRole, createInitialState, tableCtx } from './engine'
import { combosFor, phaseBoosts } from './combos'
import { MESSAGES } from '../i18n/messages'
import { ctx2, give, identity } from './testUtils'

describe('combo hints', () => {
  it('finds combos between a card and the buildings you own', () => {
    const G = createInitialState(ctx2, identity)
    const me = G.players['0'] // starts with an indigo plant
    expect(combosFor(me, 'smithy')).toEqual([{ id: 'smithyProduction', partner: 'indigo_plant' }])
    give(G, '0', 'aqueduct')
    expect(combosFor(me, 'well').map((c) => c.id)).toEqual(['aqueductWell'])
    expect(combosFor(me, 'library').map((c) => c.id)).toEqual(['libraryAqueduct'])
    // A building doesn't combo with itself.
    expect(combosFor(me, 'aqueduct').map((c) => c.id)).toEqual([])
  })

  it('adds up what a phase gives, and only the chooser gets the privilege', () => {
    const G = createInitialState(ctx2, identity)
    G.governor = '0'
    G.pickers = ['0', '1', '0']
    G.actor = '0'
    give(G, '0', 'aqueduct')
    give(G, '0', 'library')
    actChooseRole(G, ctx2, '0', 'producer')
    const mine = phaseBoosts(G, tableCtx(G), '0', 'producer', true)
    expect(mine.total).toEqual({ a: 4 })
    expect(mine.sources.map((s) => s.source)).toEqual(['base', 'privilege', 'library', 'aqueduct'])
    const theirs = phaseBoosts(G, tableCtx(G), '1', 'producer', false)
    expect(theirs.total).toEqual({ a: 1 })
    expect(phaseBoosts(G, tableCtx(G), '1', 'councillor', true).total).toEqual({ a: 5, b: 1 })
  })

  it('has hint text for every combo in both languages', () => {
    for (const t of Object.values(MESSAGES)) for (const text of Object.values(t.combos)) expect(text).toMatch(/\S/)
    expect(Object.keys(MESSAGES.en.combos).sort()).toEqual(Object.keys(MESSAGES['zh-TW'].combos).sort())
  })
})
