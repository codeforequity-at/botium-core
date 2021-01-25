const utils = require('util')

module.exports = class MyAsserter {
  constructor (context, caps = {}) {
    this.context = context
    this.caps = caps
  }

  assertConvoBegin ({convo, container, args}) {
    console.log(`MyAsserter assertConvoBegin: ${convo.header.name}`)
    return Promise.resolve()
  }

  assertConvoStep ({convo, convoStep, args, botMsg}) {
    console.log(`MyAsserter assertConvoStep, botMessage: ${utils.inspect(botMsg)} ...`)
    return Promise.resolve()
  }

  assertConvoEnd ({convo, container, transcript, args}) {
    console.log(`MyAsserter assertConvoEnd ${convo.header.name}, transcript: ${utils.inspect(transcript)} ...`)
    return Promise.resolve()
  }
}
