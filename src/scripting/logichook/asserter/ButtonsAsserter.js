module.exports = class ButtonsAsserter {
  constructor (context, caps = {}) {
    this.context = context
    this.caps = caps
  }

  assertConvoStep (convo, convoStep, args, botMsg) {
    if (args && args.length > 0) {
      const buttonsNotFound = []
      for (let i = 0; i < args.length; i++) {
        if (botMsg.buttons) {
          if (botMsg.buttons.findIndex(mb => this.context.Match(mb.text, args[i])) >= 0) continue
        }
        if (botMsg.cards) {
          if (botMsg.cards.findIndex(mc => mc.buttons && mc.buttons.findIndex(mcb => this.context.Match(mcb.text, args[i])) >= 0) >= 0) continue
        }
        buttonsNotFound.push(args[i])
      }
      if (buttonsNotFound.length > 0) return Promise.reject(new Error(`${convoStep.stepTag}: Expected buttons with text "${buttonsNotFound}"`))
    }
    return Promise.resolve()
  }
}
