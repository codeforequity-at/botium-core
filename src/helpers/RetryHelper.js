const util = require('util')
const _ = require('lodash')

module.exports = class RetryHelper {
  constructor (caps, section, options = {}) {
    this.retrySettings = {
      retries: caps[`RETRY_${section.toUpperCase()}_NUMRETRIES`] || (_.isNil(options.numRetries) ? 1 : options.numRetries),
      factor: caps[`RETRY_${section.toUpperCase()}_FACTOR`] || (_.isNil(options.factor) ? 1 : options.factor),
      minTimeout: caps[`RETRY_${section.toUpperCase()}_MINTIMEOUT`] || (_.isNil(options.minTimeout) ? 1000 : options.minTimeout)
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
