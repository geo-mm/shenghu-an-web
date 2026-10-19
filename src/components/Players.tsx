import { createContext, useContext } from 'react'
import { playerIconArt } from '../art'
import { COLOR_IDS, PLAYER_ICONS, isPlayerProfile, type PlayerColor, type PlayerIcon, type PlayerProfile } from '../game/players'
import type { PlayerID } from '../game/state'
import { useI18n } from '../i18n/I18n'

/** Shown on the token until icon art (icons/<icon>.webp) is added. */
const ICON_GLYPHS: Record<PlayerIcon, string> = {
  anchor: '⚓',
  ship: '⛵',
  sun: '☀',
  olive: '🌿',
  compass: '🧭',
  key: '🗝',
  crown: '👑',
  fish: '🐟',
}

const ProfilesContext = createContext<Record<PlayerID, PlayerProfile>>({})
/** Provides everyone's colour and icon (from playerProfiles(G)) to the tokens and colour classes below. */
export const ProfilesProvider = ProfilesContext.Provider

export const useProfiles = () => useContext(ProfilesContext)

/** Class that sets --pc to the player's colour. */
export function usePlayerClass() {
  const profiles = useContext(ProfilesContext)
  return (p: PlayerID) => `pc-${profiles[p]?.color ?? COLOR_IDS[Number(p) % COLOR_IDS.length]}`
}

/** A round token: the icon on a disc of the colour. */
export function Token({ profile, label }: { profile: PlayerProfile; label?: string }) {
  const art = playerIconArt(profile.icon)
  return (
    <span className={`ptoken pc-${profile.color}`} aria-hidden={!label} aria-label={label} title={label}>
      {art ? <img src={art} alt="" draggable={false} /> : <span className="ptoken-glyph">{ICON_GLYPHS[profile.icon]}</span>}
    </span>
  )
}

export function PlayerToken({ p }: { p: PlayerID }) {
  const profiles = useContext(ProfilesContext)
  const profile = profiles[p] ?? { color: COLOR_IDS[Number(p) % COLOR_IDS.length], icon: PLAYER_ICONS[Number(p) % PLAYER_ICONS.length] }
  return <Token profile={profile} />
}

interface PickerProps {
  value: PlayerProfile | null
  /** Colours other players already have. */
  taken?: PlayerColor[]
  onChange: (profile: PlayerProfile) => void
}

/** 8 colours and 8 icons to choose from; colours someone else has are disabled. */
export function ProfilePicker({ value, taken = [], onChange }: PickerProps) {
  const { t } = useI18n()
  const current = value ?? { color: COLOR_IDS.find((c) => !taken.includes(c))!, icon: PLAYER_ICONS[0] }
  return (
    <div className="profile-picker" data-testid="profile-picker">
      <div className="picker-row" role="radiogroup" aria-label={t.colorLabel}>
        {COLOR_IDS.map((c) => {
          const isTaken = taken.includes(c)
          return (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={value?.color === c}
              className={`swatch pc-${c} ${value?.color === c ? 'on' : ''}`}
              disabled={isTaken}
              title={isTaken ? t.colorTaken(t.colorNames[c]) : t.colorNames[c]}
              aria-label={t.colorNames[c]}
              data-testid={`color-${c}`}
              onClick={() => onChange({ ...current, color: c })}
            />
          )
        })}
      </div>
      <div className="picker-row" role="radiogroup" aria-label={t.iconLabel}>
        {PLAYER_ICONS.map((i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={value?.icon === i}
            className={`icon-choice ${value?.icon === i ? 'on' : ''}`}
            title={t.iconNames[i]}
            aria-label={t.iconNames[i]}
            data-testid={`icon-${i}`}
            onClick={() => onChange({ ...current, icon: i })}
          >
            <Token profile={{ color: current.color, icon: i }} />
          </button>
        ))}
      </div>
    </div>
  )
}

const STORAGE_KEY = 'sanjuan-profile'

/** The colour and icon this browser's player last picked (sent to the game when it starts). */
export function loadProfilePref(): PlayerProfile | null {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    return isPlayerProfile(value) ? value : null
  } catch {
    return null
  }
}

export function saveProfilePref(profile: PlayerProfile) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
  } catch {
    // Private mode etc.: the choice just isn't remembered.
  }
}
