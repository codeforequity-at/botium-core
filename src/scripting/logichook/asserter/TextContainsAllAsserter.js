const { BotiumError } = require('../../BotiumError')
const MatchFunctions = require('../../MatchFunctions')

module.exports = class TextContainsAllAsserter {
  constructor (context, caps = {}, ignoreCase = false) {
    this.context = context
    this.caps = caps
    this.ignoreCase = ignoreCase
    this.matchFn = MatchFunctions.include(ignoreCase)
  }

  _evalText (convo, args, botMsg) {
    let allUtterances = []
    for (const arg of args) {
      const utterances = convo.scriptingEvents.resolveUtterance({ utterance: arg })
      allUtterances = allUtterances.concat(utterances)
    }
    for (const utterance of allUtterances) {
      if (!this.matchFn(botMsg, utterance)) {
        return { found: false, allUtterances }
      }
    }
    return { found: true, allUtterances }
  }

  assertNotConvoStep ({ convo, convoStep, args, botMsg }) {
    if (args && args.length > 0) {
      const { found, allUtterances } = this._evalText(convo, args, botMsg)
      if (found) {
        return Promise.reject(new BotiumError(
          `${convoStep.stepTag}: Not expected texts in response "${allUtterances}"`,
          {
            type: 'asserter',
            source: this.name,
            params: {
              args
            },
            cause: {
              not: false,
              expected: allUtterances,
              actual: botMsg
            }
          }
        ))
      }
    }
    return Promise.resolve()
  }

  assertConvoStep ({ convo, convoStep, args, botMsg }) {
    if (args && args.length > 0) {
      const { found, allUtterances } = this._evalText(convo, args, botMsg)
      if (!found) {
        return Promise.reject(new BotiumError(
          `${convoStep.stepTag}: Expected texts in response "${allUtterances}"`,
          {
            type: 'asserter',
            source: this.name,
            params: {
              args
            },
            cause: {
              not: false,
              expected: allUtterances,
              actual: botMsg
            }
          }
        ))
      }
    }
    return Promise.resolve()
  }
}
