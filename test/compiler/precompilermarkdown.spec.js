const path = require('path')
const assert = require('chai').assert
const BotDriver = require('../../').BotDriver
const Capabilities = require('../../').Capabilities

const echoConnector = ({ queueBotSays }) => {
  return {
    UserSays (msg) {
      const botMsg = {
        sender: 'bot',
        sourceData: msg.sourceData,
        messageText: 'hello meat bag',
        buttons: [
          {
            text: 'checkbutton',
            payload: 'checkbutton'
          },
          {
            text: 'checkbutton2',
            payload: 'checkbutton2'
          }
        ]
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
        NAME: 'MARKDOWN'
      }
    }
    const driver = new BotDriver(myCaps)
    this.compiler = driver.BuildCompiler()
    this.container = await driver.Build()
  })
  afterEach(async function () {
    this.container && await this.container.Clean()
  })

  it('should execute markdown', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'convos_precompiler_markdown.md')
    this.compiler.ExpandConvos()
    assert.equal(this.compiler.convos.length, 2)

    const transcripts = []
    transcripts.push(await this.compiler.convos[0].Run(this.container))
    transcripts.push(await this.compiler.convos[1].Run(this.container))

    transcripts.forEach(transcript => {
      assert.equal(transcript.steps.length, 2)
      assert.equal(transcript.steps[0].actual.sender, 'me')
      assert.equal(transcript.steps[0].actual.messageText, 'hello bot')
      assert.equal(transcript.steps[1].actual.sender, 'bot')
      assert.equal(transcript.steps[1].actual.messageText, 'hello meat bag')
      assert.equal(transcript.steps[1].actual.buttons[0].payload, 'checkbutton')
      assert.equal(transcript.steps[1].actual.buttons[1].payload, 'checkbutton2')
    })
  })

  it('should execute markdown with utterances', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'convos_precompiler_markdown_utterances.md')
    this.compiler.ExpandConvos()
    assert.equal(this.compiler.convos.length, 3)

    let transcript
    transcript = await this.compiler.convos[0].Run(this.container)
    assert.equal(transcript.steps[0].actual.sender, 'me')
    assert.equal(transcript.steps[0].actual.messageText, 'hi')

    transcript = await this.compiler.convos[1].Run(this.container)
    assert.equal(transcript.steps[0].actual.sender, 'me')
    assert.equal(transcript.steps[0].actual.messageText, 'hello')

    transcript = await this.compiler.convos[2].Run(this.container)
    assert.equal(transcript.steps[0].actual.sender, 'me')
    assert.equal(transcript.steps[0].actual.messageText, 'greeting')
  })
})
