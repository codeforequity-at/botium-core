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
    if (!args || args.length < 1) {
      return Promise.reject(new BotiumError(`${convoStep.stepTag}: Word Error Rate Asserter - no argument given`,
        {
          type: 'asserter',
          subtype: 'wrong parameters',
          source: this.name,
          cause: { args }
        }
      ))
    }
    if (args.length > 2) {
      return Promise.reject(new BotiumError(`${convoStep.stepTag}: Word Error Rate Asserter - too many arguments "${args}"`,
        {
          type: 'asserter',
          subtype: 'wrong parameters',
          source: this.name,
          cause: { args }
        }
      ))
    }

    const utterance = args[0]
    const threshold = ([',', '.'].find(p => `${args[1]}`.includes(p)) ? parseFloat(args[1]) : parseInt(args[1]) / 100)

    const wer = speechScorer.wordErrorRate(botMsg.messageText, utterance)
    if (wer > threshold) {
      const _toPercent = (s) => `${(s * 100).toFixed(0)}%`

      return Promise.reject(new BotiumError(
        `${convoStep.stepTag}: Word Error Rate (${_toPercent(wer)}) higher than accepted (${_toPercent(threshold)})`,
        {
          type: 'asserter',
          source: this.name,
          context: {
            params: {
              args
            }
          },
          cause: {
            expected: `<=${_toPercent(threshold)}`,
            actual: `${_toPercent(wer)}`
          }
        }
      ))
    }

    return Promise.resolve()
  }
}
