const path = require('path')
const assert = require('chai').assert
const BotDriver = require('../../..').BotDriver
const Capabilities = require('../../..').Capabilities
const myCaps = require('./customEmbeddedSkip')

const echoConnector = () => ({ queueBotSays }) => {
  return {
    UserSays (msg) {
      const botMsg = { sender: 'bot', sourceData: msg.sourceData, messageText: msg.messageText }
      queueBotSays(botMsg)
    }
  }
}

const buildDriver = async (mergeCaps) => {
  const myCaps = Object.assign({
    [Capabilities.PROJECTNAME]: 'convo.customassertersskip',
    [Capabilities.CONTAINERMODE]: echoConnector()
  }, mergeCaps)

  const result = {}
  result.driver = new BotDriver(myCaps)
  result.compiler = result.driver.BuildCompiler()
  result.container = await result.driver.Build()
  return result
}

describe('convo.customasserters skip', function () {
  beforeEach(async function () {
    const { compiler, container } = await buildDriver(myCaps)
    this.compiler = compiler
    this.container = container
    await this.container.Start()
  })
  afterEach(async function () {
    await this.container.Stop()
    await this.container.Clean()
  })

  it('should success followed by another bot message', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'custom_embedded_skip.convo.txt')
    const transript = await this.compiler.convos[0].Run(this.container)
    assert.equal(transript.steps.length, 2)
  })

  it('should success followed by me message', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'custom_embedded_skip_followed_by_me.convo.txt')
    const transript = await this.compiler.convos[0].Run(this.container)
    assert.equal(transript.steps.length, 2)
  })

  it('should success followed by nothing', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'custom_embedded_skip_followed_by_nothing.convo.txt')
    const transript = await this.compiler.convos[0].Run(this.container)
    assert.equal(transript.steps.length, 1)
  })
})