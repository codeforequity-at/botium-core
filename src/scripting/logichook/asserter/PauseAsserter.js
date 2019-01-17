const pause = require('../PauseLogic').pause

module.exports = class PauseAsserter {
  constructor (context, caps = {}) {
    this.context = context
    this.caps = caps
  }

  assertConvoBegin ({ convo, container, args }) {
    return pause(convo.sourceTag, args)
  }

  assertConvoEnd ({ convo, container, msgs, args }) {
    return pause(convo.sourceTag, args)
  }
}
