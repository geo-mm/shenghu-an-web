import { describe, expect, it } from 'vitest'
import { cardType, deckCards } from './cards'
import {
  actBuild,
  actChooseRole,
  actCouncil,
  actGovernor,
  actPass,
  actSell,
  advance,
  buildCost,
  countAllCards,
  createInitialState,
  governorDiscardCount,
  handLimit,
  residenceSets,
  scorePlayer,
} from './engine'
import type { SanJuanState } from './state'
import { cardsOf, ctx2, give, identity } from './testUtils'

const TOTAL = deckCards(true).length

/** Expansion game where player 0 is governor and picks first. */
function newGame(): SanJuanState {
  const G = createInitialState(ctx2, identity, { expansion: true })
  G.governor = '0'
  G.pickers = ['0', '1', '0']
  G.actor = '0'
  G.step = { kind: 'chooseRole' }
  return G
}

/** Player 0 chooses `role`, then automatic steps run until someone must decide. */
function choose(G: SanJuanState, role: Parameters<typeof actChooseRole>[3]) {
  expect(actChooseRole(G, ctx2, '0', role)).toBeNull()
  advance(G, ctx2, identity)
}

describe('guard room', () => {
  it('lowers the hand limit of players without one to 6 (tower: 12)', () => {
    const G = newGame()
    expect(handLimit(G, G.players['1'])).toBe(7)
    give(G, '0', 'guard_room')
    expect(handLimit(G, G.players['0'])).toBe(7)
    expect(handLimit(G, G.players['1'])).toBe(6)
    give(G, '1', 'tower')
    expect(handLimit(G, G.players['1'])).toBe(12)
  })
})

describe('bank', () => {
  it('deposits cards once per game at round start; they score 1 VP each', () => {
    const G = newGame()
    const me = G.players['0']
    give(G, '0', 'bank')
    me.hand.push(...G.deck.splice(0, 6)) // 10 cards
    G.step = { kind: 'governor', queue: ['0', '1'] }
    advance(G, ctx2, identity)
    expect(G.actor).toBe('0')
    const bank = me.hand.slice(0, 2)
    // 10 cards - 2 banked = 8 → discard 1 to reach 7.
    expect(governorDiscardCount(G, me, false, 2)).toBe(1)
    expect(actGovernor(G, '0', null, [], bank)).toMatch(/exactly 1/)
    expect(actGovernor(G, '0', null, me.hand.slice(2, 3), bank)).toBeNull()
    expect(me.bank).toEqual(bank)
    expect(me.bankUsed).toBe(true)
    expect(me.hand).toHaveLength(7)
    expect(scorePlayer(G, '0').stored).toBe(2)
    expect(countAllCards(G)).toBe(TOTAL)

    // Next round the bank can't be used again.
    G.step = { kind: 'governor', queue: ['0'] }
    G.actor = '0'
    expect(actGovernor(G, '0', null, [], me.hand.slice(0, 1))).toMatch(/no unused bank/)
  })
})

describe('park', () => {
  it('makes a crane rebuild over it 6 cards cheaper', () => {
    const G = newGame()
    give(G, '0', 'crane')
    give(G, '0', 'park')
    const [palace] = cardsOf(G, 'palace')
    G.players['0'].hand.push(palace)
    G.step = { kind: 'role', role: 'builder', chooser: '1', queue: ['0'] }
    const parkIndex = G.players['0'].buildings.findIndex((b) => cardType(b.card) === 'park')
    expect(buildCost(G, ctx2, '0', palace, parkIndex)).toBe(0) // 6 - 6
    expect(buildCost(G, ctx2, '0', palace, 0)).toBe(5) // over the indigo plant: 6 - 1
    expect(actBuild(G, ctx2, identity, '0', { card: palace, payment: [], replace: parkIndex })).toBeNull()
    expect(cardType(G.players['0'].buildings[parkIndex].card)).toBe('palace')
  })
})

describe('customs office, harbor and hut', () => {
  it('customs gets a good in the councillor phase and sells for 2; harbor keeps one sold good', () => {
    const G = newGame()
    const me = G.players['0']
    give(G, '0', 'customs_office')
    give(G, '0', 'harbor')
    choose(G, 'councillor')
    const customs = me.buildings.find((b) => cardType(b.card) === 'customs_office')!
    expect(customs.good).not.toBeNull()
    expect(actCouncil(G, '0', me.pending.slice(0, 4))).toBeNull()
    advance(G, ctx2, identity)
    expect(actCouncil(G, '1', G.players['1'].pending.slice(0, 1))).toBeNull()
    advance(G, ctx2, identity)

    // Player 1 picks the trader; player 0 sells the customs good.
    G.actor = '1'
    expect(actChooseRole(G, ctx2, '1', 'trader')).toBeNull()
    advance(G, ctx2, identity)
    expect(G.actor).toBe('0') // player 1 has no goods and is skipped
    const handBefore = me.hand.length
    const idx = me.buildings.indexOf(customs)
    expect(actSell(G, ctx2, identity, '0', [idx])).toBeNull()
    expect(me.hand.length - handBefore).toBe(2)
    expect(me.harbor).toHaveLength(1)
    expect(scorePlayer(G, '0').stored).toBe(1)
    expect(countAllCards(G)).toBe(TOTAL)
  })

  it('hut draws a card when nobody sells in the trader phase', () => {
    const G = newGame()
    give(G, '1', 'hut')
    G.players['0'].buildings[0].good = G.deck.pop()! // player 0 could sell…
    const hutHand = G.players['1'].hand.length
    choose(G, 'trader')
    expect(actPass(G, '0')).toBeNull() // …but passes
    advance(G, ctx2, identity)
    expect(G.players['1'].hand.length).toBe(hutHand + 1)
  })

  it('hut draws nothing when someone sold', () => {
    const G = newGame()
    give(G, '1', 'hut')
    G.players['0'].buildings[0].good = G.deck.pop()!
    const hutHand = G.players['1'].hand.length
    choose(G, 'trader')
    expect(actSell(G, ctx2, identity, '0', [0])).toBeNull()
    advance(G, ctx2, identity)
    expect(G.players['1'].hand.length).toBe(hutHand)
  })
})

describe('tavern', () => {
  it('draws at the end of the builder phase if nobody has fewer buildings', () => {
    const G = newGame()
    give(G, '1', 'tavern') // player 1: 2 buildings
    give(G, '0', 'smithy')
    give(G, '0', 'well') // player 0: 3 buildings
    G.players['0'].hand = []
    G.players['1'].hand = []
    choose(G, 'builder') // nobody can build → phase ends at once
    expect(G.players['1'].hand).toHaveLength(1)
  })

  it('does not draw when someone has fewer buildings', () => {
    const G = newGame()
    give(G, '1', 'tavern')
    give(G, '1', 'smithy') // player 1: 3 buildings, player 0: 1
    G.players['0'].hand = []
    G.players['1'].hand = []
    choose(G, 'builder')
    expect(G.players['1'].hand).toHaveLength(0)
  })
})

describe('goldsmith', () => {
  it('keeps the card only if nobody has built that building', () => {
    const G = newGame()
    give(G, '1', 'goldsmith')
    const [cathedral] = cardsOf(G, 'cathedral')
    G.deck.push(cathedral) // top of the deck (prospector privilege draws first, so add two)
    const [statue] = cardsOf(G, 'statue')
    G.deck.push(statue)
    // Player 0 prospects (takes the statue), then player 1's goldsmith turns up the cathedral.
    choose(G, 'prospector')
    expect(G.players['1'].hand).toContain(cathedral)

    const H = newGame()
    give(H, '1', 'goldsmith')
    const [indigo] = cardsOf(H, 'indigo_plant') // indigo plants are already built
    H.deck.push(indigo)
    const [stat] = cardsOf(H, 'statue')
    H.deck.push(stat)
    choose(H, 'prospector')
    expect(H.players['1'].hand).not.toContain(indigo)
    expect(H.discard).toContain(indigo)
  })
})

describe('residence and cathedral scoring', () => {
  it('counts sets of 3 different same-cost buildings', () => {
    const G = newGame()
    // Cost 1: indigo (start) + smithy + gold mine + archive → 1 set (4 types)
    for (const t of ['smithy', 'gold_mine', 'archive'] as const) give(G, '0', t)
    expect(residenceSets(G.players['0'])).toBe(1)
    // Cost 2: well + crane + market stand → 2nd set
    for (const t of ['well', 'crane', 'market_stand'] as const) give(G, '0', t)
    expect(residenceSets(G.players['0'])).toBe(2)
    give(G, '0', 'residence')
    // printed VP: indigo 1 + 3×1 + 3×1 = 7; residence: 2 sets → 7
    expect(scorePlayer(G, '0')).toMatchObject({ buildings: 7, bonus: 7 })
  })

  it('cathedral scores for the cost-6 buildings opponents own', () => {
    const G = createInitialState({ numPlayers: 3, playOrder: ['0', '1', '2'] }, identity, { expansion: true })
    give(G, '0', 'cathedral')
    expect(scorePlayer(G, '0').bonus).toBe(0)
    give(G, '1', 'palace')
    expect(scorePlayer(G, '0').bonus).toBe(4)
    give(G, '2', 'city_hall')
    give(G, '2', 'guild_hall')
    expect(scorePlayer(G, '0').bonus).toBe(9)
    give(G, '1', 'triumphal_arch')
    give(G, '1', 'residence')
    expect(scorePlayer(G, '0').bonus).toBe(10) // 5 buildings → capped at 4+
  })
})
