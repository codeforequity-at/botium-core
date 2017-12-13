const async = require('async')
const util = require('util')

const QueueTimeoutError = require('./QueueTimeoutError')

module.exports = class Queue {
  constructor () {
    this.queue = []
    this.listeners = []
    this.pushListener = null
  }

  clear () {
    this.queue = []
    this.listeners = []
  }

  push (msg) {
    if (this.pushListener) {
      this.pushListener(msg)
    }

    if (this.listeners.length > 0) {
      this.listeners.shift()(msg)
    } else {
      this.queue.push(msg)
    }
  }

  pop (timeoutMillis) {
    if (this.queue.length > 0) {
      return Promise.resolve(this.queue.shift())
    }
    return new Promise((resolve, reject) => {
      const timeoutRequest = async.timeout((timeoutCallback) => {
        this.listeners.push((msg) => {
          timeoutCallback(null, msg)
        })
      }, timeoutMillis)

      timeoutRequest((err, msg) => {
        if (err && err.code === 'ETIMEDOUT') {
          reject(new QueueTimeoutError(timeoutMillis))
        } else if (err) {
          reject(new Error(`Queue pop error ${util.inspect(err)}`))
        } else {
          resolve(msg)
        }
      })
    })
  }

  registerPushListener (callback) {
    this.pushListener = callback
  }
}
