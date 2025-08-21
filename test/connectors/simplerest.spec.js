const path = require('path')
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const assert = chai.assert
const { getAllCapValues } = require('../../src/helpers/CapabilitiesUtils')
const BotDriver = require('../../').BotDriver
const Capabilities = require('../../').Capabilities
const nock = require('nock')

const myCapsGet = {
  [Capabilities.CONTAINERMODE]: 'simplerest',
  [Capabilities.SIMPLEREST_URL]: 'http://my-host.com/api/endpoint/{{msg.messageText}}',
  [Capabilities.SIMPLEREST_HEADERS_TEMPLATE]: {
    HEADER1: 'HEADER1VALUE',
    HEADER2: '{{msg.token}}'
  },
  [Capabilities.SIMPLEREST_RESPONSE_JSONPATH]: ['$']
}
const myCapsPost = {
  [Capabilities.CONTAINERMODE]: 'simplerest',
  [Capabilities.SIMPLEREST_URL]: 'http://my-host.com/api/endpoint',
  [Capabilities.SIMPLEREST_METHOD]: 'POST',
  [Capabilities.SIMPLEREST_HEADERS_TEMPLATE]: {
    HEADER1: 'HEADER1VALUE',
    HEADER2: '{{msg.token}}'
  },
  [Capabilities.SIMPLEREST_BODY_TEMPLATE]: {
    BODY1: 'BODY1VALUE',
    BODY2: '{{msg.messageText}}'
  },
  [Capabilities.SIMPLEREST_RESPONSE_JSONPATH]: ['$']
}
const myCapsFormPost = {
  [Capabilities.CONTAINERMODE]: 'simplerest',
  [Capabilities.SIMPLEREST_URL]: 'http://my-host.com/api/endpoint/{{msg.messageText}}',
  [Capabilities.SIMPLEREST_METHOD]: 'POST',
  [Capabilities.SIMPLEREST_RESPONSE_JSONPATH]: ['$']
}

const myCapsScriptingMemory = {
  [Capabilities.CONTAINERMODE]: 'simplerest',
  [Capabilities.PROJECTNAME]: 'MYPROJECTNAME',
  [Capabilities.TESTSESSIONNAME]: 'MYTESTSESSIONNAME',
  [Capabilities.TESTCASENAME]: 'MYTESTCASENAME',
  CUSTOMCAPABILITY: 'MYCUSTOMCAPABILITY',
  [Capabilities.SIMPLEREST_URL]: 'http://my-host.com/api/endpoint',
  [Capabilities.SIMPLEREST_METHOD]: 'POST',
  [Capabilities.SIMPLEREST_BODY_TEMPLATE]: {
    FUNCTION_WITHOUT_PARAM: '{{fnc.year}}',
    FUNCTION_WITH_PARAM: '{{#fnc.random}}5{{/fnc.random}}',
    FUNCTION_WITH_PARAM_FROM_SCRIPTING_MEMORY: '{{#fnc.random}}{{msg.scriptingMemory.functionArgument}}{{/fnc.random}}',
    SAMPLE_ENV: '{{#fnc.env}}SAMPLE_ENV{{/fnc.env}}',
    VARIABLE: '{{msg.scriptingMemory.variable}}',
    PROJECTNAME: '{{fnc.projectname}}',
    TESTSESSIONNAME: '{{fnc.testsessionname}}',
    TESTCASENAME: '{{fnc.testcasename}}',
    CUSTOMCAPABILITY: '{{#fnc.cap}}CUSTOMCAPABILITY{{/fnc.cap}}'
  },
  [Capabilities.SIMPLEREST_RESPONSE_JSONPATH]: ['$']
}
const myCapsStringTemplate = {
  [Capabilities.CONTAINERMODE]: 'simplerest',
  [Capabilities.SIMPLEREST_URL]: 'http://my-host.com/api/endpoint',
  [Capabilities.SIMPLEREST_METHOD]: 'POST',
  [Capabilities.SIMPLEREST_BODY_TEMPLATE]: '{ "timestamp": "{{fnc.now_DE}}" }',
  [Capabilities.SIMPLEREST_RESPONSE_JSONPATH]: ['$']
}
const myCapsConvAndStepId = {
  [Capabilities.CONTAINERMODE]: 'simplerest',
  [Capabilities.SIMPLEREST_URL]: 'http://my-host.com/api/endpoint',
  [Capabilities.SIMPLEREST_METHOD]: 'POST',
  [Capabilities.SIMPLEREST_CONVERSATION_ID_TEMPLATE]: '{{fnc.timestamp}}',
  [Capabilities.SIMPLEREST_STEP_ID_TEMPLATE]: '{{#fnc.random}}7{{/fnc.random}}',
  [Capabilities.SIMPLEREST_BODY_TEMPLATE]: {
    SESSION_ID: '{{botium.conversationId}}',
    MESSAGE_ID: '{{botium.stepId}}'
  },
  [Capabilities.SIMPLEREST_RESPONSE_JSONPATH]: ['$']
}

const myCapsHookBase = {
  [Capabilities.CONTAINERMODE]: 'simplerest',
  [Capabilities.SIMPLEREST_URL]: 'http://my-host.com/api/endpoint',
  [Capabilities.SIMPLEREST_METHOD]: 'POST',
  [Capabilities.SIMPLEREST_BODY_TEMPLATE]: {
    SESSION_ID: '{{botium.conversationId}}',
    MESSAGE_ID: '{{botium.stepId}}'
  },
  [Capabilities.SIMPLEREST_RESPONSE_JSONPATH]: ['$']
}
const myCapsRequestHookFromString = Object.assign({
  [Capabilities.SIMPLEREST_REQUEST_HOOK]: ({ requestOptions, context }) => {
    let counter = 1
    requestOptions.body = { bodyFieldRequestHook: counter++ }
    context.contextFieldRequestHook = counter
  }
}, myCapsHookBase)
const myCapsRequestHookFromStringInvalid = Object.assign({
  [Capabilities.SIMPLEREST_REQUEST_HOOK]: '!'
}, myCapsHookBase)
const myCapsRequestHookFromFunction = Object.assign({
  [Capabilities.SIMPLEREST_REQUEST_HOOK]: ({ requestOptions, context }) => {
    let counter = 1
    requestOptions.body = { bodyFieldRequestHook: counter++ }
    context.contextFieldRequestHook = counter
  }
}, myCapsHookBase)
const myCapsRequestHookFromModule = Object.assign({
  [Capabilities.SAFEDIR]: './test/connectors/',
  [Capabilities.SIMPLEREST_REQUEST_HOOK]: 'logicHook.js'
}, myCapsHookBase)
const myCapsResponseHook = Object.assign({
  [Capabilities.SIMPLEREST_RESPONSE_HOOK]: ({ botMsg }) => {
    botMsg.messageText = 'message text from hook'
  }
}, myCapsHookBase)

const msg = {
  messageText: 'messageText',
  token: 'myToken',
  scriptingMemory: {
    variable: 'varvalue',
    functionArgument: '7'

  }
}

const msgSpecial = {
  messageText: '{"\n',
  token: '{"\n'
}

const _assertHook = async (myCaps) => {
  const driver = new BotDriver(myCaps)
  const container = await driver.Build()

  await container.Start()
  const request = await container.pluginInstance._buildRequest(msg)

  assert.exists(request.body)
  const body = JSON.parse(request.body)
  assert.exists(body.bodyFieldRequestHook)
  assert.equal(body.bodyFieldRequestHook, 1)

  assert.exists(container.pluginInstance.view)
  assert.exists(container.pluginInstance.view.context)
  assert.exists(container.pluginInstance.view.context.contextFieldRequestHook)
  assert.equal(container.pluginInstance.view.context.contextFieldRequestHook, 2)

  await container.Clean()
}

describe('connectors.simplerest', function () {
  describe('nock', function () {
    it('should build JSON GET url', async function () {
      const caps = {
        [Capabilities.CONTAINERMODE]: 'simplerest',
        [Capabilities.SIMPLEREST_URL]: 'http://my-host.com/api/endpoint/{{msg.messageText}}',
        [Capabilities.SIMPLEREST_HEADERS_TEMPLATE]: {
          HEADER1: 'HEADER1VALUE',
          HEADER2: '{{msg.token}}'
        },
        [Capabilities.SIMPLEREST_RESPONSE_JSONPATH]: ['$'],
        [Capabilities.SIMPLEREST_PING_URL]: 'https://mock.com/pingget',
        [Capabilities.SIMPLEREST_COOKIE_REPLICATION]: false
      }
      const scope = nock('https://mock.com')
        .get('/pingget')
        .reply(200, {
          status: 'ok'
        })
        .persist()
      const driver = new BotDriver(caps)
      const container = await driver.Build()
      const pingConfig = {
        method: 'GET',
        uri: 'https://mock.com/pingget',
        timeout: 10000
      }
      const response = await container.pluginInstance._waitForUrlResponse(pingConfig, 2)
      assert.equal(response.body, '{"status":"ok"}')
      scope.persist(false)
    })

    it('post ping endpoint', async function () {
      const caps = {
        [Capabilities.CONTAINERMODE]: 'simplerest',
        [Capabilities.SIMPLEREST_URL]: 'http://my-host.com/api/endpoint/{{msg.messageText}}',
        [Capabilities.SIMPLEREST_HEADERS_TEMPLATE]: {
          HEADER1: 'HEADER1VALUE',
          HEADER2: '{{msg.token}}'
        },
        [Capabilities.SIMPLEREST_RESPONSE_JSONPATH]: ['$'],
        [Capabilities.SIMPLEREST_PING_URL]: 'https://mock.com/pingpost',
        [Capabilities.SIMPLEREST_PING_RETRIES]: 2,
        [Capabilities.SIMPLEREST_COOKIE_REPLICATION]: false
      }
      const scope = nock('https://mock.com')
        .post('/pingpost', { status: 'ok?' }, null)
        .reply(200, {
          status: 'ok'
        })
        .persist()
      const driver = new BotDriver(caps)
      const container = await driver.Build()
      const body = JSON.stringify({ status: 'ok?' })
      const pingConfig = {
        method: 'POST',
        uri: 'https://mock.com/pingpost',
        body,
        timeout: 100
      }
      const response = await container.pluginInstance._waitForUrlResponse(pingConfig, 2)
      assert.equal(response.body, '{"status":"ok"}')
      scope.persist(false)
    })

    it('post stop endpoint', async function () {
      const caps = {
        [Capabilities.CONTAINERMODE]: 'simplerest',
        [Capabilities.SIMPLEREST_URL]: 'http://my-host.com/api/endpoint/{{msg.messageText}}',
        [Capabilities.SIMPLEREST_HEADERS_TEMPLATE]: {
          HEADER1: 'HEADER1VALUE',
          HEADER2: '{{msg.token}}'
        },
        [Capabilities.SIMPLEREST_RESPONSE_JSONPATH]: ['$'],
        [Capabilities.SIMPLEREST_STOP_URL]: 'https://mock.com/stoppost',
        [Capabilities.SIMPLEREST_STOP_RETRIES]: 2,
        [Capabilities.SIMPLEREST_STOP_VERB]: 'POST',
        [Capabilities.SIMPLEREST_STOP_BODY]: { status: 'ok?' },
        [Capabilities.SIMPLEREST_COOKIE_REPLICATION]: false
      }
      const scope = nock('https://mock.com')
        .post('/stoppost', { status: 'ok?' }, null)
        .reply(200, {
          status: 'ok'
        })
        .persist()
      const driver = new BotDriver(caps)
      const container = await driver.Build()
      const response = await container.pluginInstance._makeCall('SIMPLEREST_STOP')
      assert.equal(response.body.status, 'ok')
      scope.persist(false)
    })

    it('error case can\'t connect', async function () {
      const caps = {
        [Capabilities.CONTAINERMODE]: 'simplerest',
        [Capabilities.SIMPLEREST_URL]: 'http://my-host.com/api/endpoint/{{msg.messageText}}',
        [Capabilities.SIMPLEREST_HEADERS_TEMPLATE]: {
          HEADER1: 'HEADER1VALUE',
          HEADER2: '{{msg.token}}'
        },
        [Capabilities.SIMPLEREST_RESPONSE_JSONPATH]: ['$'],
        [Capabilities.SIMPLEREST_PING_URL]: 'https://mock.com/pingfail',
        [Capabilities.SIMPLEREST_PING_RETRIES]: 2,
        [Capabilities.SIMPLEREST_COOKIE_REPLICATION]: false
      }
      const scope = nock('https://mock.com')
        .get('/pingfail')
        .reply(404, {
          error: 'notOk'
        })
        .persist()
      const driver = new BotDriver(caps)
      const container = await driver.Build()
      const body = JSON.stringify({})
      const pingConfig = {
        method: 'GET',
        uri: 'https://mock.com/pingfail',
        body,
        timeout: 100
      }
      try {
        await container.pluginInstance._waitForUrlResponse(pingConfig, 2)
        assert.fail('expected ping error')
      } catch (err) {
      }
      scope.persist(false)
    })

    it('error case no chat endpoint', async function () {
      const caps = {
        [Capabilities.CONTAINERMODE]: 'simplerest',
        [Capabilities.SIMPLEREST_URL]: 'https://mock2.com/endpoint',
        // [Capabilities.SIMPLEREST_URL]: 'https://jsonplaceholder.typicode.com/posts/123456',
        [Capabilities.SIMPLEREST_RESPONSE_JSONPATH]: ['$.text']
      }
      const scope = nock('https://mock2.com')
        .get('/endpoint')
        .reply(404, {
          error: 'notOk'
        })
        .persist()
      const driver = new BotDriver(caps)
      const container = await driver.Build()
      await container.Start()

      try {
        await container.UserSays({ text: 'hallo' })
        await container.WaitBotSays()
        throw new Error('should have failed')
      } catch (err) {
        assert.isTrue(err.message.includes('notOk'))
      }

      await container.Stop()
      await container.Clean()
      scope.persist(false)
    })

    it('error case chat endpoint timeout', async function () {
      const caps = {
        [Capabilities.CONTAINERMODE]: 'simplerest',
        [Capabilities.SIMPLEREST_TIMEOUT]: 100,
        [Capabilities.SIMPLEREST_URL]: 'https://mock2.com/endpointTimeout',
        [Capabilities.SIMPLEREST_RESPONSE_JSONPATH]: ['$.text']
      }
      const scope = nock('https://mock2.com')
        .get('/endpointTimeout')
        .delayConnection(200)
        .reply(200, {
          status: 'ok'
        })
        .persist()
      const driver = new BotDriver(caps)
      const container = await driver.Build()
      await container.Start()

      try {
        await container.UserSays({ text: 'hallo' })
        await container.WaitBotSays()
        throw new Error('should have failed')
      } catch (err) {
        assert.isTrue(err.message.includes('The operation was aborted due to timeout'))
      }

      await container.Stop()
      await container.Clean()
      scope.persist(false)
    })

    it('should follow redirect', async function () {
      const caps = {
        [Capabilities.CONTAINERMODE]: 'simplerest',
        [Capabilities.SIMPLEREST_URL]: 'https://mock2.com/endpoint1',
        [Capabilities.SIMPLEREST_RESPONSE_JSONPATH]: ['$.text']
      }
      const scope = nock('https://mock2.com')
        .get('/endpoint1')
        .reply(301, undefined, { location: '/endpoint2' })
        .get('/endpoint2')
        .reply(404, {
          error: 'redirectedToNotExisting'
        }).persist()
      const driver = new BotDriver(caps)
      const container = await driver.Build()
      await container.Start()

      try {
        await container.UserSays({ text: 'hallo' })
        await container.WaitBotSays()
        throw new Error('should have failed')
      } catch (err) {
        assert.isTrue(err.message.includes('redirectedToNotExisting'))
      }

      await container.Stop()
      await container.Clean()
      assert.isTrue(scope.isDone())
      scope.persist(false)
    })

    it('should send form parameters', async function () {
      const FORMPARAM = {
        formparam1: 'valueparam1+-%'
      }
      const caps = {
        [Capabilities.CONTAINERMODE]: 'simplerest',
        [Capabilities.SIMPLEREST_METHOD]: 'POST',
        [Capabilities.SIMPLEREST_URL]: 'https://mock2.com/endpointForm',
        [Capabilities.SIMPLEREST_RESPONSE_JSONPATH]: ['$.status']
      }
      const scope = nock('https://mock2.com')
        .post('/endpointForm', 'formparam1=valueparam1%2B-%25')
        .matchHeader('Content-Type', 'application/x-www-form-urlencoded')
        .reply(200, {
          status: 'ok'
        })
        .persist()
      const driver = new BotDriver(caps)
      const container = await driver.Build()
      await container.Start()

      const msg = {
        ADD_FORM_PARAM: FORMPARAM
      }
      await container.UserSays(msg)
      await container.WaitBotSays()

      await container.Clean()
      scope.persist(false)
    })

    it('should store cookies from ping and use for user says request', async function () {
      const caps = {
        [Capabilities.CONTAINERMODE]: 'simplerest',
        [Capabilities.SIMPLEREST_URL]: 'http://mock2.com/endpoint',
        [Capabilities.SIMPLEREST_HEADERS_TEMPLATE]: {
          HEADER1: 'HEADER1VALUE'
        },
        [Capabilities.SIMPLEREST_RESPONSE_JSONPATH]: ['$.text'],
        [Capabilities.SIMPLEREST_PING_URL]: 'http://mock2.com/pingget'
      }
      const scope = nock('http://mock2.com')
        .get('/pingget')
        .reply(200, {
          status: 'ok'
        }, {
          'Set-Cookie': 'cookie1=value1;cookie2=value2'
        }).persist()

      const scope2 = nock('http://mock2.com', {
        reqheaders: {
          cookie: 'cookie1=value1;cookie2=value2',
          header1: 'HEADER1VALUE'
        }
      })
        .get('/endpoint')
        .reply(200, {
          text: 'you called me'
        })
        .persist()
      const driver = new BotDriver(caps)
      const container = await driver.Build()
      await container.Start()

      await container.UserSays({ text: 'hallo' })
      await container.WaitBotSays()

      await container.Stop()
      await container.Clean()
      scope.persist(false)
      scope2.persist(false)
    })
  })

  describe('build', function () {
    it('should build JSON GET url', async function () {
      const myCaps = Object.assign({}, myCapsGet)
      const driver = new BotDriver(myCaps)
      const container = await driver.Build()
      assert.equal(container.pluginInstance.constructor.name, 'SimpleRestContainer')

      await container.Start()
      const request = await container.pluginInstance._buildRequest(msg)

      assert.isUndefined(request.json)
      assert.isObject(request.headers)
      assert.isUndefined(request.body)
      assert.equal(request.headers.HEADER2, msg.token)
      assert.equal(request.uri, 'http://my-host.com/api/endpoint/messageText')

      await container.Clean()
    })

    it('should build JSON GET url from encoded characters', async function () {
      const myCaps = Object.assign({}, myCapsGet)
      myCaps[Capabilities.SIMPLEREST_HEADERS_TEMPLATE] = { ORIG: '{{{msg.messageText}}}' }

      const myMsg = Object.assign({}, msg)
      myMsg.messageText = '&?äüö'

      const driver = new BotDriver(myCaps)
      const container = await driver.Build()
      assert.equal(container.pluginInstance.constructor.name, 'SimpleRestContainer')

      await container.Start()
      const request = await container.pluginInstance._buildRequest(myMsg)
      assert.isUndefined(request.json)
      assert.isObject(request.headers)
      assert.isUndefined(request.body)
      assert.equal(request.headers.ORIG, myMsg.messageText)
      assert.equal(request.uri, 'http://my-host.com/api/endpoint/' + encodeURIComponent(myMsg.messageText))

      await container.Clean()
    })

    it('should build JSON POST request body', async function () {
      const myCaps = Object.assign({}, myCapsPost)
      const driver = new BotDriver(myCaps)
      const container = await driver.Build()
      assert.equal(container.pluginInstance.constructor.name, 'SimpleRestContainer')

      await container.Start()
      const request = await container.pluginInstance._buildRequest(msg)

      assert.isTrue(request.json)
      assert.isObject(request.headers)
      assert.isString(request.body)
      const body = JSON.parse(request.body)
      assert.isObject(body)
      assert.equal(request.headers.HEADER2, msg.token)
      assert.equal(body.BODY2, msg.messageText)

      await container.Clean()
    })

    it('should build JSON POST request body with special chars', async function () {
      const myCaps = Object.assign({}, myCapsPost)
      myCaps[Capabilities.SIMPLEREST_HEADERS_TEMPLATE] = {
        HEADER1: 'HEADER1VALUE',
        HEADER2: '{{#fnc.jsonify}}{{msg.token}}{{/fnc.jsonify}}'
      }

      const driver = new BotDriver(myCaps)
      const container = await driver.Build()
      assert.equal(container.pluginInstance.constructor.name, 'SimpleRestContainer')

      await container.Start()
      const request = await container.pluginInstance._buildRequest(msgSpecial)
      assert.isTrue(request.json)
      assert.isObject(request.headers)
      assert.isString(request.body)
      const body = JSON.parse(request.body)
      assert.isObject(body)
      assert.equal(request.headers.HEADER2, msgSpecial.token)
      assert.equal(body.BODY2, msgSpecial.messageText)

      await container.Clean()
    })

    it('should build JSON POST request body from strings', async function () {
      const myCaps = Object.assign({}, myCapsPost)
      myCaps[Capabilities.SIMPLEREST_BODY_TEMPLATE] = JSON.stringify(myCaps[Capabilities.SIMPLEREST_BODY_TEMPLATE])
      myCaps[Capabilities.SIMPLEREST_HEADERS_TEMPLATE] = JSON.stringify(myCaps[Capabilities.SIMPLEREST_HEADERS_TEMPLATE])

      const driver = new BotDriver(myCaps)
      const container = await driver.Build()
      assert.equal(container.pluginInstance.constructor.name, 'SimpleRestContainer')

      await container.Start()
      const request = await container.pluginInstance._buildRequest(msg)

      assert.isTrue(request.json)
      assert.isObject(request.headers)
      assert.isString(request.body)
      const body = JSON.parse(request.body)
      assert.isObject(body)
      assert.equal(request.headers.HEADER2, msg.token)
      assert.equal(body.BODY2, msg.messageText)

      await container.Clean()
    })

    it('should build url-form-encoded POST request body', async function () {
      const myCaps = Object.assign({}, myCapsPost)
      myCaps[Capabilities.SIMPLEREST_BODY_RAW] = true
      myCaps[Capabilities.SIMPLEREST_HEADERS_TEMPLATE] = { 'Content-Type': 'application/x-www-form-urlencoded' }
      myCaps[Capabilities.SIMPLEREST_BODY_TEMPLATE] = 'BODY1=BODY1VALUE&BODY2={{msg.messageText}}'

      const driver = new BotDriver(myCaps)
      const container = await driver.Build()
      assert.equal(container.pluginInstance.constructor.name, 'SimpleRestContainer')

      await container.Start()
      const request = await container.pluginInstance._buildRequest(msg)
      assert.isObject(request.headers)
      assert.isString(request.body)
      assert.equal(request.body, 'BODY1=BODY1VALUE&BODY2=messageText')

      await container.Clean()
    })

    it('should use scriptingMemory variables', async function () {
      process.env.SAMPLE_ENV = 'SAMPLE_ENV'

      const myCaps = Object.assign({}, myCapsScriptingMemory)
      const driver = new BotDriver(myCaps)
      const container = await driver.Build()

      await container.Start()
      const request = await container.pluginInstance._buildRequest(msg)

      assert.isTrue(request.json)
      assert.isString(request.body)

      const body = JSON.parse(request.body)
      assert.exists(body.FUNCTION_WITHOUT_PARAM)
      assert.equal(body.FUNCTION_WITHOUT_PARAM.length, 4)

      assert.exists(body.FUNCTION_WITH_PARAM)
      assert.equal(body.FUNCTION_WITH_PARAM.length, 5)

      assert.exists(body.FUNCTION_WITH_PARAM_FROM_SCRIPTING_MEMORY)
      assert.equal(body.FUNCTION_WITH_PARAM_FROM_SCRIPTING_MEMORY.length, 7)

      assert.exists(body.SAMPLE_ENV)
      assert.equal(body.SAMPLE_ENV, 'SAMPLE_ENV')

      assert.exists(body.VARIABLE)
      assert.equal(body.VARIABLE, 'varvalue')

      assert.equal(body.PROJECTNAME, 'MYPROJECTNAME')
      assert.equal(body.TESTSESSIONNAME, 'MYTESTSESSIONNAME')
      assert.equal(body.TESTCASENAME, 'MYTESTCASENAME')
      assert.equal(body.CUSTOMCAPABILITY, 'MYCUSTOMCAPABILITY')

      await container.Clean()
    })

    it('should parse string template', async function () {
      const myCaps = Object.assign({}, myCapsStringTemplate)
      const driver = new BotDriver(myCaps)
      const container = await driver.Build()

      await container.Start()
      const request = await container.pluginInstance._buildRequest(msg)

      assert.isTrue(request.json)
      assert.isString(request.body)

      assert.exists(JSON.parse(request.body).timestamp)

      await container.Clean()
    })

    it('should use scriptingMemory variables for step, and conversation id if template is set', async function () {
      const myCaps = Object.assign({}, myCapsConvAndStepId)
      const driver = new BotDriver(myCaps)
      const container = await driver.Build()

      await container.Start()
      const request = await container.pluginInstance._buildRequest(msg)

      assert.isTrue(request.json)
      assert.isString(request.body)

      const body = JSON.parse(request.body)
      assert.exists(body.SESSION_ID)
      assert.equal(body.SESSION_ID.length, 13)

      assert.exists(body.MESSAGE_ID)
      assert.equal(body.MESSAGE_ID.length, 7)

      await container.Clean()
    })

    it('should use request hook, from string', async function () {
      await _assertHook(Object.assign({}, myCapsRequestHookFromString))
    })

    it('should use request hook, from function', async function () {
      await _assertHook(Object.assign({}, myCapsRequestHookFromFunction))
    })

    it('should use request hook, from function2', async function () {
      await _assertHook(Object.assign({}, myCapsRequestHookFromFunction))
    })

    it('should use request hook, from module', async function () {
      await _assertHook(Object.assign({}, myCapsRequestHookFromModule))
    })

    it('should reject request hook, from invalid string', async function () {
      const driver = new BotDriver(myCapsRequestHookFromStringInvalid)
      try {
        await driver.Build()
        assert.fail('it should have failed')
      } catch (err) {
        assert.isTrue(err.message.includes('Hook specification "\'!\'" invalid'))
      }
    })

    it('should add query params from UPDATE_CUSTOM (without "?")', async function () {
      const myCaps = Object.assign({}, myCapsGet)
      const myMsg = Object.assign({}, msg)
      myMsg.ADD_QUERY_PARAM = {
        queryparam1: 'valueparam1',
        queryparam2: '{{msg.messageText}}'
      }

      const driver = new BotDriver(myCaps)
      const container = await driver.Build()
      assert.equal(container.pluginInstance.constructor.name, 'SimpleRestContainer')

      await container.Start()
      const request = await container.pluginInstance._buildRequest(myMsg)
      assert.isObject(request.headers)
      assert.equal(request.uri, 'http://my-host.com/api/endpoint/messageText?queryparam1=valueparam1&queryparam2=messageText')

      await container.Clean()
    })

    it('should add query params from UPDATE_CUSTOM (with "?")', async function () {
      const myCaps = Object.assign({}, myCapsGet)
      myCaps.SIMPLEREST_URL = 'http://my-host.com/api/endpoint/messageText?const1=const1'
      const myMsg = Object.assign({}, msg)
      myMsg.ADD_QUERY_PARAM = {
        queryparam1: 'valueparam1',
        queryparam2: '{{msg.messageText}}'
      }

      const driver = new BotDriver(myCaps)
      const container = await driver.Build()
      assert.equal(container.pluginInstance.constructor.name, 'SimpleRestContainer')

      await container.Start()
      const request = await container.pluginInstance._buildRequest(myMsg)
      assert.isObject(request.headers)
      assert.equal(request.uri, 'http://my-host.com/api/endpoint/messageText?const1=const1&queryparam1=valueparam1&queryparam2=messageText')

      await container.Clean()
    })

    it('should handle non string query params from UPDATE_CUSTOM', async function () {
      const myCaps = Object.assign({}, myCapsGet)
      const myMsg = Object.assign({}, msg)
      const jsonObject = {
        firstName: 'First',
        middleName: '{{msg.messageText}}',
        lastName: 'Last'
      }
      myMsg.ADD_QUERY_PARAM = {
        queryparam1: 'valueparam1',
        queryparam2: jsonObject,
        queryparam3: 11
      }
      jsonObject.middleName = 'messageText'

      const driver = new BotDriver(myCaps)
      const container = await driver.Build()
      assert.equal(container.pluginInstance.constructor.name, 'SimpleRestContainer')

      await container.Start()
      const request = await container.pluginInstance._buildRequest(myMsg)
      assert.isObject(request.headers)
      assert.equal(request.uri,
        `http://my-host.com/api/endpoint/messageText?queryparam1=valueparam1&queryparam2=${encodeURIComponent(JSON.stringify(jsonObject))}&queryparam3=11`)

      await container.Clean()
    })

    it('should add form params from UPDATE_CUSTOM (without "?")', async function () {
      const myCaps = Object.assign({}, myCapsFormPost)
      const myMsg = Object.assign({}, msg)
      myMsg.ADD_FORM_PARAM = {
        formparam1: 'valueparam1',
        formparam2: '{{msg.messageText}}'
      }

      const driver = new BotDriver(myCaps)
      const container = await driver.Build()
      assert.equal(container.pluginInstance.constructor.name, 'SimpleRestContainer')

      await container.Start()
      const request = await container.pluginInstance._buildRequest(myMsg)
      assert.isString(request.body)
      assert.equal(request.body, 'formparam1=valueparam1&formparam2=messageText')

      await container.Clean()
    })

    it('should add header from UPDATE_CUSTOM', async function () {
      const myCaps = Object.assign({}, myCapsGet)
      const myMsg = Object.assign({}, msg)
      myMsg.ADD_HEADER = {
        headerparam1: 'headerparam1',
        headerparam2: '{{msg.messageText}}'
      }

      const driver = new BotDriver(myCaps)
      const container = await driver.Build()
      assert.equal(container.pluginInstance.constructor.name, 'SimpleRestContainer')

      await container.Start()
      const request = await container.pluginInstance._buildRequest(myMsg)
      assert.isObject(request.headers)
      assert.equal(request.headers.headerparam1, 'headerparam1')
      assert.equal(request.headers.headerparam2, 'messageText')

      await container.Clean()
    })

    it('should handle and add non string header from UPDATE_CUSTOM', async function () {
      const myCaps = Object.assign({}, myCapsGet)
      const myMsg = Object.assign({}, msg)
      myMsg.ADD_HEADER = {
        headerparam1: 'headerparam1',
        headerparam2: {
          firstName: 'First',
          middleName: null,
          lastName: 'Last'
        }
      }

      const driver = new BotDriver(myCaps)
      const container = await driver.Build()
      assert.equal(container.pluginInstance.constructor.name, 'SimpleRestContainer')

      await container.Start()
      const request = await container.pluginInstance._buildRequest(myMsg)
      assert.isObject(request.headers)
      assert.equal(request.headers.headerparam1, 'headerparam1')
      assert.isObject(request.headers.headerparam2)
      assert.equal(request.headers.headerparam2.firstName, 'First')
      assert.isNull(request.headers.headerparam2.middleName)
      assert.equal(request.headers.headerparam2.lastName, 'Last')

      await container.Clean()
    })
    it('should parse jsonmessage from sourcedata if it enabled', async function () {
      const msgJSON = {
        sourceData: {
          key: 'value'
        }
      }

      const myCaps = Object.assign({}, myCapsPost)
      myCaps[Capabilities.SIMPLEREST_BODY_FROM_JSON] = true
      myCaps[Capabilities.SIMPLEREST_HEADERS_TEMPLATE] = undefined
      const driver = new BotDriver(myCaps)
      const container = await driver.Build()
      assert.equal(container.pluginInstance.constructor.name, 'SimpleRestContainer')

      await container.Start()
      const request = await container.pluginInstance._buildRequest(msgJSON)

      assert.isTrue(request.json)
      assert.isString(request.body)
      const body = JSON.parse(request.body)
      assert.exists(body.key)
      assert.exists(msgJSON.sourceData)
      assert.exists(msgJSON.sourceData.key)
      assert.equal(body.key, msgJSON.sourceData.key)

      await container.Clean()
    })
    it('should fall back to text message if using jsonmessage from sourcedata is enabled, but sourcedata is not set', async function () {
      const myCaps = Object.assign({}, myCapsPost)
      myCaps[Capabilities.SIMPLEREST_BODY_FROM_JSON] = true
      myCaps[Capabilities.SIMPLEREST_HEADERS_TEMPLATE] = undefined
      const driver = new BotDriver(myCaps)
      const container = await driver.Build()
      assert.equal(container.pluginInstance.constructor.name, 'SimpleRestContainer')

      await container.Start()
      const request = await container.pluginInstance._buildRequest(msg)

      assert.isTrue(request.json)
      assert.isString(request.body)
      const body = JSON.parse(request.body)
      assert.equal(body.BODY2, msg.messageText)

      await container.Clean()
    })
    it('should handle somehow if jsonmessage from sourcedata is enabled, and booth json, and text are set in the user message (impossible state)', async function () {
      // this is not a valid state. In case there is a json as message in a convo.txt, text parser parses it into the sourceData field, and keeps messageText empty
      const msgTextAndJSONIllegal = {
        messageText: 'some user message',
        sourceData: {
          key: 'value'
        }
      }
      const myCaps = Object.assign({}, myCapsPost)
      myCaps[Capabilities.SIMPLEREST_BODY_FROM_JSON] = true
      myCaps[Capabilities.SIMPLEREST_HEADERS_TEMPLATE] = undefined
      const driver = new BotDriver(myCaps)
      const container = await driver.Build()
      assert.equal(container.pluginInstance.constructor.name, 'SimpleRestContainer')

      await container.Start()
      const request = await container.pluginInstance._buildRequest(msgTextAndJSONIllegal)

      // json message from sourcedata wins, but we dont really care wich one. Just no error should be thrown.
      assert.isTrue(request.json)
      assert.isString(request.body)
      const body = JSON.parse(request.body)
      assert.exists(body.key)
      assert.exists(msgTextAndJSONIllegal.sourceData)
      assert.exists(msgTextAndJSONIllegal.sourceData.key)
      assert.equal(body.key, msgTextAndJSONIllegal.sourceData.key)

      await container.Clean()
    })
  })

  describe('processBody', function () {
    it('should process simple response from hook', async function () {
      const myCaps = Object.assign({}, myCapsResponseHook)
      const driver = new BotDriver(myCaps)
      const container = await driver.Build()
      assert.equal(container.pluginInstance.constructor.name, 'SimpleRestContainer')

      await container.Start()
      const msgs = await container.pluginInstance._processBodyAsyncImpl({}, {}, true)

      assert.exists(msgs)
      assert.equal(msgs.length, 1)
      assert.equal(msgs[0].messageText, 'message text from hook')

      await container.Clean()
    })

    it('should ignore empty response', async function () {
      const myCaps = Object.assign({}, myCapsGet, {
        [Capabilities.SIMPLEREST_BODY_JSONPATH]: '$.responses[*]',
        [Capabilities.SIMPLEREST_RESPONSE_JSONPATH]: '$.text',
        [Capabilities.SIMPLEREST_MEDIA_JSONPATH]: '$.media',
        [Capabilities.SIMPLEREST_IGNORE_EMPTY]: true
      })
      const driver = new BotDriver(myCaps)
      const container = await driver.Build()
      assert.equal(container.pluginInstance.constructor.name, 'SimpleRestContainer')

      await container.Start()
      const msgs = await container.pluginInstance._processBodyAsyncImpl({}, {}, true)

      assert.exists(msgs)
      assert.equal(msgs.length, 0)

      await container.Clean()
    })

    it('should not ignore empty response', async function () {
      const myCaps = Object.assign({}, myCapsGet, {
        [Capabilities.SIMPLEREST_RESPONSE_JSONPATH]: '$.text',
        [Capabilities.SIMPLEREST_MEDIA_JSONPATH]: '$.media',
        [Capabilities.SIMPLEREST_IGNORE_EMPTY]: false
      })
      const driver = new BotDriver(myCaps)
      const container = await driver.Build()
      assert.equal(container.pluginInstance.constructor.name, 'SimpleRestContainer')

      await container.Start()
      const msgs = await container.pluginInstance._processBodyAsyncImpl({}, {}, true)

      assert.exists(msgs)
      assert.equal(msgs.length, 1)
      assert.equal(msgs[0].messageText, '')

      await container.Clean()
    })

    it('should not ignore empty response with media', async function () {
      const myCaps = Object.assign({}, myCapsGet, {
        [Capabilities.SIMPLEREST_RESPONSE_JSONPATH]: '$.text',
        [Capabilities.SIMPLEREST_MEDIA_JSONPATH]: '$.media',
        [Capabilities.SIMPLEREST_IGNORE_EMPTY]: true
      })
      const driver = new BotDriver(myCaps)
      const container = await driver.Build()
      assert.equal(container.pluginInstance.constructor.name, 'SimpleRestContainer')

      await container.Start()
      const msgs = await container.pluginInstance._processBodyAsyncImpl({ media: ['hugo.jpg'] }, {}, true)

      assert.exists(msgs)
      assert.equal(msgs.length, 1)
      assert.equal(msgs[0].messageText, '')
      assert.equal(msgs[0].media.length, 1)
      assert.equal(msgs[0].media[0].mediaUri, 'hugo.jpg')

      await container.Clean()
    })

    it('should not ignore empty response with hook NLP data', async function () {
      const myCaps = Object.assign({}, myCapsGet, {
        [Capabilities.SIMPLEREST_RESPONSE_JSONPATH]: '$.text',
        [Capabilities.SIMPLEREST_MEDIA_JSONPATH]: '$.media',
        [Capabilities.SIMPLEREST_RESPONSE_HOOK]: ({ botMsg }) => {
          botMsg.nlp = { intent: { name: 'hugo' } }
        },
        [Capabilities.SIMPLEREST_IGNORE_EMPTY]: true
      })
      const driver = new BotDriver(myCaps)
      const container = await driver.Build()
      assert.equal(container.pluginInstance.constructor.name, 'SimpleRestContainer')

      await container.Start()
      const msgs = await container.pluginInstance._processBodyAsyncImpl({}, {}, true)

      assert.exists(msgs)
      assert.equal(msgs.length, 1)
      assert.equal(msgs[0].messageText, '')
      assert.isNotNull(msgs[0].nlp)

      await container.Clean()
    })

    it('should not ignore empty response with custom hook data', async function () {
      const myCaps = Object.assign({}, myCapsGet, {
        [Capabilities.SIMPLEREST_RESPONSE_JSONPATH]: '$.text',
        [Capabilities.SIMPLEREST_MEDIA_JSONPATH]: '$.media',
        [Capabilities.SIMPLEREST_RESPONSE_HOOK]: ({ botMsg }) => {
          botMsg.someextradata = 'message text from hook'
        },
        [Capabilities.SIMPLEREST_IGNORE_EMPTY]: true
      })
      const driver = new BotDriver(myCaps)
      const container = await driver.Build()
      assert.equal(container.pluginInstance.constructor.name, 'SimpleRestContainer')

      await container.Start()
      const msgs = await container.pluginInstance._processBodyAsyncImpl({}, {}, true)

      assert.exists(msgs)
      assert.equal(msgs.length, 1)
      assert.equal(msgs[0].messageText, '')
      assert.equal(msgs[0].someextradata, 'message text from hook')

      await container.Clean()
    })

    it('should not ignore empty response with messageText filled in response hook', async function () {
      const myCaps = Object.assign({}, myCapsGet, {
        [Capabilities.SIMPLEREST_RESPONSE_JSONPATH]: '$.text',
        [Capabilities.SIMPLEREST_MEDIA_JSONPATH]: '$.media',
        [Capabilities.SIMPLEREST_RESPONSE_HOOK]: ({ botMsg }) => {
          botMsg.messageText = 'message text from hook'
        },
        [Capabilities.SIMPLEREST_IGNORE_EMPTY]: true
      })
      const driver = new BotDriver(myCaps)
      const container = await driver.Build()
      assert.equal(container.pluginInstance.constructor.name, 'SimpleRestContainer')

      await container.Start()
      const msgs = await container.pluginInstance._processBodyAsyncImpl({}, {}, true)

      assert.exists(msgs)
      assert.equal(msgs.length, 1)
      assert.equal(msgs[0].messageText, 'message text from hook')

      await container.Clean()
    })

    it('should process multiple responses', async function () {
      const myCaps = Object.assign({}, myCapsGet, {
        [Capabilities.SIMPLEREST_BODY_JSONPATH]: '$.responses[*]',
        [Capabilities.SIMPLEREST_RESPONSE_JSONPATH]: '$.text',
        [Capabilities.SIMPLEREST_MEDIA_JSONPATH]: '$.media'
      })
      const driver = new BotDriver(myCaps)
      const container = await driver.Build()
      assert.equal(container.pluginInstance.constructor.name, 'SimpleRestContainer')

      await container.Start()
      const msgs = await container.pluginInstance._processBodyAsyncImpl({
        responses: [
          {
            text: 'text 1',
            media: 'http://botium.at/1.jpg'
          },
          {
            text: 'text 2',
            media: 'http://botium.at/2.jpg'
          },
          {
            text: 'text 3',
            media: 'http://botium.at/3.jpg'
          }
        ]
      }, {}, true)

      assert.exists(msgs)
      assert.equal(msgs.length, 3)
      assert.equal(msgs[0].messageText, 'text 1')
      assert.equal(msgs[0].media[0].mediaUri, 'http://botium.at/1.jpg')
      assert.equal(msgs[1].messageText, 'text 2')
      assert.equal(msgs[1].media[0].mediaUri, 'http://botium.at/2.jpg')
      assert.equal(msgs[2].messageText, 'text 3')
      assert.equal(msgs[2].media[0].mediaUri, 'http://botium.at/3.jpg')

      await container.Clean()
    })

    it('should process card responses', async function () {
      const myCaps = Object.assign({}, myCapsGet, {
        [Capabilities.SIMPLEREST_RESPONSE_JSONPATH]: '$.text',
        [Capabilities.SIMPLEREST_CARDS_JSONPATH]: '$.cards',
        [Capabilities.SIMPLEREST_CARD_TEXT_JSONPATH]: '$.title',
        [Capabilities.SIMPLEREST_CARD_SUBTEXT_JSONPATH]: '$.subTitle',
        [Capabilities.SIMPLEREST_CARD_ATTACHMENTS_JSONPATH]: '$.media',
        [Capabilities.SIMPLEREST_CARD_BUTTONS_JSONPATH]: '$.buttons[*]',
        [Capabilities.SIMPLEREST_CARD_BUTTONS_TEXT_SUBJSONPATH]: '$.text',
        [Capabilities.SIMPLEREST_CARD_BUTTONS_PAYLOAD_SUBJSONPATH]: ['$.postback', '$.value']
      })
      const driver = new BotDriver(myCaps)
      const container = await driver.Build()
      assert.equal(container.pluginInstance.constructor.name, 'SimpleRestContainer')

      await container.Start()
      const msgs = await container.pluginInstance._processBodyAsyncImpl({
        cards: [
          {
            title: 'card1',
            subTitle: 'card1 sub',
            media: 'http://botium.at/1.jpg',
            buttons: [
              {
                text: 'c1b1',
                postback: 'c1b1'
              },
              {
                text: 'c1b2',
                postback: 'c1b2'
              }
            ]
          },
          {
            title: 'card2',
            subTitle: 'card2 sub',
            media: 'http://botium.at/2.jpg',
            buttons: [
              {
                text: 'c2b1',
                value: 'c2b1'
              }
            ]
          }
        ]
      }, {}, true)

      assert.exists(msgs)
      assert.equal(msgs.length, 1)
      assert.equal(msgs[0].cards.length, 2)
      assert.equal(msgs[0].cards[0].text, 'card1')
      assert.equal(msgs[0].cards[0].subtext, 'card1 sub')
      assert.equal(msgs[0].cards[0].media.length, 1)
      assert.equal(msgs[0].cards[0].media[0].mediaUri, 'http://botium.at/1.jpg')
      assert.equal(msgs[0].cards[0].media[0].mimeType, 'image/jpeg')
      assert.equal(msgs[0].cards[0].buttons.length, 2)
      assert.equal(msgs[0].cards[0].buttons[0].text, 'c1b1')
      assert.equal(msgs[0].cards[0].buttons[0].payload, 'c1b1')
      assert.equal(msgs[0].cards[0].buttons[1].text, 'c1b2')
      assert.equal(msgs[0].cards[0].buttons[1].payload, 'c1b2')

      assert.equal(msgs[0].cards[1].text, 'card2')
      assert.equal(msgs[0].cards[1].subtext, 'card2 sub')
      assert.equal(msgs[0].cards[1].media.length, 1)
      assert.equal(msgs[0].cards[1].media[0].mediaUri, 'http://botium.at/2.jpg')
      assert.equal(msgs[0].cards[1].media[0].mimeType, 'image/jpeg')
      assert.equal(msgs[0].cards[1].buttons.length, 1)
      assert.equal(msgs[0].cards[1].buttons[0].text, 'c2b1')
      assert.equal(msgs[0].cards[1].buttons[0].payload, 'c2b1')

      await container.Clean()
    })

    it('should process button responses', async function () {
      const myCaps = Object.assign({}, myCapsGet, {
        [Capabilities.SIMPLEREST_RESPONSE_JSONPATH]: '$.text',
        [Capabilities.SIMPLEREST_BUTTONS_JSONPATH]: '$.buttons[*]',
        [Capabilities.SIMPLEREST_BUTTONS_TEXT_SUBJSONPATH]: '$.text',
        [Capabilities.SIMPLEREST_BUTTONS_PAYLOAD_SUBJSONPATH]: ['$.postback', '$.value']
      })
      const driver = new BotDriver(myCaps)
      const container = await driver.Build()
      assert.equal(container.pluginInstance.constructor.name, 'SimpleRestContainer')

      await container.Start()
      const msgs = await container.pluginInstance._processBodyAsyncImpl({
        buttons: [
          {
            text: 'b1',
            postback: 'b1'
          },
          {
            text: 'b2',
            postback: 'b2'
          },
          {
            text: 'b3',
            value: 'b3'
          }
        ]
      }, {}, true)

      assert.exists(msgs)
      assert.equal(msgs.length, 1)
      assert.equal(msgs[0].buttons.length, 3)
      assert.equal(msgs[0].buttons[0].text, 'b1')
      assert.equal(msgs[0].buttons[0].payload, 'b1')
      assert.equal(msgs[0].buttons[1].text, 'b2')
      assert.equal(msgs[0].buttons[1].payload, 'b2')
      assert.equal(msgs[0].buttons[2].text, 'b3')
      assert.equal(msgs[0].buttons[2].payload, 'b3')

      await container.Clean()
    })

    it('should extract intent and confidence', async function () {
      const myCaps = Object.assign({}, myCapsGet, {
        [Capabilities.SIMPLEREST_NLP_INTENT_JSONPATH]: '$.intent.intentname',
        [Capabilities.SIMPLEREST_NLP_CONFIDENCE_JSONPATH]: '$.intent.intentconfidence'
      })
      const driver = new BotDriver(myCaps)
      const container = await driver.Build()
      assert.equal(container.pluginInstance.constructor.name, 'SimpleRestContainer')

      await container.Start()
      const msgs = await container.pluginInstance._processBodyAsyncImpl({
        intent: {
          intentname: 'iname',
          intentconfidence: '50'
        }
      }, {}, true)

      assert.equal(msgs?.length, 1)
      assert.exists(msgs[0].nlp)
      assert.exists(msgs[0].nlp.intent)
      assert.equal(msgs[0].nlp.intent.name, 'iname')
      assert.equal(msgs[0].nlp.intent.confidence, 0.5)

      await container.Clean()
    })

    it('should extract intent list', async function () {
      const myCaps = Object.assign({}, myCapsGet, {
        [Capabilities.SIMPLEREST_NLP_LIST_JSONPATH]: '$.intents',
        [Capabilities.SIMPLEREST_NLP_LIST_INTENT_JSONPATH]: '$.intentname',
        [Capabilities.SIMPLEREST_NLP_LIST_CONFIDENCE_JSONPATH]: '$.intentconfidence'
      })
      const driver = new BotDriver(myCaps)
      const container = await driver.Build()
      assert.equal(container.pluginInstance.constructor.name, 'SimpleRestContainer')

      await container.Start()
      const msgs = await container.pluginInstance._processBodyAsyncImpl({
        intents: [
          {
            intentname: 'iname1',
            intentconfidence: '50'
          },
          {
            intentname: 'iname2',
            intentconfidence: 25
          }
        ]
      }, {}, true)

      assert.equal(msgs?.length, 1)
      assert.exists(msgs[0].nlp)
      assert.exists(msgs[0].nlp.intent)
      assert.equal(msgs[0].nlp.intent.name, 'iname1')
      assert.equal(msgs[0].nlp.intent.confidence, 0.5)
      assert.equal(msgs[0].nlp.intent.intents.length, 1)
      assert.equal(msgs[0].nlp.intent.intents[0].name, 'iname2')
      assert.equal(msgs[0].nlp.intent.intents[0].confidence, 0.25)

      await container.Clean()
    })
  })

  describe('parseCapabilities', function () {
    it('should get multiple cap values from array', async function () {
      const values = getAllCapValues(Capabilities.SIMPLEREST_RESPONSE_JSONPATH, {
        [Capabilities.SIMPLEREST_RESPONSE_JSONPATH]: () => [
          '$.1',
          '$.2'
        ]
      })
      assert.lengthOf(values, 2)
      assert.deepEqual(values, ['$.1', '$.2'])
    })

    it('should get multiple cap values from splitted string', async function () {
      const values = getAllCapValues(Capabilities.SIMPLEREST_RESPONSE_JSONPATH, {
        [Capabilities.SIMPLEREST_RESPONSE_JSONPATH]: () => '$.1,$.2'
      })
      assert.lengthOf(values, 2)
      assert.deepEqual(values, ['$.1', '$.2'])
    })

    it('should get multiple cap values from multiple string keys', async function () {
      const values = getAllCapValues(Capabilities.SIMPLEREST_RESPONSE_JSONPATH, {
        SIMPLEREST_RESPONSE_JSONPATH_0: '$.1,$.2',
        SIMPLEREST_RESPONSE_JSONPATH_1: '$.3,$.4'
      })
      assert.lengthOf(values, 4)
      assert.deepEqual(values, ['$.1', '$.2', '$.3', '$.4'])
    })

    it('should get multiple cap values from mixed keys', async function () {
      const values = getAllCapValues(Capabilities.SIMPLEREST_RESPONSE_JSONPATH, {
        SIMPLEREST_RESPONSE_JSONPATH_0: [
          '$.1',
          '$.2'
        ],
        SIMPLEREST_RESPONSE_JSONPATH_1: '$.3,$.4'
      })
      assert.lengthOf(values, 4)
      assert.deepEqual(values, ['$.1', '$.2', '$.3', '$.4'])
    })
  })

  describe('userresponse', function () {
    beforeEach(async function () {
      this.init = async (caps) => {
        this.scope = nock('https://mock.com')
          .get('/ping').reply(200, { text: 'response from ping' })
          .get('/pingtrash').reply(200, 'asdfasdfasdfasdf')
          .get('/pingencoded').reply(200, { text: JSON.stringify({ prop: 'response from ping' }) })
          .get('/pingstring').reply(200, 'response from ping')
          .get('/start').reply(200, { text: 'response from start' })
          .get('/starttrash').reply(200, 'asdfasdfasdfasdf')
          .get('/startencoded').reply(200, { text: JSON.stringify({ prop: 'response from start' }) })
          .get('/startstring').reply(200, 'response from start')
          .get('/msg').reply(200, { text: 'response from msg' })
          .get('/msgfail').reply(400, { error: 'failure text' })
          .persist()

        const myCaps = Object.assign({
          [Capabilities.CONTAINERMODE]: 'simplerest',
          [Capabilities.WAITFORBOTTIMEOUT]: 1000,
          [Capabilities.SIMPLEREST_URL]: 'http://mock.com/msg',
          [Capabilities.SIMPLEREST_RESPONSE_JSONPATH]: '$.text'
        }, caps)
        this.driver = new BotDriver(myCaps)
        this.compiler = this.driver.BuildCompiler()
        this.container = await this.driver.Build()
        await this.container.Start()
      }
    })

    afterEach(async function () {
      await this.container.Stop()
      await this.container.Clean()
      this.scope.persist(false)
    })

    it('should use response from ping', async function () {
      await this.init({
        [Capabilities.SIMPLEREST_PING_URL]: 'https://mock.com/ping',
        [Capabilities.SIMPLEREST_PING_PROCESS_RESPONSE]: true
      })

      this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'responsefromping.convo.txt')
      const transcript = await this.compiler.convos[0].Run(this.container)
      assert.equal(transcript.steps.length, 1)
      assert.equal(transcript.steps[0].actual.messageText, 'response from ping')
    })

    it('should not use trash response from ping', async function () {
      await this.init({
        [Capabilities.SIMPLEREST_PING_URL]: 'https://mock.com/pingtrash',
        [Capabilities.SIMPLEREST_PING_PROCESS_RESPONSE]: true
      })

      this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'responsefromping.convo.txt')
      try {
        await this.compiler.convos[0].Run(this.container)
        assert.fail('should have failed')
      } catch (err) {
        assert.isTrue(err.message.indexOf('Bot did not respond within') >= 0)
      }
    })

    it('should use parser to parse response from ping', async function () {
      await this.init({
        [Capabilities.SIMPLEREST_PING_URL]: 'https://mock.com/pingencoded',
        [Capabilities.SIMPLEREST_PING_PROCESS_RESPONSE]: true,
        [Capabilities.SIMPLEREST_PARSER_HOOK]: ({ body }) => { body.text = JSON.parse(body.text).prop }
      })

      this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'responsefromping.convo.txt')
      const transcript = await this.compiler.convos[0].Run(this.container)
      assert.equal(transcript.steps.length, 1)
      assert.equal(transcript.steps[0].actual.messageText, 'response from ping')
    })

    it('should use parser to parse string from ping', async function () {
      await this.init({
        [Capabilities.SIMPLEREST_PING_URL]: 'https://mock.com/pingstring',
        [Capabilities.SIMPLEREST_PING_PROCESS_RESPONSE]: true,
        [Capabilities.SIMPLEREST_PARSER_HOOK]: ({ changeBody, body }) => changeBody({ text: body })
      })

      this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'responsefromping.convo.txt')
      const transcript = await this.compiler.convos[0].Run(this.container)
      assert.equal(transcript.steps.length, 1)
      assert.equal(transcript.steps[0].actual.messageText, 'response from ping')
    })

    it('should use response from start', async function () {
      await this.init({
        [Capabilities.SIMPLEREST_START_URL]: 'https://mock.com/start',
        [Capabilities.SIMPLEREST_START_PROCESS_RESPONSE]: true
      })

      this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'responsefromstart.convo.txt')
      const transcript = await this.compiler.convos[0].Run(this.container)
      assert.equal(transcript.steps.length, 1)
      assert.equal(transcript.steps[0].actual.messageText, 'response from start')
    })

    it('should not use trash response from start', async function () {
      await this.init({
        [Capabilities.SIMPLEREST_START_URL]: 'https://mock.com/starttrash',
        [Capabilities.SIMPLEREST_START_PROCESS_RESPONSE]: true
      })

      this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'responsefromstart.convo.txt')
      try {
        await this.compiler.convos[0].Run(this.container)
        assert.fail('should have failed')
      } catch (err) {
        assert.isTrue(err.message.indexOf('Bot did not respond within') >= 0)
      }
    })

    it('should use parser to parse response from ping 2', async function () {
      await this.init({
        [Capabilities.SIMPLEREST_START_URL]: 'https://mock.com/startencoded',
        [Capabilities.SIMPLEREST_START_PROCESS_RESPONSE]: true,
        [Capabilities.SIMPLEREST_PARSER_HOOK]: ({ body }) => { body.text = JSON.parse(body.text).prop }
      })

      this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'responsefromstart.convo.txt')
      const transcript = await this.compiler.convos[0].Run(this.container)
      assert.equal(transcript.steps.length, 1)
      assert.equal(transcript.steps[0].actual.messageText, 'response from start')
    })

    it('should use parser to parse string from ping 2', async function () {
      await this.init({
        [Capabilities.SIMPLEREST_START_URL]: 'https://mock.com/startstring',
        [Capabilities.SIMPLEREST_START_PROCESS_RESPONSE]: true,
        [Capabilities.SIMPLEREST_PARSER_HOOK]: ({ changeBody, body }) => changeBody({ text: body })
      })

      this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'responsefromstart.convo.txt')
      const transcript = await this.compiler.convos[0].Run(this.container)
      assert.equal(transcript.steps.length, 1)
      assert.equal(transcript.steps[0].actual.messageText, 'response from start')
    })

    it('should use error body content', async function () {
      await this.init({
        [Capabilities.SIMPLEREST_URL]: 'https://mock.com/msgfail'
      })

      this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'hello.convo.txt')
      try {
        await this.compiler.convos[0].Run(this.container)
      } catch (err) {
        assert.isTrue(err.message.indexOf('failure text') >= 0)
      }
    })
  })

  describe('inbound', function () {
    it('should accept inbound message with matching jsonpath', async function () {
      const myCaps = Object.assign({}, myCapsGet)
      myCaps[Capabilities.SIMPLEREST_RESPONSE_JSONPATH] = '$.text'
      myCaps[Capabilities.SIMPLEREST_INBOUND_SELECTOR_JSONPATH] = '$.body.conversationId'
      myCaps[Capabilities.SIMPLEREST_INBOUND_SELECTOR_VALUE] = '{{botium.conversationId}}'

      const driver = new BotDriver(myCaps)
      const container = await driver.Build()
      await container.Start()

      let resultResolve, resultReject
      const result = new Promise((resolve, reject) => {
        resultResolve = resolve
        resultReject = reject
      })

      container.pluginInstance.queueBotSays = (botMsg) => {
        try {
          assert.isDefined(botMsg)
          assert.isDefined(botMsg.sourceData.conversationId)
          container.Clean().then(resultResolve)
        } catch (err) {
          resultReject(err)
        }
      }
      container.pluginInstance._processInboundEvent({
        originalUrl: '/api/inbound/xxxx',
        originalMethod: 'POST',
        body: {
          conversationId: container.pluginInstance.view.botium.conversationId,
          text: 'hallo'
        }
      })

      return result
    })

    it('should reorder multiple inbound message with order jsonpath', async function () {
      const myCaps = Object.assign({}, myCapsGet)
      myCaps[Capabilities.SIMPLEREST_RESPONSE_JSONPATH] = '$.text'
      myCaps[Capabilities.SIMPLEREST_INBOUND_SELECTOR_JSONPATH] = '$.body.conversationId'
      myCaps[Capabilities.SIMPLEREST_INBOUND_SELECTOR_VALUE] = '{{botium.conversationId}}'
      myCaps[Capabilities.SIMPLEREST_INBOUND_ORDER_UNSETTLED_EVENTS_JSONPATH] = '$.body.timestamp'
      myCaps[Capabilities.SIMPLEREST_INBOUND_DEBOUNCE_TIMEOUT] = 300

      const driver = new BotDriver(myCaps)
      const container = await driver.Build()
      await container.Start()

      let resultResolve, resultReject
      const result = new Promise((resolve, reject) => {
        resultResolve = resolve
        resultReject = reject
      })

      let i = 0
      container.pluginInstance.queueBotSays = (botMsg) => {
        try {
          if (i === 0) {
            assert.equal(botMsg.messageText, 'Message1')
            container.Clean().then(resultResolve)
          } else if (i === 1) {
            assert.equal(botMsg.messageText, 'Message2')
            container.Clean().then(resultResolve)
          }
          i++
        } catch (err) {
          resultReject(err)
        }
      }

      const now = Date.now()
      const littlebitLater = now + 100

      container.pluginInstance._processInboundEvent({
        originalUrl: '/api/inbound/xxxx',
        originalMethod: 'POST',
        body: {
          conversationId: container.pluginInstance.view.botium.conversationId,
          timestamp: littlebitLater,
          text: 'Message2'
        }
      })

      container.pluginInstance._processInboundEvent({
        originalUrl: '/api/inbound/xxxx',
        originalMethod: 'POST',
        body: {
          conversationId: container.pluginInstance.view.botium.conversationId,
          timestamp: now,
          text: 'Message1'
        }
      })

      return result
    })
  })

  describe('polling', function () {
    it('should poll HTTP url', async function () {
      const caps = {
        [Capabilities.CONTAINERMODE]: 'simplerest',
        [Capabilities.SIMPLEREST_URL]: () => 'https://mock.com/endpoint',
        [Capabilities.SIMPLEREST_RESPONSE_JSONPATH]: () => ['$.text'],
        [Capabilities.SIMPLEREST_POLL_URL]: () => 'https://mock.com/poll'
      }
      const scope = nock('https://mock.com')
        .get('/endpoint')
        .reply(200, {
          text: 'you called me'
        })
        .get('/poll')
        .reply(200, {
          text: 'you called me'
        })
        .persist()

      const driver = new BotDriver(caps)
      const container = await driver.Build()
      await container.Start()

      await container.UserSays({ text: 'hallo' })
      await container.WaitBotSays()
      await container.WaitBotSays()

      await container.Stop()
      await container.Clean()
      scope.persist(false)
    }).timeout(5000)
    it('should use request hook for polling', async function () {
      const caps = {
        [Capabilities.CONTAINERMODE]: 'simplerest',
        [Capabilities.SIMPLEREST_URL]: () => 'https://mock.com/endpoint',
        [Capabilities.SIMPLEREST_RESPONSE_JSONPATH]: () => ['$.text'],
        [Capabilities.SIMPLEREST_POLL_URL]: () => 'https://mock.com/poll',
        [Capabilities.SIMPLEREST_POLL_REQUEST_HOOK]: ({ requestOptions }) => { requestOptions.uri = 'https://mock.com/_from_hook' }
      }
      const scope = nock('https://mock.com')
        .get('/endpoint')
        .reply(200, {
          text: 'you called me'
        })
        .get('/_from_hook')
        .reply(200, {
          text: 'you called me'
        })
        .persist()

      const driver = new BotDriver(caps)
      const container = await driver.Build()
      await container.Start()

      await container.UserSays({ text: 'hallo' })
      await container.WaitBotSays()
      await container.WaitBotSays()

      await container.Stop()
      await container.Clean()
      scope.persist(false)
    }).timeout(5000)
  })

  describe('flow', function () {
    it('should ignore matching message', async function () {
      const caps = {
        [Capabilities.CONTAINERMODE]: 'simplerest',
        [Capabilities.WAITFORBOTTIMEOUT]: 1000,
        [Capabilities.SIMPLEREST_URL]: 'https://mock.com/flowignore',
        [Capabilities.SIMPLEREST_RESPONSE_JSONPATH]: ['$.text'],
        [Capabilities.SIMPLEREST_CONTEXT_IGNORE_JSONPATH]: '$.ignore',
        [Capabilities.SIMPLEREST_CONTEXT_IGNORE_MATCH]: 'Y'
      }
      const scope = nock('https://mock.com')
        .get('/flowignore').reply(200, { text: 'ignore it', ignore: 'Y' })

      const driver = new BotDriver(caps)
      const container = await driver.Build()
      await container.Start()

      await container.UserSays({ text: 'hallo' })
      try {
        await container.WaitBotSays()
        assert.fail('expected response to be ignored')
      } catch (err) {
        assert.equal(err.message, 'Bot did not respond within 1s')
      }
      await container.Stop()
      await container.Clean()
      scope.persist(false)
    })

    it('should skip matching message', async function () {
      const caps = {
        [Capabilities.CONTAINERMODE]: 'simplerest',
        [Capabilities.SIMPLEREST_URL]: 'https://mock.com/flowskip',
        [Capabilities.SIMPLEREST_RESPONSE_JSONPATH]: ['$.text'],
        [Capabilities.SIMPLEREST_CONTEXT_SKIP_JSONPATH]: '$.skip',
        [Capabilities.SIMPLEREST_CONTEXT_SKIP_MATCH]: 'Y'
      }
      const scope = nock('https://mock.com')
        .get('/flowskip').reply(200, { text: 'skip it', skip: 'Y' })
        .get('/flowskip').reply(200, { text: 'not skip it', skip: 'N' })

      const driver = new BotDriver(caps)
      const container = await driver.Build()
      await container.Start()

      await container.UserSays({ text: 'hello' })
      const botMsg = await container.WaitBotSays()
      assert.equal(botMsg.messageText, 'not skip it')

      await container.Stop()
      await container.Clean()
      scope.persist(false)
    })

    it('should continue on matching message', async function () {
      const caps = {
        [Capabilities.CONTAINERMODE]: 'simplerest',
        [Capabilities.SIMPLEREST_URL]: 'https://mock.com/flowcontinue',
        [Capabilities.SIMPLEREST_RESPONSE_JSONPATH]: ['$.text'],
        [Capabilities.SIMPLEREST_CONTEXT_CONTINUE_JSONPATH]: '$.continue',
        [Capabilities.SIMPLEREST_CONTEXT_CONTINUE_MATCH]: 'Y'
      }
      const scope = nock('https://mock.com')
        .get('/flowcontinue').reply(200, { text: 'continue it', continue: 'Y' })
        .get('/flowcontinue').reply(200, { text: 'not continue it', continue: 'N' })

      const driver = new BotDriver(caps)
      const container = await driver.Build()
      await container.Start()

      await container.UserSays({ text: 'hello' })
      const botMsg1 = await container.WaitBotSays()
      assert.equal(botMsg1.messageText, 'continue it')
      const botMsg2 = await container.WaitBotSays()
      assert.equal(botMsg2.messageText, 'not continue it')

      await container.Stop()
      await container.Clean()
      scope.persist(false)
    })
  })
})
