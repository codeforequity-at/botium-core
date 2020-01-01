const { BotiumError } = require('../../BotiumError')

module.exports = class TextContainsAllAsserter {
  constructor (context, caps = {}, matchFn, mode) {
    this.context = context
    this.caps = caps
    this.matchFn = matchFn
    if (mode !== 'all' && mode !== 'any') {
      throw new Error(`Mode must be "any" or "all" but it is ${mode}`)
    }
    this.mode = mode
  }

  _evalText (convo, args, botMsg) {
    let allUtterances = []
    for (const arg of args) {
      const utterances = convo.scriptingEvents.resolveUtterance({ utterance: arg })
      allUtterances = allUtterances.concat(utterances)
    }
    if (this.mode === 'all') {
      for (const utterance of allUtterances) {
        if (!this.matchFn(botMsg, utterance)) {
          return { found: false, allUtterances }
        }
      }
      return { found: true, allUtterances }
    } else if (this.mode === 'any') {
      for (const utterance of allUtterances) {
        if (this.matchFn(botMsg, utterance)) {
          return { found: true, allUtterances }
        }
      }
      return { found: false, allUtterances }
    }
  }

  assertNotConvoStep ({ convo, convoStep, args, botMsg }) {
    if (args && args.length > 0) {
      const { found, allUtterances } = this._evalText(convo, args, botMsg)
      if (found) {
        return Promise.reject(new BotiumError(
          `${convoStep.stepTag}: Not expected ${this.mode === 'all' ? 'texts' : 'any text'} in response "${allUtterances}"`,
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
          `${convoStep.stepTag}: Expected ${this.mode === 'all' ? 'texts' : 'any text'} in response "${allUtterances}"`,
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
