// Optimize the storefront's static public images (logos, hero, about photo).
//
// These were committed at full original resolution (2MB+ PNGs) but are
// displayed at 44–1920px, so every page load downloads megabytes for pixels
// it never shows. This script resizes + recompresses in place — same
// filenames, same formats, so no code changes are needed — and emits a WebP
// variant of the hero for modern browsers (the PNG stays untouched as the
// fallback for legacy browsers).
//
// Run:  npm run optimize-assets
// Requires: sharp (devDependency, not shipped in the production bundle).

import sharp from 'sharp'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { rename } from 'node:fs/promises'

const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public')

// Display sizes from the components:
//   logo        navbar (~44px tall) + invoice PDF header (~36mm wide)
//   logoLight   footer (~84–100px wide)
//   Hero        full-bleed hero background — WebP only; original PNG kept as
//               the legacy-browser fallback (Hero.jsx uses image-set)
//   about-image about page story photo
const JOBS = [
  { file: 'HE color Logo.png', width: 400 },
  { file: 'HE white Logo.png', width: 400 },
  { file: 'HE logo black.png', width: 400 },
  { file: 'HE logo white.png', width: 400 },
  { file: 'Hero.png', width: 1920, webpOnly: true, webpQuality: 80 },
  { file: 'about-image.jpeg', width: 1200, jpegQuality: 80 },
]

async function run() {
  for (const job of JOBS) {
    const src = path.join(PUBLIC_DIR, job.file)
    try {
      await stat(src)
    } catch {
      console.warn(`skip (missing): ${job.file}`)
      continue
    }
    const before = (await stat(src)).size

    if (job.webpOnly) {
      // Emit only the WebP variant — leave the PNG fallback untouched.
      const webpPath = src.replace(/\.(png|jpe?g)$/i, '.webp')
      await sharp(src, { limitInputPixels: 100_000_000 })
        .rotate()
        .resize({ width: job.width, withoutEnlargement: true })
        .webp({ quality: job.webpQuality ?? 80 })
        .toFile(webpPath)
      console.log(`${job.file}: kept PNG (${formatKB(before)}), + ${path.basename(webpPath)}: ${formatKB((await stat(webpPath)).size)}`)
      continue
    }

    const isJpeg = /\.jpe?g$/i.test(job.file)
    const image = sharp(src, { limitInputPixels: 100_000_000 })
      .rotate()
      .resize({ width: job.width, withoutEnlargement: true })

    if (isJpeg) {
      // Re-encode photos as JPEG (never PNG) — keeps them small.
      await image.jpeg({ quality: job.jpegQuality ?? 80, mozjpeg: true }).toFile(src + '.tmp')
    } else {
      // Lossless PNG at the target width — logo quality preserved, no palette
      // quantization (avoids banding on gradients).
      await image.png({ compressionLevel: 9 }).toFile(src + '.tmp')
    }
    await rename(src + '.tmp', src)

    const after = (await stat(src)).size
    const pct = Math.round((1 - after / before) * 100)
    console.log(`${job.file}: ${formatKB(before)} → ${formatKB(after)}  (${pct >= 0 ? pct + '% smaller' : 'grew ' + -pct + '%'})`)
  }
}

function formatKB(bytes) {
  return `${Math.round(bytes / 1024)} KB`
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
