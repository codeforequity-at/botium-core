const path = require('path')
const assert = require('chai').assert
const BotDriver = require('../../').BotDriver
const Capabilities = require('../../').Capabilities

const echoConnector = ({ queueBotSays }) => {
  return {
    UserSays (msg) {
      const botMsg = { sender: 'bot', sourceData: msg.sourceData, messageText: `Response of ${msg.messageText}` }
      queueBotSays(botMsg)
    }
  }
}

describe('compiler.precompiler.script', function () {
  beforeEach(async function () {
    const myCaps = {
      [Capabilities.PROJECTNAME]: 'compiler.precompiler.script',
      [Capabilities.CONTAINERMODE]: echoConnector,
      [Capabilities.SCRIPTING_ENABLE_MEMORY]: true,
      PRECOMPILERS: {
        name: 'SCRIPT',
        script: `
          const utterances = {}
          for (const entry of scriptData) {
            utterances[entry.intent] = entry.sentences
          }
          result = {utterances}
          `
      }
    }
    const driver = new BotDriver(myCaps)
    this.compiler = driver.BuildCompiler()
    this.container = await driver.Build()
  })
  afterEach(async function () {
    this.container && await this.container.Clean()
  })

  it('should execute non-standard json', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'convos_precompiler_script.json')
    this.compiler.ExpandUtterancesToConvos()
    this.compiler.ExpandConvos()
    assert.equal(this.compiler.convos.length, 3)
    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.equal(transcript.steps.length, 2)
    assert.equal(transcript.steps[0].actual.sender, 'me')
    assert.equal(transcript.steps[0].actual.messageText, 'goodbye')
    assert.equal(transcript.steps[1].actual.sender, 'bot')
    assert.equal(transcript.steps[1].actual.messageText, 'Response of goodbye')
  })
})
