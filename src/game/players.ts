/**
 * Player colours and icons. Each player picks one of 8 colours (no two players
 * share one) and one of 8 icons; until they do, they get a default by player number.
 */
import type { PlayerID, SanJuanState } from './state'

export const PLAYER_COLORS = {
  teal: '#0b7285',
  crimson: '#c92a2a',
  amber: '#e67700',
  green: '#2b8a3e',
  blue: '#1c5fbf',
  purple: '#7b3fb5',
  pink: '#c2255c',
  brown: '#7a5230',
} as const
export type PlayerColor = keyof typeof PLAYER_COLORS
export const COLOR_IDS = Object.keys(PLAYER_COLORS) as PlayerColor[]

export const PLAYER_ICONS = ['anchor', 'ship', 'sun', 'olive', 'compass', 'key', 'crown', 'fish'] as const
export type PlayerIcon = (typeof PLAYER_ICONS)[number]

export interface PlayerProfile {
  color: PlayerColor
  icon: PlayerIcon
}

export const isPlayerProfile = (x: unknown): x is PlayerProfile =>
  typeof x === 'object' &&
  x !== null &&
  COLOR_IDS.includes((x as PlayerProfile).color) &&
  PLAYER_ICONS.includes((x as PlayerProfile).icon)

/**
 * Everyone's colour and icon: their own choice, or else the default for their
 * player number, moved to the first free colour if someone already chose it.
 */
export function playerProfiles(G: Pick<SanJuanState, 'players' | 'profiles'>): Record<PlayerID, PlayerProfile> {
  const ids = Object.keys(G.players)
  const result: Record<PlayerID, PlayerProfile> = {}
  for (const p of ids) if (G.profiles[p]) result[p] = G.profiles[p]
  const used = () => new Set(Object.values(result).map((r) => r.color))
  for (const p of ids) {
    if (result[p]) continue
    const n = Number(p) % COLOR_IDS.length
    const color = used().has(COLOR_IDS[n]) ? COLOR_IDS.find((c) => !used().has(c))! : COLOR_IDS[n]
    result[p] = { color, icon: PLAYER_ICONS[n] }
  }
  return result
}

/** Sets `p`'s colour and icon; the colour must not be anyone else's. Allowed at any time, not just on `p`'s turn. */
export function actSetProfile(G: SanJuanState, p: PlayerID, profile: unknown): string | null {
  if (!G.players[p]) return 'Unknown player.'
  if (!isPlayerProfile(profile)) return 'Unknown colour or icon.'
  const current = playerProfiles(G)
  if (Object.entries(current).some(([q, r]) => q !== p && r.color === profile.color)) return 'That colour is taken.'
  G.profiles[p] = { color: profile.color, icon: profile.icon }
  return null
}
