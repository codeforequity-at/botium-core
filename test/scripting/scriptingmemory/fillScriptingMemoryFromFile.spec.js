const path = require('path')
const assert = require('chai').assert
const BotDriver = require('../../../').BotDriver
const Capabilities = require('../../../').Capabilities

const echoConnector = ({ queueBotSays }) => {
  return {
    UserSays (msg) {
      const botMsg = { sender: 'bot', sourceData: msg.sourceData, messageText: `You said: ${msg.messageText}` }
      queueBotSays(botMsg)
    }
  }
}

describe('scripting.fillingScriptingMemoryFromFile.memoryenabled.originaldeleted', function () {
  beforeEach(async function () {
    const myCaps = {
      [Capabilities.PROJECTNAME]: 'scripting.scriptingmemory',
      [Capabilities.CONTAINERMODE]: echoConnector,
      [Capabilities.SCRIPTING_XLSX_SHEETNAMES_SCRIPTING_MEMORY]: 'ScriptingMemory',
      [Capabilities.SCRIPTING_XLSX_SHEETNAMES]: 'Convos',
      [Capabilities.SCRIPTING_ENABLE_MEMORY]: true,
      [Capabilities.SCRIPTING_MEMORYEXPANSION_KEEP_ORIG]: false
    }
    const driver = new BotDriver(myCaps)
    this.compiler = driver.BuildCompiler()
    this.container = await driver.Build()
  })
  afterEach(async function () {
    this.container && await this.container.Clean()
  })

  it('Set Scripting memory by convo vs by scripting memory file', async function () {
    // scripting memory file wins, log on console
    this.compiler.ReadScriptsFromDirectory(path.resolve(__dirname, 'convosLogicHookCollision'))
    this.compiler.ExpandScriptingMemoryToConvos()
    assert.equal(this.compiler.convos.length, 1)

    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.isObject(transcript.scriptingMemory)
    assert.isDefined(transcript.scriptingMemory.$productName)
    assert.equal(transcript.scriptingMemory.$productName, 'Wiener Schnitzel')
  })

  it('one scripting memory file, two colums', async function () {
    // variations are hardcoded into table
    this.compiler.ReadScriptsFromDirectory(path.resolve(__dirname, 'convosOneTable'))
    this.compiler.ExpandScriptingMemoryToConvos()
    assert.equal(this.compiler.convos.length, 4)

    for (const convo of this.compiler.convos) {
      const transcript = await convo.Run(this.container)
      assert.isObject(transcript.scriptingMemory)
      assert.isDefined(transcript.scriptingMemory.$productName)
    }
  })

  it('two scripting memory file, one colum each', async function () {
    // all variations are generated
    this.compiler.ReadScriptsFromDirectory(path.resolve(__dirname, 'convosTwoTables'))
    this.compiler.ExpandScriptingMemoryToConvos()
    assert.equal(this.compiler.convos.length, 4)

    for (const convo of this.compiler.convos) {
      const transcript = await convo.Run(this.container)
      assert.isObject(transcript.scriptingMemory)
      assert.isDefined(transcript.scriptingMemory.$productName)
    }
  })

  it('Value is optional in the scripting memory file', async function () {
    // all variations are generated
    this.compiler.ReadScriptsFromDirectory(path.resolve(__dirname, 'convosValueOptional'))
    this.compiler.ExpandScriptingMemoryToConvos()
    assert.equal(this.compiler.convos.length, 1)

    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.isObject(transcript.scriptingMemory)
    assert.isDefined(transcript.scriptingMemory.$productName)
    assert.notExists(transcript.scriptingMemory.$customerName)
  })

  // Box can work without files, this eexception had no sense -> removed
  it('Same variable in more files -> error (update: no error!)', async function () {
    try {
      // assert.throws did not worked to me
      this.compiler.ReadScriptsFromDirectory(path.resolve(__dirname, 'convosMerging'))
      throw (new Error('ReadScriptsFromDirectory had to throw error'))
    } catch (ex) {
      assert.equal(ex.toString(), 'Error: ReadScriptsFromDirectory had to throw error')
      // assert.equal(ex.toString(), 'Error: Variable name defined in multiple scripting memory files: productGroup1.xlsx and productGroup2.xlsx')
    }
  })

  it('Using text file', async function () {
    this.compiler.ReadScriptsFromDirectory(path.resolve(__dirname, 'convosSimpleText'))
    this.compiler.ExpandScriptingMemoryToConvos()
    assert.equal(this.compiler.convos.length, 1)

    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.isObject(transcript.scriptingMemory)
    assert.isDefined(transcript.scriptingMemory.$productName)
    assert.equal(transcript.scriptingMemory.$productName, 'Wiener Schnitzel')
    assert.isDefined(transcript.scriptingMemory.$customer)
    assert.equal(transcript.scriptingMemory.$customer, 'Joe')
  })

  // nothing to test here, this case is just a debug log.
  it('Reserved word', async function () {
    this.compiler.ReadScriptsFromDirectory(path.resolve(__dirname, 'convosReservedWord'))
  })

  it('No intersecion, no multiply', async function () {
    this.compiler.ReadScriptsFromDirectory(path.resolve(__dirname, 'convosNoIntersection'))
    this.compiler.ExpandScriptingMemoryToConvos()
    assert.equal(this.compiler.convos.length, 1)
  })
})

describe('scripting.scriptingmemory.memoryenabled.originalkept', function () {
  beforeEach(async function () {
    const myCaps = {
      [Capabilities.PROJECTNAME]: 'scripting.scriptingmemory',
      [Capabilities.CONTAINERMODE]: echoConnector,
      [Capabilities.SCRIPTING_XLSX_SHEETNAMES_SCRIPTING_MEMORY]: 'ScriptingMemory',
      [Capabilities.SCRIPTING_XLSX_SHEETNAMES]: 'Convos',
      [Capabilities.SCRIPTING_ENABLE_MEMORY]: true,
      [Capabilities.SCRIPTING_MEMORYEXPANSION_KEEP_ORIG]: true

    }
    const driver = new BotDriver(myCaps)
    this.compiler = driver.BuildCompiler()
    this.container = await driver.Build()
  })
  afterEach(async function () {
    this.container && await this.container.Clean()
  })

  it('Original convo kept', async function () {
    this.compiler.ReadScriptsFromDirectory(path.resolve(__dirname, 'convosSimple'))
    this.compiler.ExpandScriptingMemoryToConvos()
    assert.equal(this.compiler.convos.length, 2)
  })
})

describe('scripting.scriptingmemory.memorydisabled', function () {
  beforeEach(async function () {
    const myCaps = {
      [Capabilities.PROJECTNAME]: 'scripting.scriptingmemory',
      [Capabilities.CONTAINERMODE]: echoConnector,
      [Capabilities.SCRIPTING_XLSX_SHEETNAMES_SCRIPTING_MEMORY]: 'ScriptingMemory',
      [Capabilities.SCRIPTING_XLSX_SHEETNAMES]: 'Convos',
      [Capabilities.SCRIPTING_ENABLE_MEMORY]: false

    }
    const driver = new BotDriver(myCaps)
    this.compiler = driver.BuildCompiler()
    this.container = await driver.Build()
  })
  afterEach(async function () {
    this.container && await this.container.Clean()
  })

  it('scripting disabled, variable not replaced', async function () {
    this.compiler.ReadScriptsFromDirectory(path.resolve(__dirname, 'convosSimple'))
    this.compiler.ExpandScriptingMemoryToConvos()
    assert.equal(this.compiler.convos.length, 1)

    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.isObject(transcript.scriptingMemory)
    assert.notExists(transcript.scriptingMemory.$productName)
  })
})
