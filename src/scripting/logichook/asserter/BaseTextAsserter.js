const { BotiumError } = require('../../BotiumError')

module.exports = class BaseTextAsserter {
  constructor (context, caps = {}, matchFn = null, mode = null, noArgIsJoker = false) {
    this.context = context
    this.caps = caps
    this.matchFn = matchFn
    if (mode !== 'all' && mode !== 'any') {
      throw new Error(`Mode must be "any" or "all" but it is ${mode}`)
    }
    this.mode = mode
    this.noArgIsJoker = noArgIsJoker
  }

  _evalText (convo, args, botMsg) {
    let allUtterances = []
    if (this.noArgIsJoker && (!args || args.length === 0)) {
      return { found: (botMsg.messageText.length > 0), allUtterances: [], founds: [], notFounds: [] }
    }
    for (const arg of args) {
      const utterances = convo.scriptingEvents.resolveUtterance({ utterance: arg })
      allUtterances = allUtterances.concat(utterances)
    }
    const founds = []
    const notFounds = []
    for (const utterance of allUtterances) {
      (this.matchFn(botMsg, utterance) ? founds : notFounds).push(utterance)
    }
    return { found: (this.mode === 'all' ? notFounds.length === 0 : founds.length > 0), allUtterances, founds, notFounds }
  }

  assertNotConvoStep ({ convo, convoStep, args, botMsg }) {
    if ((args && args.length > 0) || this.noArgIsJoker) {
      const { found, allUtterances, founds } = this._evalText(convo, args, botMsg)
      if (found) {
        if (!args || args.length === 0) {
          return Promise.reject(new BotiumError(
            `${convoStep.stepTag}: Expected empty response`,
            {
              type: 'asserter',
              source: this.name,
              params: {
                args
              },
              cause: {
                not: true,
                expected: allUtterances,
                actual: botMsg
              }
            }
          ))
        }
        return Promise.reject(new BotiumError(
          `${convoStep.stepTag}: Not expected ${this.mode === 'all' ? 'text(s)' : 'any text'} in response "${founds}"`,
          {
            type: 'asserter',
            source: this.name,
            params: {
              args
            },
            cause: {
              not: true,
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
    if ((args && args.length > 0) || this.noArgIsJoker) {
      const { found, allUtterances, notFounds } = this._evalText(convo, args, botMsg)
      if (!found) {
        if (!args || args.length === 0) {
          return Promise.reject(new BotiumError(
            `${convoStep.stepTag}: Expected not empty response`,
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
        return Promise.reject(new BotiumError(
          `${convoStep.stepTag}: Expected ${this.mode === 'all' ? 'text(s)' : 'any text'} in response "${notFounds}"`,
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
