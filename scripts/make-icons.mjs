#!/usr/bin/env node
/**
 * Builds the site icons from the compass player icon: the gold compass on a
 * sea-blue disc with a gold ring (browser tab, home screen).
 *
 *   npm run icons
 *
 * Output: public/favicon.png (64), public/apple-touch-icon.png (180), public/icon-512.png.
 */
import path from 'node:path'
import sharp from 'sharp'

const root = path.resolve(import.meta.dirname, '..')

async function icon(size, out) {
  const ring = Math.max(1.5, size * 0.045)
  const r = size / 2
  const disc = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <defs>
      <radialGradient id="sea" cx="40%" cy="35%" r="75%"><stop offset="0" stop-color="#1f7f8f"/><stop offset="1" stop-color="#0a3440"/></radialGradient>
      <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3d58a"/><stop offset="1" stop-color="#a87b2c"/></linearGradient>
    </defs>
    <circle cx="${r}" cy="${r}" r="${r - ring / 2}" fill="url(#sea)" stroke="url(#gold)" stroke-width="${ring}"/>
  </svg>`)
  const inner = Math.round((r - ring) * 2 * 0.86)
  const compass = await sharp(path.join(root, 'src/assets/art/icons/compass.webp'))
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()
  await sharp(disc).composite([{ input: compass, gravity: 'centre' }]).png().toFile(path.join(root, 'public', out))
  console.log(`✓ public/${out}`)
}

await icon(64, 'favicon.png')
await icon(180, 'apple-touch-icon.png')
await icon(512, 'icon-512.png')
