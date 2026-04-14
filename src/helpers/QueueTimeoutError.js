import { formatTimeout } from './Utils.js'

export default class QueueTimeoutError extends Error {
  constructor (timeoutMillis) {
    super(`Bot did not respond within ${formatTimeout(timeoutMillis)}`)
    this.timeoutMillis = timeoutMillis
  }
};
