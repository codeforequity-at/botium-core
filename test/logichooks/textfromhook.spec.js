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
    [Capabilities.PROJECTNAME]: 'logichooks.textfromhook',
    [Capabilities.CONTAINERMODE]: echoConnector
  }, mergeCaps)

  const result = {}
  result.driver = new BotDriver(myCaps)
  result.compiler = result.driver.BuildCompiler()
  result.container = await result.driver.Build()
  return result
}

describe('logichooks.textfromhook', function () {
  it('should use text from onMeStart logic hook', async function () {
    const { compiler, container } = await buildDriver({
      [Capabilities.LOGIC_HOOKS]: [{
        ref: 'SET_TEXT_FROM_HOOK',
        src: {
          onMeStart: ({ meMsg, args }) => {
            meMsg.messageText = args[0]
            meMsg.testAttribute = 'val1'
          }
        }
      }]
    })
    compiler.ReadScript(path.resolve(__dirname, 'convos'), 'TEXTFROMHOOK.convo.txt')
    const transcript = await compiler.convos[0].Run(container)
    assert.lengthOf(transcript.steps, 2)
    assert.equal(transcript.steps[0].actual.testAttribute, 'val1')
  })
  it('should use text from onBotPrepare logic hook', async function () {
    const { compiler, container } = await buildDriver({
      [Capabilities.LOGIC_HOOKS]: [{
        ref: 'SET_TEXT_FROM_HOOK',
        src: {
          onBotPrepare: ({ botMsg, args }) => {
            botMsg.messageText = args[0]
          }
        }
      }]
    })
    compiler.ReadScript(path.resolve(__dirname, 'convos'), 'TEXTFROMBOTHOOK.convo.txt')
    const transcript = await compiler.convos[0].Run(container)
    assert.lengthOf(transcript.steps, 2)
  })
})
