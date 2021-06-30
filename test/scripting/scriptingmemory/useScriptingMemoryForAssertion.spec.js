const path = require('path')
const assert = require('chai').assert
const BotDriver = require('../../../').BotDriver
const Capabilities = require('../../../').Capabilities

const echoAssertConnector = ({ queueBotSays }) => {
  return {
    UserSays (msg) {
      const response = `${msg.messageText.replace('forcereplace1', 'OUTPUT1').replace('forcereplace2', 'OUTPUT2')}`
      const botMsg = { sender: 'bot', sourceData: msg.sourceData, messageText: response }
      queueBotSays(botMsg)
    }
  }
}
const echoShopConnector = ({ queueBotSays }) => {
  return {
    UserSays (msg) {
      let response = msg.messageText
      if (msg.messageText === 'What can I order from you?') {
        response = 'You can order Bread, Beer, Eggs'
      } else if (msg.messageText.startsWith('Ok, then send me some')) {
        response = `Added ${msg.messageText.substr(21).trim()} to the shopping cart`
      }
      const botMsg = { sender: 'bot', sourceData: msg.sourceData, messageText: response }
      queueBotSays(botMsg)
    }
  }
}

const multipleVariableEntriesConnector = ({ queueBotSays }) => {
  return {
    UserSays (msg) {
      const response = 'I\'d like to have Schnitzel and one more Schnitzel'
      const botMsg = { sender: 'bot', sourceData: msg.sourceData, messageText: response }
      queueBotSays(botMsg)
    }
  }
}

describe('scripting.useScriptingMemoryForAssertion.simpleassertion', function () {
  beforeEach(async function () {
    const myCaps = {
      [Capabilities.PROJECTNAME]: 'scripting.scriptingmemory',
      [Capabilities.CONTAINERMODE]: echoAssertConnector,
      [Capabilities.SCRIPTING_ENABLE_MEMORY]: true
    }
    const driver = new BotDriver(myCaps)
    this.compiler = driver.BuildCompiler()
    this.container = await driver.Build()
  })
  afterEach(async function () {
    this.container && await this.container.Clean()
  })

  it('should use scripting memory for assertion', async function () {
    this.compiler.ReadScriptsFromDirectory(path.resolve(__dirname, 'convosAssertion'))
    this.compiler.ExpandScriptingMemoryToConvos()

    try {
      await this.compiler.convos[0].Run(this.container)
      assert.fail('should have failed')
    } catch (err) {
      assert.isTrue(err.message.indexOf('Bot response (on Line 3: #me - $productName $customer) "OUTPUT1 OUTPUT2" expected to match "forcereplace1 forcereplace2"') >= 0)
    }
  })
})

describe('scripting.useScriptingMemoryForAssertion.multiplefiles', function () {
  beforeEach(async function () {
    const myCaps = {
      [Capabilities.PROJECTNAME]: 'scripting.scriptingmemory',
      [Capabilities.CONTAINERMODE]: echoShopConnector,
      [Capabilities.SCRIPTING_ENABLE_MEMORY]: true,
      [Capabilities.SCRIPTING_MEMORY_MATCHING_MODE]: 'joker'
    }
    const driver = new BotDriver(myCaps)
    this.compiler = driver.BuildCompiler()
    this.container = await driver.Build()
  })
  afterEach(async function () {
    this.container && await this.container.Clean()
  })

  it('should use scripting memory for assertion', async function () {
    this.compiler.ReadScriptsFromDirectory(path.resolve(__dirname, 'convosMultiMemory', 'convos'))
    this.compiler.ReadScriptsFromDirectory(path.resolve(__dirname, 'convosMultiMemory', 'memory1'))
    this.compiler.ExpandScriptingMemoryToConvos()
    assert.lengthOf(this.compiler.convos, 2)

    const transcript0 = await this.compiler.convos[0].Run(this.container)
    assert.lengthOf(transcript0.steps, 4)
    assert.equal(transcript0.steps[0].scriptingMemory.$available_products, 'Bread, Beer, Eggs')
    assert.equal(transcript0.steps[0].scriptingMemory.$productName, 'Bread')

    const transcript1 = await this.compiler.convos[1].Run(this.container)
    assert.lengthOf(transcript1.steps, 4)
    assert.equal(transcript1.steps[0].scriptingMemory.$available_products, 'Bread, Beer, Eggs')
    assert.equal(transcript1.steps[0].scriptingMemory.$productName, 'Beer')
  })
})

describe('scripting.useScriptingMemoryForAssertion.multipleVariableEntries', function () {
  beforeEach(async function () {
    const myCaps = {
      [Capabilities.PROJECTNAME]: 'scripting.scriptingmemory',
      [Capabilities.CONTAINERMODE]: multipleVariableEntriesConnector,
      [Capabilities.SCRIPTING_ENABLE_MEMORY]: true
    }
    const driver = new BotDriver(myCaps)
    this.compiler = driver.BuildCompiler()
    this.container = await driver.Build()
  })
  afterEach(async function () {
    this.container && await this.container.Clean()
  })

  it('should use scripting memory for assertion several variables entries', async function () {
    // scripting variables replaced in every entry
    this.compiler.ReadScriptsFromDirectory(path.resolve(__dirname, 'scriptingVariablesSeveralEntries'))
    assert.equal(this.compiler.convos.length, 1)

    try {
      await this.compiler.convos[0].Run(this.container)
      assert.fail('should have failed')
    } catch (err) {
      assert.isTrue(err.message.indexOf('Bot response (on Line 6: #me - What would you like to eat?) "I\'d like to have Schnitzel and one more Schnitzel" expected to match "I\'d like to have a Schnitzel and one more Schnitzel"') >= 0)
    }
  })
})
