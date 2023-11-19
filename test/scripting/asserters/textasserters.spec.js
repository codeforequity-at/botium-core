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
describe('asserters.text', function () {
  describe('asserters.textasserter (to replace deprecated ones)', function () {
    describe('asserters.basetextasserters.text', function () {
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
      it('should accept good chatbot response', async function () {
        this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'TEXT_ASSERTER_DEFAULT.convo.txt')
        assert.equal(this.compiler.convos.length, 1)

        await this.compiler.convos[0].Run(this.container)
      }).timeout(3000)
      it('should not accept bad chatbot response', async function () {
        this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'TEXT_ASSERTER_DEFAULT_NO_MATCH.convo.txt')
        assert.equal(this.compiler.convos.length, 1)

        try {
          await this.compiler.convos[0].Run(this.container)
          assert.fail('should have failed')
        } catch (err) {
          assert.isTrue(err.message.indexOf('Expected any text of "You said Hello" in response containing message "You said Hey"') >= 0)
        }
      }).timeout(3000)
      it('should not accept bad chatbot response if matching mode is exact', async function () {
        this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'convo_step_parameter_matchmode_failed.convo.txt')
        assert.equal(this.compiler.convos.length, 1)

        try {
          await this.compiler.convos[0].Run(this.container)
          assert.fail('should have failed')
        } catch (err) {
          assert.isTrue(err.message.indexOf('Expected any text of "You said" in response containing message "You said Hey"') >= 0)
        }
      }).timeout(3000)
      it('should accept good chatbot response with retry', async function () {
        this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'TEXT_ASSERTER_RETRY.convo.txt')
        assert.equal(this.compiler.convos.length, 1)

        await this.compiler.convos[0].Run(this.container)
      }).timeout(3000)
      it('should check well if all parameters are set', async function () {
        this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'TEXT_ASSERTER_EVERYTHING.convo.txt')
        assert.equal(this.compiler.convos.length, 1)

        try {
          await this.compiler.convos[0].Run(this.container)
          assert.fail('should have failed')
        } catch (err) {
          assert.isTrue(err.message.indexOf('Expected any text of "You said" in response containing message "You said Hey"') >= 0)
        }
      }).timeout(3000)
    })
  })

  describe('asserters.basetextasserters (deprecated)', function () {
    beforeEach(async function () {
      const myCaps = {
        [Capabilities.PROJECTNAME]: 'asserters.retryassert should retry',
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
    describe('asserters.basetextasserters.text', function () {
      it('should accept good chatbot response', async function () {
        this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'TEXT_GOOD.convo.txt')
        assert.equal(this.compiler.convos.length, 1)

        await this.compiler.convos[0].Run(this.container)
      }).timeout(3000)
      it('should not accept bad chatbot response', async function () {
        this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'TEXT_BAD.convo.txt')
        assert.equal(this.compiler.convos.length, 1)
        try {
          await this.compiler.convos[0].Run(this.container)
          assert.fail('should have failed')
        } catch (err) {
          assert.isTrue(err.message.indexOf('Expected any text of "You said Hello1" in response containing message "You said Hey"') >= 0)
        }
      }).timeout(3000)
    })
    describe('asserters.basetextasserters.retryassert', function () {
      it('should accept message inside of the timeout', async function () {
        this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'RETRYASSERT_TEXT_2HELLO.convo.txt')
        assert.equal(this.compiler.convos.length, 1)

        await this.compiler.convos[0].Run(this.container)
      }).timeout(3000)
      it('should not accept message outside of the timeout', async function () {
        this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'RETRYASSERT_TEXT_10HELLO.convo.txt')
        assert.equal(this.compiler.convos.length, 1)
        try {
          await this.compiler.convos[0].Run(this.container)
          assert.fail('should have failed')
        } catch (err) {
          assert.isTrue(err.message.indexOf('Line 15: Expected any text of "You said Hello10" in response containing message "You said Hello5" using retries with 200ms') >= 0)
        }
      }).timeout(3000)
    })
  })
})
