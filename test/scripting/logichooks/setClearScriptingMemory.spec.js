const path = require('path')
const assert = require('chai').assert
const BotDriver = require('../../../index').BotDriver
const Capabilities = require('../../../index').Capabilities

const echoConnector = ({ queueBotSays }) => {
  return {
    UserSays (msg) {
      const response = msg.messageText && msg.messageText.replace('INPUT1', 'OUTPUT1').replace('INPUT2', 'OUTPUT2')
      const botMsg = { sender: 'bot', sourceData: msg.sourceData, messageText: response, cards: [{ text: 'card text', content: 'card content' }] }
      queueBotSays(botMsg)
    }
  }
}

describe('SetClearScriptingMemory', function () {
  beforeEach(async function () {
    const myCaps = {
      [Capabilities.PROJECTNAME]: 'scripting.logichooks',
      [Capabilities.CONTAINERMODE]: echoConnector,
      [Capabilities.SCRIPTING_ENABLE_MEMORY]: true
    }
    const driver = new BotDriver(myCaps)
    this.compiler = driver.BuildCompiler()
    this.container = await driver.Build()
  })

  afterEach(async function () {
    this.container && await this.container.Clean()
  })

  it('should be created by begin', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'scripting_memory_created_by_begin.convo.txt')
    assert.equal(this.compiler.convos.length, 1)

    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.isObject(transcript.scriptingMemory)
    assert.isDefined(transcript.scriptingMemory.$created_by_begin)
    assert.equal(transcript.scriptingMemory.$created_by_begin, 'created_by_begin_from_begin')
  })

  it('should be created two by begin', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'scripting_memory_created_two_by_begin.convo.txt')
    assert.equal(this.compiler.convos.length, 1)

    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.isObject(transcript.scriptingMemory)
    assert.isDefined(transcript.scriptingMemory.$created_by_begin_one)
    assert.equal(transcript.scriptingMemory.$created_by_begin_one, 'created_by_begin_one_from_begin')
    assert.isDefined(transcript.scriptingMemory.$created_by_begin_two)
    assert.equal(transcript.scriptingMemory.$created_by_begin_two, 'created_by_begin_two_from_begin')
  })

  it('should be created by logic hook', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'scripting_memory_created_by_logic_hook.convo.txt')
    assert.equal(this.compiler.convos.length, 1)

    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.isObject(transcript.scriptingMemory)
    assert.isDefined(transcript.scriptingMemory.$created_by_logic_hook)
    assert.equal(transcript.scriptingMemory.$created_by_logic_hook, 'created_by_logic_hook_from_logic_hook')
  })

  it('should be cleared by logic hook', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'scripting_memory_cleared_by_logic_hook.convo.txt')
    assert.equal(this.compiler.convos.length, 1)

    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.isObject(transcript.scriptingMemory)
    assert.notExists(transcript.scriptingMemory.cleared_by_logic_hook)
  })

  it('should be overwritten by convo', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'scripting_memory_overwritten_by_convo.convo.txt')
    assert.equal(this.compiler.convos.length, 1)

    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.isObject(transcript.scriptingMemory)
    assert.isDefined(transcript.scriptingMemory.$overwritten_by_convo)
    assert.equal(transcript.scriptingMemory.$overwritten_by_convo, 'overwritten_by_convo_from_begin')
  })

  it('should be overwritten by logic hook', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'scripting_memory_overwritten_by_logic_hook.convo.txt')
    assert.equal(this.compiler.convos.length, 1)

    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.isObject(transcript.scriptingMemory)
    assert.isDefined(transcript.scriptingMemory.$overwritten_by_logic_hook)
    assert.equal(transcript.scriptingMemory.$overwritten_by_logic_hook, 'overwritten_by_logic_hook_from_logic_hook')
  })

  it('reserved word, just a log on console', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'scripting_memory_reserved_word.convo.txt')
    assert.equal(this.compiler.convos.length, 1)
    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.isObject(transcript.scriptingMemory)
    assert.isDefined(transcript.scriptingMemory.$year)
    assert.equal(transcript.scriptingMemory.$year, '2012')
  })

  it('numbers, parse currencies', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'scripting_memory_numbers.convo.txt')
    assert.equal(this.compiler.convos.length, 1)
    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.isObject(transcript.scriptingMemory)
    // assert.isDefined(transcript.scriptingMemory['$year'])
    // assert.equal(transcript.scriptingMemory['$year'], '2012')
  })

  it('should use scripting memory for assertions', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'scripting_memory_progress.convo.txt')
    try {
      await this.compiler.convos[0].Run(this.container)
      assert.fail('should have failed')
    } catch (err) {
      assert.isTrue(err.message.indexOf('Bot response (on Line 6: #me - sending input: $input) "sending input: OUTPUT1" expected to match "sending input: INPUT1"') >= 0)
    }
  })
  it('should overwrite scripting memory and use for assertions', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'scripting_memory_overwrite_and_check.convo.txt')
    try {
      await this.compiler.convos[0].Run(this.container)
      assert.fail('should have failed')
    } catch (err) {
      assert.isTrue(err.message.indexOf('Bot response (on Line 9: #me - this is a variable: VARVALUE2) "this is a variable: VARVALUE2" expected to match "this is a variable: VARVALUE1"') >= 0)
      assert.isUndefined(err.transcript.steps[0].scriptingMemory.$myvar)
      assert.equal(err.transcript.steps[1].scriptingMemory.$myvar, 'VARVALUE1')
      assert.equal(err.transcript.steps[2].scriptingMemory.$myvar, 'VARVALUE1')
      assert.equal(err.transcript.steps[3].scriptingMemory.$myvar, 'VARVALUE1')
    }
  })
  it('should be assigned from jsonpath', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'scripting_memory_from_jsonpath.convo.txt')
    assert.equal(this.compiler.convos.length, 1)

    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.isObject(transcript.scriptingMemory)
    assert.isDefined(transcript.scriptingMemory.$cardcontent)
    assert.equal(transcript.scriptingMemory.$cardcontent, 'card content')
  })
  it('should fail on invalid jsonpath', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'scripting_memory_from_invalidjsonpath.convo.txt')
    try {
      await this.compiler.convos[0].Run(this.container)
      assert.fail('should have failed')
    } catch (err) {
      assert.isTrue(err.message.indexOf('no result from JSON-Path query') >= 0)
    }
  })
})

describe('scripting.logichooks.global', function () {
  beforeEach(async function () {
    const myCaps = {
      [Capabilities.PROJECTNAME]: 'scripting.logichooks',
      [Capabilities.CONTAINERMODE]: echoConnector,
      [Capabilities.SCRIPTING_ENABLE_MEMORY]: true,
      [Capabilities.LOGIC_HOOKS]: [
        {
          src: 'SetScriptingMemoryLogicHook',
          ref: 'created_by_global',
          global: true,
          args: {
            name: 'created_by_global',
            value: 'created_by_global_from_global'
          }
        },
        {
          src: 'SetScriptingMemoryLogicHook',
          ref: 'created_by_begin',
          global: true,
          args: {
            name: 'created_by_begin',
            value: 'created_by_begin_from_global'
          }
        }

      ]
    }
    const driver = new BotDriver(myCaps)
    this.compiler = driver.BuildCompiler()
    this.container = await driver.Build()
  })

  afterEach(async function () {
    this.container && await this.container.Clean()
  })

  it('should be created by global', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'no_scripting_memory.convo.txt')
    assert.equal(this.compiler.convos.length, 1)

    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.isObject(transcript.scriptingMemory)
    assert.isDefined(transcript.scriptingMemory.$created_by_global)
    assert.equal(transcript.scriptingMemory.$created_by_global, 'created_by_global_from_global')
  })

  // It must be just an accident that the global is overwritten by begin. feel free to change this test
  it('should be overwritten by global', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'scripting_memory_created_by_begin.convo.txt')
    assert.equal(this.compiler.convos.length, 1)

    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.isObject(transcript.scriptingMemory)
    assert.isDefined(transcript.scriptingMemory.$created_by_begin)
    assert.equal(transcript.scriptingMemory.$created_by_begin, 'created_by_begin_from_global')
  })
})
