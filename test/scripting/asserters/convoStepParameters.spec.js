const path = require('path')
const assert = require('chai').assert
const BotDriver = require('../../../index').BotDriver
const Capabilities = require('../../../index').Capabilities
const debug = require('debug')('botium-test-logichooks-waitforbot')
const util = require('util')

const createEchoConnector = () => ({ queueBotSays, caps }) => {
  return {
    UserSays (msg) {
      const _send = (msg, timeout) => {
        const botMsg = { sender: 'bot', sourceData: msg.sourceData, messageText: `You said ${msg}` }
        setTimeout(() => {
          debug(`${prefix} Connector is sending message ${util.inspect(botMsg)}`)
          return queueBotSays(botMsg)
        }, timeout)
      }

      const prefix = `Testcase "${caps[Capabilities.PROJECTNAME]}"`
      debug(`${prefix} Connector got message ${util.inspect(msg)}`)
      if (msg.messageText) {
        msg.messageText.split('\n').forEach((msgPart, i) => {
          if (msgPart) {
            _send(msgPart, i * 50)
          }
        })
      }
    }
  }
}
describe('scripting.asserters.convoStepParametersForAssert', function () {
  beforeEach(async function () {
    const myCaps = {
      [Capabilities.PROJECTNAME]: 'asserters.text',
      [Capabilities.CONTAINERMODE]: createEchoConnector()
    }
    const driver = new BotDriver(myCaps)
    this.compiler = driver.BuildCompiler()
    this.container = await driver.Build()
  })
  afterEach(async function () {
    await this.container.Stop()
    await this.container.Clean()
  })
  it('should not accept bad chatbot response on exact match defined on step', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'MAIN_ASSERTER_MATCHMODE.convo.txt')
    assert.equal(this.compiler.convos.length, 1)

    try {
      await this.compiler.convos[0].Run(this.container)
      assert.fail('should have failed')
    } catch (err) {
      assert.isTrue(err.message.indexOf('"You said Hey" expected to match "You"') >= 0)
    }
  })
  it('should retry because main message mismatch with timeout', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'MAIN_ASSERTER_RETRY_MAIN.convo.txt')
    assert.equal(this.compiler.convos.length, 1)

    try {
      await this.compiler.convos[0].Run(this.container)
      assert.fail('should have failed')
    } catch (err) {
      assert.isTrue(err.message.indexOf('"You said Hey" expected to match "You"') >= 0)
    }
  }).timeout(3000)
  it('should retry because button mismatch with timeout', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'MAIN_ASSERTER_RETRY_MAIN.convo.txt')
    assert.equal(this.compiler.convos.length, 1)

    try {
      await this.compiler.convos[0].Run(this.container)
      assert.fail('should have failed')
    } catch (err) {
      assert.isTrue(err.message.indexOf('"You said Hey" expected to match "You"') >= 0)
    }
  }).timeout(3000)
})
