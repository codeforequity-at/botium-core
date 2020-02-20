const path = require('path')
const assert = require('chai').assert
const BotDriver = require('../../../index').BotDriver
const Capabilities = require('../../../index').Capabilities

const echoConnector = ({ queueBotSays }) => {
  return {
    UserSays (msg) {
      let messageText = msg.messageText
      if (msg.depth1Field) {
        messageText = msg.depth1Field.depth2Field
      } else if (msg.aJsonField) {
        messageText = msg.aJsonField.msg
      } else if (msg.simpleField) {
        messageText = msg.simpleField
      }

      const botMsg = { sender: 'bot', sourceData: msg.sourceData, messageText, custom: msg.custom }
      queueBotSays(botMsg)
    }
  }
}

describe('UpdateCustomLogicHook', function () {
  beforeEach(async function () {
    const myCaps = {
      [Capabilities.PROJECTNAME]: 'scripting.logichooks',
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

  it('should update me message from json', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'update_custom_me_msg_json.convo.txt')
    assert.equal(this.compiler.convos.length, 1)

    await this.compiler.convos[0].Run(this.container)
  })

  it('should update me message 2 depth', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'update_custom_me_msg_depth2.convo.txt')
    assert.equal(this.compiler.convos.length, 1)

    await this.compiler.convos[0].Run(this.container)
  })

  it('should update me message from skalar', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'update_custom_me_msg_simple.convo.txt')
    assert.equal(this.compiler.convos.length, 1)

    await this.compiler.convos[0].Run(this.container)
  })

  it('should update mixed custom fields', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'update_custom_me_msg_mixed_struct.convo.txt')
    assert.equal(this.compiler.convos.length, 1)

    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.lengthOf(transcript.steps, 10)

    assert.isArray(transcript.steps[0].actual.custom)
    assert.lengthOf(transcript.steps[0].actual.custom, 3)
    assert.equal(transcript.steps[0].actual.custom[0], 'scalar1')
    assert.equal(transcript.steps[0].actual.custom[1], 'scalar2')
    assert.equal(transcript.steps[0].actual.custom[2], 'scalar3')

    assert.isObject(transcript.steps[2].actual.custom)
    assert.equal(transcript.steps[2].actual.custom.field1, 'value1')
    assert.equal(transcript.steps[2].actual.custom.field2, 'value2')

    assert.isObject(transcript.steps[4].actual.custom)
    assert.equal(transcript.steps[4].actual.custom.field1, 'value1')
    assert.equal(transcript.steps[4].actual.custom.scalar1, true)

    assert.isObject(transcript.steps[6].actual.custom)
    assert.equal(transcript.steps[6].actual.custom.field1, 'value1')
    assert.equal(transcript.steps[6].actual.custom.scalar1, true)

    assert.isObject(transcript.steps[8].actual.custom)
    assert.equal(transcript.steps[8].actual.custom.field1, 'value1')
    assert.equal(transcript.steps[8].actual.custom.scalar1, true)
    assert.equal(transcript.steps[8].actual.custom.scalar2, true)
  })

  it('should update me message global from skalar', async function () {
    const myCaps = {
      [Capabilities.PROJECTNAME]: 'scripting.logichooks',
      [Capabilities.CONTAINERMODE]: echoConnector,
      [Capabilities.SCRIPTING_ENABLE_MEMORY]: true,
      [Capabilities.LOGIC_HOOKS]: [
        {
          ref: 'SET_SIMPLE',
          src: 'UpdateCustomLogicHook',
          args: {
            name: 'simpleField',
            arg: 'new message'
          },
          global: true
        }
      ]
    }
    const driver = new BotDriver(myCaps)
    this.compiler = driver.BuildCompiler()
    this.container = await driver.Build()

    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'update_custom_me_msg_global_simple.convo.txt')
    assert.equal(this.compiler.convos.length, 1)

    await this.compiler.convos[0].Run(this.container)
  })
  it('should update me message from begin section skalar', async function () {
    const myCaps = {
      [Capabilities.PROJECTNAME]: 'scripting.logichooks',
      [Capabilities.CONTAINERMODE]: echoConnector,
      [Capabilities.SCRIPTING_ENABLE_MEMORY]: true
    }
    const driver = new BotDriver(myCaps)
    this.compiler = driver.BuildCompiler()
    this.container = await driver.Build()

    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'update_custom_me_msg_begin.convo.txt')
    assert.equal(this.compiler.convos.length, 1)

    await this.compiler.convos[0].Run(this.container)
  })
  it('should update me message from begin section in partial convo', async function () {
    const myCaps = {
      [Capabilities.PROJECTNAME]: 'scripting.logichooks',
      [Capabilities.CONTAINERMODE]: echoConnector,
      [Capabilities.SCRIPTING_ENABLE_MEMORY]: true
    }
    const driver = new BotDriver(myCaps)
    this.compiler = driver.BuildCompiler()
    this.container = await driver.Build()

    this.compiler.ReadScriptsFromDirectory(path.resolve(__dirname, 'convos', 'update_custom_with_partial'))
    assert.equal(this.compiler.convos.length, 1)

    await this.compiler.convos[0].Run(this.container)
  })
})
