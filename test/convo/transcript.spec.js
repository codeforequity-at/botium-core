const path = require('path')
const moment = require('moment')
const assert = require('chai').assert
const BotDriver = require('../../').BotDriver
const Capabilities = require('../../').Capabilities

const echoConnector = ({ queueBotSays }) => {
  return {
    UserSays (msg) {
      const botMsg = { sender: 'bot', sourceData: msg.sourceData, messageText: msg.messageText }
      queueBotSays(botMsg)
    }
  }
}

describe('transcript.transcriptsteps', function () {
  it('should provide transcript steps on success', async function () {
    const myCaps = {
      [Capabilities.CONTAINERMODE]: echoConnector
    }
    const driver = new BotDriver(myCaps)
    const compiler = driver.BuildCompiler()
    const container = await driver.Build()

    compiler.ReadScript(path.resolve(__dirname, 'convos'), '2steps.convo.txt')
    assert.equal(compiler.convos.length, 1)

    const transcript = await compiler.convos[0].Run(container)
    assert.isDefined(transcript)
    assert.isDefined(transcript.convoBegin)
    assert.isDefined(transcript.convoEnd)
    assert.isTrue(moment(transcript.convoBegin).isSameOrBefore(transcript.convoEnd), 'begin should be same or before end')
    assert.equal(transcript.steps.length, 4)
    transcript.steps.forEach(step => {
      assert.isDefined(step.stepBegin)
      assert.isDefined(step.stepEnd)
      assert.isTrue(moment(step.stepBegin).isSameOrBefore(step.stepEnd), 'begin should be same or before end')
    })
  })
  it('should include pause in transcript steps', async function () {
    const myCaps = {
      [Capabilities.CONTAINERMODE]: echoConnector
    }
    const driver = new BotDriver(myCaps)
    const compiler = driver.BuildCompiler()
    const container = await driver.Build()

    compiler.ReadScript(path.resolve(__dirname, 'convos'), '2stepsWithPause.convo.txt')
    assert.equal(compiler.convos.length, 1)

    const transcript = await compiler.convos[0].Run(container)
    assert.isDefined(transcript)
    assert.isDefined(transcript.convoBegin)
    assert.isDefined(transcript.convoEnd)
    assert.isTrue(moment(transcript.convoEnd).diff(transcript.convoBegin) >= 1000, 'begin should be at least 1000 ms before end')
    assert.equal(transcript.steps.length, 4)
    assert.isTrue(moment(transcript.steps[2].stepEnd).diff(transcript.steps[2].stepBegin) >= 1000, 'begin should be at least 1000 ms before end')
  })
  it('should provide transcript steps on failing', async function () {
    const myCaps = {
      [Capabilities.CONTAINERMODE]: echoConnector
    }
    const driver = new BotDriver(myCaps)
    const compiler = driver.BuildCompiler()
    const container = await driver.Build()

    compiler.ReadScript(path.resolve(__dirname, 'convos'), '2stepsfailing.convo.txt')
    assert.equal(compiler.convos.length, 1)

    try {
      await compiler.convos[0].Run(container)
      assert.fail('expected error')
    } catch (err) {
      assert.isDefined(err.transcript)
      assert.equal(err.transcript.steps.length, 4)
      assert.equal(err.transcript.steps[0].actual.messageText, compiler.convos[0].conversation[0].messageText)
      assert.equal(err.transcript.steps[1].actual.messageText, compiler.convos[0].conversation[1].messageText)
      assert.equal(err.transcript.steps[2].actual.messageText, compiler.convos[0].conversation[2].messageText)
      assert.equal(err.transcript.steps[3].expected.messageText, compiler.convos[0].conversation[3].messageText)
      assert.notEqual(err.transcript.steps[3].actual.messageText, compiler.convos[0].conversation[3].messageText)
      assert.isDefined(err.transcript.steps[3].err)
    }
  })
  it('should provide transcript steps on invalid sender', async function () {
    const myCaps = {
      [Capabilities.CONTAINERMODE]: echoConnector
    }
    const driver = new BotDriver(myCaps)
    const compiler = driver.BuildCompiler()
    const container = await driver.Build()

    compiler.ReadScript(path.resolve(__dirname, 'convos'), 'invalidsender.convo.txt')
    assert.equal(compiler.convos.length, 1)

    try {
      await compiler.convos[0].Run(container)
      assert.fail('expected error')
    } catch (err) {
      assert.isDefined(err.transcript)
      assert.equal(err.transcript.steps.length, 1)
      assert.isDefined(err.transcript.steps[0].err)
    }
  })
})
