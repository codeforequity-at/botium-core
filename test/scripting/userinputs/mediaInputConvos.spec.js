const path = require('path')
const assert = require('chai').assert
const BotDriver = require('../../../').BotDriver
const Capabilities = require('../../../').Capabilities

const echoConnector = ({ queueBotSays }) => {
  return {
    UserSays (msg) {
      const botMsg = { sender: 'bot', sourceData: msg.sourceData, messageText: msg.messageText }
      queueBotSays(botMsg)
    }
  }
}

describe('scripting.userinputs.mediaInputConvos', function () {
  beforeEach(async function () {
    const myCaps = {
      [Capabilities.PROJECTNAME]: 'scripting.userinputs.mediaInputConvos',
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

  it('should fail on media with no arg', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'mediaNoArg.convo.txt')
    try {
      await this.compiler.convos[0].Run(this.container)
      assert.fail('it should have failed')
    } catch (err) {
      assert.isTrue(err.message.indexOf('Line 3: MediaInput requires exactly 1 argument') > 0)
    }
  })

  it('should add media in user message', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'media.convo.txt')
    assert.equal(this.compiler.convos.length, 1)
    assert.equal(this.compiler.convos[0].conversation.length, 1)
    assert.equal(this.compiler.convos[0].conversation[0].userInputs.length, 1)
    assert.equal(this.compiler.convos[0].conversation[0].userInputs[0].name, 'MEDIA')
    assert.equal(this.compiler.convos[0].conversation[0].userInputs[0].args.length, 1)
    assert.equal(this.compiler.convos[0].conversation[0].userInputs[0].args[0], 'test.jpg')

    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.equal(transcript.steps.length, 1)
    assert.equal(transcript.steps[0].actual.media.length, 1)
    assert.equal(transcript.steps[0].actual.media[0].mediaUri, `file://${process.cwd()}/spec/convo/test.jpg`)
    assert.equal(transcript.steps[0].actual.media[0].mimeType, 'image/jpeg')
  })

  it('should add multi media in user message', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'medias.convo.txt')

    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.equal(transcript.steps.length, 1)
    assert.equal(transcript.steps[0].actual.media.length, 2)
    assert.equal(transcript.steps[0].actual.media[0].mediaUri, `file://${process.cwd()}/spec/convo/test1.jpg`)
    assert.equal(transcript.steps[0].actual.media[0].mimeType, 'image/jpeg')
    assert.equal(transcript.steps[0].actual.media[1].mediaUri, `file://${process.cwd()}/spec/convo/test2.jpg`)
    assert.equal(transcript.steps[0].actual.media[1].mimeType, 'image/jpeg')
  })
})
