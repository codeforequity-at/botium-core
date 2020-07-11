const path = require('path')
const assert = require('chai').assert
const BotDriver = require('../../').BotDriver
const Capabilities = require('../../').Capabilities
const debug = require('debug')('botium-test-logichooks-waitforbot')
const util = require('util')

const createEchoConnector = () => ({ queueBotSays, caps }) => {
  return {
    UserSays (msg) {
      const prefix = `Testcase "${caps[Capabilities.PROJECTNAME]}"`
      debug(`${prefix} Connector got message ${util.inspect(msg)}`)
      const botMsg = { sender: 'bot', sourceData: msg.sourceData, messageText: msg.messageText }
      setTimeout(() => {
        debug(`${prefix} Connector send message ${util.inspect(botMsg)}`)
        return queueBotSays(botMsg)
      }, caps.WAITECHO)
    }
  }
}

describe('logichooks.waitforbot', function () {
  it('should waitforbot', async function () {
    const myCaps = {
      [Capabilities.PROJECTNAME]: 'logichooks.waitforbot should waitforbot',
      [Capabilities.CONTAINERMODE]: createEchoConnector(),
      [Capabilities.WAITFORBOTTIMEOUT]: 0,
      WAITECHO: 500
    }
    const driver = new BotDriver(myCaps)
    const compiler = driver.BuildCompiler()
    const container = await driver.Build()

    compiler.ReadScript(path.resolve(__dirname, 'convos'), 'WAITFORBOT_1000.convo.txt')
    assert.equal(compiler.convos.length, 1)

    await compiler.convos[0].Run(container)
    await container.Clean()
  }).timeout(3000)
  it('should fail on waitforbot timeout', async function () {
    const myCaps = {
      [Capabilities.PROJECTNAME]: 'logichooks.waitforbot should fail on waitforbot timeout',
      [Capabilities.CONTAINERMODE]: createEchoConnector(),
      [Capabilities.WAITFORBOTTIMEOUT]: 0,
      WAITECHO: 2000
    }
    const driver = new BotDriver(myCaps)
    const compiler = driver.BuildCompiler()
    const container = await driver.Build()

    compiler.ReadScript(path.resolve(__dirname, 'convos'), 'WAITFORBOT_1000.convo.txt')
    assert.equal(compiler.convos.length, 1)

    try {
      await compiler.convos[0].Run(container)
      assert.fail('should have failed with timeout')
    } catch (err) {
      if (!err.message.includes('Bot did not respond within')) {
        throw err
      }
    }
    await container.Clean()
  }).timeout(3000)
  it('should waitforbot infinite timeout', async function () {
    const myCaps = {
      [Capabilities.PROJECTNAME]: 'logichooks.waitforbot should waitforbot infinite timeout',
      [Capabilities.CONTAINERMODE]: createEchoConnector(),
      [Capabilities.WAITFORBOTTIMEOUT]: 0,
      WAITECHO: 1000
    }
    const driver = new BotDriver(myCaps)
    const compiler = driver.BuildCompiler()
    const container = await driver.Build()

    compiler.ReadScript(path.resolve(__dirname, 'convos'), 'WAITFORBOT_INFINITE.convo.txt')
    assert.equal(compiler.convos.length, 1)

    await compiler.convos[0].Run(container)
    await container.Clean()
  }).timeout(3000)
  it('should fail on waitforbot timeout in begin', async function () {
    const myCaps = {
      [Capabilities.PROJECTNAME]: 'logichooks.waitforbot should fail on waitforbot timeout in begin',
      [Capabilities.CONTAINERMODE]: createEchoConnector(),
      [Capabilities.WAITFORBOTTIMEOUT]: 0,
      WAITECHO: 0
    }
    const driver = new BotDriver(myCaps)
    const compiler = driver.BuildCompiler()
    const container = await driver.Build()

    compiler.ReadScript(path.resolve(__dirname, 'convos'), 'WAITFORBOT_1000_BEGIN.convo.txt')
    assert.equal(compiler.convos.length, 1)

    try {
      await compiler.convos[0].Run(container)
      assert.fail('should have failed with timeout')
    } catch (err) {
      if (!err.message.includes('Bot did not respond within')) {
        throw err
      }
    }
    await container.Clean()
  }).timeout(3000)
  it('should fail on waitforbot timeout in end', async function () {
    const myCaps = {
      [Capabilities.PROJECTNAME]: 'logichooks.waitforbot should fail on waitforbot timeout in end',
      [Capabilities.CONTAINERMODE]: createEchoConnector(),
      [Capabilities.WAITFORBOTTIMEOUT]: 500,
      WAITECHO: 0
    }
    const driver = new BotDriver(myCaps)
    const compiler = driver.BuildCompiler()
    const container = await driver.Build()

    compiler.ReadScript(path.resolve(__dirname, 'convos'), 'WAITFORBOT_1000_BOT_AND_END.convo.txt')
    assert.equal(compiler.convos.length, 1)

    await compiler.convos[0].Run(container)
    await container.Clean()
  }).timeout(3000)
  it('should waitforbot in end', async function () {
    const myCaps = {
      [Capabilities.PROJECTNAME]: 'logichooks.waitforbot should waitforbot in end',
      [Capabilities.CONTAINERMODE]: createEchoConnector(),
      [Capabilities.WAITFORBOTTIMEOUT]: 0,
      WAITECHO: 500
    }
    const driver = new BotDriver(myCaps)
    const compiler = driver.BuildCompiler()
    const container = await driver.Build()

    compiler.ReadScript(path.resolve(__dirname, 'convos'), 'WAITFORBOT_1000_END.convo.txt')
    assert.equal(compiler.convos.length, 1)

    await compiler.convos[0].Run(container)
    await container.Clean()
  }).timeout(3000)
})
