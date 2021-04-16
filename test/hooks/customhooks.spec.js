const nock = require('nock')
const assert = require('chai').assert
const BotDriver = require('../../').BotDriver
const Capabilities = require('../../').Capabilities

const echoConnector = ({ queueBotSays }) => {
  return {
    UserSays (msg) {
      const botMsg = { sender: 'bot', sourceData: msg.sourceData, messageText: msg.messageText, testInput: msg.testInput }
      queueBotSays(botMsg)
    }
  }
}

const buildDriver = async (mergeCaps) => {
  const myCaps = Object.assign({
    [Capabilities.PROJECTNAME]: 'customhooks',
    [Capabilities.CONTAINERMODE]: echoConnector
  }, mergeCaps)

  const result = {}
  result.driver = new BotDriver(myCaps)
  result.container = await result.driver.Build()
  return result
}

describe('customhooks.hookfromsrc', function () {
  it('should call hooks from code', async function () {
    let onBuildCalled = false
    let onStartCalled = false
    let onUserSaysCalled = false
    let onBotResponseCalled = false
    let onStopCalled = false
    let onCleanCalled = false
    const { container } = await buildDriver({
      [Capabilities.CUSTOMHOOK_ONBUILD]: () => {
        onBuildCalled = true
      },
      [Capabilities.CUSTOMHOOK_ONSTART]: () => {
        onStartCalled = true
      },
      [Capabilities.CUSTOMHOOK_ONUSERSAYS]: () => {
        onUserSaysCalled = true
      },
      [Capabilities.CUSTOMHOOK_ONBOTRESPONSE]: () => {
        onBotResponseCalled = true
      },
      [Capabilities.CUSTOMHOOK_ONSTOP]: () => {
        onStopCalled = true
      },
      [Capabilities.CUSTOMHOOK_ONCLEAN]: () => {
        onCleanCalled = true
      }
    })
    await container.Start()
    await container.UserSaysText('hallo')
    await container.WaitBotSays()
    await container.Stop()
    await container.Clean()

    assert.isTrue(onBuildCalled)
    assert.isTrue(onStartCalled)
    assert.isTrue(onUserSaysCalled)
    assert.isTrue(onBotResponseCalled)
    assert.isTrue(onStopCalled)
    assert.isTrue(onCleanCalled)
  })
  it('should call hooks from string function', async function () {
    const { container } = await buildDriver({
      [Capabilities.CUSTOMHOOK_ONBUILD]: 'module.exports = ({ container }) => { container.onBuildCalled = true }',
      [Capabilities.CUSTOMHOOK_ONSTART]: 'module.exports = ({ container }) => { container.onStartCalled = true }',
      [Capabilities.CUSTOMHOOK_ONUSERSAYS]: 'module.exports = ({ container }) => { container.onUserSaysCalled = true }',
      [Capabilities.CUSTOMHOOK_ONBOTRESPONSE]: 'module.exports = ({ container }) => { container.onBotResponseCalled = true }',
      [Capabilities.CUSTOMHOOK_ONSTOP]: 'module.exports = ({ container }) => { container.onStopCalled = true }',
      [Capabilities.CUSTOMHOOK_ONCLEAN]: 'module.exports = ({ container }) => { container.onCleanCalled = true }'
    })
    await container.Start()
    await container.UserSaysText('hallo')
    await container.WaitBotSays()
    await container.Stop()
    await container.Clean()

    assert.isTrue(container.onBuildCalled)
    assert.isTrue(container.onStartCalled)
    assert.isTrue(container.onUserSaysCalled)
    assert.isTrue(container.onBotResponseCalled)
    assert.isTrue(container.onStopCalled)
    assert.isTrue(container.onCleanCalled)
  })
  it('should change meMsg from hook', async function () {
    const { container } = await buildDriver({
      [Capabilities.CUSTOMHOOK_ONUSERSAYS]: ({ meMsg }) => {
        meMsg.testInput = 1
      }
    })
    await container.Start()
    await container.UserSaysText('hallo')
    const botMsg = await container.WaitBotSays()
    await container.Stop()
    await container.Clean()

    assert.equal(botMsg.testInput, 1)
  })
  it('should change botMsg from hook', async function () {
    const { container } = await buildDriver({
      [Capabilities.CUSTOMHOOK_ONBOTRESPONSE]: ({ botMsg }) => {
        botMsg.fromHook = 1
      }
    })
    await container.Start()
    await container.UserSaysText('hallo')
    const botMsg = await container.WaitBotSays()
    await container.Stop()
    await container.Clean()

    assert.equal(botMsg.fromHook, 1)
  })
  it('should call http api from string function', async function () {
    const scope = nock('https://gettoken.com')
      .get('/get')
      .reply(200, {
        token: 'thisisausertoken'
      })
      .persist()

    const { container } = await buildDriver({
      [Capabilities.CUSTOMHOOK_ONSTART]: `module.exports = async ({ container, request }) => {
        return new Promise((resolve, reject) => {
          request({ method: 'get', uri: 'https://gettoken.com/get', json: true }, (err, response, body) => {
            if (err) return reject(err)
            container.caps.MYTOKEN = body.token
            resolve()
          })
        })
      }`
    })
    await container.Start()
    assert.equal(container.caps.MYTOKEN, 'thisisausertoken')
    scope.persist(false)
  })
})
