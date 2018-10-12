module.exports = class BaseAsserter {
  constructor (context, caps = {}) {
    this.context = context
    this.caps = caps
  }

  assertConvoBegin (convo) {
    return Promise.resolve()
  }

  assertConvoStep (convo, convoStep, args, botMsg) {
    return Promise.resolve()
  }

  assertConvoEnd (convo, msgs) {
    return Promise.resolve()
  }
}
