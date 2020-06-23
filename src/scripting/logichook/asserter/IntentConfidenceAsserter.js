const _ = require('lodash')

const { BotiumError } = require('../../BotiumError')

/**
 * Can be used as local, and as global asserter
 * @type {module.IntentConfidenceAsserter}
 */
module.exports = class IntentConfidenceAsserter {
  constructor (context, caps = {}, globalArgs = {}) {
    this.context = context
    this.caps = caps
    this.hasGlobalExpectedMinimum = !isNaN(globalArgs.expectedMinimum)
    if (this.hasGlobalExpectedMinimum) {
      this.globalExpectedMinimum = Number(globalArgs.expectedMinimum)
      if (Number.isNaN(this.globalExpectedMinimum)) {
        throw Error(`IntentConfidenceAsserter Excepted minimum is not valid ${this.globalExpectedMinimum}`)
      }
    }
    this.name = 'IntentConfidenceAsserter'
  }

  assertConvoStep ({ convo, convoStep, args, botMsg, isGlobal }) {
    if (args.length > 1) {
      return Promise.reject(new BotiumError(`${convoStep.stepTag}: IntentConfidenceAsserter Too much arguments "${args}"`,
        {
          type: 'asserter',
          subtype: 'wrong parameters',
          source: this.name,
          cause: { args }
        }
      ))
    }

    const hasLocalExpectedMinimum = args && args.length

    if (!this.hasGlobalExpectedMinimum && !hasLocalExpectedMinimum) {
      return Promise.reject(new BotiumError(`${convoStep.stepTag}: IntentConfidenceAsserter configured neither global, nor local`,
        {
          type: 'asserter',
          subtype: 'wrong parameters',
          source: this.name,
          cause: {
            args,
            hasGlobalExpectedMinimum: this.hasGlobalExpectedMinimum,
            hasLocalExpectedMinimum
          }
        }
      ))
    }

    let expectedMinimum
    if (hasLocalExpectedMinimum) {
      expectedMinimum = Number(args[0])
      if (parseInt(expectedMinimum, 10) !== expectedMinimum) {
        return Promise.reject(new BotiumError(`${convoStep.stepTag}: IntentConfidenceAsserter Wrong argument. It must be integer "${args[0]}"`,
          {
            type: 'asserter',
            subtype: 'wrong parameters',
            source: this.name,
            cause: {
              args,
              expectedMinimum
            }
          }
        ))
      }
    } else {
      expectedMinimum = this.globalExpectedMinimum
    }

    if (!_.has(botMsg, 'nlp.intent.confidence')) {
      return Promise.reject(new BotiumError(`${convoStep.stepTag}: Expected confidence minimum "${expectedMinimum}" but found nothing`,
        {
          type: 'asserter',
          source: this.name,
          cause: {
            expected: expectedMinimum,
            actual: null
          }
        }
      ))
    }

    const confidence = Number(botMsg.nlp.intent.confidence)
    if (Number.isNaN(confidence)) {
      return Promise.reject(new BotiumError(
        `${convoStep.stepTag}: Config error. Cant recognize as intent confidence: "${botMsg.nlp.intent.confidence}"`,
        {
          type: 'asserter',
          source: this.name,
          cause: {
            expected: expectedMinimum,
            actual: confidence
          }
        }
      ))
    }

    if (confidence * 100 < expectedMinimum) {
      return Promise.reject(new BotiumError(
        `${convoStep.stepTag}: Confidence expected minimum ${expectedMinimum} current "${confidence * 100}"`,
        {
          type: 'asserter',
          source: this.name,
          context: {
            constructor: {
              expectedMinimum: this.globalExpectedMinimum
            },
            params: {
              args
            }
          },
          cause: {
            expected: `>= ${expectedMinimum}`,
            actual: confidence * 100
          }
        }
      ))
    }

    return Promise.resolve()
  }
}
