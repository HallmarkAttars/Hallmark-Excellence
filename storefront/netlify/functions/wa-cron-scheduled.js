import { sweepAll } from '../../api/wa-cron.js'

export const config = { schedule: '0 4 * * *' }

export const handler = async () => {
  try {
    const result = await sweepAll()
    console.log('[wa:cron:scheduled]', JSON.stringify(result))
  } catch (err) {
    console.error('[wa:cron:scheduled] failed:', err?.message)
  }
}
