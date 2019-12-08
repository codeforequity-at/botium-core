const util = require('util')
const _ = require('lodash')

module.exports = class RetryHelper {
  constructor (caps, section) {
    this.retrySettings = {
      retries: caps[`RETRY_${section.toUpperCase()}_NUMRETRIES`] || 1,
      factor: caps[`RETRY_${section.toUpperCase()}_FACTOR`] || 1,
      minTimeout: caps[`RETRY_${section.toUpperCase()}_MINTIMEOUT`] || 1000
    }
    this.retryErrorPatterns = []
    const onErrorRegexp = caps[`RETRY_${section.toUpperCase()}_ONERROR_REGEXP`] || []
    if (onErrorRegexp) {
      if (_.isArray(onErrorRegexp)) {
        onErrorRegexp.forEach(r => {
          if (_.isString(r)) this.retryErrorPatterns.push(new RegExp(r, 'i'))
          else this.retryErrorPatterns.push(r)
        })
      } else if (_.isString(onErrorRegexp)) {
        this.retryErrorPatterns.push(new RegExp(onErrorRegexp, 'i'))
      } else {
        this.retryErrorPatterns.push(onErrorRegexp)
      }
    }
  }

  shouldRetry (err) {
    if (!err || this.retryErrorPatterns.length === 0) return false
    const errString = util.inspect(err)
    for (const re of this.retryErrorPatterns) {
      if (errString.match(re)) return true
    }
    return false
  }
}
