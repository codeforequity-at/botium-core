const path = require('path')
const assert = require('chai').assert
const BotDriver = require('../../../index').BotDriver
const Capabilities = require('../../../index').Capabilities

const echoConnector = ({ queueBotSays }) => {
  return {
    UserSays (msg) {
      const botMsg = { sender: 'bot', sourceData: msg.sourceData, messageText: msg.messageText }
      queueBotSays(botMsg)
    }
  }
}

describe('scripting.logichooks.cases', function () {
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
    assert.isDefined(transcript.scriptingMemory['$created_by_begin'])
    assert.equal(transcript.scriptingMemory['$created_by_begin'], 'created_by_begin_from_begin')
  })

  it('should be created two by begin', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'scripting_memory_created_two_by_begin.convo.txt')
    assert.equal(this.compiler.convos.length, 1)

    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.isObject(transcript.scriptingMemory)
    assert.isDefined(transcript.scriptingMemory['$created_by_begin_one'])
    assert.equal(transcript.scriptingMemory['$created_by_begin_one'], 'created_by_begin_one_from_begin')
    assert.isDefined(transcript.scriptingMemory['$created_by_begin_two'])
    assert.equal(transcript.scriptingMemory['$created_by_begin_two'], 'created_by_begin_two_from_begin')
  })

  it('should be created by logic hook', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'scripting_memory_created_by_logic_hook.convo.txt')
    assert.equal(this.compiler.convos.length, 1)

    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.isObject(transcript.scriptingMemory)
    assert.isDefined(transcript.scriptingMemory['$created_by_logic_hook'])
    assert.equal(transcript.scriptingMemory['$created_by_logic_hook'], 'created_by_logic_hook_from_logic_hook')
  })

  it('should be cleared by logic hook', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'scripting_memory_cleared_by_logic_hook.convo.txt')
    assert.equal(this.compiler.convos.length, 1)

    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.isObject(transcript.scriptingMemory)
    assert.notExists(transcript.scriptingMemory['cleared_by_logic_hook'])
  })

  it('should be overwritten by convo', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'scripting_memory_overwritten_by_convo.convo.txt')
    assert.equal(this.compiler.convos.length, 1)

    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.isObject(transcript.scriptingMemory)
    assert.isDefined(transcript.scriptingMemory['$overwritten_by_convo'])
    assert.equal(transcript.scriptingMemory['$overwritten_by_convo'], 'overwritten_by_convo_from_convo')
  })

  it('should be overwritten by logic hook', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'scripting_memory_overwritten_by_logic_hook.convo.txt')
    assert.equal(this.compiler.convos.length, 1)

    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.isObject(transcript.scriptingMemory)
    assert.isDefined(transcript.scriptingMemory['$overwritten_by_logic_hook'])
    assert.equal(transcript.scriptingMemory['$overwritten_by_logic_hook'], 'overwritten_by_logic_hook_from_logic_hook')
  })

  it('reserved word, just a log on console', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'scripting_memory_reserved_word.convo.txt')
    assert.equal(this.compiler.convos.length, 1)
    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.isObject(transcript.scriptingMemory)
    assert.isDefined(transcript.scriptingMemory['$year'])
    assert.equal(transcript.scriptingMemory['$year'], '2012')
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
    assert.isDefined(transcript.scriptingMemory['$created_by_global'])
    assert.equal(transcript.scriptingMemory['$created_by_global'], 'created_by_global_from_global')
  })

  // It must be just an accident that the global is overwritten by begin. feel free to change this test
  it('should be overwritten by global', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'scripting_memory_created_by_begin.convo.txt')
    assert.equal(this.compiler.convos.length, 1)

    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.isObject(transcript.scriptingMemory)
    assert.isDefined(transcript.scriptingMemory['$created_by_begin'])
    assert.equal(transcript.scriptingMemory['$created_by_begin'], 'created_by_begin_from_global')
  })
})
