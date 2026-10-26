require('dotenv').config()
// Local-only secrets (server/.env.local — gitignored) override .env so admin
// credentials never live in a committed file. Missing file = no-op.
require('dotenv').config({ path: '.env.local', override: true })

const app = require('./src/app')
const { runAutoMigrations } = require('./src/utils/autoMigrations')
const { runExactPiecesBackfill } = require('./src/utils/exactPiecesBackfill')

const PORT = process.env.PORT || 5000

async function start() {
  await runAutoMigrations()
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`)
    runExactPiecesBackfill().catch((error) => {
      console.warn(`[exact-pieces-backfill] skipped: ${error.message}`)
    })
  })
}

start()
