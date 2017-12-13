module.exports = class QueueTimeoutError extends Error {
  constructor (timeoutMillis) {
    super(`Queue.pop timeout after ${timeoutMillis}`)
  }
}
