const path = require('path')
const BotDriver = require('../../..').BotDriver
const Capabilities = require('../../..').Capabilities
const myCaps = require('./customEmbedded')

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
    [Capabilities.PROJECTNAME]: 'convo.customasserters',
    [Capabilities.CONTAINERMODE]: echoConnector()
  }, mergeCaps)

  const result = {}
  result.driver = new BotDriver(myCaps)
  result.compiler = result.driver.BuildCompiler()
  result.container = await result.driver.Build()
  return result
}

describe('convo.customasserters', function () {
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

  it('should success', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'custom_embedded.convo.txt')
    await this.compiler.convos[0].Run(this.container)
  })
})
