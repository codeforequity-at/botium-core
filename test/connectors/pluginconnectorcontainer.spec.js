const assert = require('chai').assert
const BotDriver = require('../../').BotDriver
const Capabilities = require('../../').Capabilities

const echoConnectorWithMetadata = ({ queueBotSays }) => {
  return {
    UserSays (msg) {
      const botMsg = {
        sender: 'bot',
        sourceData: msg.sourceData,
        messageText: `Response of ${msg.messageText}`
      }
      queueBotSays(botMsg)
    },
    GetMetaData () {
      return Promise.resolve('Sample response from GetMetaData')
    }
  }
}
const echoConnectorWithoutMetadata = ({ queueBotSays }) => {
  return {
    UserSays (msg) {
      const botMsg = {
        sender: 'bot',
        sourceData: msg.sourceData,
        messageText: `Response of ${msg.messageText}`
      }
      queueBotSays(botMsg)
    }
  }
}

describe('compiler.precompiler.json', function () {
  beforeEach(async function () {
    this.init = async (withGetMetaData) => {
      const myCaps = {
        [Capabilities.PROJECTNAME]: 'connector.basecontainer',
        [Capabilities.CONTAINERMODE]: withGetMetaData ? echoConnectorWithMetadata : echoConnectorWithoutMetadata
      }
      const driver = new BotDriver(myCaps)
      this.compiler = driver.BuildCompiler()
      this.container = await driver.Build()
    }
  })
  afterEach(async function () {
    this.container && await this.container.Clean()
  })

  it('should get metadata if its available', async function () {
    await this.init(true)
    const result = await this.container.GetMetaData()
    assert.equal(result, 'Sample response from GetMetaData')
  })

  it('should get undefined if metadata is not available', async function () {
    await this.init(false)
    const result = await this.container.GetMetaData()
    assert.equal(result, undefined)
  })
})
