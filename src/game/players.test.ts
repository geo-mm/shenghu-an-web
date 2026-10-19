import { describe, expect, it } from 'vitest'
import { Client } from 'boardgame.io/client'
import { Local } from 'boardgame.io/multiplayer'
import { createInitialState } from './engine'
import { actSetProfile, playerProfiles } from './players'
import { createSanJuanGame } from './SanJuanGame'
import { ctx2, identity } from './testUtils'

describe('player colours and icons', () => {
  it('defaults by player number and keeps colours unique', () => {
    const G = createInitialState(ctx2, identity)
    expect(playerProfiles(G)).toEqual({ '0': { color: 'teal', icon: 'anchor' }, '1': { color: 'crimson', icon: 'ship' } })

    expect(actSetProfile(G, '1', { color: 'purple', icon: 'crown' })).toBeNull()
    expect(playerProfiles(G)['1']).toEqual({ color: 'purple', icon: 'crown' })
    // Someone's colour, chosen or default, can't be taken; icons can be shared.
    expect(actSetProfile(G, '0', { color: 'purple', icon: 'anchor' })).toMatch(/taken/)
    expect(actSetProfile(G, '1', { color: 'teal', icon: 'anchor' })).toMatch(/taken/)
    expect(actSetProfile(G, '0', { color: 'blue', icon: 'crown' })).toBeNull()
    expect(actSetProfile(G, '0', { color: 'red', icon: 'anchor' })).toMatch(/Unknown/)
    expect(actSetProfile(G, '0', { color: 'blue', icon: 'dragon' })).toMatch(/Unknown/)
  })

  it("never changes someone else's colour: defaults count as taken", () => {
    const G = createInitialState({ numPlayers: 3, playOrder: ['0', '1', '2'] }, identity)
    expect(actSetProfile(G, '2', { color: 'teal', icon: 'sun' })).toMatch(/taken/)
    expect(actSetProfile(G, '2', { color: 'blue', icon: 'sun' })).toBeNull()
    const profiles = playerProfiles(G)
    expect(profiles['0'].color).toBe('teal')
    expect(new Set(Object.values(profiles).map((p) => p.color)).size).toBe(3)
  })

  it('lets any player change their profile at any time, but game moves stay turn-bound', () => {
    const game = createSanJuanGame()
    const multiplayer = Local()
    const [c0, c1] = ['0', '1'].map((playerID) => Client({ game, numPlayers: 2, multiplayer, playerID }))
    c0.start()
    c1.start()
    const actor = c0.getState()!.G.actor
    const other = actor === '0' ? c1 : c0
    other.moves.setProfile({ color: 'pink', icon: 'fish' })
    expect(c0.getState()!.G.profiles[other.playerID!]).toEqual({ color: 'pink', icon: 'fish' })
    // Still the same player's turn, and an out-of-turn role choice is ignored.
    expect(c0.getState()!.G.actor).toBe(actor)
    other.moves.chooseRole('builder')
    expect(c0.getState()!.G.actor).toBe(actor)
    expect(c0.getState()!.G.rolesTaken).toEqual([])
    // A taken colour is ignored too.
    other.moves.setProfile({ color: c0.getState()!.G.profiles[actor]?.color ?? (actor === '0' ? 'teal' : 'crimson'), icon: 'sun' })
    expect(c0.getState()!.G.profiles[other.playerID!]).toEqual({ color: 'pink', icon: 'fish' })
    c0.stop()
    c1.stop()
  })
})
