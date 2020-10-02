const path = require('path')
const assert = require('chai').assert
const BotDriver = require('../../').BotDriver
const Capabilities = require('../../').Capabilities

const messageTextToIntent = {
  yes: 'affirm',
  'yes sure': 'affirm',
  no: 'deny',
  Sitka: 'inform',
  'San Diego': 'inform',
  'i need a hospital': 'search_provider',
  'hi i am in San Diego i need a hospital': 'search_provider',
  'hi i am in Sitka i need a hospital': 'search_provider'
}
const echoConnector = ({ queueBotSays }) => {
  return {
    UserSays (msg) {
      const intent = messageTextToIntent[msg.messageText]
      if (!intent) {
        throw new Error(`No intent for "${msg.messageText}"`)
      }
      const botMsg = {
        sender: 'bot',
        sourceData: msg.sourceData,
        messageText: `Response of "${msg.messageText}"`,
        nlp: {
          intent: {
            name: messageTextToIntent[msg.messageText]
          }
        }
      }
      queueBotSays(botMsg)
    }
  }
}

describe('compiler.precompiler.markdown', function () {
  beforeEach(async function () {
    const myCaps = {
      [Capabilities.PROJECTNAME]: 'compiler.precompiler.markdown',
      [Capabilities.CONTAINERMODE]: echoConnector,
      [Capabilities.SCRIPTING_ENABLE_MEMORY]: true,
      PRECOMPILERS: {
        NAME: 'MARKDOWN_RASA'
      }
    }
    const driver = new BotDriver(myCaps)
    this.compiler = driver.BuildCompiler()
    this.container = await driver.Build()
  })
  afterEach(async function () {
    this.container && await this.container.Clean()
  })

  it('should execute RASA markdown without extra parameters', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'convos_precompiler_markdown_rasa.md')
    assert.equal(Object.keys(this.compiler.utterances).length, 4)
    this.compiler.ExpandUtterancesToConvos({ useNameAsIntent: true })
    this.compiler.ExpandConvos()
    assert.equal(this.compiler.convos.length, 6)
    const transcripts = []
    for (const convo of this.compiler.convos) {
      transcripts.push(await convo.Run(this.container))
    }
    assert.equal(transcripts[4].steps.length, 2)
    assert.equal(transcripts[4].steps[0].actual.sender, 'me')
    assert.equal(transcripts[4].steps[0].actual.messageText, 'i need a hospital')
  })
})
