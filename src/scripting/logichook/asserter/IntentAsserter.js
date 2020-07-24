const _ = require('lodash')
const { BotiumError } = require('../../BotiumError')

module.exports = class IntentAsserter {
  constructor (context, caps = {}) {
    this.context = context
    this.caps = caps
    this.name = 'IntentAsserter'
  }

  assertConvoStep ({ convo, convoStep, args, botMsg }) {
    if (!args || args.length < 1) {
      return Promise.reject(new BotiumError(`${convoStep.stepTag}: IntentAsserter Missing argument`,
        {
          type: 'asserter',
          subtype: 'wrong parameters',
          source: this.name,
          cause: { args }
        }
      ))
    }
    if (args.length > 1) {
      return Promise.reject(new BotiumError(`${convoStep.stepTag}: IntentAsserter Too much argument "${args}"`,
        {
          type: 'asserter',
          subtype: 'wrong parameters',
          source: this.name,
          cause: { args }
        }
      ))
    }

    if (!_.has(botMsg, 'nlp.intent.name') || !botMsg.nlp.intent.name) {
      return Promise.reject(new BotiumError(`${convoStep.stepTag}: Expected intent "${args[0]}" but found nothing`,
        {
          type: 'asserter',
          source: this.name,
          context: {
            params: {
              args
            }
          },
          cause: {
            expected: args[0],
            actual: null
          }
        }
      ))
    }

    const intent = botMsg.nlp.intent.name
    if (intent !== args[0]) {
      return Promise.reject(new BotiumError(
        `${convoStep.stepTag}: Expected intent "${args[0]}" but found ${intent}`,
        {
          type: 'asserter',
          source: this.name,
          context: {
            params: {
              args
            }
          },
          cause: {
            expected: args[0],
            actual: intent
          }
        }
      ))
    }

    return Promise.resolve()
  }
}
