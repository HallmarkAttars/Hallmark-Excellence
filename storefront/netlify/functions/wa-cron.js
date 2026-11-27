import waCronHandler from '../../api/wa-cron.js'
import { adapt } from './_adapter.js'

export const handler = adapt(waCronHandler)
