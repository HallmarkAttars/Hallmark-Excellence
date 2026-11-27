import waWebhookHandler from '../../api/wa-webhook.js'
import { adapt } from './_adapter.js'

export const handler = adapt(waWebhookHandler)
