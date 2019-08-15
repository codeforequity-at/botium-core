const BotiumError = require('../../BotiumError')

module.exports = class MediaAsserter {
  constructor (context, caps = {}) {
    this.context = context
    this.caps = caps
  }

  assertConvoStep ({ convo, convoStep, args, botMsg }) {
    if (args && args.length > 0) {
      let mediaFound = []
      if (botMsg.media) {
        mediaFound = mediaFound.concat(botMsg.media.map(mb => mb.mediaUri))
      }
      if (botMsg.cards) {
        mediaFound = mediaFound.concat(botMsg.cards.filter(mc => mc.image).map(mc => mc.image.mediaUri))
        mediaFound = mediaFound.concat(botMsg.cards.filter(mc => mc.media).reduce((acc, mc) => acc.concat(mc.media.map(mcm => mcm.mediaUri)), []))
      }
      const mediaNotFound = []
      for (let i = 0; i < args.length; i++) {
        if (mediaFound.findIndex(c => this.context.Match(c, args[i])) < 0) {
          mediaNotFound.push(args[i])
        }
      }
      if (mediaNotFound.length > 0) {
        return Promise.reject(new BotiumError(
          `${convoStep.stepTag}: Expected media with uri "${mediaNotFound}"`,
          {
            type: 'asserter',
            source: 'MediaAsserter',
            context: {
              // effective arguments getting from constructor
              constructor: {},
              params: {
                args
              }
            },
            cause: {
              expected: args,
              actual: mediaFound,
              diff: mediaNotFound
            }
          }
        ))
      }
    }
    return Promise.resolve()
  }
}
