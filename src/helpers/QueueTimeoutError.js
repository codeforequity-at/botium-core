const { formatTimeout } = require('./Utils')

module.exports = class QueueTimeoutError extends Error {
  constructor (timeoutMillis) {
    super(`Bot did not respond within ${formatTimeout(timeoutMillis)}`)
    this.timeoutMillis = timeoutMillis
  }
}
