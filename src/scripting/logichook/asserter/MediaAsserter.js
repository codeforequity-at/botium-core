const { BotiumError } = require('../../BotiumError')

module.exports = class MediaAsserter {
  constructor (context, caps = {}) {
    this.context = context
    this.caps = caps
  }

  assertConvoStep ({ convo, convoStep, args, botMsg }) {
    if (args && args.length > 0) {
      const mediaNotFound = []
      for (let i = 0; i < args.length; i++) {
        if (botMsg.media) {
          if (botMsg.media.findIndex(mb => this.context.Match(mb.mediaUri, args[i])) >= 0) continue
        }
        if (botMsg.cards) {
          if (botMsg.cards.findIndex(mc => mc.image && this.context.Match(mc.image.mediaUri, args[i])) >= 0) continue
          if (botMsg.cards.findIndex(mc => mc.media && mc.media.findIndex(mcm => this.context.Match(mcm.mediaUri, args[i])) >= 0) >= 0) continue
        }
        mediaNotFound.push(args[i])
      }
      if (mediaNotFound.length > 0) {
        return Promise.reject(new BotiumError(`${convoStep.stepTag}: Expected media with uri "${mediaNotFound}"`,
          {
            type: 'asserter',
            source: 'MediaAsserter',
            context: {
              // effective arguments getting from constructor
              constructor: {},
              params: {
                args,
                botMsg
              }
            },
            cause: {
              mediaNotFound
            }
          }
        ))
      }
    }
    return Promise.resolve()
  }
}
