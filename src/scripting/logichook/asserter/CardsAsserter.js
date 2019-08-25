const { BotiumError } = require('../../BotiumError')

module.exports = class CardsAsserter {
  constructor (context, caps = {}) {
    this.context = context
    this.caps = caps
  }

  assertConvoStep ({ convo, convoStep, args, botMsg }) {
    if (args && args.length > 0) {
      const cardsFound = botMsg.cards ? botMsg.cards.reduce((acc, mc) => acc.concat([mc.text, mc.subtext, mc.content].filter(t => t)), []) : []
      const cardsNotFound = []
      for (let i = 0; i < args.length; i++) {
        if (cardsFound.findIndex(c => this.context.Match(c, args[i])) < 0) {
          cardsNotFound.push(args[i])
        }
      }
      if (cardsNotFound.length > 0) {
        return Promise.reject(new BotiumError(
          `${convoStep.stepTag}: Expected cards with text "${cardsNotFound}"`,
          {
            type: 'asserter',
            source: 'CardsAsserter',
            params: {
              args
            },
            cause: {
              expected: args,
              actual: cardsFound,
              diff: cardsNotFound
            }
          }
        ))
      }
    }
    return Promise.resolve()
  }
}
