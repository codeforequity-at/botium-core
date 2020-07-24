const _ = require('lodash')
const { BotiumError } = require('../../BotiumError')

module.exports = class IntentUniqueAsserter {
  constructor (context, caps = {}) {
    this.context = context
    this.caps = caps
    this.name = 'IntentUniqueAsserter'
  }

  assertConvoStep ({ convo, convoStep, args, botMsg }) {
    if (args.length > 0) {
      return Promise.reject(new BotiumError(
        `${convoStep.stepTag}: IntentUniqueAsserter Too much argument "${args}"`,
        {
          type: 'asserter',
          subtype: 'wrong parameters',
          source: this.name,
          cause: { args }
        }
      ))
    }

    if (botMsg.nlp && botMsg.nlp.intent && !Number.isNaN(botMsg.nlp.intent.confidence) && botMsg.nlp.intent.intents && botMsg.nlp.intent.intents.length > 0) {
      const foundIntent = { name: botMsg.nlp.intent.name, confidence: botMsg.nlp.intent.confidence }
      const alternateIntents = _.orderBy(botMsg.nlp.intent.intents.filter(i => i.name !== botMsg.nlp.intent.name && !Number.isNaN(i.confidence)), ['confidence'], ['desc'])

      if (alternateIntents.length > 0 && foundIntent.confidence === alternateIntents[0].confidence) {
        return Promise.reject(new BotiumError(
          `${convoStep.stepTag}: Expected intent "${foundIntent.name}" (confidence: ${foundIntent.confidence}) to be unique, found alternate intent ${alternateIntents[0].name} with same confidence`,
          {
            type: 'asserter',
            source: this.name,
            context: {
              params: {
                args
              }
            },
            cause: {
              expected: foundIntent.name,
              actual: alternateIntents[0].name
            }
          }
        ))
      }
    }
    return Promise.resolve()
  }
}
