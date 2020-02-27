const path = require('path')
const assert = require('chai').assert
const nock = require('nock')
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

describe('scripting.userinputs.mediaInputConvos.relative', function () {
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
    assert.equal(this.compiler.convos[0].conversation[0].userInputs[0].args[0], 'botium.png')

    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.equal(transcript.steps.length, 1)
    assert.equal(transcript.steps[0].actual.media.length, 1)
    assert.isTrue(transcript.steps[0].actual.media[0].mediaUri.endsWith('test/scripting/userinputs/convos/botium.png'))
    assert.equal(transcript.steps[0].actual.media[0].mimeType, 'image/png')
  })

  it('should add multi media in user message', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'medias.convo.txt')

    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.equal(transcript.steps.length, 1)
    assert.equal(transcript.steps[0].actual.media.length, 2)
    assert.isTrue(transcript.steps[0].actual.media[0].mediaUri.endsWith('test/scripting/userinputs/convos/test1.jpg'))
    assert.equal(transcript.steps[0].actual.media[0].mimeType, 'image/jpeg')
    assert.isTrue(transcript.steps[0].actual.media[1].mediaUri.endsWith('test/scripting/userinputs/convos/test2.jpg'))
    assert.equal(transcript.steps[0].actual.media[1].mimeType, 'image/jpeg')
  })
})

describe('scripting.userinputs.mediaInputConvos.baseUri', function () {
  beforeEach(async function () {
    const myCaps = {
      [Capabilities.PROJECTNAME]: 'scripting.userinputs.mediaInputConvos',
      [Capabilities.CONTAINERMODE]: echoConnector,
      [Capabilities.SCRIPTING_ENABLE_MEMORY]: true,
      [Capabilities.USER_INPUTS]: [
        {
          ref: 'MEDIA',
          src: 'MediaInput',
          args: {
            baseUri: 'https://www.botium.at'
          }
        }
      ]
    }
    const driver = new BotDriver(myCaps)
    this.compiler = driver.BuildCompiler()
    this.container = await driver.Build()
  })
  afterEach(async function () {
    this.container && await this.container.Clean()
  })

  it('should add media in user message', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'media.convo.txt')
    assert.equal(this.compiler.convos.length, 1)
    assert.equal(this.compiler.convos[0].conversation.length, 1)
    assert.equal(this.compiler.convos[0].conversation[0].userInputs.length, 1)
    assert.equal(this.compiler.convos[0].conversation[0].userInputs[0].name, 'MEDIA')
    assert.equal(this.compiler.convos[0].conversation[0].userInputs[0].args.length, 1)
    assert.equal(this.compiler.convos[0].conversation[0].userInputs[0].args[0], 'botium.png')

    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.equal(transcript.steps.length, 1)
    assert.equal(transcript.steps[0].actual.media.length, 1)
    assert.equal(transcript.steps[0].actual.media[0].mediaUri, 'https://www.botium.at/botium.png')
    assert.equal(transcript.steps[0].actual.media[0].mimeType, 'image/png')
  })

  it('should add multi media in user message', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'medias.convo.txt')

    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.equal(transcript.steps.length, 1)
    assert.equal(transcript.steps[0].actual.media.length, 2)
    assert.equal(transcript.steps[0].actual.media[0].mediaUri, 'https://www.botium.at/test1.jpg')
    assert.equal(transcript.steps[0].actual.media[0].mimeType, 'image/jpeg')
    assert.equal(transcript.steps[0].actual.media[1].mediaUri, 'https://www.botium.at/test2.jpg')
    assert.equal(transcript.steps[0].actual.media[1].mimeType, 'image/jpeg')
  })
})

describe('scripting.userinputs.mediaInputDownloadConvos.relative', function () {
  beforeEach(async function () {
    const myCaps = {
      [Capabilities.PROJECTNAME]: 'scripting.userinputs.mediaInputDownloadConvos',
      [Capabilities.CONTAINERMODE]: echoConnector,
      [Capabilities.SCRIPTING_ENABLE_MEMORY]: true,
      [Capabilities.USER_INPUTS]: [
        {
          ref: 'MEDIA',
          src: 'MediaInput',
          args: {
            downloadMedia: true
          }
        }
      ]      
    }
    const driver = new BotDriver(myCaps)
    this.compiler = driver.BuildCompiler()
    this.container = await driver.Build()
  })
  afterEach(async function () {
    this.container && await this.container.Clean()
  })

  it('should add media buffer in user message', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'media.convo.txt')

    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.equal(transcript.steps.length, 1)
    assert.equal(transcript.steps[0].actual.media.length, 1)
    assert.isTrue(transcript.steps[0].actual.media[0].mediaUri.endsWith('test/scripting/userinputs/convos/botium.png'))
    assert.equal(transcript.steps[0].actual.media[0].mimeType, 'image/png')
    assert.isNotNull(transcript.steps[0].actual.media[0].buffer)
  })
})

describe('scripting.userinputs.mediaInputDownloadConvos.baseUri', function () {
  beforeEach(async function () {
    const myCaps = {
      [Capabilities.PROJECTNAME]: 'scripting.userinputs.mediaInputDownloadConvos',
      [Capabilities.CONTAINERMODE]: echoConnector,
      [Capabilities.SCRIPTING_ENABLE_MEMORY]: true,
      [Capabilities.USER_INPUTS]: [
        {
          ref: 'MEDIA',
          src: 'MediaInput',
          args: {
            downloadMedia: true,
            baseUri: 'https://www.botium.at'
          }
        }
      ]
    }
    const driver = new BotDriver(myCaps)
    this.compiler = driver.BuildCompiler()
    this.container = await driver.Build()
  })
  afterEach(async function () {
    this.container && await this.container.Clean()
  })

  it('should add media in user message', async function () {
    const scope = nock('https://www.botium.at')
      .get('/botium.png')
      .reply(200, Buffer.from('hello world'))
      .persist()

    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'media.convo.txt')

    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.equal(transcript.steps.length, 1)
    assert.equal(transcript.steps[0].actual.media.length, 1)
    assert.equal(transcript.steps[0].actual.media[0].mediaUri, 'https://www.botium.at/botium.png')
    assert.equal(transcript.steps[0].actual.media[0].mimeType, 'image/png')
    assert.isNotNull(transcript.steps[0].actual.media[0].buffer)

    scope.persist(false)
  })
})
