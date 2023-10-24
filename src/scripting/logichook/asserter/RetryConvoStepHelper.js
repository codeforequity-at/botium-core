const debug = require('debug')('botium-core-RetryConvoStepHelper')
const { BOTIUM_RETRY_FAILED } = require('./Helper')

module.exports = class RetryConvoStepHelper {
  constructor () {
    this.retryEnd = null
    this.lastCheckedConvoId = null
  }

  check ({ dynArgs, transcriptStep, convoStep }) {
    try {
      let timeoutRemaining = false
      const timeout = +dynArgs[BOTIUM_RETRY_FAILED]
      if (timeout) {
      // each retry is separate transcript step. We need the stepBegin just of the first one for each convostep
        if (!this.retryEnd || this.lastCheckedConvoId !== convoStep.stepTag) {
          this.retryEnd = transcriptStep.stepBegin.getTime() + timeout
        }
        this.lastCheckedConvoId = convoStep.stepTag
        if (!this.retryEnd) {
          debug('Start date is not available')
        } else {
          const now = new Date().getTime()
          timeoutRemaining = this.retryEnd - now
          if (timeoutRemaining <= 0) {
            timeoutRemaining = false
          } else {
            convoStep.retry = true
          }
        }
      }
      return { timeoutRemaining, timeout }
    } catch (err) {
      debug(`Error checking timeout: ${err.message}`)
      return { timeoutRemaining: 0, timeout: 0 }
    }
  }
}
