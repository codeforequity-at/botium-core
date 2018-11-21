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

  assertConvoStep (convo, convoStep, args, botMsg) {
    console.log(`ConvoStep dummy assertion with those args: ${utils.inspect(args)}, botMessage: ${utils.inspect(botMsg)} ...`)
    return Promise.resolve()
  }

  assertConvoEnd ({convo, container, msgs, args}) {
    console.log(`ConvoEnd dummy assertion with those args: ${utils.inspect(args)}, converstation: ${utils.inspect(msgs)} ...`)
    return Promise.resolve()
  }
}
