// Generate the homepage showcase hero assets and the Wholesale bottle sheet.
//
// The supplied catalogue graphics already contain the AREES logo, product
// names, captions and trust badges. They are therefore never cropped: each
// output keeps the source aspect ratio and is displayed with object-fit:
// contain inside the hero's framed panel. A tiny blurred copy of every graphic
// is generated for the full-bleed backdrop.
//
// Run:  npm run hero:graphics
// Requires: sharp (devDependency, not shipped in the production bundle).

import sharp from 'sharp'
import { mkdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE_DIR = path.join(ROOT, 'assets', 'hero-source')
const PUBLIC_DIR = path.join(ROOT, 'public')
const HERO_OUT = path.join(PUBLIC_DIR, 'hero')
const WHOLESALE_OUT = path.join(PUBLIC_DIR, 'wholesale')

const HERO_JOBS = [
  { src: 'luxury-12ml.jpeg', name: 'luxury-12ml' },
  { src: 'rollon-8ml.jpeg', name: 'rollon-8ml' },
  { src: 'bakhoor.jpeg', name: 'bakhoor' },
  { src: 'bulk-1kg.jpeg', name: 'bulk-1kg' },
]

const WHOLESALE_JOBS = [
  { src: 'rollon-bottles.jpeg', name: 'rollon-bottle-range' },
]

const formatKB = (bytes) => `${(bytes / 1024).toFixed(1)} KB`

async function render(srcPath, outPath, { width, quality, blur = 0 }) {
  let pipeline = sharp(srcPath)
    .rotate()
    .resize({ width, withoutEnlargement: true })

  if (blur > 0) pipeline = pipeline.blur(blur)

  const buffer = await pipeline.webp({ quality, effort: 6 }).toBuffer()
  await writeFile(outPath, buffer)

  const meta = await sharp(buffer).metadata()
  const sourceSize = (await stat(srcPath)).size
  const outputSize = (await stat(outPath)).size
  console.log(
    `${path.basename(outPath)}: ${meta.width}x${meta.height} ` +
      `(${formatKB(sourceSize)} -> ${formatKB(outputSize)})`
  )
}

async function run() {
  await mkdir(HERO_OUT, { recursive: true })
  await mkdir(WHOLESALE_OUT, { recursive: true })

  for (const job of HERO_JOBS) {
    const srcPath = path.join(SOURCE_DIR, job.src)
    await stat(srcPath)

    await render(srcPath, path.join(HERO_OUT, `${job.name}.webp`), {
      width: 1600,
      quality: 80,
    })
    await render(srcPath, path.join(HERO_OUT, `${job.name}-mobile.webp`), {
      width: 900,
      quality: 62,
    })
    await render(srcPath, path.join(HERO_OUT, `${job.name}-blur.webp`), {
      width: 96,
      quality: 42,
      blur: 14,
    })
  }

  // The first hero slide is a photograph and is not replaced. Only its
  // backdrop needs a tiny blurred variant.
  await render(path.join(PUBLIC_DIR, 'Hero.webp'), path.join(HERO_OUT, 'hero-signature-blur.webp'), {
    width: 96,
    quality: 42,
    blur: 14,
  })

  for (const job of WHOLESALE_JOBS) {
    const srcPath = path.join(SOURCE_DIR, job.src)
    await stat(srcPath)

    await render(srcPath, path.join(WHOLESALE_OUT, `${job.name}.webp`), {
      width: 1600,
      quality: 82,
    })
    await render(srcPath, path.join(WHOLESALE_OUT, `${job.name}-900.webp`), {
      width: 900,
      quality: 80,
    })
  }
}

run().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
