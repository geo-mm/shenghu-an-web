import type { Game } from 'boardgame.io'

/** A few San Juan building names used as placeholder cards. */
export const BUILDINGS = [
  'Indigo Plant',
  'Sugar Mill',
  'Tobacco Storage',
  'Coffee Roaster',
  'Silver Smelter',
  'Smithy',
  'Gold Mine',
  'Archive',
  'Poor House',
  'Black Market',
  'Trading Post',
  'Well',
  'Market Stand',
  'Chapel',
  'Library',
  'Guild Hall',
  'City Hall',
  'Palace',
] as const

export interface SanJuanState {
  /** Cards held by each player, keyed by playerID. Empty at setup. */
  hands: Record<string, string[]>
  /** Total number of cards drawn so far (handy for eyeballing sync). */
  drawCount: number
}

export const SanJuanGame: Game<SanJuanState> = {
  // A unique name matters for P2P: it is part of the host's PeerJS ID.
  name: 'san-juan-p2p',
  minPlayers: 2,
  maxPlayers: 2,

  setup: ({ ctx }) => ({
    hands: Object.fromEntries(ctx.playOrder.map((id) => [id, [] as string[]])),
    drawCount: 0,
  }),

  moves: {
    // Dummy move: draw a random building into the current player's hand.
    drawCard: ({ G, playerID, random }) => {
      const card = BUILDINGS[random.Die(BUILDINGS.length) - 1]
      G.hands[playerID].push(card)
      G.drawCount += 1
    },
  },

  // One draw per turn so both players get to act and watch the other screen update.
  turn: { minMoves: 1, maxMoves: 1 },
}
