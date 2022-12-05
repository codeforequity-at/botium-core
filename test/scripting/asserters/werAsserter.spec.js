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

  it('ok (float)', async function () {
    this.compiler.ReadScriptsFromDirectory(path.resolve(__dirname, 'convos', 'wer_threshold_ok_float.yml'))

    this.compiler.ExpandScriptingMemoryToConvos()
    assert.equal(this.compiler.convos.length, 1)
    await this.compiler.convos[0].Run(this.container)
  })
  it('ok (percentage)', async function () {
    this.compiler.ReadScriptsFromDirectory(path.resolve(__dirname, 'convos', 'wer_threshold_ok_percentage.yml'))

    this.compiler.ExpandScriptingMemoryToConvos()
    assert.equal(this.compiler.convos.length, 1)
    await this.compiler.convos[0].Run(this.container)
  })

  it('nok (float)', async function () {
    this.compiler.ReadScriptsFromDirectory(path.resolve(__dirname, 'convos', 'wer_threshold_nok_float.yml'))

    this.compiler.ExpandScriptingMemoryToConvos()
    assert.equal(this.compiler.convos.length, 1)

    try {
      await this.compiler.convos[0].Run(this.container)
      assert.fail('expected error')
    } catch (err) {
      assert.equal(err.message, 'wer_threshold_nok/Line 2: assertion error - Line 2: Word Error Rate (50%) higher than accepted (10%)')
    }
  })
  it('nok (percentage)', async function () {
    this.compiler.ReadScriptsFromDirectory(path.resolve(__dirname, 'convos', 'wer_threshold_nok_percentage.yml'))

    this.compiler.ExpandScriptingMemoryToConvos()
    assert.equal(this.compiler.convos.length, 1)

    try {
      await this.compiler.convos[0].Run(this.container)
      assert.fail('expected error')
    } catch (err) {
      assert.equal(err.message, 'wer_threshold_nok/Line 2: assertion error - Line 2: Word Error Rate (50%) higher than accepted (10%)')
    }
  })

  it('ok wildcard (percentage)', async function () {
    this.compiler.ReadScriptsFromDirectory(path.resolve(__dirname, 'convos', 'wer_threshold_wildcard_ok_percentage.yml'))

    this.compiler.ExpandScriptingMemoryToConvos()
    assert.equal(this.compiler.convos.length, 1)
    await this.compiler.convos[0].Run(this.container)
  })
  it('ok wildcard (float)', async function () {
    this.compiler.ReadScriptsFromDirectory(path.resolve(__dirname, 'convos', 'wer_threshold_wildcard_ok_float.yml'))

    this.compiler.ExpandScriptingMemoryToConvos()
    assert.equal(this.compiler.convos.length, 1)
    await this.compiler.convos[0].Run(this.container)
  })
  it('nok wildcard (percentage)', async function () {
    this.compiler.ReadScriptsFromDirectory(path.resolve(__dirname, 'convos', 'wer_threshold_wildcard_nok_percentage.yml'))

    this.compiler.ExpandScriptingMemoryToConvos()
    assert.equal(this.compiler.convos.length, 1)

    try {
      await this.compiler.convos[0].Run(this.container)
      assert.fail('expected error')
    } catch (err) {
      assert.equal(err.message, 'wer_threshold_wildcard_nok/Line 2: assertion error - Line 2: Word Error Rate (33%) higher than accepted (1%)')
    }
  })
  it('nok wildcard (float)', async function () {
    this.compiler.ReadScriptsFromDirectory(path.resolve(__dirname, 'convos', 'wer_threshold_wildcard_nok_float.yml'))

    this.compiler.ExpandScriptingMemoryToConvos()
    assert.equal(this.compiler.convos.length, 1)

    try {
      await this.compiler.convos[0].Run(this.container)
      assert.fail('expected error')
    } catch (err) {
      assert.equal(err.message, 'wer_threshold_wildcard_nok/Line 2: assertion error - Line 2: Word Error Rate (75%) higher than accepted (40%)')
    }
  })
})
