const { BotiumError } = require('../../BotiumError')

module.exports = class BotRepliesConsumedAsserter {
  constructor (context, caps = {}) {
    this.context = context
    this.caps = caps
    this.name = 'BotRepliesConsumedAsserter'
  }

  assertConvoEnd ({ container }) {
    const queueLength = container._QueueLength()
    if (queueLength > 0) {
      const errMsg = queueLength === 1 ? 'There is an unread bot reply in queue' : `There are still ${queueLength} unread bot replies in queue`

      throw new BotiumError(
        errMsg,
        {
          type: 'asserter',
          source: this.name,
          cause: {
            not: false,
            expected: 0,
            actual: queueLength,
            diff: queueLength
          }
        }
      )
    }
  }
}
