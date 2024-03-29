const path = require('path')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const assert = chai.assert
const BotDriver = require('../../').BotDriver
const Capabilities = require('../../').Capabilities
const HookUtils = require('../../src/helpers/HookUtils')

const myCapsSimpleRest = {
  [Capabilities.CONTAINERMODE]: 'simplerest',
  [Capabilities.SIMPLEREST_URL]: 'http://my-non-existing-botium-host.com/api/endpoint',
  [Capabilities.SIMPLEREST_METHOD]: 'POST',
  [Capabilities.SECURITY_ALLOW_UNSAFE]: false,
  [Capabilities.SCRIPTING_ENABLE_MEMORY]: true,
  [Capabilities.SIMPLEREST_RESPONSE_JSONPATH]: ['$']
}

const _getSimpleRestCaps = (caps) => {
  return Object.assign(
    {},
    myCapsSimpleRest,
    caps || {}
  )
}

const emptyMsg = {}

const functionConnector = ({ queueBotSays }) => {
  return {
    UserSays (msg) {
      const botMsg = {
        sender: 'bot',
        sourceData: msg.sourceData,
        messageText: `Response of ${msg.messageText}`
      }
      queueBotSays(botMsg)
    }
  }
}

describe('security.allowUnsafe', function () {
  describe('hook utils', function () {
    it('should accept javascript hook in safe mode', async function () {
      HookUtils.getHook({
        [Capabilities.SECURITY_ALLOW_UNSAFE]: false
      }, () => null)
    })
    it('should not accept file hook in safe mode', async function () {
      try {
        HookUtils.getHook({
          [Capabilities.SECURITY_ALLOW_UNSAFE]: false
        }, 'test/security/resources/hook-as-file.js')
        assert.fail('should have failed')
      } catch (err) {
        console.log(err.message)
        assert.isTrue(err.message.indexOf('invalid') >= 0)
      }
    })
    it('should accept file hook from safe dir in unsafe mode', async function () {
      HookUtils.getHook({
        [Capabilities.SECURITY_ALLOW_UNSAFE]: true,
        [Capabilities.SAFEDIR]: 'test/security/'
      }, 'resources/hook-as-file.js')
    })
    it('should not accept file hook from outside safe dir', async function () {
      try {
        HookUtils.getHook({
          [Capabilities.SECURITY_ALLOW_UNSAFE]: true,
          [Capabilities.SAFEDIR]: 'test/security/'
        }, '../hook-as-file.js')
        assert.fail('should have failed')
      } catch (err) {
        assert.isTrue(err.message.indexOf('invalid') >= 0)
      }
    })
    it('should accept require hook in unsafe mode', async function () {
      HookUtils.getHook({
        [Capabilities.SECURITY_ALLOW_UNSAFE]: true
      }, 'hook-as-file')
    })
  })

  describe('simple rest, scripting memory', function () {
    it('should use variables succesful', async function () {
      const myCaps = _getSimpleRestCaps(
        {
          [Capabilities.SIMPLEREST_BODY_TEMPLATE]: {
            FUNCTION_WITHOUT_PARAM: '{{fnc.year}}'
          }
        }
      )
      const driver = new BotDriver(myCaps)
      const container = await driver.Build()
      await container.Start()

      await container.pluginInstance._buildRequest(emptyMsg)

      await container.Clean()
    })

    it('should use env variables succesful', async function () {
      const driver = new BotDriver(_getSimpleRestCaps(
        {
          [Capabilities.SIMPLEREST_BODY_TEMPLATE]: {
            SAMPLE_ENV: '{{#fnc.env}}SAMPLE_ENV{{/fnc.env}}'
          }
        }
      ))
      const container = await driver.Build()
      await container.Start()

      await container.pluginInstance._buildRequest(emptyMsg)

      await container.Clean()
    })
  })

  describe('simple rest, hooks', function () {
    it('should create and use simplerest with function hooks', async function () {
      const driver = new BotDriver(_getSimpleRestCaps(
        {
          [Capabilities.SIMPLEREST_REQUEST_HOOK]: () => 2
        }
      ))

      const compiler = driver.BuildCompiler()
      const container = await driver.Build()
      await container.Start()

      compiler.ReadScript(path.resolve(__dirname, 'convos'), 'dummy.convo.txt')
    })
  })

  describe('logic hook, asserter', function () {
    it('should load asserter from file', async function () {
      const driver = new BotDriver(_getSimpleRestCaps(
        {
          [Capabilities.ASSERTERS]: [
            {
              ref: 'as-file'
            }
          ]
        }
      ))

      driver.BuildCompiler()
    })
  })

  describe('connectors', function () {
    it('should create simplerest', async function () {
      const driver = new BotDriver(myCapsSimpleRest)
      await driver.Build()
    })

    it('should create any connector from file/dir with added botium-connector prefix', async function () {
      const driver = new BotDriver({
        [Capabilities.CONTAINERMODE]: 'as-file',
        [Capabilities.SECURITY_ALLOW_UNSAFE]: false
      })
      await driver.Build()
    })
    it('should create any connector from safedir', async function () {
      const driver = new BotDriver({
        [Capabilities.SAFEDIR]: 'test/security/',
        [Capabilities.CONTAINERMODE]: 'resources/botium-connector-as-file.js',
        [Capabilities.SECURITY_ALLOW_UNSAFE]: false
      })
      await driver.Build()
    })

    it('should create any function connectors', async function () {
      const myCapsFunction = {
        [Capabilities.PROJECTNAME]: 'security.allowUnsafe.connectors',
        [Capabilities.CONTAINERMODE]: functionConnector,
        [Capabilities.SCRIPTING_ENABLE_MEMORY]: true,
        [Capabilities.SECURITY_ALLOW_UNSAFE]: false
      }
      const driver = new BotDriver(myCapsFunction)
      await driver.Build()
    })
  })

  describe('media input', function () {
    it('should fail for downloadMedia global arg without baseDir', async function () {
      const args = {
        downloadMedia: true
      }

      const driver = new BotDriver(_getSimpleRestCaps({
        [Capabilities.USER_INPUTS]: [
          {
            ref: 'MEDIA',
            src: 'MediaInput',
            args
          }
        ]
      }))
      const compiler = driver.BuildCompiler()
      const container = await driver.Build()
      await container.Start()

      try {
        compiler.ReadScript(path.resolve(__dirname, 'convos'), 'media.convo.txt')
        await compiler.convos[0].Run(container)
        assert.fail('should have failed')
      } catch (err) {
        assert.isTrue(err.message.indexOf('Security Error. Using base dir global argument in MediaInput is required') >= 0)
      }
      await container && container.Clean()
    })

    it('should fail for downloadMedia global arg as file', async function () {
      const args = {
        downloadMedia: true
      }

      const driver = new BotDriver(_getSimpleRestCaps({
        [Capabilities.USER_INPUTS]: [
          {
            ref: 'MEDIA',
            src: 'MediaInput',
            args
          }
        ]
      }))
      const compiler = driver.BuildCompiler()
      const container = await driver.Build()
      await container.Start()
      compiler.ReadScript(path.resolve(__dirname, 'convos'), 'mediaasfile.convo.txt')

      try {
        await compiler.convos[0].Run(container)
        assert.fail('should have failed')
      } catch (err) {
        assert.isTrue(err.message.indexOf('Security Error. Using base dir global argument in MediaInput is required') >= 0)
      }
      await container && container.Clean()
    })

    it('should fail for wildcard arg', async function () {
      const driver = new BotDriver(_getSimpleRestCaps())
      const compiler = driver.BuildCompiler()
      const container = await driver.Build()
      await container.Start()
      compiler.ReadScript(path.resolve(__dirname, 'convos'), 'mediawildcard.convo.txt')

      try {
        compiler.ExpandConvos()
        assert.fail('should have failed')
      } catch (err) {
        assert.isTrue(err.message.indexOf('Security Error. Using base dir global argument in MediaInput is required') >= 0)
      }
      await container && container.Clean()
    })
  })
})
