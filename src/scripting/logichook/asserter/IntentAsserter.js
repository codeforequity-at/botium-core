const _ = require('lodash')

module.exports = class IntentAsserter {
  constructor (context, caps = {}) {
    this.context = context
    this.caps = caps
  }

  assertConvoStep ({ convo, convoStep, args, botMsg }) {
    if (!args || args.length < 1) {
      return Promise.reject(new Error(`${convoStep.stepTag}: IntentAsserter Missing argument`))
    }
    if (args.length > 1) {
      return Promise.reject(new Error(`${convoStep.stepTag}: IntentAsserter Too much argument "${args}"`))
    }

    if (!_.has(botMsg, 'nlp.intent.name')) {
      return Promise.reject(new Error(`${convoStep.stepTag}: Expected intent "${args[0]}" but found nothing`))
    }

    const intent = botMsg.nlp.intent.name
    if (intent !== args[0]) {
      return Promise.reject(new Error(`${convoStep.stepTag}: Expected intent "${args[0]}" but found ${intent}`))
    }

    return Promise.resolve()
  }
}
