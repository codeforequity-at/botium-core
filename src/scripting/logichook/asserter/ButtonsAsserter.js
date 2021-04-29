const { BotiumError } = require('../../BotiumError')
const { buttonsFromMsg } = require('../helpers')

module.exports = class ButtonsAsserter {
  constructor (context, caps = {}) {
    this.context = context
    this.caps = caps
    this.name = 'ButtonsAsserter'
  }

  _evalButtons (args, botMsg) {
    const allButtons = buttonsFromMsg(botMsg, true).map(b => b.text)
    if (!args || args.length === 0) {
      return { allButtons, buttonsNotFound: [], buttonsFound: allButtons }
    }
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

  assertNotConvoStep ({ convo, convoStep, args = [], botMsg = [] }) {
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
    return Promise.resolve()
  }

  assertConvoStep ({ convo, convoStep, args = [], botMsg = [] }) {
    const { allButtons, buttonsNotFound, buttonsFound } = this._evalButtons(args, botMsg)

    if (!args || args.length === 0) {
      if (!buttonsFound.length) {
        return Promise.reject(new BotiumError(
          `${convoStep.stepTag}: Expected some button(s)`,
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
    } else if (buttonsNotFound.length > 0) {
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
    return Promise.resolve()
  }
}
