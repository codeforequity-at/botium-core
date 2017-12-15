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
      let listener = null
      const timeoutRequest = async.timeout((timeoutCallback) => {
        listener = (msg) => {
          timeoutCallback(null, msg)
        }
        this.listeners.push(listener)
      }, timeoutMillis)

      timeoutRequest((err, msg) => {
        if (err && err.code === 'ETIMEDOUT') {
          this.listeners.splice(this.listeners.indexOf(listener), 1)
          reject(new QueueTimeoutError(timeoutMillis))
        } else if (err) {
          this.listeners.splice(this.listeners.indexOf(listener), 1)
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
