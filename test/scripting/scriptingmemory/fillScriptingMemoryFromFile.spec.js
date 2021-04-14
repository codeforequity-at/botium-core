const path = require('path')
const assert = require('chai').assert
const BotDriver = require('../../../').BotDriver
const Capabilities = require('../../../').Capabilities

const echoConnector = ({ queueBotSays }) => {
  return {
    UserSays (msg) {
      const response = `You said: ${msg.messageText.replace('forcereplace1', 'OUTPUT1').replace('forcereplace2', 'OUTPUT2')}`
      const botMsg = { sender: 'bot', sourceData: msg.sourceData, messageText: response }
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

  it('should throw exception if name is not set', async function () {
    try {
      this.compiler.ReadScriptsFromDirectory(path.resolve(__dirname, 'convosMultiMemoryNoName'))
      this.compiler.ExpandScriptingMemoryToConvos()
    } catch (err) {
      assert.equal(err.toString(), 'BotiumError: Scripting Memory Definition(s) without name')
      assert.isNotNull(err.context)
      assert.equal(err.context.type, 'Scripting Memory')
      assert.equal(err.context.source, 'ScriptingProvider')

      assert.isObject(err.context.cause)
      assert.isArray(err.context.cause.aggregatedNoNames)
      assert.equal(err.context.cause.aggregatedNoNames.length, 1)

      return
    }
    throw (new Error('Exception not thrown'))
  })

  it('should throw exception if variable name is not set', async function () {
    try {
      this.compiler.ReadScriptsFromDirectory(path.resolve(__dirname, 'convosMultiMemoryNoVariableName'))
      this.compiler.ExpandScriptingMemoryToConvos()
    } catch (err) {
      assert.equal(err.toString(), 'BotiumError: Scripting Memory Definition(s) product1, product2, product3 without variable name')
      assert.isNotNull(err.context)
      assert.equal(err.context.type, 'Scripting Memory')
      assert.equal(err.context.source, 'ScriptingProvider')

      assert.isObject(err.context.cause)
      assert.isArray(err.context.cause.aggregatedNoVariableNames)
      assert.equal(err.context.cause.aggregatedNoVariableNames.length, 3)

      return
    }
    throw (new Error('Exception not thrown'))
  })

  it('should throw exception variable is not set', async function () {
    try {
      this.compiler.ReadScriptsFromDirectory(path.resolve(__dirname, 'convosMultiMemoryNoVariable'))
      this.compiler.ExpandScriptingMemoryToConvos()
    } catch (err) {
      assert.equal(err.toString(), 'BotiumError: Scripting Memory Definition(s) product1, product2, product3 without variable')
      assert.isNotNull(err.context)
      assert.equal(err.context.type, 'Scripting Memory')
      assert.equal(err.context.source, 'ScriptingProvider')

      assert.isObject(err.context.cause)
      assert.isArray(err.context.cause.aggregatedNoVariables)
      assert.equal(err.context.cause.aggregatedNoVariables.length, 3)

      return
    }
    throw (new Error('Exception not thrown'))
  })

  describe('Using multiple scripting memory file', function () {
    it('should work with different variable names', async function () {
      this.compiler.ReadScriptsFromDirectory(path.resolve(__dirname, 'convosMultiMemoryDifferent'))
      this.compiler.ExpandScriptingMemoryToConvos()
      assert.equal(this.compiler.convos.length, 6)

      try {
        await this.compiler.convos[0].Run(this.container)
      } catch (err) {
        if (err.transcript) {
          assert.isObject(err.transcript.scriptingMemory)
          assert.isDefined(err.transcript.scriptingMemory.$productName)
          assert.equal(err.transcript.scriptingMemory.$productName, 'Bread')
          assert.isDefined(err.transcript.scriptingMemory.$available_products)
          assert.equal(err.transcript.scriptingMemory.$available_products, 'Bread, Beer, Eggs')
          return
        } else {
          throw err
        }
      }
      throw (new Error('Exception not thrown'))
    })

    it('should work with same variable names', async function () {
      this.compiler.ReadScriptsFromDirectory(path.resolve(__dirname, 'convosMultiMemorySame'))
      this.compiler.ExpandScriptingMemoryToConvos()
      assert.equal(this.compiler.convos.length, 4)

      const transcript = await this.compiler.convos[3].Run(this.container)
      assert.isObject(transcript.scriptingMemory)
      assert.isDefined(transcript.scriptingMemory.$productName)
      assert.equal(transcript.scriptingMemory.$productName, 'Hamburger')
    })

    it('should throw exception if there is intersection in convosMultiMemoryCaseNameCollisionvariable names', async function () {
      try {
        this.compiler.ReadScriptsFromDirectory(path.resolve(__dirname, 'convosMultiMemoryIntersection'))
        this.compiler.ExpandScriptingMemoryToConvos()
      } catch (err) {
        assert.equal(err.toString(), 'BotiumError: Scripting Memory Definitions "available1, available2, product1" are invalid because variable name collision"')
        assert.isNotNull(err.context)
        assert.equal(err.context.type, 'Scripting Memory')
        assert.equal(err.context.source, 'ScriptingProvider')

        assert.isObject(err.context.cause)
        assert.isArray(err.context.cause.aggregatedIntersections)
        assert.equal(err.context.cause.aggregatedIntersections.length, 3)

        return
      }
      throw (new Error('Exception not thrown'))
    })

    it('should throw exception if case name is not unique', async function () {
      try {
        this.compiler.ReadScriptsFromDirectory(path.resolve(__dirname, 'convosMultiMemoryCaseNameCollision'))
        this.compiler.ExpandScriptingMemoryToConvos()
      } catch (err) {
        assert.equal(err.toString(), 'BotiumError: Scripting Memory Definition name(s) "product1" are not unique')
        assert.isNotNull(err.context)
        assert.equal(err.context.type, 'Scripting Memory')
        assert.equal(err.context.source, 'ScriptingProvider')

        assert.isObject(err.context.cause)
        assert.isArray(err.context.cause.aggregatedDuplicates)
        assert.equal(err.context.cause.aggregatedDuplicates.length, 2)

        return
      }
      throw (new Error('Exception not thrown'))
    })
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
