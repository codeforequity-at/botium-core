const path = require('path')
const assert = require('chai').assert
const BotDriver = require('../../').BotDriver
const Capabilities = require('../../').Capabilities
const ScriptingProvider = require('../../src/scripting/ScriptingProvider')
const { Convo } = require('../../src/scripting/Convo')
const DefaultCapabilities = require('../../src/Defaults').Capabilities

const echoConnector = ({ queueBotSays }) => {
  return {
    UserSays (msg) {
      const botMsg = { sender: 'bot', sourceData: msg.sourceData, messageText: msg.messageText }
      queueBotSays(botMsg)
    }
  }
}

describe('convo.scriptingmemory.convos', function () {
  beforeEach(async function () {
    const myCaps = {
      [Capabilities.PROJECTNAME]: 'convo.scriptingmemory',
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

  it('should fill scripting memory from convo file', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'memory.convo.txt')
    assert.equal(this.compiler.convos.length, 1)

    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.isObject(transcript.scriptingMemory)
    assert.isDefined(transcript.scriptingMemory['$myvar'])
    assert.equal(transcript.scriptingMemory['$myvar'], 'VARVALUE')
  })
  it('should fill scripting memory from utterances file', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'utt_memory.convo.txt')
    assert.equal(this.compiler.convos.length, 1)
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'utt_memory.utterances.txt')
    assert.isDefined(this.compiler.utterances['AGE_UTT'])

    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.isObject(transcript.scriptingMemory)
    assert.equal(transcript.scriptingMemory['$years'], '40')
    assert.equal(transcript.scriptingMemory['$months'], '2')
  })
  it('should fail on invalid scripting memory', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'memory_fail.convo.txt')
    assert.equal(this.compiler.convos.length, 1)

    try {
      await this.compiler.convos[0].Run(this.container)
      assert.fail('expected convo to fail')
    } catch (err) {
      assert.isTrue(err.message.indexOf('Expected bot response (on Line 9: #me - show var VARVALUE  ) "show var VARVALUE" to match one of "show var VARVALUEINVALID"') > 0)
    }
  })
})

describe('convo.scriptingMemory.api', function () {
  beforeEach(async function () {
    this.containerStub = {
      caps: {
        [Capabilities.SCRIPTING_ENABLE_MEMORY]: true
      }
    }
    this.scriptingProvider = new ScriptingProvider(DefaultCapabilities)
    await this.scriptingProvider.Build()
    this.scriptingContext = this.scriptingProvider._buildScriptContext()
    this.convo = new Convo(this.scriptingContext, {
      header: 'test convo',
      conversation: []
    })
    this.scriptingProvider.AddConvos(this.convo)
  })

  it('should fill scripting memory from text', async function () {
    const scriptingMemory = {}
    this.convo._fillScriptingMemory(this.containerStub, scriptingMemory, 'test sentence 1', 'test sentence $num')
    assert.equal(scriptingMemory['$num'], '1')
  })
  it('should not fill scripting memory from invalid text', async function () {
    const scriptingMemory = {}
    this.convo._fillScriptingMemory(this.containerStub, scriptingMemory, 'test sentence', 'test sentence $num')
    assert.isUndefined(scriptingMemory['$num'])
  })
  it('should fill scripting memory from one utterance', async function () {
    this.scriptingProvider.AddUtterances({
      name: 'utt1',
      utterances: ['test sentence $num']
    })

    const scriptingMemory = {}
    this.convo._fillScriptingMemory(this.containerStub, scriptingMemory, 'test sentence 1', 'utt1')
    assert.equal(scriptingMemory['$num'], '1')
  })
  it('should fill multiple scripting memory from one utterance', async function () {
    this.scriptingProvider.AddUtterances({
      name: 'utt1',
      utterances: ['test sentence $num1 $num2']
    })

    const scriptingMemory = {}
    this.convo._fillScriptingMemory(this.containerStub, scriptingMemory, 'test sentence 1 2', 'utt1')
    assert.equal(scriptingMemory['$num1'], '1')
    assert.equal(scriptingMemory['$num2'], '2')
  })
  it('should fill scripting memory from two different utterances', async function () {
    this.scriptingProvider.AddUtterances({
      name: 'utt1',
      utterances: ['i am $months months old', 'i am $years years old']
    })

    const scriptingMemory = {}
    this.convo._fillScriptingMemory(this.containerStub, scriptingMemory, 'i am 2 months old', 'utt1')
    assert.equal(scriptingMemory['$months'], '2')
    assert.isUndefined(scriptingMemory['$years'])
  })
  it('should replace utterances from scripting memory', async function () {
    this.scriptingProvider.AddUtterances({
      name: 'utt1',
      utterances: ['i am $months months old', 'i am $years years old']
    })
    const scriptingMemory = {}
    this.convo._fillScriptingMemory(this.containerStub, scriptingMemory, 'i am 2 months old', 'utt1')

    const tomatch = this.convo._resolveUtterancesToMatch(this.containerStub, scriptingMemory, 'utt1')
    assert.isArray(tomatch)
    assert.equal(tomatch[0], 'i am 2 months old')
    assert.equal(tomatch[1], 'i am $years years old')
  })
  it('should accept special regexp characters in utterance when replace utterances from scripting memory in regexp matching mode', async function () {
    this.containerStub.caps[Capabilities.SCRIPTING_MATCHING_MODE] = 'regexp'

    const scriptingMemory = {}
    this.convo._fillScriptingMemory(this.containerStub, scriptingMemory, '*test sentence 1*', '.* sentence $num')
    assert.equal(scriptingMemory['$num'], '1')
    const tomatch = this.convo._resolveUtterancesToMatch(this.containerStub, scriptingMemory, '.* sentence $num')
    assert.isArray(tomatch)
    assert.equal(tomatch[0], '.* sentence 1')
  })
  it('should accept special regexp characters in utterances when replace utterances from scripting memory in regexp matching mode', async function () {
    this.containerStub.caps[Capabilities.SCRIPTING_MATCHING_MODE] = 'regexp'
    this.scriptingProvider.AddUtterances({
      name: 'utt1',
      utterances: ['.* sentence $num']
    })

    const scriptingMemory = {}
    this.convo._fillScriptingMemory(this.containerStub, scriptingMemory, '*test sentence 1*', 'utt1')
    assert.equal(scriptingMemory['$num'], '1')
    const tomatch = this.convo._resolveUtterancesToMatch(this.containerStub, scriptingMemory, 'utt1')
    assert.isArray(tomatch)
    assert.equal(tomatch[0], '.* sentence 1')
  })
  it('should accept special regexp characters in utterance when filling scripting memory', async function () {
    const scriptingMemory = {}
    this.convo._fillScriptingMemory(this.containerStub, scriptingMemory, '*test sentence 1*', '*test sentence $num*')
    assert.equal(scriptingMemory['$num'], '1')

    const scriptingMemory1 = {}
    this.convo._fillScriptingMemory(this.containerStub, scriptingMemory1, 'Hier sind deine Erinnerungen: Notiz: 104 | This is a test reminder', 'Hier sind deine Erinnerungen: Notiz: $id | This is a test reminder')
    assert.equal(scriptingMemory1['$id'], '104')
  })
  it('should accept special regexp characters in utterances when filling scripting memory', async function () {
    this.scriptingProvider.AddUtterances({
      name: 'utt1',
      utterances: ['[\'I am $months months old.\']', '[\'I am $years years old.\']']
    })
    const scriptingMemory = {}
    this.convo._fillScriptingMemory(this.containerStub, scriptingMemory, '[\'I am 2 years old.\']', 'utt1')
    assert.equal(scriptingMemory['$years'], '2')
  })
  it('should accept newline characters in utterances when filling scripting memory', async function () {
    const scriptingMemory = {}
    this.convo._fillScriptingMemory(this.containerStub, scriptingMemory, 'test sentence header\n\ntest sentence 1', 'test sentence header\n\ntest sentence $num')
    assert.equal(scriptingMemory['$num'], '1')
  })
})
