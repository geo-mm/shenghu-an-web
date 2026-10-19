/**
 * Optional custom artwork. Images are produced by `npm run art` (see
 * docs/card-art-prompts.md) into src/assets/art/; anything missing falls back
 * to the CSS-drawn card, so art can be added one picture at a time.
 */
import type { BuildingType, RoleId } from './game/cards'

const urls = (files: Record<string, string>) =>
  Object.fromEntries(Object.entries(files).map(([path, url]) => [path.replace(/^.*\/|\.webp$/g, ''), url]))

const buildings = urls(import.meta.glob('./assets/art/buildings/*.webp', { eager: true, query: '?url', import: 'default' }))
const roles = urls(import.meta.glob('./assets/art/roles/*.webp', { eager: true, query: '?url', import: 'default' }))
const avatars = urls(import.meta.glob('./assets/art/avatars/*.webp', { eager: true, query: '?url', import: 'default' }))
const ui = urls(import.meta.glob('./assets/art/ui/*.webp', { eager: true, query: '?url', import: 'default' }))

export const buildingArt = (type: BuildingType): string | undefined => buildings[type]
/** Role art; 'governor' is the start-player card, not a selectable role. */
export const roleArt = (role: RoleId | 'governor'): string | undefined => roles[role]

/** Player avatar for seat colour `n` (0–3), drawn on the player's token when present. */
export const playerAvatar = (n: number): string | undefined => avatars[`player-${n}`]

/** Decorative card parts; each one replaces its CSS fallback when present. */
export const UI_PARTS = ['frame', 'card-back', 'ribbon', 'medallion', 'vp-badge', 'text-panel'] as const

/** Exposes the available UI parts as CSS variables plus `art-<part>` classes on <html>. */
export function applyUiArt(root: HTMLElement = document.documentElement) {
  for (const part of UI_PARTS) {
    const url = ui[part]
    if (!url) continue
    root.style.setProperty(`--sj-${part}`, `url("${url}")`)
    root.classList.add(`art-${part}`)
  }
}
