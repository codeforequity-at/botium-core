// const _ = require('lodash')
const { BotiumError } = require('../../BotiumError')
const { calculateWer, toPercent } = require('../../helper')

module.exports = class WerAsserter {
  constructor (context, caps = {}) {
    this.context = context
    this.caps = caps
    this.name = 'Word Error Rate Asserter'
  }

  assertNotConvoStep ({ convo, convoStep, args, botMsg }) {
    if (!args || args.length < 1) {
      return Promise.reject(new BotiumError(`${convoStep.stepTag}: ${this.name} - no argument given`,
        {
          type: 'asserter',
          subtype: 'wrong parameters',
          source: this.name,
          cause: { args }
        }
      ))
    }
    if (args.length > 2) {
      return Promise.reject(new BotiumError(`${convoStep.stepTag}: ${this.name} - too many arguments "${args}"`,
        {
          type: 'asserter',
          subtype: 'wrong parameters',
          source: this.name,
          cause: { args }
        }
      ))
    }

    const utterance = args[0]
    const threshold = ([',', '.'].find(p => `${args[1]}`.includes(p)) ? parseFloat(args[1]) : parseInt(args[1]) / 100).toFixed(2)

    const wer = calculateWer(botMsg.messageText, utterance)

    if (wer < threshold) {
      return Promise.reject(new BotiumError(
        `${convoStep.stepTag}: Word Error Rate (${toPercent(wer)}) lower than accepted (${toPercent(threshold)})`,
        {
          type: 'asserter',
          source: this.name,
          context: {
            params: {
              args
            }
          },
          cause: {
            expected: `>=${toPercent(threshold)} (${utterance})`,
            actual: `${toPercent(wer)} (${botMsg.messageText})`
          }
        }
      ))
    }

    return Promise.resolve()
  }

  assertConvoStep ({ convo, convoStep, args, botMsg }) {
    if (!args || args.length < 1) {
      return Promise.reject(new BotiumError(`${convoStep.stepTag}: ${this.name} - no argument given`,
        {
          type: 'asserter',
          subtype: 'wrong parameters',
          source: this.name,
          cause: { args }
        }
      ))
    }
    if (args.length > 2) {
      return Promise.reject(new BotiumError(`${convoStep.stepTag}: ${this.name} - too many arguments "${args}"`,
        {
          type: 'asserter',
          subtype: 'wrong parameters',
          source: this.name,
          cause: { args }
        }
      ))
    }

    const utterance = args[0]
    const threshold = ([',', '.'].find(p => `${args[1]}`.includes(p)) ? parseFloat(args[1]) : parseInt(args[1]) / 100).toFixed(2)

    const wer = calculateWer(botMsg.messageText, utterance)

    if (wer > threshold) {
      return Promise.reject(new BotiumError(
        `${convoStep.stepTag}: Word Error Rate (${toPercent(wer)}) higher than accepted (${toPercent(threshold)})`,
        {
          type: 'asserter',
          source: this.name,
          context: {
            params: {
              args
            }
          },
          cause: {
            expected: `<=${toPercent(threshold)} (${utterance})`,
            actual: `${toPercent(wer)} (${botMsg.messageText})`
          }
        }
      ))
    }

    return Promise.resolve()
  }
}
