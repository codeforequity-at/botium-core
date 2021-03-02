const path = require('path')
const assert = require('chai').assert
const BotDriver = require('../../').BotDriver
const Capabilities = require('../../').Capabilities

const echoConnector = ({ queueBotSays }) => {
  return {
    UserSays (msg) {
      const botMsg = { sender: 'bot', sourceData: msg.sourceData, messageText: msg.messageText }
      queueBotSays(botMsg)
    }
  }
}

const buildDriver = async (mergeCaps) => {
  const myCaps = Object.assign({
    [Capabilities.PROJECTNAME]: 'logichooks.hookfromsrc',
    [Capabilities.CONTAINERMODE]: echoConnector
  }, mergeCaps)

  const result = {}
  result.driver = new BotDriver(myCaps)
  result.compiler = result.driver.BuildCompiler()
  result.container = await result.driver.Build()
  return result
}

describe('logichooks.hookfromsrc', function () {
  it('should succeed with asserter from code', async function () {
    const { compiler, container } = await buildDriver({
      [Capabilities.ASSERTERS]: [{
        ref: 'CUSTOMASSERTER',
        src: {
          assertConvoStep: 'if (botMsg.messageText === "Hello") result=Promise.resolve(); else result=Promise.reject(new Error("expected Hello"))'
        }
      }]
    })
    compiler.ReadScript(path.resolve(__dirname, 'convos'), 'HOOKFROMSRC.convo.txt')
    await compiler.convos[0].Run(container)
  })
  it('should fail with asserter from code', async function () {
    const { compiler, container } = await buildDriver({
      [Capabilities.ASSERTERS]: [{
        ref: 'CUSTOMASSERTER',
        src: {
          assertConvoStep: 'if (botMsg.messageText === "Hello1") module.exports=Promise.resolve(); else module.exports=Promise.reject(new Error("expected Hello1"))'
        }
      }]
    })
    compiler.ReadScript(path.resolve(__dirname, 'convos'), 'HOOKFROMSRC.convo.txt')
    try {
      await compiler.convos[0].Run(container)
      assert.fail('it should have failed')
    } catch (err) {
      assert.isTrue(err.message.includes('Line 6: assertion error - expected Hello1'))
    }
  })
  it('should fail with asserter with invalid script', async function () {
    const { compiler, container } = await buildDriver({
      [Capabilities.ASSERTERS]: [{
        ref: 'CUSTOMASSERTER',
        src: {
          assertConvoStep: '!'
        }
      }]
    })
    compiler.ReadScript(path.resolve(__dirname, 'convos'), 'HOOKFROMSRC.convo.txt')
    try {
      await compiler.convos[0].Run(container)
      assert.fail('it should have failed')
    } catch (err) {
      assert.isTrue(err.message.includes('Line 6: assertion error - Unexpected token'))
    }
  })
})

const buildDriverFromFile = async (mergeCaps) => {
  const myCaps = Object.assign({
    [Capabilities.PROJECTNAME]: 'logichooks.hookfromsrc',
    [Capabilities.CONTAINERMODE]: path.join(__dirname, 'botium-connector-fromfile')
  }, mergeCaps)

  const result = {}
  result.driver = new BotDriver(myCaps)
  result.compiler = result.driver.BuildCompiler()
  result.container = await result.driver.Build()
  return result
}

describe('logichooks.hookfromconnector', function () {
  it('should succeed with asserter from connector', async function () {
    const { compiler, container } = await buildDriverFromFile({
      [Capabilities.ASSERTERS]: [{
        ref: 'CUSTOMASSERTER',
        src: path.join(__dirname, 'botium-connector-fromfile.js/MyCustomAsserter')
      }]
    })
    compiler.ReadScript(path.resolve(__dirname, 'convos'), 'HOOKFROMSRC.convo.txt')
    await compiler.convos[0].Run(container)
  })
  it('should succeed with asserter from asserter module file', async function () {
    const { compiler, container } = await buildDriverFromFile({
      [Capabilities.ASSERTERS]: [{
        ref: 'CUSTOMASSERTER',
        src: path.join(__dirname, 'botium-asserter-fromfile.js')
      }]
    })
    compiler.ReadScript(path.resolve(__dirname, 'convos'), 'HOOKFROMSRC.convo.txt')
    await compiler.convos[0].Run(container)
  })
})
