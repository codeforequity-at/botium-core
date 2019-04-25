const util = require('util')
const _ = require('lodash')

module.exports = class RetryHelper {
  constructor (caps) {
    this.retrySettings = {
      retries: caps.RETRY_USERSAYS_NUMRETRIES,
      factor: caps.RETRY_USERSAYS_FACTOR,
      minTimeout: caps.RETRY_USERSAYS_MINTIMEOUT
    }
    this.retryErrorPatterns = []
    if (caps.RETRY_USERSAYS_ONERROR_REGEXP) {
      if (_.isArray(caps.RETRY_USERSAYS_ONERROR_REGEXP)) {
        caps.RETRY_USERSAYS_ONERROR_REGEXP.forEach(r => {
          if (_.isString(r)) this.retryErrorPatterns.push(new RegExp(r, 'i'))
          else this.retryErrorPatterns.push(r)
        })
      } else if (_.isString(caps.RETRY_USERSAYS_ONERROR_REGEXP)) {
        this.retryErrorPatterns.push(new RegExp(caps.RETRY_USERSAYS_ONERROR_REGEXP, 'i'))
      } else {
        this.retryErrorPatterns.push(caps.RETRY_USERSAYS_ONERROR_REGEXP)
      }
    }
  }

  shouldRetryUserSays (err) {
    if (!err || this.retryErrorPatterns.length === 0) return false
    const errString = util.inspect(err)
    for (const re of this.retryErrorPatterns) {
      if (errString.match(re)) return true
    }
    return false
  }
}
