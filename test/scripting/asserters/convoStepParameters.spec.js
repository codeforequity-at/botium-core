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
        if (msg.toLowerCase().indexOf('button') >= 0) {
          botMsg.buttons = [{ text: 'button1' }, { text: 'button2' }]
        }
        if (msg.toLowerCase().indexOf('intent') >= 0) {
          botMsg.nlp = { intent: { name: 'someIntent', confidence: 0.5 } }
        }
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
      [Capabilities.CONTAINERMODE]: createEchoConnector(),
      [Capabilities.WAITFORBOTTIMEOUT]: 1000,
      [Capabilities.SCRIPTING_ENABLE_MULTIPLE_ASSERT_ERRORS]: true,
      [Capabilities.SCRIPTING_CONVO_STEP_PARAMETERS]: '{"ignoreNotMatchedBotResponses": {"timeout": 200, "asserters": ["INTENT"]}}'
    }
    const driver = new BotDriver(myCaps)
    this.compiler = driver.BuildCompiler()
    this.container = await driver.Build()
  })
  afterEach(async function () {
    await this.container.Stop()
    await this.container.Clean()
  })

  describe('scripting.asserters.convoStepParametersForAssert.matchmode', function () {
    it('should not accept bad chatbot response on exact match defined on step', async function () {
      this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'convo_step_parameter_matchmode_failed.convo.txt')
      assert.equal(this.compiler.convos.length, 1)

      try {
        await this.compiler.convos[0].Run(this.container)
        assert.fail('should have failed')
      } catch (err) {
        assert.isTrue(err.message.indexOf('"You said Hello" expected to match "Hello"') >= 0)
      }
    })
  })

  describe('scripting.asserters.convoStepParametersForAssert.retry', function () {
    it('should retry until succesful main', async function () {
      this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'convo_step_parameter_retry_main_good.convo.txt')
      assert.equal(this.compiler.convos.length, 1)

      await this.compiler.convos[0].Run(this.container)
    })
    it('should retry until succesful asserters', async function () {
      this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'convo_step_parameter_retry_asserters_good.convo.txt')
      assert.equal(this.compiler.convos.length, 1)

      await this.compiler.convos[0].Run(this.container)
    })
    it('should retry until succesful asserters all', async function () {
      this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'convo_step_parameter_retry_asserters_all_good.convo.txt')
      assert.equal(this.compiler.convos.length, 1)

      await this.compiler.convos[0].Run(this.container)
    })
    it('should retry until succesful main, configured in begin', async function () {
      this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'convo_step_parameter_retry_main_good_begin.convo.txt')
      assert.equal(this.compiler.convos.length, 1)

      await this.compiler.convos[0].Run(this.container)
    })
    it('should retry until succesful asserters, configured by cap', async function () {
      this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'convo_step_parameter_retry_asserters_good_global.convo.txt')
      assert.equal(this.compiler.convos.length, 1)

      await this.compiler.convos[0].Run(this.container)
    })
    it('should retry until timeout main', async function () {
      this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'convo_step_parameter_retry_main_botium_timeout.convo.txt')
      assert.equal(this.compiler.convos.length, 1)

      try {
        await this.compiler.convos[0].Run(this.container)
        assert.fail('should have failed')
      } catch (err) {
        assert.isTrue(err.message.indexOf('error waiting for bot - Bot did not respond within 1s') >= 0)
      }
    })
    it('should retry until timeout asserter', async function () {
      this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'convo_step_parameter_retry_asserters_botium_timeout.convo.txt')
      assert.equal(this.compiler.convos.length, 1)

      try {
        await this.compiler.convos[0].Run(this.container)
        assert.fail('should have failed')
      } catch (err) {
        assert.isTrue(err.message.indexOf('error waiting for bot - Bot did not respond within 1s') >= 0)
      }
    })
    it('should not retry on not retriable error', async function () {
      this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'convo_step_parameter_retry_main_but_no_button.convo.txt')
      assert.equal(this.compiler.convos.length, 1)

      try {
        await this.compiler.convos[0].Run(this.container)
        assert.fail('should have failed')
      } catch (err) {
        assert.isTrue(err.message.indexOf('Expected button(s) with text "some not existing button"') >= 0)
      }
    })
    it('should retry until every retriable is succesful', async function () {
      this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'convo_step_parameter_retry_main_and_asserter.convo.txt')
      assert.equal(this.compiler.convos.length, 1)

      await this.compiler.convos[0].Run(this.container)
    })
  })
})
