const path = require('path')
const assert = require('chai').assert
const BotDriver = require('../../../').BotDriver
const Capabilities = require('../../../').Capabilities

const answers = [
  {
    input: ['buy without variables'],
    output: 'you want to buy productNameFormBegin'
  }
]

const scriptedConnector = ({ queueBotSays }) => {
  return {
    UserSays (msg) {
      let response
      const answer = answers.find((a) => a.input.indexOf(msg.messageText) >= 0)
      if (answer) {
        response = answer.output
      } else {
        response = `You said: ${msg.messageText}`
      }

      const botMsg = { sender: 'bot', sourceData: msg.sourceData, messageText: response }
      queueBotSays(botMsg)
    }
  }
}

describe('scripting.scriptingmemory.memoryenabled.originaldeleted', function () {
  beforeEach(async function () {
    const myCaps = {
      [Capabilities.PROJECTNAME]: 'scripting.scriptingmemory',
      [Capabilities.CONTAINERMODE]: scriptedConnector,
      [Capabilities.SCRIPTING_XLSX_SHEETNAMES_SCRIPTING_MEMORY]: 'ScriptingMemory',
      [Capabilities.SCRIPTING_XLSX_SHEETNAMES]: 'Convos',
      [Capabilities.SCRIPTING_ENABLE_MEMORY]: true,
      [Capabilities.SCRIPTING_MEMORYEXPANSION_DELORIG]: true

    }
    const driver = new BotDriver(myCaps)
    this.compiler = driver.BuildCompiler()
    this.container = await driver.Build()
  })
  afterEach(async function () {
    this.container && await this.container.Clean()
  })

  it('Scripting memory settings by convo vs by scripting memory file', async function () {
    this.compiler.ReadScriptsFromDirectory(path.resolve(__dirname, 'convosLogicHookCollision'))
    this.compiler.ExpandScriptingMemoryToConvos()
    assert.equal(this.compiler.convos.length, 1)

    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.isObject(transcript.scriptingMemory)
    assert.isDefined(transcript.scriptingMemory['$productName'])
    assert.equal(transcript.scriptingMemory['$productName'], 'Wiener Schnitzel')
  })
})

describe('scripting.scriptingmemory.memoryenabled.originalkept', function () {
  beforeEach(async function () {
    const myCaps = {
      [Capabilities.PROJECTNAME]: 'scripting.scriptingmemory',
      [Capabilities.CONTAINERMODE]: scriptedConnector,
      [Capabilities.SCRIPTING_XLSX_SHEETNAMES_SCRIPTING_MEMORY]: 'ScriptingMemory',
      [Capabilities.SCRIPTING_XLSX_SHEETNAMES]: 'Convos',
      [Capabilities.SCRIPTING_ENABLE_MEMORY]: true
    }
    const driver = new BotDriver(myCaps)
    this.compiler = driver.BuildCompiler()
    this.container = await driver.Build()
  })
  afterEach(async function () {
    this.container && await this.container.Clean()
  })
  // it('Scripting memory settings by convo vs by scripting memory file', async function () {
  //   this.compiler.ReadScriptsFromDirectory(path.resolve(__dirname, 'convosLogicHookCollision'))
  //   this.compiler.ExpandScriptingMemoryToConvos()
  //   assert.equal(this.compiler.convos.length, 3)
  //
  //   const productNames = []
  //   for (let convo of this.compiler.convos) {
  //     this.compiler.convos[0].Run(this.container)
  //     const transcript = await convo.Run(this.container)
  //     assert.isObject(transcript.scriptingMemory)
  //     assert.isDefined(transcript.scriptingMemory['$productName'])
  //     productNames.push(transcript.scriptingMemory['$productName'])
  //   }
  //   assert.equal(productNames.sort(), ['Pfannkuchen', 'productNameFormBegin', 'Wiener Schnitzel'])
  // })

})
