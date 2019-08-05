const path = require('path')
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

describe('convo.emptyrow', function () {
  beforeEach(async function () {
    const myCaps = {
      [Capabilities.PROJECTNAME]: 'convo.emptyrow',
      [Capabilities.CONTAINERMODE]: echoConnector
    }
    this.driver = new BotDriver(myCaps)
    this.compiler = this.driver.BuildCompiler()
    this.container = await this.driver.Build()
    await this.container.Start()
  })
  afterEach(async function () {
    await this.container.Stop()
    await this.container.Clean()
  })

  it('should not send text if there is just asserter', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'just_asserter_no_empty_row.convo.txt')

    await this.compiler.convos[0].Run(this.container)
  })

  it('should send empty text for empty row', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'just_asserter_empty_row.convo.txt')

    await this.compiler.convos[0].Run(this.container)
  })
})
