// Generate portrait mobile crops for the homepage hero slides.
//
// The hero photographs are landscape (1.5-1.87 aspect), so displaying them
// full-bleed on a portrait phone crops most of the bottle away. This script
// extracts a 2:3 portrait window centred on each product and writes a 900x1350
// WebP used by <source media="(max-width: 767px)"> in CinematicHero.
//
// Run:  npm run hero:mobile
// Requires: sharp (devDependency, not shipped in the production bundle).

import sharp from 'sharp'
import { stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public')
const TARGET_WIDTH = 900
const TARGET_HEIGHT = 1350
const TARGET_AR = TARGET_WIDTH / TARGET_HEIGHT

// centerX is the horizontal centre of the subject, as a fraction of the source
// width. Chosen per photo so the bottle sits in the middle of the portrait crop.
const JOBS = [
  { src: 'Hero.webp', out: 'Hero-mobile.webp', centerX: 0.62 },
  { src: 'arees12ml-hero.webp', out: 'arees12ml-hero-mobile.webp', centerX: 0.54 },
  { src: 'areesluxury-hero.webp', out: 'areesluxury-hero-mobile.webp', centerX: 0.62 },
  { src: 'bakhoor-hero.webp', out: 'bakhoor-hero-mobile.webp', centerX: 0.5 },
  { src: 'Dahab-hero.webp', out: 'Dahab-hero-mobile.webp', centerX: 0.53 },
]

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)
const formatKB = (bytes) => `${(bytes / 1024).toFixed(1)} KB`

async function run() {
  for (const job of JOBS) {
    const srcPath = path.join(PUBLIC_DIR, job.src)
    const outPath = path.join(PUBLIC_DIR, job.out)

    try {
      await stat(srcPath)
    } catch {
      console.warn(`skip (missing): ${job.src}`)
      continue
    }

    const { width, height } = await sharp(srcPath).metadata()

    // 2:3 window: full height for landscape sources, capped to width otherwise.
    let cropWidth = Math.round(height * TARGET_AR)
    let cropHeight = height
    if (cropWidth > width) {
      cropWidth = width
      cropHeight = Math.round(width / TARGET_AR)
    }

    const left = clamp(Math.round(width * job.centerX - cropWidth / 2), 0, width - cropWidth)
    const top = clamp(Math.round((height - cropHeight) / 2), 0, height - cropHeight)

    const buffer = await sharp(srcPath)
      .extract({ left, top, width: cropWidth, height: cropHeight })
      .resize(TARGET_WIDTH, TARGET_HEIGHT, { fit: 'fill' })
      .webp({ quality: 76, effort: 6 })
      .toBuffer()

    await writeFile(outPath, buffer)

    const sourceSize = (await stat(srcPath)).size
    const outputSize = (await stat(outPath)).size
    console.log(
      `${job.out}: ${cropWidth}x${cropHeight} crop -> ${TARGET_WIDTH}x${TARGET_HEIGHT} ` +
        `(${formatKB(sourceSize)} -> ${formatKB(outputSize)})`
    )
  }
}

run().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
