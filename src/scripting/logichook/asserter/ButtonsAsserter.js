const { BotiumError } = require('../../BotiumError')

module.exports = class ButtonsAsserter {
  constructor (context, caps = {}) {
    this.context = context
    this.caps = caps
    this.name = 'ButtonsAsserter'
  }

  _buttonTextsFromCardsRecursive (cards) {
    let result = []
    for (const card of cards) {
      result = result.concat(card.buttons ? card.buttons.map(b => b.text) : [])
      card.cards && (result = result.concat(this._buttonTextsFromCardsRecursive(card.cards)))
    }

    return result
  }

  _evalButtons (args, botMsg) {
    const allButtons = (botMsg.buttons ? botMsg.buttons.map(b => b.text) : []).concat(this._buttonTextsFromCardsRecursive(botMsg.cards))
    const buttonsNotFound = []
    const buttonsFound = []
    for (let i = 0; i < (args || []).length; i++) {
      if (allButtons.findIndex(b => this.context.Match(b, args[i])) < 0) {
        buttonsNotFound.push(args[i])
      } else {
        buttonsFound.push(args[i])
      }
    }
    return { allButtons, buttonsNotFound, buttonsFound }
  }

  assertNotConvoStep ({ convo, convoStep, args, botMsg }) {
    if (args && args.length > 0) {
      const { allButtons, buttonsFound } = this._evalButtons(args, botMsg)

      if (buttonsFound.length > 0) {
        return Promise.reject(new BotiumError(
        `${convoStep.stepTag}: Not expected button(s) with text "${buttonsFound}"`,
        {
          type: 'asserter',
          source: this.name,
          params: {
            args
          },
          cause: {
            not: true,
            expected: args,
            actual: allButtons,
            diff: buttonsFound
          }
        }
        ))
      }
    }
    return Promise.resolve()
  }

  assertConvoStep ({ convo, convoStep, args, botMsg }) {
    if (args && args.length > 0) {
      const { allButtons, buttonsNotFound } = this._evalButtons(args, botMsg)
      if (buttonsNotFound.length > 0) {
        return Promise.reject(new BotiumError(
          `${convoStep.stepTag}: Expected button(s) with text "${buttonsNotFound}"`,
          {
            type: 'asserter',
            source: this.name,
            params: {
              args
            },
            cause: {
              not: false,
              expected: args,
              actual: allButtons,
              diff: buttonsNotFound
            }
          }
        ))
      }
    }
    return Promise.resolve()
  }
}
