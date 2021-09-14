const assert = require('chai').assert
const path = require('path')

const BotDriver = require('../../../').BotDriver
const Capabilities = require('../../../').Capabilities

const echoConnector = ({ queueBotSays }) => {
  return {
    UserSays (msg) {
      const botMsg = { sender: 'bot', sourceData: msg.sourceData, messageText: msg.messageText }
      queueBotSays(botMsg)
    }
  }
}

describe('scripting.asserters.textContainsAllAsserter', function () {
  beforeEach(async function () {
    const myCaps = {
      [Capabilities.PROJECTNAME]: 'scripting.asserters.textContainsAllAsserter',
      [Capabilities.CONTAINERMODE]: echoConnector
    }
    const driver = new BotDriver(myCaps)
    this.compiler = driver.BuildCompiler()
    this.container = await driver.Build()
  })
  afterEach(async function () {
    this.container && await this.container.Clean()
  })

  it('ok, base', async function () {
    this.compiler.ReadScriptsFromDirectory(path.resolve(__dirname, 'convos', 'text_contains_all_ok_base.yml'))

    this.compiler.ExpandScriptingMemoryToConvos()
    assert.equal(this.compiler.convos.length, 1)
    await this.compiler.convos[0].Run(this.container)
  })

  it('ok, more words', async function () {
    this.compiler.ReadScriptsFromDirectory(path.resolve(__dirname, 'convos', 'text_contains_all_ok_more_words.yml'))

    this.compiler.ExpandScriptingMemoryToConvos()
    assert.equal(this.compiler.convos.length, 1)
    await this.compiler.convos[0].Run(this.container)
  })

  it('ok, utterances', async function () {
    this.compiler.ReadScriptsFromDirectory(path.resolve(__dirname, 'convos', 'text_contains_all_ok_utterances.yml'))

    this.compiler.ExpandScriptingMemoryToConvos()
    assert.equal(this.compiler.convos.length, 1)
    await this.compiler.convos[0].Run(this.container)
  })

  it('ok, ignore case', async function () {
    this.compiler.ReadScriptsFromDirectory(path.resolve(__dirname, 'convos', 'text_contains_all_ok_ignore_case.yml'))

    this.compiler.ExpandScriptingMemoryToConvos()
    assert.equal(this.compiler.convos.length, 1)
    await this.compiler.convos[0].Run(this.container)
  })

  it('ok, negate', async function () {
    this.compiler.ReadScriptsFromDirectory(path.resolve(__dirname, 'convos', 'text_contains_all_ok_negate.yml'))

    this.compiler.ExpandScriptingMemoryToConvos()
    assert.equal(this.compiler.convos.length, 1)
    await this.compiler.convos[0].Run(this.container)
  })

  it('nok, base', async function () {
    this.compiler.ReadScriptsFromDirectory(path.resolve(__dirname, 'convos', 'text_contains_all_nok_base.yml'))

    this.compiler.ExpandScriptingMemoryToConvos()
    assert.equal(this.compiler.convos.length, 1)

    try {
      await this.compiler.convos[0].Run(this.container)
      assert.fail('expected error')
    } catch (err) {
      assert.equal(err.message, 'text_contains_all_nok_base/Line 2: assertion error - Line 2: Expected text(s) in response "word3"')
    }
  })

  it('nok, more words', async function () {
    this.compiler.ReadScriptsFromDirectory(path.resolve(__dirname, 'convos', 'text_contains_all_nok_more_words.yml'))

    this.compiler.ExpandScriptingMemoryToConvos()
    assert.equal(this.compiler.convos.length, 1)

    try {
      await this.compiler.convos[0].Run(this.container)
      assert.fail('expected error')
    } catch (err) {
      assert.equal(err.message, 'text_contains_all_nok_more_words/Line 2: assertion error - Line 2: Expected text(s) in response "word3,word4,word5"')
    }
  })

  it('nok, more words, partial match', async function () {
    this.compiler.ReadScriptsFromDirectory(path.resolve(__dirname, 'convos', 'text_contains_all_nok_more_words_partial_match.yml'))

    this.compiler.ExpandScriptingMemoryToConvos()
    assert.equal(this.compiler.convos.length, 1)

    try {
      await this.compiler.convos[0].Run(this.container)
      assert.fail('expected error')
    } catch (err) {
      assert.equal(err.message, 'text_contains_all_nok_more_words/Line 2: assertion error - Line 2: Expected text(s) in response "word3,word4"')
    }
  })

  it('nok, utterances', async function () {
    this.compiler.ReadScriptsFromDirectory(path.resolve(__dirname, 'convos', 'text_contains_all_nok_utterances.yml'))

    this.compiler.ExpandScriptingMemoryToConvos()
    assert.equal(this.compiler.convos.length, 1)

    try {
      await this.compiler.convos[0].Run(this.container)
      assert.fail('expected error')
    } catch (err) {
      assert.equal(err.message, 'text_contains_all_nok_utterances/Line 2: assertion error - Line 2: Expected text(s) in response "word3,word4,hi,hello!"')
    }
  })

  it('nok, ignore case', async function () {
    this.compiler.ReadScriptsFromDirectory(path.resolve(__dirname, 'convos', 'text_contains_all_nok_ignore_case.yml'))

    this.compiler.ExpandScriptingMemoryToConvos()
    assert.equal(this.compiler.convos.length, 1)

    try {
      await this.compiler.convos[0].Run(this.container)
      assert.fail('expected error')
    } catch (err) {
      assert.equal(err.message, 'text_contains_all_nok_ignore_case/Line 2: assertion error - Line 2: Expected text(s) in response "Word3"')
    }
  })

  it('nok, negate', async function () {
    this.compiler.ReadScriptsFromDirectory(path.resolve(__dirname, 'convos', 'text_contains_all_nok_negate.yml'))

    this.compiler.ExpandScriptingMemoryToConvos()
    assert.equal(this.compiler.convos.length, 1)

    try {
      await this.compiler.convos[0].Run(this.container)
      assert.fail('expected error')
    } catch (err) {
      assert.equal(err.message, 'text_contains_all_nok_negate/Line 2: assertion error - Line 2: Not expected text(s) in response "word2"')
    }
  })
})
