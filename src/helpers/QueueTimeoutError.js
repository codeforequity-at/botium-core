module.exports = class QueueTimeoutError extends Error {
  constructor (timeoutMillis) {
    super(`Bot did not respond within ${timeoutMillis} ms`)
    this.timeoutMillis = timeoutMillis
  }
}
