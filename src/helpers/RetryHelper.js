const util = require('util')
const _ = require('lodash')
const debug = require('debug')('botium-core-RetryHelper')

module.exports = class RetryHelper {
  constructor (caps, section, options = {}) {
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

    // to turn on retries, NUMRETRIES or ONERROR_REGEXP has to be set
    this.retrySettings = {
      retries: caps[`RETRY_${section.toUpperCase()}_NUMRETRIES`] || (!_.isNil(options.numRetries) ? options.numRetries : (this.retryErrorPatterns.length === 0) ? 0 : 1),
      factor: caps[`RETRY_${section.toUpperCase()}_FACTOR`] || (_.isNil(options.factor) ? 1 : options.factor),
      minTimeout: caps[`RETRY_${section.toUpperCase()}_MINTIMEOUT`] || (_.isNil(options.minTimeout) ? 1000 : options.minTimeout)
    }

    debug(`Retry for ${section} is ${this.retrySettings.retries > 0 ? 'enabled' : 'disabled'}. Settings: ${JSON.stringify(this.retrySettings)} Patterns: ${JSON.stringify(this.retryErrorPatterns.map(r => r.toString()))}`)
  }

  shouldRetry (err) {
    if (!err) return false
    if (this.retryErrorPatterns.length === 0) return true
    const errString = util.inspect(err)
    for (const re of this.retryErrorPatterns) {
      if (errString.match(re)) return true
    }
    return false
  }
}
