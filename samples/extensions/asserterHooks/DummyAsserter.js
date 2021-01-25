const utils = require('util')

module.exports = class DummyAsserter {
  constructor (context, caps = {}) {
    this.context = context
    this.caps = caps
  }

  assertConvoBegin ({convo, container, args}) {
    console.log(`Dummy asserter Begin started with those args: ${utils.inspect(args)}`)
    return Promise.resolve()
  }

  assertConvoStep ({convo, convoStep, args, botMsg}) {
    console.log(`ConvoStep dummy assertion with those args: ${utils.inspect(args)}, botMessage: ${utils.inspect(botMsg)} ...`)
    return Promise.resolve()
  }

  assertConvoEnd ({convo, container, transcript, args}) {
    console.log(`ConvoEnd dummy assertion with those args: ${utils.inspect(args)}, transcript: ${utils.inspect(transcript)} ...`)
    return Promise.resolve()
  }
}
