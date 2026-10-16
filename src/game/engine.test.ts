import { describe, expect, it } from 'vitest'
import { Client } from 'boardgame.io/client'
import { BASE_DECK_SIZE, BUILDINGS, CARD_LIST, HIDDEN_CARD, cardType, deckCards, type BuildingType, type RoleId, type SoldGood } from './cards'
import { MESSAGES } from '../i18n/messages'
import {
  actBuild,
  actChooseRole,
  actCouncil,
  actGovernor,
  actProduce,
  actSell,
  advance,
  buildCost,
  countAllCards,
  createInitialState,
  scorePlayer,
} from './engine'
import { legalActions } from './bot'
import { SanJuanGame, createSanJuanGame } from './SanJuanGame'
import { cardsOf, ctx2, give, identity } from './testUtils'

describe('card data', () => {
  it('has the 110-card base deck', () => {
    expect(BASE_DECK_SIZE).toBe(110)
    const base = CARD_LIST.slice(0, BASE_DECK_SIZE)
    const production = base.filter((t) => BUILDINGS[t].kind === 'production').length
    expect(production).toBe(42)
    expect(BASE_DECK_SIZE - production).toBe(68)
    expect(BUILDINGS.prefecture.cost).toBe(4) // second edition
  })

  it('adds the expansion (without the office building, whose effect is unknown)', () => {
    const extra = deckCards(true).slice(BASE_DECK_SIZE).map((id) => CARD_LIST[id])
    expect(extra.filter((t) => BUILDINGS[t].kind === 'production')).toHaveLength(4)
    expect(extra.filter((t) => BUILDINGS[t].kind === 'violet')).toHaveLength(27)
    expect(extra).not.toContain('sugar_mill')
  })
})

describe('setup', () => {
  it('gives each player an indigo plant and 4 cards', () => {
    const G = createInitialState(ctx2, identity)
    for (const pl of Object.values(G.players)) {
      expect(pl.buildings.map((b) => cardType(b.card))).toEqual(['indigo_plant'])
      expect(pl.hand).toHaveLength(4)
    }
    expect(countAllCards(G)).toBe(110)
    expect(G.pickers).toEqual([G.governor, G.governor === '0' ? '1' : '0', G.governor])
  })
})

describe('builder', () => {
  it('applies privilege, smithy, quarry, library and crane discounts', () => {
    const G = createInitialState(ctx2, identity)
    G.governor = '0'
    G.pickers = ['0', '1', '0']
    G.actor = '0'
    actChooseRole(G, ctx2, '0', 'builder')
    const [silver] = cardsOf(G, 'silver_smelter')
    const [hero] = cardsOf(G, 'hero')
    expect(buildCost(G, ctx2, '0', silver)).toBe(4) // 5 - privilege
    expect(buildCost(G, ctx2, '1', silver)).toBe(5)
    give(G, '0', 'smithy')
    expect(buildCost(G, ctx2, '0', silver)).toBe(3)
    expect(buildCost(G, ctx2, '0', hero)).toBe(4) // smithy doesn't apply to violet
    give(G, '0', 'quarry')
    expect(buildCost(G, ctx2, '0', hero)).toBe(3)
    give(G, '0', 'library')
    expect(buildCost(G, ctx2, '0', hero)).toBe(2) // doubled privilege
    // Crane over the indigo plant (cost 1): 5 - 2 (library privilege) - 1 (smithy) - 1 = 1.
    expect(buildCost(G, ctx2, '0', silver, 0)).toBe(1)
  })

  it('builds, pays, and triggers poor house and carpenter', () => {
    const G = createInitialState(ctx2, identity)
    G.governor = '0'
    G.pickers = ['0', '1', '0']
    G.actor = '0'
    give(G, '0', 'poor_house')
    give(G, '0', 'carpenter')
    const [chapel] = cardsOf(G, 'chapel')
    G.discard.push(...G.players['0'].hand)
    G.players['0'].hand = [chapel, ...cardsOf(G, 'sugar_mill', 2)]
    actChooseRole(G, ctx2, '0', 'builder')
    advance(G, ctx2, identity)
    expect(G.actor).toBe('0')
    const pay = G.players['0'].hand.filter((c) => c !== chapel)
    expect(actBuild(G, ctx2, identity, '0', { card: chapel, payment: pay.slice(0, 1) })).toMatch(/costs 2 cards/)
    expect(actBuild(G, ctx2, identity, '0', { card: chapel, payment: pay })).toBeNull()
    // Hand was 0 after building → poor house +1, carpenter (violet) +1.
    expect(G.players['0'].hand).toHaveLength(2)
    expect(G.players['0'].buildings.map((b) => cardType(b.card))).toContain('chapel')
    expect(countAllCards(G)).toBe(110)
  })

  it('keeps violet buildings unique', () => {
    const G = createInitialState(ctx2, identity)
    G.actor = G.governor
    give(G, G.governor, 'smithy')
    const [smithy2] = cardsOf(G, 'smithy')
    G.players[G.governor].hand.push(smithy2)
    actChooseRole(G, ctx2, G.governor, 'builder')
    expect(actBuild(G, ctx2, identity, G.governor, { card: smithy2, payment: [] })).toMatch(/unique/)
  })
})

describe('producer and trader', () => {
  it('produces with privilege + aqueduct and sells at tile prices', () => {
    const G = createInitialState(ctx2, identity)
    G.governor = '0'
    G.pickers = ['0', '1', '0']
    G.actor = '0'
    const me = G.players['0']
    for (const t of ['silver_smelter', 'coffee_roaster', 'aqueduct', 'market_hall'] as const) give(G, '0', t)
    actChooseRole(G, ctx2, '0', 'producer')
    advance(G, ctx2, identity)
    expect(actProduce(G, ctx2, identity, '0', [0, 1, 2, 3])).toMatch(/at most 3/)
    expect(actProduce(G, ctx2, identity, '0', [0, 1, 2])).toBeNull()
    expect(me.buildings.filter((b) => b.good !== null)).toHaveLength(3)

    // Player 1 passes producing, then player 0 picks trader as the 2-player governor's 2nd role.
    G.step = { kind: 'role', role: 'trader', chooser: '0', queue: ['0', '1'] }
    G.tradeTile = 4 // [1, 2, 2, 3, 3]
    G.actor = '0'
    const handBefore = me.hand.length
    expect(actSell(G, ctx2, identity, '0', [0, 1])).toBeNull() // indigo 1 + silver 3, + market hall 1
    expect(me.hand.length - handBefore).toBe(5)
    expect(countAllCards(G)).toBe(110)
  })
})

describe('councillor', () => {
  it('chooser draws 5 and keeps 1; prefecture keeps 2', () => {
    const G = createInitialState(ctx2, identity)
    G.governor = '0'
    G.pickers = ['0', '1', '0']
    G.actor = '0'
    give(G, '1', 'prefecture')
    actChooseRole(G, ctx2, '0', 'councillor')
    advance(G, ctx2, identity)
    expect(G.players['0'].pending).toHaveLength(5)
    expect(actCouncil(G, '0', G.players['0'].pending.slice(0, 3))).toMatch(/exactly 4/)
    expect(actCouncil(G, '0', G.players['0'].pending.slice(0, 4))).toBeNull()
    const handBefore = G.players['1'].hand.length
    advance(G, ctx2, identity)
    // Player 1 draws 2 and keeps both (prefecture): nothing to decide, so it resolves automatically.
    expect(G.players['1'].pending).toHaveLength(0)
    expect(G.players['1'].hand).toHaveLength(handBefore + 2)
    expect(G.step.kind).toBe('chooseRole')
    expect(G.actor).toBe('1')
    expect(countAllCards(G)).toBe(110)
  })
})

describe('governor phase', () => {
  it('enforces hand limit and chapel tuck', () => {
    const G = createInitialState(ctx2, identity)
    const me = G.players['0']
    give(G, '0', 'chapel')
    me.hand.push(...G.deck.splice(0, 5)) // 9 cards
    G.step = { kind: 'governor', queue: ['0', '1'] }
    G.actor = '0'
    expect(actGovernor(G, '0', null, me.hand.slice(0, 1))).toMatch(/exactly 2/)
    expect(actGovernor(G, '0', me.hand[0], me.hand.slice(1, 2))).toBeNull()
    expect(me.hand).toHaveLength(7)
    expect(me.chapel).toHaveLength(1)
  })
})

describe('scoring', () => {
  it('scores bonuses and palace last', () => {
    const G = createInitialState(ctx2, identity)
    const pl = G.players['0']
    for (const t of ['guild_hall', 'city_hall', 'triumphal_arch', 'palace', 'statue', 'hero', 'sugar_mill'] as const)
      give(G, '0', t)
    pl.chapel = cardsOf(G, 'indigo_plant', 2)
    const s = scorePlayer(G, '0')
    // VP: indigo 1 + statue 3 + hero 5 + sugar 1 = 10; chapel 2
    // guild hall: 2 × 2 production = 4; city hall: 6 violet = 6; arch: 2 monuments = 6 → bonus 16
    // palace: floor(28 / 4) = 7
    expect(s).toMatchObject({ buildings: 10, stored: 2, bonus: 16, palace: 7, total: 35 })
  })
})

describe('full games through boardgame.io', () => {
  for (const expansion of [false, true])
  for (const numPlayers of [2, 3, 4]) {
    it(`plays random ${numPlayers}-player games to the end${expansion ? ' with the expansion' : ''}`, () => {
      const game = createSanJuanGame({ expansion })
      const totalCards = deckCards(expansion).length
      for (let seed = 1; seed <= 15; seed++) {
        const client = Client({ game: { ...game, seed: `${expansion}-${numPlayers}-${seed}` }, numPlayers })
        client.start()
        let rng = seed * 7919
        const pick = <T,>(arr: T[]) => arr[(rng = (rng * 16807) % 2147483647) % arr.length]
        for (let i = 0; i < 5000; i++) {
          // The raw store state: getState() would apply playerView and hide hands.
          const state = (client as unknown as { store: { getState(): ReturnType<typeof client.getState> } }).store.getState()!
          if (state.ctx.gameover) break
          const G = state.G
          expect(countAllCards(G)).toBe(totalCards)
          expect(state.ctx.currentPlayer).toBe(G.actor)
          const options = legalActions(G, state.ctx)
          expect(options.length).toBeGreaterThan(0)
          // Prefer real actions over passing so games finish.
          const real = options.filter((o) => o.move !== 'pass')
          const choice = pick(real.length > 0 && rng % 10 !== 0 ? real : options)
          const before = state._stateID
          client.moves[choice.move](...choice.args)
          expect(client.getState()!._stateID, `${choice.move} ${JSON.stringify(choice.args)} rejected`).toBeGreaterThan(before)
        }
        const end = client.getState()!
        expect(end.ctx.gameover, `game ${numPlayers}p seed ${seed} did not finish`).toBeTruthy()
        expect(end.G.scores).toHaveLength(numPlayers)
        // Every log entry renders in both languages.
        for (const lang of ['en', 'zh-TW'] as const) {
          const t = MESSAGES[lang]
          const helpers = { card: (b: BuildingType) => t.cards[b][0], good: (g: SoldGood) => t.goods[g], role: (r: RoleId) => t.roles[r].name, who: (p: string) => t.who(p, false) }
          for (const e of end.G.log) expect(t.log(e, helpers), `${lang} ${e.key}`).toMatch(/\S/)
        }
        expect(Object.values(end.G.players).some((p) => p.buildings.length >= 12)).toBe(true)
        client.stop()
      }
    })
  }
})

describe('playerView', () => {
  it('hides the deck and other hands but not my own', () => {
    const client = Client({ game: SanJuanGame, numPlayers: 2, playerID: '0' })
    client.start()
    const G = client.getState()!.G
    expect(G.deck.every((c) => c === HIDDEN_CARD)).toBe(true)
    expect(G.players['1'].hand.every((c) => c === HIDDEN_CARD)).toBe(true)
    expect(G.players['0'].hand.every((c) => c >= 0)).toBe(true)
    client.stop()
  })
})
