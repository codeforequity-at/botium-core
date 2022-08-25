const assert = require('chai').assert
const path = require('path')

const BotDriver = require('../../..').BotDriver
const Capabilities = require('../../..').Capabilities

const echoConnector = ({ queueBotSays }) => {
  return {
    UserSays (msg) {
      const botMsg = { sender: 'bot', sourceData: msg.sourceData, messageText: msg.messageText }
      queueBotSays(botMsg)
    }
  }
}

describe('scripting.asserters.werAsserter', function () {
  beforeEach(async function () {
    const myCaps = {
      [Capabilities.PROJECTNAME]: 'scripting.asserters.werAsserter',
      [Capabilities.CONTAINERMODE]: echoConnector
    }
    const driver = new BotDriver(myCaps)
    this.compiler = driver.BuildCompiler()
    this.container = await driver.Build()
  })
  afterEach(async function () {
    this.container && await this.container.Clean()
  })

  it('ok', async function () {
    this.compiler.ReadScriptsFromDirectory(path.resolve(__dirname, 'convos', 'wer_threshold_ok.yml'))

    this.compiler.ExpandScriptingMemoryToConvos()
    assert.equal(this.compiler.convos.length, 1)
    await this.compiler.convos[0].Run(this.container)
  })

  it('nok', async function () {
    this.compiler.ReadScriptsFromDirectory(path.resolve(__dirname, 'convos', 'wer_threshold_nok.yml'))

    this.compiler.ExpandScriptingMemoryToConvos()
    assert.equal(this.compiler.convos.length, 1)

    try {
      await this.compiler.convos[0].Run(this.container)
      assert.fail('expected error')
    } catch (err) {
      assert.equal(err.message, 'wer_threshold_nok/Line 2: assertion error - Line 2: Word error rate 0.5 > 0.1 for tast 123')
    }
  })
})
