#!/usr/bin/env node
/**
 * Turns raw images from ChatGPT into game-ready artwork.
 *
 *   npm run art [-- <source dir>] [--skip-existing]      (default source dir: art-src/)
 *
 * --skip-existing only processes images that aren't in the game yet, so older
 * versions in the source folder never replace artwork that was already chosen.
 *
 * Name the source files as listed in docs/card-art-prompts.md:
 *   <building>.png       e.g. smithy.png      → 4:3 card art
 *   role-<role>.png      e.g. role-trader.png → 4:3 role art
 *   card-back.png                             → 2:3 card back
 *   icon-<icon>.png      e.g. icon-anchor.png → player icon (magenta background, keyed out)
 *   table.png, lobby-hero.png, parchment.png  → page backgrounds (parchment tiles)
 *   frame.png, ribbon.png, medallion.png, vp-badge.png, text-panel.png, panel-frame.png
 *                        → decorative parts drawn on a flat magenta (#FF00FF)
 *                          background, which is made transparent here
 * Output goes to src/assets/art/{buildings,roles,ui,icons}/*.webp.
 */
import { mkdir, readdir, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const root = path.resolve(import.meta.dirname, '..')
const args = process.argv.slice(2)
const skipExisting = args.includes('--skip-existing')
const srcDir = path.resolve(args.find((a) => !a.startsWith('--')) ?? path.join(root, 'art-src'))
const outDir = path.join(root, 'src/assets/art')

// Building ids come straight from the card data so the two never drift apart.
const cardsTs = await readFile(path.join(root, 'src/game/cards.ts'), 'utf8')
const BUILDINGS = [...cardsTs.matchAll(/^\s+(\w+): \{ type: '(\w+)'/gm)].map((m) => m[2])
const ROLES = ['builder', 'producer', 'trader', 'councillor', 'prospector', 'governor']
const playersTs = await readFile(path.join(root, 'src/game/players.ts'), 'utf8')
const ICONS = [...playersTs.match(/PLAYER_ICONS = \[([^\]]*)\]/)[1].matchAll(/'(\w+)'/g)].map((m) => m[1])
const KEYED_PARTS = ['frame', 'ribbon', 'medallion', 'vp-badge', 'text-panel', 'panel-frame']
/** Page images: name → [width, height] after a centre crop. */
const PAGE_PARTS = { table: [1920, 1280], 'lobby-hero': [1600, 900], parchment: [512, 512] }

/** Centre-crops to the aspect ratio, then resizes. */
async function cropTo(input, width, height, out) {
  await sharp(input).rotate().resize(width, height, { fit: 'cover', position: 'centre' }).webp({ quality: 82 }).toFile(out)
}

/**
 * Makes the flat magenta background transparent, with soft edges and the
 * pink fringe removed from anti-aliased pixels, then trims the empty border.
 */
async function chromaKey(input, maxWidth, out, { trim = true } = {}) {
  const { data, info } = await sharp(input).rotate().ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]]
    // "Magenta-ness": high red and blue, low green.
    const key = Math.min(r, b) - g
    if (key > 120) {
      data[i + 3] = 0
    } else if (key > 40) {
      const a = 1 - (key - 40) / 80
      data[i + 3] = Math.round(data[i + 3] * a)
      // De-spill: pull red/blue down towards green so edges aren't pink.
      const spill = Math.min(r, b) - g
      data[i] = Math.max(0, r - spill * (1 - a))
      data[i + 2] = Math.max(0, b - spill * (1 - a))
    }
  }
  let img = sharp(data, { raw: info })
  if (trim) img = sharp(await img.png().toBuffer()).trim()
  await img.resize({ width: maxWidth, withoutEnlargement: true }).webp({ quality: 90, alphaQuality: 90 }).toFile(out)
}

const files = existsSync(srcDir) ? await readdir(srcDir) : []
if (files.length === 0) {
  console.error(`No images found in ${srcDir}`)
  process.exit(1)
}
for (const sub of ['buildings', 'roles', 'ui', 'icons']) await mkdir(path.join(outDir, sub), { recursive: true })

const done = new Set()
const unknown = []
for (const file of files.sort()) {
  const ext = path.extname(file).toLowerCase()
  if (!['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) continue
  const name = path.basename(file, path.extname(file)).toLowerCase()
  const input = path.join(srcDir, file)
  if (skipExisting && existsSync(path.join(outDir, artPath(name)))) {
    console.log(`- ${file}: already in the game, skipped`)
    continue
  }
  if (BUILDINGS.includes(name)) {
    await cropTo(input, 640, 480, path.join(outDir, 'buildings', `${name}.webp`))
  } else if (name.startsWith('role-') && ROLES.includes(name.slice(5))) {
    await cropTo(input, 640, 480, path.join(outDir, 'roles', `${name.slice(5)}.webp`))
  } else if (name.startsWith('icon-') && ICONS.includes(name.slice(5))) {
    await chromaKey(input, 256, path.join(outDir, 'icons', `${name.slice(5)}.webp`))
  } else if (name in PAGE_PARTS) {
    const [w, h] = PAGE_PARTS[name]
    await cropTo(input, w, h, path.join(outDir, 'ui', `${name}.webp`))
  } else if (name === 'card-back') {
    await cropTo(input, 480, 720, path.join(outDir, 'ui', 'card-back.webp'))
  } else if (KEYED_PARTS.includes(name)) {
    // Frames keep their full canvas so they line up with the edges they decorate.
    const fullCanvas = name === 'frame' || name === 'panel-frame'
    await chromaKey(input, fullCanvas ? 600 : 480, path.join(outDir, 'ui', `${name}.webp`), { trim: !fullCanvas })
  } else {
    unknown.push(file)
    continue
  }
  done.add(name)
  console.log(`✓ ${file}`)
}

const expected = [...BUILDINGS, ...ROLES.map((r) => `role-${r}`), 'card-back', ...KEYED_PARTS, ...Object.keys(PAGE_PARTS), ...ICONS.map((i) => `icon-${i}`)]
const missing = expected.filter((n) => !done.has(n) && !existsSync(path.join(outDir, artPath(n))))
if (unknown.length) console.warn(`\n⚠ Unrecognised file names (skipped): ${unknown.join(', ')}`)
console.log(`\nProcessed ${done.size} image(s). Still missing ${missing.length}: ${missing.join(', ') || '—'}`)

function artPath(n) {
  if (BUILDINGS.includes(n)) return `buildings/${n}.webp`
  if (n.startsWith('role-')) return `roles/${n.slice(5)}.webp`
  if (n.startsWith('icon-')) return `icons/${n.slice(5)}.webp`
  return `ui/${n}.webp`
}
