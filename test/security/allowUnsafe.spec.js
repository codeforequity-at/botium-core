const path = require('path')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const assert = chai.assert
const BotDriver = require('../../').BotDriver
const Capabilities = require('../../').Capabilities
const { BotiumError } = require('../../src/scripting/BotiumError')

const myCapsSimpleRest = {
  [Capabilities.CONTAINERMODE]: 'simplerest',
  [Capabilities.SIMPLEREST_URL]: 'http://my-host.com/api/endpoint',
  [Capabilities.SIMPLEREST_METHOD]: 'POST',
  [Capabilities.SECURITY_ALLOW_UNSAFE]: false,
  [Capabilities.SIMPLEREST_BODY_TEMPLATE]: {
    FUNCTION_WITHOUT_PARAM: '{{fnc.year}}'
  },
  [Capabilities.SIMPLEREST_RESPONSE_JSONPATH]: ['$']
}

const echoConnector = ({ queueBotSays }) => {
  return {
    UserSays (msg) {
      const botMsg = { sender: 'bot', sourceData: msg.sourceData, messageText: `Response of ${msg.messageText}` }
      queueBotSays(botMsg)
    }
  }
}

const myCapsEcho = {
  [Capabilities.PROJECTNAME]: 'security.allowUnsafe',
  [Capabilities.CONTAINERMODE]: echoConnector,
  [Capabilities.SCRIPTING_ENABLE_MEMORY]: true,
  [Capabilities.SECURITY_ALLOW_UNSAFE]: false
}

const emptyMsg = {}

describe('scripting memory', function () {
  it('should throw security error for using function', async function () {
    const driver = new BotDriver(myCapsEcho)
    const compiler = driver.BuildCompiler()
    const container = await driver.Build()

    await container.Start()

    try {
      compiler.ReadScript(path.resolve(__dirname, 'convos'), 'withscriptingmemoryfunction.convo.txt')
      await compiler.convos[0].Run(container)
      assert.fail('should have failed')
    } catch (err) {
      assert.isTrue(err.message.indexOf('Security Error. Using unsafe scripting memory function $func is not allowed') >= 0)
    }
    await container && container.Clean()
  })
})

describe('simple rest, scripting memory', function () {
  it('should use variables succesful', async function () {
    const myCaps = Object.assign({}, Object.assign(
      {},
      myCapsSimpleRest,
      {
        [Capabilities.SIMPLEREST_BODY_TEMPLATE]: {
          FUNCTION_WITHOUT_PARAM: '{{fnc.year}}'
        }
      }
    ))
    const driver = new BotDriver(myCaps)
    const container = await driver.Build()

    await container.Start()

    await container.pluginInstance._buildRequest(emptyMsg)

    await container.Clean()
  })

  it('should throw security error for using env', async function () {
    const driver = new BotDriver(Object.assign(
      {},
      myCapsSimpleRest,
      {
        [Capabilities.SIMPLEREST_BODY_TEMPLATE]: {
          SAMPLE_ENV: '{{#fnc.env}}SAMPLE_ENV{{/fnc.env}}'
        }
      }
    ))
    const container = await driver.Build()

    await container.Start()

    try {
      await container.pluginInstance._buildRequest(emptyMsg)
      assert.fail('should have failed')
    } catch (err) {
      assert.isTrue(err.message.indexOf('BotiumError: Security Error. Using unsafe scripting memory function $env is not allowed') >= 0)
      assert.isTrue(err.message.indexOf('allow unsafe') >= 0)
      assert.isTrue(err.message.indexOf('ScriptingMemory.js') >= 0)
    }

    await container.Clean()
  })
})

describe('simple rest, hooks', function () {
  it('should throw security error for using hook', async function () {
    const driver = new BotDriver(Object.assign(
      {},
      myCapsSimpleRest,
      {
        [Capabilities.SIMPLEREST_REQUEST_HOOK]: '1+1'
      }
    ))

    try {
      await driver.Build()
      assert.fail('should have failed')
    } catch (err) {
      assert.isTrue(err instanceof BotiumError)
      assert.exists(err.context)
      assert.equal(err.context.message, 'Security Error. Using unsafe hooks in simple rest connector is not allowed')
      assert.equal(err.context.source, 'SimpleRestContainer.js')
      assert.equal(err.context.type, 'security')
      assert.equal(err.context.subtype, 'allow unsafe')
    }
  })
})

describe('precompilers', function () {
  it('should throw security error for script type', async function () {
    const myCaps = {
      [Capabilities.PROJECTNAME]: 'compiler.precompiler.script',
      [Capabilities.CONTAINERMODE]: echoConnector,
      [Capabilities.SCRIPTING_ENABLE_MEMORY]: true,
      [Capabilities.SECURITY_ALLOW_UNSAFE]: false,
      PRECOMPILERS: {
        NAME: 'SCRIPT',
        SCRIPT: 'console.log("dummy")'
      }
    }
    const driver = new BotDriver(myCaps)
    const compiler = driver.BuildCompiler()
    const container = await driver.Build()

    try {
      compiler.ReadScript(path.resolve(__dirname, 'convos'), 'dummy.convo.txt')
      assert.fail('should have failed')
    } catch (err) {
      assert.isTrue(err instanceof BotiumError)
      assert.exists(err.context)
      assert.equal(err.context.message, 'Security Error. Using unsafe precompiler SCRIPT is not allowed')
      assert.equal(err.context.source, 'precompilers')
      assert.equal(err.context.type, 'security')
      assert.equal(err.context.subtype, 'allow unsafe')
    }
    await container.Clean()
  })
})

describe('base container, hooks', function () {
  it('should throw security error for using hook', async function () {
    const driver = new BotDriver(Object.assign(
      {},
      myCapsEcho,
      { [Capabilities.CUSTOMHOOK_ONUSERSAYS]: '1+1' }
    ))

    try {
      await driver.Build()
      assert.fail('should have failed')
    } catch (err) {
      assert.isTrue(err instanceof BotiumError)
      assert.exists(err.context)
      assert.equal(err.context.message, 'Security Error. Using unsafe custom hooks is not allowed')
      assert.equal(err.context.source, 'BaseContainer.js')
      assert.equal(err.context.type, 'security')
      assert.equal(err.context.subtype, 'allow unsafe')
    }
  })
})

describe('Logic hook', function () {
  it('should throw security error for logic hook with src', async function () {
    const driver = new BotDriver(Object.assign(
      {},
      myCapsEcho,
      {
        [Capabilities.LOGIC_HOOKS]: [
          {
            ref: 'MY-LOGICHOOK-NAME',
            src: {
              onMeStart: '1+1'
            },
            global: false,
            args: {
              'my-arg-1': 'something'
            }
          }
        ]
      }
    ))

    try {
      driver.BuildCompiler()
    } catch (err) {
      assert.isTrue(err instanceof BotiumError)
      assert.exists(err.context)
      assert.equal(err.context.message, 'Security Error. Using unsafe component is not allowed')
      assert.equal(err.context.source, 'LogicHookUtils.js')
      assert.equal(err.context.type, 'security')
      assert.equal(err.context.subtype, 'allow unsafe')
    }
  })
  it('should throw security error for global logic hook with src', async function () {
    const driver = new BotDriver(Object.assign(
      {},
      myCapsEcho,
      {
        [Capabilities.LOGIC_HOOKS]: [
          {
            ref: 'MY-LOGICHOOK-NAME',
            src: {
              onMeStart: '1+1'
            },
            global: true,
            args: {
              'my-arg-1': 'something'
            }
          }
        ]
      }
    ))

    try {
      driver.BuildCompiler()
    } catch (err) {
      assert.isTrue(err instanceof BotiumError)
      assert.exists(err.context)
      assert.equal(err.context.message, 'Security Error. Using unsafe component is not allowed')
      assert.equal(err.context.source, 'LogicHookUtils.js')
      assert.equal(err.context.type, 'security')
      assert.equal(err.context.subtype, 'allow unsafe')
      assert.exists(err.context.cause)
      assert.equal(err.context.cause.ref, 'MY-LOGICHOOK-NAME')
      assert.equal(err.context.cause.src, true)
    }
  })
})
