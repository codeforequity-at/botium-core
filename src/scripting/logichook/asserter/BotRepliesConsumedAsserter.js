const BaseCountAsserter = require('./BaseCountAsserter')

module.exports = class BotRepliesConsumedAsserter extends BaseCountAsserter {
  constructor (context, caps = {}) {
    super(context, caps, 'BotReplies')
    this.name = 'BotRepliesConsumedAsserter'
  }

  async _getCount (argv) { return argv.container._QueueLength() }
  _evalArgs (argv) {
    argv.args = ['=0']
  }

  _getBotiumErrMsg (argv, not, count, check) {
    const { convoStep } = argv
    if (not) {
      return `${convoStep.stepTag}: There is no unread bot reply in queue`
    } else {
      return count === 1 ? `${convoStep.stepTag}: There is an unread bot reply in queue` : `${convoStep.stepTag}: There are still ${count} unread bot replies in queue`
    }
  }
}
