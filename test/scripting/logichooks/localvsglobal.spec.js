const path = require('path')
const Constants = require('../../../src/scripting/Constants')
const assert = require('chai').assert
const BotDriver = require('../../..').BotDriver
const Capabilities = require('../../..').Capabilities

const echoConnector = () => ({ queueBotSays }) => {
  return {
    UserSays (msg) {
      const botMsg = { sender: 'bot', sourceData: msg.sourceData, messageText: msg.messageText }
      queueBotSays(botMsg)
    }
  }
}

const buildDriver = async (mergeCaps) => {
  const myCaps = Object.assign({
    [Capabilities.PROJECTNAME]: 'convo.localvsglobal',
    [Capabilities.CONTAINERMODE]: echoConnector()
  }, mergeCaps)

  const result = {}
  result.driver = new BotDriver(myCaps)
  result.compiler = result.driver.BuildCompiler()
  result.container = await result.driver.Build()
  return result
}

const convoScriptAsserters = `
LOCALVSGLOBAL

#me
hello

#bot

#me
hello 2

#bot
MYASSERTER
`

const convoScriptHooks = `
LOCALVSGLOBAL

#me
hello

#bot

#me
hello 2

#bot
MYHOOK
`

describe('Using local and global hooks together', function () {
  it('should use local and global asserter', async function () {
    let localAssertionCount = 0
    let globalAssertionCount = 0

    const { compiler, container } = await buildDriver({
      [Capabilities.ASSERTERS]: [{
        ref: 'MYASSERTER',
        src: {
          assertConvoStep: ({ isGlobal }) => {
            if (isGlobal) globalAssertionCount++
            else localAssertionCount++
            return Promise.resolve()
          }
        },
        global: true
      }]
    })

    compiler.ReadScriptFromBuffer(Buffer.from(convoScriptAsserters), Constants.SCRIPTING_FORMAT_TXT, Constants.SCRIPTING_TYPE_CONVO)
    await compiler.convos[0].Run(container)
    assert.equal(localAssertionCount, 1)
    assert.equal(globalAssertionCount, 1)
  })
  it('should use local and global logic hooks', async function () {
    let localHookCount = 0
    let globalHookCount = 0

    const { compiler, container } = await buildDriver({
      [Capabilities.LOGIC_HOOKS]: [{
        ref: 'MYHOOK',
        src: {
          onBotEnd: ({ isGlobal }) => {
            if (isGlobal) globalHookCount++
            else localHookCount++
            return Promise.resolve()
          }
        },
        global: true
      }]
    })

    compiler.ReadScriptFromBuffer(Buffer.from(convoScriptHooks), Constants.SCRIPTING_FORMAT_TXT, Constants.SCRIPTING_TYPE_CONVO)
    await compiler.convos[0].Run(container)
    assert.equal(localHookCount, 1)
    assert.equal(globalHookCount, 1)
  })
})
