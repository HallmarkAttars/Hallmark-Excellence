import robotsHandler from '../../api/robots.js'
import { adapt } from './_adapter.js'

export const handler = adapt(robotsHandler)
