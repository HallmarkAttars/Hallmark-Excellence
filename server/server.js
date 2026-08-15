require('dotenv').config()
// Local-only secrets (server/.env.local — gitignored) override .env so admin
// credentials never live in a committed file. Missing file = no-op.
require('dotenv').config({ path: '.env.local', override: true })

const app = require('./src/app')

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`)
})
