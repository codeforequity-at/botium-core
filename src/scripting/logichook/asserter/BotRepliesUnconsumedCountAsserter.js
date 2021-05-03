const BaseCountAsserter = require('./BaseCountAsserter')

module.exports = class BotRepliesUnconsumedCountAsserter extends BaseCountAsserter {
  constructor (context, caps = {}) {
    super(context, caps, 'unconsumed bot replies')
    this.name = 'BotRepliesUnconsumedCountAsserter'
  }

  async _getCount (argv) { return argv.container._QueueLength() }
}
