const pause = require('../PauseLogic').pause

module.exports = class PauseAsserter {
  constructor (context, caps = {}) {
    this.context = context
    this.caps = caps
    this.name = 'PauseAsserter'
  }

  assertConvoBegin ({ convo, args }) {
    return pause('PauseAsserter', convo.sourceTag, args)
  }

  assertConvoEnd ({ convo, args }) {
    return pause('PauseAsserter', convo.sourceTag, args)
  }
}
