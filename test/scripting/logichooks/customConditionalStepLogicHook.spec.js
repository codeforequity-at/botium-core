const path = require('path')
const assert = require('chai').assert
const BotDriver = require('../../..').BotDriver
const Capabilities = require('../../..').Capabilities
const CustomConditionalLogicHook = require('./CustomConditionalLogicHook')
const myCaps = {
  LOGIC_HOOKS: [
    {
      ref: 'CONDITIONAL_STEP_LOGIC_HOOK',
      src: CustomConditionalLogicHook,
      global: false
    }
  ]
}
const echoConnector = () => ({ queueBotSays }) => {
  return {
    UserSays (msg) {
      const botMsg = { sender: 'bot', sourceData: msg.sourceData, messageText: msg.messageText }
      queueBotSays(botMsg)
    }
  }
}

const echoConnectorDuplicatedBotMsg = () => ({ queueBotSays }) => {
  return {
    UserSays (msg) {
      const botMsg = { sender: 'bot', sourceData: msg.sourceData, messageText: msg.messageText }
      queueBotSays(botMsg)

      const botMsgDuplicate = { sender: 'bot', sourceData: msg.sourceData, messageText: msg.messageText + ' Duplicate' }
      queueBotSays(botMsgDuplicate)
    }
  }
}

const buildDriver = async (mergeCaps, duplicateBotMsg) => {
  const myCaps = Object.assign({
    [Capabilities.PROJECTNAME]: 'convo.customassertersskip',
    [Capabilities.CONTAINERMODE]: duplicateBotMsg ? echoConnectorDuplicatedBotMsg() : echoConnector()
  }, mergeCaps)

  const result = {}
  result.driver = new BotDriver(myCaps)
  result.compiler = result.driver.BuildCompiler()
  result.container = await result.driver.Build()
  return result
}

describe('convo with custom conditional logichook', function () {
  describe('simple bot messages', function () {
    beforeEach(async function () {
      const { compiler, container } = await buildDriver(myCaps)
      this.compiler = compiler
      this.container = container
      await this.container.Start()
    })
    afterEach(async function () {
      await this.container.Stop()
      await this.container.Clean()
    })

    it('should success', async function () {
      this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'conditional_steps.convo.txt')
      const transript = await this.compiler.convos[0].Run(this.container)
      assert.equal(transript.steps.length, 2)
    })

    it('should success followed by me message', async function () {
      this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'conditional_steps_followed_by_me.convo.txt')
      const transript = await this.compiler.convos[0].Run(this.container)
      assert.equal(transript.steps.length, 4)
    })
  })

  describe('multiple bot messages', function () {
    beforeEach(async function () {
      const { compiler, container } = await buildDriver(myCaps, true)
      this.compiler = compiler
      this.container = container
      await this.container.Start()
    })
    afterEach(async function () {
      await this.container.Stop()
      await this.container.Clean()
    })

    it('should success followed by bot message', async function () {
      this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'conditional_steps_followed_by_bot_msg.convo.txt')
      const transript = await this.compiler.convos[0].Run(this.container)
      assert.equal(transript.steps.length, 3)
    })

    it('should success with multiple condition groups', async function () {
      this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'conditional_steps_multiple_condition_groups.convo.txt')
      const transript = await this.compiler.convos[0].Run(this.container)
      assert.equal(transript.steps.length, 3)
    })

    it('should success with multiple condition groups no assertion', async function () {
      this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'conditional_steps_multiple_condition_groups_no_assertion.convo.txt')
      const transript = await this.compiler.convos[0].Run(this.container)
      assert.equal(transript.steps.length, 3)
    })

    it('should fail mandatory condition group if no condition met', async function () {
      try {
        this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'conditional_steps_multiple_mandatory_condition_groups.convo.txt')
        await this.compiler.convos[0].Run(this.container)
        assert.fail('it should have failed')
      } catch (e) {
        assert.equal(e.message, 'custom embedded/Line 18: Non of the conditions are met in \'G2\' condition group')
      }
    })

    it('should not fail optional condition group if no condition met', async function () {
      this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'conditional_steps_multiple_optional_condition_groups.convo.txt')
      const transript = await this.compiler.convos[0].Run(this.container)
      assert.equal(transript.steps.length, 2)
    })
  })
})
