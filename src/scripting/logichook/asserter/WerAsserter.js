// const _ = require('lodash')
const speechScorer = require('word-error-rate')
const { BotiumError } = require('../../BotiumError')

module.exports = class WerAsserter {
  constructor (context, caps = {}) {
    this.context = context
    this.caps = caps
    this.name = 'WerAsserter'
  }

  assertConvoStep ({ convo, convoStep, args, botMsg }) {
    console.log(args)
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
    if (args.length > 2) {
      return Promise.reject(new BotiumError(`${convoStep.stepTag}: IntentAsserter Too much argument "${args}"`,
        {
          type: 'asserter',
          subtype: 'wrong parameters',
          source: this.name,
          cause: { args }
        }
      ))
    }

    const utterance = args[0]
    const threshold = args[1]

    const wer = speechScorer.wordErrorRate(botMsg.messageText, utterance)
    if (wer > threshold) {
      return Promise.reject(new BotiumError(
        `${convoStep.stepTag}: Word error rate ${wer} > ${threshold} for ${utterance}`,
        {
          type: 'asserter',
          source: this.name,
          context: {
            params: {
              args
            }
          },
          cause: {
            expected: `Word error rate <= ${threshold}`,
            actual: `Word error rate = ${wer}`
          }
        }
      ))
    }

    return Promise.resolve()
  }
}
