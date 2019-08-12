const path = require('path')
const assert = require('chai').assert
const BotDriver = require('../../../index').BotDriver
const Capabilities = require('../../../index').Capabilities

const echoConnector = ({ queueBotSays }) => {
  return {
    UserSays (msg) {
      let messageText = msg.messageText
      if (msg.depth1Field) {
        messageText = msg.depth1Field.depth2Field
      } else if (msg.aJsonField) {
        messageText = msg.aJsonField.msg
      } else if (msg.simpleField) {
        messageText = msg.simpleField
      }

      const botMsg = { sender: 'bot', sourceData: msg.sourceData, messageText }
      queueBotSays(botMsg)
    }
  }
}

describe('UpdateCustomLogicHook', function () {
  beforeEach(async function () {
    const myCaps = {
      [Capabilities.PROJECTNAME]: 'scripting.logichooks',
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

  it('should update me message from json', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'update_custom_me_msg_json.convo.txt')
    assert.equal(this.compiler.convos.length, 1)

    await this.compiler.convos[0].Run(this.container)
  })

  it('should update me message 2 depth', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'update_custom_me_msg_depth2.convo.txt')
    assert.equal(this.compiler.convos.length, 1)

    await this.compiler.convos[0].Run(this.container)
  })

  it('should update me message from skalar', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'update_custom_me_msg_simple.convo.txt')
    assert.equal(this.compiler.convos.length, 1)

    await this.compiler.convos[0].Run(this.container)
  })
})
