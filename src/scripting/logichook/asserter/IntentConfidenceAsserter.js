const _ = require('lodash')

/**
 * Can be used as local, and as global asserter
 * @type {module.IntentConfidenceAsserter}
 */
module.exports = class IntentConfidenceAsserter {
  constructor (context, caps = {}, globalArgs = {}) {
    this.context = context
    this.caps = caps
    this.hasGlobalExpectedMinimum = typeof globalArgs.EXPECTED_MINIMUM !== 'undefined'
    if (this.hasGlobalExpectedMinimum) {
      this.globalExpectedMinimum = Number(globalArgs.EXPECTED_MINIMUM)
      if (Number.isNaN(this.globalExpectedMinimum)) {
        throw Error(`IntentConfidenceAsserter Excepted minimum is not valid ${this.globalExpectedMinimum}`)
      }
    }
  }

  assertConvoStep ({ convo, convoStep, args, botMsg, isGlobal }) {
    if (args.length > 1) {
      return Promise.reject(new Error(`${convoStep.stepTag}: IntentConfidenceAsserter Too much arguments "${args}"`))
    }

    const hasLocalExpectedMinimum = args && args.length

    if (!this.hasGlobalExpectedMinimum && !hasLocalExpectedMinimum) {
      return Promise.reject(new Error(`${convoStep.stepTag}: IntentConfidenceAsserter configured neither global, nor local`))
    }

    let expectedMinimum
    if (hasLocalExpectedMinimum) {
      expectedMinimum = Number(args[0])
      if (parseInt(expectedMinimum, 10) !== expectedMinimum) {
        return Promise.reject(new Error(`${convoStep.stepTag}: IntentConfidenceAsserter Wrong argument. It must be integer "${args[0]}"`))
      }
    } else {
      expectedMinimum = this.globalExpectedMinimum
    }

    if (!_.has(botMsg, 'nlp.intent.confidence')) {
      return Promise.reject(new Error(`${convoStep.stepTag}: Expected confidence minimum "${expectedMinimum}" but found nothing`))
    }

    let confidence = Number(botMsg.nlp.intent.confidence)
    if (Number.isNaN(confidence)) {
      return Promise.reject(new Error(`${convoStep.stepTag}: Config error. Cant recognize as intent: "${botMsg.nlp.intent.confidence}"`))
    }

    if (confidence * 100 < expectedMinimum) {
      return Promise.reject(new Error(`${convoStep.stepTag}: Confidence expected minimum ${expectedMinimum} current "${confidence * 100}"`))
    }

    return Promise.resolve()
  }
}
