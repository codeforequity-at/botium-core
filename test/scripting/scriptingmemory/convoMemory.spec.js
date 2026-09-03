const path = require('path')
const assert = require('chai').assert
const BotDriver = require('../../..').BotDriver
const Capabilities = require('../../..').Capabilities
const ScriptingMemory = require('../../../src/scripting/ScriptingMemory')

// #region helper functions
const echoConnector = ({ queueBotSays }) => {
  return {
    UserSays (msg) {
      queueBotSays({
        sender: 'bot',
        sourceData: msg.sourceData || { request: msg.messageText },
        messageText: msg.messageText
      })
    }
  }
}

const convoByName = (compiler, name) => compiler.convos.find(c => c.header.name === name)

const meTexts = (transcript) => transcript.steps
  .filter(s => s.actual && s.actual.sender !== 'bot')
  .map(s => s.actual.messageText)
  .filter(t => t)
// #endregion

describe('scripting.scriptingmemory.convoMemory', function () {
  describe('alias helpers', function () {
    it('aliasConvoMemory copies scoped keys to short names for the current convo', function () {
      const values = {
        $Convo__Checkout__orderId: '342',
        $Convo__Checkout__username: 'Joe',
        $Convo__Payment__username: 'Jane',
        $token: 'secret'
      }
      const aliased = ScriptingMemory.aliasConvoMemory('Checkout', values)
      assert.equal(aliased.$orderId, '342')
      assert.equal(aliased.$username, 'Joe')
      assert.equal(aliased.$Convo__Checkout__orderId, '342')
      assert.equal(aliased.$Convo__Payment__username, 'Jane')
      assert.isUndefined(aliased.$pw)
      assert.equal(aliased.$token, 'secret')
      assert.equal(values.$orderId, undefined)
    })

    it('aliasConvoMemory lets scoped names win over a global of the same short name', function () {
      const aliased = ScriptingMemory.aliasConvoMemory('Checkout', {
        $orderId: 'global',
        $Convo__Checkout__orderId: '342'
      })
      assert.equal(aliased.$orderId, '342')
    })

    it('convoMemoryAliases adds short names for the current convo prefix only', function () {
      const aliased = ScriptingMemory.convoMemoryAliases('Checkout', [
        '$Convo__Checkout__orderId',
        '$Convo__Payment__username',
        '$newPWD'
      ])
      assert.deepEqual(aliased, [
        '$Convo__Checkout__orderId',
        '$orderId',
        '$Convo__Payment__username',
        '$newPWD'
      ])
    })
  })

  describe('expand and run', function () {
    beforeEach(async function () {
      const driver = new BotDriver({
        [Capabilities.PROJECTNAME]: 'scripting.scriptingmemory.convoMemory',
        [Capabilities.CONTAINERMODE]: echoConnector,
        [Capabilities.SCRIPTING_ENABLE_MEMORY]: true
      })
      this.compiler = driver.BuildCompiler()
      this.container = await driver.Build()
    })

    afterEach(async function () {
      this.container && await this.container.Clean()
    })

    it('expands Checkout and ChangePassword with case suffix and applies scoped values', async function () {
      this.compiler.ReadScriptsFromDirectory(path.resolve(__dirname, 'convosConvoMemory'))
      this.compiler.ExpandScriptingMemoryToConvos()
      this.compiler.ExpandConvos()

      assert.sameMembers(this.compiler.convos.map(c => c.header.name), ['Checkout.One', 'ChangePassword.One'])

      await this.container.Start()
      const checkout = await convoByName(this.compiler, 'Checkout.One').Run(this.container)
      await this.container.Stop()
      assert.deepEqual(meTexts(checkout), ['login Joe 555', 'my order is 342'])
      assert.equal(checkout.scriptingMemory.$username, 'Joe')
      assert.equal(checkout.scriptingMemory.$orderId, '342')
      assert.equal(checkout.scriptingMemory.$Convo__Payment__username, 'Jane')

      await this.container.Start()
      const changePassword = await convoByName(this.compiler, 'ChangePassword.One').Run(this.container)
      await this.container.Stop()
      assert.deepEqual(meTexts(changePassword), ['login Tom 234', 'change password to 78977'])
      assert.equal(changePassword.scriptingMemory.$username, 'Tom')
      assert.equal(changePassword.scriptingMemory.$newPWD, '78977')
    })
  })
})
