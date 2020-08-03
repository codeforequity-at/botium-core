module.exports = class CustomAsserter {
  constructor (context, caps, globalArgs) {
    this.context = context
    this.caps = caps
    this.globalArgs = globalArgs
  }

  assertConvoBegin ({ convo, args, isGlobal }) {
    return Promise.resolve()
  }

  assertConvoStep ({ convo, convoStep, args, isGlobal, botMsg }) {
    return Promise.resolve()
  }

  assertConvoEnd ({ convo, transcript, args, isGlobal }) {
    return Promise.resolve()
  }
}
