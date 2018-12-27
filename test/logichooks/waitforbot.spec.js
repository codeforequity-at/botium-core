const path = require('path')
const assert = require('chai').assert
const BotDriver = require('../../').BotDriver
const Capabilities = require('../../').Capabilities

const echoConnector = ({ queueBotSays, caps: { WAITECHO } }) => {
  return {
    UserSays (msg) {
      const botMsg = { sender: 'bot', sourceData: msg.sourceData, messageText: msg.messageText }
      setTimeout(() => queueBotSays(botMsg), WAITECHO)
    }
  }
}

describe('logichooks.waitforbot', function () {
  it('should waitforbot', async function () {
    const myCaps = {
      [Capabilities.PROJECTNAME]: 'logichooks.waitforbot',
      [Capabilities.CONTAINERMODE]: echoConnector,
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
      [Capabilities.PROJECTNAME]: 'logichooks.waitforbot',
      [Capabilities.CONTAINERMODE]: echoConnector,
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
      assert.fail(`should have failed with timeout`)
    } catch (err) {
    }
    await container.Clean()
  }).timeout(3000)
  it('should waitforbot infinite timeout', async function () {
    const myCaps = {
      [Capabilities.PROJECTNAME]: 'logichooks.waitforbot',
      [Capabilities.CONTAINERMODE]: echoConnector,
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
})
