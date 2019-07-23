module.exports = class CardsAsserter {
  constructor (context, caps = {}) {
    this.context = context
    this.caps = caps
  }

  assertConvoStep ({ convo, convoStep, args, botMsg }) {
    if (args && args.length > 0) {
      const cardsNotFound = []
      for (let i = 0; i < args.length; i++) {
        if (botMsg.cards) {
          if (botMsg.cards.findIndex(mc => (mc.text && this.context.Match(mc.text, args[i])) || (mc.subtext && this.context.Match(mc.subtext, args[i])) || (mc.content && this.context.Match(mc.content, args[i]))) >= 0) continue
        }
        cardsNotFound.push(args[i])
      }
      if (cardsNotFound.length > 0) return Promise.reject(new Error(`${convoStep.stepTag}: Expected cards with text "${cardsNotFound}"`))
    }
    return Promise.resolve()
  }
}
