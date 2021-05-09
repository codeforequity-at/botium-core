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
      assert.isTrue(err.message.indexOf('Line 3: MediaInput requires at least 1 and at most 2 arguments') > 0)
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
    assert.isTrue(transcript.steps[0].actual.media[0].downloadUri.endsWith('test/scripting/userinputs/convos/botium.png'))
    assert.equal(transcript.steps[0].actual.media[0].mimeType, 'image/png')
  })

  it('should fail when media is out of convo dir', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'mediaOutOfConvoDir.convo.txt')

    try {
      await this.compiler.convos[0].Run(this.container)
      assert.fail('expected error')
    } catch (err) {
      assert.isTrue(err.message.startsWith('mediaoutofconvodir/Line 3: error sending to bot - The uri \'../botium.png\' is pointing out of the base directory'))
    }
  })

  it('should add multi media in user message', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'medias.convo.txt')

    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.equal(transcript.steps.length, 1)
    assert.equal(transcript.steps[0].actual.media.length, 2)
    assert.isTrue(transcript.steps[0].actual.media[0].downloadUri.endsWith('test/scripting/userinputs/convos/test1.jpg'))
    assert.equal(transcript.steps[0].actual.media[0].mimeType, 'image/jpeg')
    assert.isTrue(transcript.steps[0].actual.media[1].downloadUri.endsWith('test/scripting/userinputs/convos/test2.jpg'))
    assert.equal(transcript.steps[0].actual.media[1].mimeType, 'image/jpeg')
  })
  it('should expand media list in user message', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'medialist.convo.txt')
    this.compiler.ExpandConvos()
    assert.equal(this.compiler.convos.length, 3)
    assert.equal(this.compiler.convos[0].conversation.length, 1)
    assert.equal(this.compiler.convos[0].conversation[0].userInputs.length, 1)
    assert.equal(this.compiler.convos[0].conversation[0].userInputs[0].args[0], 'test1.jpg')
    assert.equal(this.compiler.convos[1].conversation[0].userInputs[0].args[0], 'test2.jpg')
    assert.equal(this.compiler.convos[2].conversation[0].userInputs[0].args[0], 'test3.jpg')
  })
  it('should expand media wc from convoDir in user message', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'mediawc.convo.txt')
    this.compiler.ExpandConvos()
    assert.equal(this.compiler.convos.length, 3)
    assert.equal(this.compiler.convos[0].conversation.length, 1)
    assert.equal(this.compiler.convos[0].conversation[0].userInputs.length, 1)
    assert.equal(this.compiler.convos[0].conversation[0].userInputs[0].args[0], 'files/botium0.png')
    assert.equal(this.compiler.convos[1].conversation[0].userInputs[0].args[0], 'files/botium1.png')
    assert.equal(this.compiler.convos[2].conversation[0].userInputs[0].args[0], 'files/botium2.png')
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
    assert.equal(transcript.steps[0].actual.media[0].downloadUri, 'https://www.botium.at/botium.png')
    assert.equal(transcript.steps[0].actual.media[0].mimeType, 'image/png')
  })

  it('should add multi media in user message', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'medias.convo.txt')

    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.equal(transcript.steps.length, 1)
    assert.equal(transcript.steps[0].actual.media.length, 2)
    assert.equal(transcript.steps[0].actual.media[0].downloadUri, 'https://www.botium.at/test1.jpg')
    assert.equal(transcript.steps[0].actual.media[0].mimeType, 'image/jpeg')
    assert.equal(transcript.steps[0].actual.media[1].downloadUri, 'https://www.botium.at/test2.jpg')
    assert.equal(transcript.steps[0].actual.media[1].mimeType, 'image/jpeg')
  })
})

describe('scripting.userinputs.mediaInputConvos.baseUris', function () {
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
            baseUri: 'https://www.default.at',
            baseUris: {
              testset1: 'https://www.botium.at',
              testset2: 'https://www.google.at'
            }
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

  it('should add media from test set baseUri in user message', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'media.convo.txt')
    assert.equal(this.compiler.convos.length, 1)

    this.compiler.convos[0].sourceTag.testSetId = 'testset2'

    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.equal(transcript.steps.length, 1)
    assert.equal(transcript.steps[0].actual.media.length, 1)
    assert.equal(transcript.steps[0].actual.media[0].downloadUri, 'https://www.google.at/botium.png')
    assert.equal(transcript.steps[0].actual.media[0].mimeType, 'image/png')
  })
  it('should add media with default baseUri in user message', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'media.convo.txt')
    assert.equal(this.compiler.convos.length, 1)

    this.compiler.convos[0].sourceTag.testSetId = 'testset3'

    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.equal(transcript.steps.length, 1)
    assert.equal(transcript.steps[0].actual.media.length, 1)
    assert.isTrue(transcript.steps[0].actual.media[0].downloadUri.endsWith('https://www.default.at/botium.png'))
    assert.equal(transcript.steps[0].actual.media[0].mimeType, 'image/png')
  })
})

describe('scripting.userinputs.mediaInputConvos.baseUrisCustomSelector', function () {
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
            baseUris: {
              customval1: 'https://www.botium.at'
            },
            baseSelector: 'sourceTag.customField'
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

  it('should add media from custom test set baseUri in user message', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'media.convo.txt')
    assert.equal(this.compiler.convos.length, 1)

    this.compiler.convos[0].sourceTag.customField = 'customval1'

    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.equal(transcript.steps.length, 1)
    assert.equal(transcript.steps[0].actual.media.length, 1)
    assert.equal(transcript.steps[0].actual.media[0].downloadUri, 'https://www.botium.at/botium.png')
    assert.equal(transcript.steps[0].actual.media[0].mimeType, 'image/png')
  })
})

describe('scripting.userinputs.mediaInputConvos.baseDir', function () {
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
            baseDir: path.join(__dirname, 'convos', 'files')
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

  it('should expand media wc from baseDir in user message', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'mediawcbasedir.convo.txt')
    this.compiler.ExpandConvos()
    assert.equal(this.compiler.convos.length, 3)
    assert.equal(this.compiler.convos[0].conversation.length, 1)
    assert.equal(this.compiler.convos[0].conversation[0].userInputs.length, 1)
    assert.equal(this.compiler.convos[0].conversation[0].userInputs[0].args[0], 'botium0.png')
    assert.equal(this.compiler.convos[1].conversation[0].userInputs[0].args[0], 'botium1.png')
    assert.equal(this.compiler.convos[2].conversation[0].userInputs[0].args[0], 'botium2.png')

    await this.container.Start()
    const transcript0 = await this.compiler.convos[0].Run(this.container)
    assert.equal(transcript0.steps.length, 1)
    assert.equal(transcript0.steps[0].actual.media.length, 1)
    assert.isTrue(transcript0.steps[0].actual.media[0].downloadUri.endsWith('files/botium0.png'))
    assert.equal(transcript0.steps[0].actual.media[0].mimeType, 'image/png')
    await this.container.Stop()

    await this.container.Start()
    const transcript1 = await this.compiler.convos[1].Run(this.container)
    assert.equal(transcript1.steps.length, 1)
    assert.equal(transcript1.steps[0].actual.media.length, 1)
    assert.isTrue(transcript1.steps[0].actual.media[0].downloadUri.endsWith('files/botium1.png'))
    assert.equal(transcript1.steps[0].actual.media[0].mimeType, 'image/png')
    await this.container.Stop()

    await this.container.Start()
    const transcript2 = await this.compiler.convos[2].Run(this.container)
    assert.equal(transcript2.steps.length, 1)
    assert.equal(transcript2.steps[0].actual.media.length, 1)
    assert.isTrue(transcript2.steps[0].actual.media[0].downloadUri.endsWith('files/botium2.png'))
    assert.equal(transcript2.steps[0].actual.media[0].mimeType, 'image/png')
    await this.container.Stop()
  })

  it('should fail when media is out of baseDir', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'mediaOutOfBasedir.convo.txt')

    try {
      await this.compiler.convos[0].Run(this.container)
      assert.fail('expected error')
    } catch (err) {
      assert.isTrue(err.message.startsWith('mediaoutofbasedir/Line 3: error sending to bot - The uri \'../*.png\' is pointing out of the base directory'))
    }
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
    assert.isTrue(transcript.steps[0].actual.media[0].downloadUri.endsWith('test/scripting/userinputs/convos/botium.png'))
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
    assert.equal(transcript.steps[0].actual.media[0].downloadUri, 'https://www.botium.at/botium.png')
    assert.equal(transcript.steps[0].actual.media[0].mimeType, 'image/png')
    assert.isNotNull(transcript.steps[0].actual.media[0].buffer)

    scope.persist(false)
  })
})
