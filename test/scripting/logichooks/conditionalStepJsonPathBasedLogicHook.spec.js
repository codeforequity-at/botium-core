const path = require('path')
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

describe('convo with capablility value based conditional logichook', function () {
  beforeEach(async function () {
    const myCaps = {
      [Capabilities.PROJECTNAME]: 'scripting.logichooks',
      [Capabilities.CONTAINERMODE]: echoConnector,
      [Capabilities.SCRIPTING_ENABLE_MEMORY]: true,
      SIMPLE_TEXT: 'echo1'
    }
    const driver = new BotDriver(myCaps)
    this.compiler = driver.BuildCompiler()
    this.container = await driver.Build()
  })

  afterEach(async function () {
    this.container && await this.container.Clean()
  })

  it('should success', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'conditional_steps_json_path_based.convo.txt.convo.txt')
    await this.compiler.convos[0].Run(this.container)
  })
})
