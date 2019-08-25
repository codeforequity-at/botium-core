const { BotiumError } = require('../../BotiumError')

module.exports = class ButtonsAsserter {
  constructor (context, caps = {}) {
    this.context = context
    this.caps = caps
  }

  assertConvoStep ({ convo, convoStep, args, botMsg }) {
    if (args && args.length > 0) {
      const buttonsFound = (botMsg.buttons ? botMsg.buttons.map(b => b.text) : []).concat(botMsg.cards ? botMsg.cards.reduce((acc, mc) => acc.concat(mc.buttons ? mc.buttons.map(b => b.text) : []), []) : [])
      const buttonsNotFound = []
      for (let i = 0; i < args.length; i++) {
        if (buttonsFound.findIndex(b => this.context.Match(b, args[i])) < 0) {
          buttonsNotFound.push(args[i])
        }
      }
      if (buttonsNotFound.length > 0) {
        return Promise.reject(new BotiumError(
          `${convoStep.stepTag}: Expected buttons with text "${buttonsNotFound}"`,
          {
            type: 'asserter',
            source: 'ButtonsAsserter',
            params: {
              args
            },
            cause: {
              expected: args,
              actual: buttonsFound,
              diff: buttonsNotFound
            }
          }
        ))
      }
    }
    return Promise.resolve()
  }
}
