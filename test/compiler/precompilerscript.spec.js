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

const beforeCustom = async (thisParam, script) => {
  const myCaps = {
    [Capabilities.PROJECTNAME]: 'compiler.precompiler.script',
    [Capabilities.CONTAINERMODE]: echoConnector,
    [Capabilities.SCRIPTING_ENABLE_MEMORY]: true,
    PRECOMPILERS: {
      NAME: 'SCRIPT',
      SCRIPT: script
    }
  }
  const driver = new BotDriver(myCaps)
  thisParam.compiler = driver.BuildCompiler()
  thisParam.container = await driver.Build()
}

const afterCustom = async (thisParam) => {
  this.container && await this.container.Clean()
}

describe('compiler.precompiler.script', function () {
  it('should execute non-standard json', async function () {
    await beforeCustom(this, `
      const utterances = {}
      for (const entry of scriptData) {
        utterances[entry.intent] = entry.sentences
      }
      module.exports = {utterances}
    `)
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
    await afterCustom(this)
  })

  it('should filter by extension, accepted', async function () {
    await beforeCustom(this, `
    if (filename.endsWith('.json')) {
        const utterances = {}
        for (const entry of scriptData) {
          utterances[entry.intent] = entry.sentences
        }
        module.exports = {utterances}
      }
    `)
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'convos_precompiler_script.json')
    this.compiler.ExpandUtterancesToConvos()
    this.compiler.ExpandConvos()
    assert.equal(this.compiler.convos.length, 3)
    await afterCustom(this)
  })

  it('should filter by extension, rejected', async function () {
    await beforeCustom(this, `
    if (filename.endsWith('.xxx')) {
        const utterances = {}
        for (const entry of scriptData) {
          utterances[entry.intent] = entry.sentences
        }
        module.exports = {utterances}
      }
    `)
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'convos_precompiler_script.json')
    this.compiler.ExpandUtterancesToConvos()
    this.compiler.ExpandConvos()
    assert.equal(this.compiler.convos.length, 0)
    await afterCustom(this)
  })

  it('should filter by content, accepted', async function () {
    await beforeCustom(this, `
      if (scriptData) {
        const utterances = {}
        for (const entry of scriptData) {
          utterances[entry.intent] = entry.sentences
        }
        module.exports = {utterances}
      }
    `)
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'convos_precompiler_script.json')
    this.compiler.ExpandUtterancesToConvos()
    this.compiler.ExpandConvos()
    assert.equal(this.compiler.convos.length, 3)
    await afterCustom(this)
  })

  it('should filter by content, rejected', async function () {
    await beforeCustom(this, `
      if (scriptData.utterances) {
        const utterances = {}
        for (const entry of scriptData.utterances) {
          utterances[entry.intent] = entry.sentences
        }
        module.exports = {utterances}
      }
  `)
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'convos_precompiler_script.json')
    this.compiler.ExpandUtterancesToConvos()
    this.compiler.ExpandConvos()
    assert.equal(this.compiler.convos.length, 0)
    await afterCustom(this)
  })

  it('should change extension', async function () {
    await beforeCustom(this, `
      const utterances = {}
      for (const entry of scriptData) {
        utterances[entry.intent] = entry.sentences
      }
      module.exports = { scriptBuffer:{utterances}, filename: filename + ".json" }
  `)
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'convos_precompiler_script.json.txt')
    this.compiler.ExpandUtterancesToConvos()
    this.compiler.ExpandConvos()
    assert.equal(this.compiler.convos.length, 3)
    await afterCustom(this)
  })

  it('should not read anything without extension change', async function () {
    await beforeCustom(this, `
      const utterances = {}
      for (const entry of scriptData) {
        utterances[entry.intent] = entry.sentences
      }
      module.exports = { scriptBuffer:{utterances} }
  `)
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'convos_precompiler_script.json.txt')
    this.compiler.ExpandUtterancesToConvos()
    this.compiler.ExpandConvos()
    assert.equal(this.compiler.convos.length, 0)
    await afterCustom(this)
  })

  it('should be able to precompile text to text', async function () {
    await beforeCustom(this, `
      module.exports = scriptData.replace("Hi!", "Hi Bot!")
  `)
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'convos_precompiler_script_text_to_text.convo.txt')
    this.compiler.ExpandUtterancesToConvos()
    this.compiler.ExpandConvos()
    assert.equal(this.compiler.convos.length, 1)
    assert.equal(this.compiler.convos[0].conversation.length, 2)
    assert.equal(this.compiler.convos[0].conversation[0].messageText, 'Hi Bot!')
    await afterCustom(this)
  })
})
