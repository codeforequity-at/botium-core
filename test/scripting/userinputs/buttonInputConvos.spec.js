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

describe('scripting.userinputs.buttonInputConvos', function () {
  beforeEach(async function () {
    const myCaps = {
      [Capabilities.PROJECTNAME]: 'scripting.userinputs.buttonInputConvos',
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

  it('should fail on button with no arg', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'buttonNoArg.convo.txt')
    try {
      await this.compiler.convos[0].Run(this.container)
      assert.fail('it should have failed')
    } catch (err) {
      assert.isTrue(err.message.indexOf('Line 3: ButtonInput requires 1 or 2 arguments') > 0)
    }
  })

  it('should set button payload in user message', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'button.convo.txt')
    assert.equal(this.compiler.convos.length, 1)
    assert.equal(this.compiler.convos[0].conversation.length, 1)
    assert.equal(this.compiler.convos[0].conversation[0].userInputs.length, 1)
    assert.equal(this.compiler.convos[0].conversation[0].userInputs[0].name, 'BUTTON')
    assert.equal(this.compiler.convos[0].conversation[0].userInputs[0].args.length, 1)
    assert.equal(this.compiler.convos[0].conversation[0].userInputs[0].args[0], 'ButtonPayload')

    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.equal(transcript.steps.length, 1)
    assert.equal(transcript.steps[0].actual.messageText, 'ButtonPayload')
    assert.equal(transcript.steps[0].actual.buttons.length, 1)
    assert.equal(transcript.steps[0].actual.buttons[0].payload, 'ButtonPayload')
    assert.notExists(transcript.steps[0].actual.buttons[0].text)
  })

  it('should set button text and payload in user message', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'buttonTwoArgs.convo.txt')
    assert.equal(this.compiler.convos.length, 1)
    assert.equal(this.compiler.convos[0].conversation.length, 1)
    assert.equal(this.compiler.convos[0].conversation[0].userInputs.length, 1)
    assert.equal(this.compiler.convos[0].conversation[0].userInputs[0].name, 'BUTTON')
    assert.equal(this.compiler.convos[0].conversation[0].userInputs[0].args.length, 2)
    assert.equal(this.compiler.convos[0].conversation[0].userInputs[0].args[0], 'ButtonPayload')
    assert.equal(this.compiler.convos[0].conversation[0].userInputs[0].args[1], 'ButtonText')

    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.equal(transcript.steps.length, 1)
    assert.equal(transcript.steps[0].actual.messageText, 'ButtonPayload')
    assert.equal(transcript.steps[0].actual.buttons.length, 1)
    assert.equal(transcript.steps[0].actual.buttons[0].payload, 'ButtonPayload')
    assert.equal(transcript.steps[0].actual.buttons[0].text, 'ButtonText')
  })

  it('should replace scripting variable button text in user message', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'buttonScript.convo.txt')

    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.equal(transcript.steps.length, 3)
    assert.equal(transcript.steps[2].actual.messageText, 'Button: hello world')
    assert.equal(transcript.steps[2].actual.buttons.length, 1)
    assert.equal(transcript.steps[2].actual.buttons[0].payload, 'Button: hello world')
  })
})
