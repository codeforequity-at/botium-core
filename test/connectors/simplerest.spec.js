const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const assert = chai.assert
const BotDriver = require('../../').BotDriver
const Capabilities = require('../../').Capabilities
const SimpleRestContainer = require('../../src/containers/plugins/SimpleRestContainer')
const nock = require('nock')

const myCapsGet = {
  [Capabilities.CONTAINERMODE]: 'simplerest',
  [Capabilities.SIMPLEREST_URL]: 'http://my-host.com/api/endpoint/{{msg.messageText}}',
  [Capabilities.SIMPLEREST_HEADERS_TEMPLATE]: { HEADER1: 'HEADER1VALUE', HEADER2: '{{msg.token}}' },
  [Capabilities.SIMPLEREST_RESPONSE_JSONPATH]: ['$']
}
const myCapsPost = {
  [Capabilities.CONTAINERMODE]: 'simplerest',
  [Capabilities.SIMPLEREST_URL]: 'http://my-host.com/api/endpoint',
  [Capabilities.SIMPLEREST_METHOD]: 'POST',
  [Capabilities.SIMPLEREST_HEADERS_TEMPLATE]: { HEADER1: 'HEADER1VALUE', HEADER2: '{{msg.token}}' },
  [Capabilities.SIMPLEREST_BODY_TEMPLATE]: { BODY1: 'BODY1VALUE', BODY2: '{{msg.messageText}}' },
  [Capabilities.SIMPLEREST_RESPONSE_JSONPATH]: ['$']
}
const myCapsScriptingMemory = {
  [Capabilities.CONTAINERMODE]: 'simplerest',
  [Capabilities.SIMPLEREST_URL]: 'http://my-host.com/api/endpoint',
  [Capabilities.SIMPLEREST_METHOD]: 'POST',
  [Capabilities.SIMPLEREST_BODY_TEMPLATE]: {
    FUNCTION_WITHOUT_PARAM: '{{fnc.year}}',
    FUNCTION_WITH_PARAM: '{{#fnc.random}}5{{/fnc.random}}',
    FUNCTION_WITH_PARAM_FROM_SCRIPTING_MEMORY: '{{#fnc.random}}{{msg.scriptingMemory.functionArgument}}{{/fnc.random}}',
    USING_CODE: '{{#fnc.func}}1 + 2{{/fnc.func}}',
    VARIABLE: '{{msg.scriptingMemory.variable}}'
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
  [Capabilities.SIMPLEREST_BODY_TEMPLATE]: { SESSION_ID: '{{botium.conversationId}}', MESSAGE_ID: '{{botium.stepId}}' },
  [Capabilities.SIMPLEREST_RESPONSE_JSONPATH]: ['$']
}

const myCapsHookBase = {
  [Capabilities.CONTAINERMODE]: 'simplerest',
  [Capabilities.SIMPLEREST_URL]: 'http://my-host.com/api/endpoint',
  [Capabilities.SIMPLEREST_METHOD]: 'POST',
  [Capabilities.SIMPLEREST_BODY_TEMPLATE]: { SESSION_ID: '{{botium.conversationId}}', MESSAGE_ID: '{{botium.stepId}}' },
  [Capabilities.SIMPLEREST_RESPONSE_JSONPATH]: ['$']
}
const myCapsRequestHookFromString = Object.assign({
  [Capabilities.SIMPLEREST_REQUEST_HOOK]: `
    let counter = 1
    requestOptions.body = {bodyFieldRequestHook: counter++}
    context.contextFieldRequestHook = counter
  `
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
  [Capabilities.SIMPLEREST_REQUEST_HOOK]: 'test/connectors/logicHook.js'
}, myCapsHookBase)
const myCapsResponseHook = Object.assign({
  [Capabilities.SIMPLEREST_RESPONSE_HOOK]: `
    botMsg.messageText = 'message text from hook'  
  `
}, myCapsHookBase)

const msg = {
  messageText: 'messageText',
  token: 'myToken',
  scriptingMemory: {
    variable: 'value',
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
  assert.exists(request.body.bodyFieldRequestHook)
  assert.equal(request.body.bodyFieldRequestHook, 1)

  assert.exists(container.pluginInstance.view)
  assert.exists(container.pluginInstance.view.context)
  assert.exists(container.pluginInstance.view.context.contextFieldRequestHook)
  assert.equal(container.pluginInstance.view.context.contextFieldRequestHook, 2)

  await container.Clean()
}

describe('connectors.simplerest.nock', function () {
  it('should build JSON GET url', async () => {
    const caps = {
      [Capabilities.CONTAINERMODE]: 'simplerest',
      [Capabilities.SIMPLEREST_URL]: 'http://my-host.com/api/endpoint/{{msg.messageText}}',
      [Capabilities.SIMPLEREST_HEADERS_TEMPLATE]: { HEADER1: 'HEADER1VALUE', HEADER2: '{{msg.token}}' },
      [Capabilities.SIMPLEREST_RESPONSE_JSONPATH]: ['$'],
      [Capabilities.SIMPLEREST_PING_URL]: 'https://mock.com/pingget'
    }
    const scope = nock('https://mock.com')
      .get('/pingget')
      .reply(200, {
        status: 'ok'
      })
      .persist()
    const driver = new BotDriver(caps)
    const container = await driver.Build()
    const body = JSON.stringify({})
    const pingConfig = {
      method: 'GET',
      uri: 'https://mock.com/pingget',
      body: body,
      timeout: 10000
    }
    const responseBody = await container.pluginInstance._waitForPingUrl(pingConfig, 2)
    assert.equal(responseBody, '{"status":"ok"}')
    scope.persist(false)
  })
  it('post ping endpoint', async () => {
    const caps = {
      [Capabilities.CONTAINERMODE]: 'simplerest',
      [Capabilities.SIMPLEREST_URL]: 'http://my-host.com/api/endpoint/{{msg.messageText}}',
      [Capabilities.SIMPLEREST_HEADERS_TEMPLATE]: { HEADER1: 'HEADER1VALUE', HEADER2: '{{msg.token}}' },
      [Capabilities.SIMPLEREST_RESPONSE_JSONPATH]: ['$'],
      [Capabilities.SIMPLEREST_PING_URL]: 'https://mock.com/pingpost',
      [Capabilities.SIMPLEREST_PING_RETRIES]: 2

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
      body: body,
      timeout: 100
    }
    const responseBody = await container.pluginInstance._waitForPingUrl(pingConfig, 2)
    assert.equal(responseBody, '{"status":"ok"}')
    scope.persist(false)
  })
  it('error case can\'t connect', async () => {
    const caps = {
      [Capabilities.CONTAINERMODE]: 'simplerest',
      [Capabilities.SIMPLEREST_URL]: 'http://my-host.com/api/endpoint/{{msg.messageText}}',
      [Capabilities.SIMPLEREST_HEADERS_TEMPLATE]: { HEADER1: 'HEADER1VALUE', HEADER2: '{{msg.token}}' },
      [Capabilities.SIMPLEREST_RESPONSE_JSONPATH]: ['$'],
      [Capabilities.SIMPLEREST_PING_URL]: 'https://mock.com/pingfail',
      [Capabilities.SIMPLEREST_PING_RETRIES]: 2
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
      body: body,
      timeout: 100
    }
    try {
      await container.pluginInstance._waitForPingUrl(pingConfig, 2)
      assert.fail('expected ping error')
    } catch (err) {
    }
    scope.persist(false)
  })
})

describe('connectors.simplerest.build', function () {
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
    assert.isObject(request.body)
    assert.equal(request.headers.HEADER2, msg.token)
    assert.equal(request.body.BODY2, msg.messageText)

    await container.Clean()
  })
  it('should build JSON POST request body with special chars', async function () {
    const myCaps = Object.assign({}, myCapsPost)
    myCaps[Capabilities.SIMPLEREST_HEADERS_TEMPLATE] = { HEADER1: 'HEADER1VALUE', HEADER2: '{{#fnc.jsonify}}{{msg.token}}{{/fnc.jsonify}}' }

    const driver = new BotDriver(myCaps)
    const container = await driver.Build()
    assert.equal(container.pluginInstance.constructor.name, 'SimpleRestContainer')

    await container.Start()
    const request = await container.pluginInstance._buildRequest(msgSpecial)
    assert.isTrue(request.json)
    assert.isObject(request.headers)
    assert.isObject(request.body)
    assert.equal(request.headers.HEADER2, msgSpecial.token)
    assert.equal(request.body.BODY2, msgSpecial.messageText)

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
    assert.isObject(request.body)
    assert.equal(request.headers.HEADER2, msg.token)
    assert.equal(request.body.BODY2, msg.messageText)

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
    const myCaps = Object.assign({}, myCapsScriptingMemory)
    const driver = new BotDriver(myCaps)
    const container = await driver.Build()

    await container.Start()
    const request = await container.pluginInstance._buildRequest(msg)

    assert.isTrue(request.json)
    assert.exists(request.body)

    assert.exists(request.body.FUNCTION_WITHOUT_PARAM)
    assert.equal(request.body.FUNCTION_WITHOUT_PARAM.length, 4)

    assert.exists(request.body.FUNCTION_WITH_PARAM)
    assert.equal(request.body.FUNCTION_WITH_PARAM.length, 5)

    assert.exists(request.body.FUNCTION_WITH_PARAM_FROM_SCRIPTING_MEMORY)
    assert.equal(request.body.FUNCTION_WITH_PARAM_FROM_SCRIPTING_MEMORY.length, 7)

    assert.exists(request.body.USING_CODE)
    assert.equal(request.body.USING_CODE, 3)

    assert.exists(request.body.VARIABLE)
    assert.equal(request.body.VARIABLE, 'value')

    await container.Clean()
  })
  it('should parse string template', async function () {
    const myCaps = Object.assign({}, myCapsStringTemplate)
    const driver = new BotDriver(myCaps)
    const container = await driver.Build()

    await container.Start()
    const request = await container.pluginInstance._buildRequest(msg)

    assert.isTrue(request.json)
    assert.exists(request.body)

    assert.exists(request.body.timestamp)

    await container.Clean()
  })
  it('should use scriptingMemory variables for step, and conversation id if template is set', async function () {
    const myCaps = Object.assign({}, myCapsConvAndStepId)
    const driver = new BotDriver(myCaps)
    const container = await driver.Build()

    await container.Start()
    const request = await container.pluginInstance._buildRequest(msg)

    assert.isTrue(request.json)
    assert.exists(request.body)

    assert.exists(request.body.SESSION_ID)
    assert.equal(request.body.SESSION_ID.length, 13)

    assert.exists(request.body.MESSAGE_ID)
    assert.equal(request.body.MESSAGE_ID.length, 7)

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
  it('should use request hook, from invalid string', async function () {
    const driver = new BotDriver(myCapsRequestHookFromStringInvalid)
    try {
      await driver.Build()
      assert.fail('it should have failed')
    } catch (err) {
      assert.isTrue(err.message.includes('Cant load hook, syntax is not valid'))
    }
  })
})
describe('connectors.simplerest.processBody', function () {
  it('should process simple response from hook', async function () {
    const myCaps = Object.assign({}, myCapsResponseHook)
    const driver = new BotDriver(myCaps)
    const container = await driver.Build()
    assert.equal(container.pluginInstance.constructor.name, 'SimpleRestContainer')

    await container.Start()
    const msgs = await container.pluginInstance._processBodyAsyncImpl({}, true)

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
    }, true)

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
})
describe('connectors.simplerest.parseCapabilities', function () {
  it('should get multiple cap values from array', async function () {
    const container = new SimpleRestContainer({
      caps: {
        [Capabilities.SIMPLEREST_RESPONSE_JSONPATH]: [
          '$.1',
          '$.2'
        ]
      }
    })
    const values = container._getAllCapValues(Capabilities.SIMPLEREST_RESPONSE_JSONPATH)
    assert.lengthOf(values, 2)
    assert.deepEqual(values, ['$.1', '$.2'])
  })
  it('should get multiple cap values from splitted string', async function () {
    const container = new SimpleRestContainer({
      caps: {
        [Capabilities.SIMPLEREST_RESPONSE_JSONPATH]: '$.1,$.2'
      }
    })
    const values = container._getAllCapValues(Capabilities.SIMPLEREST_RESPONSE_JSONPATH)
    assert.lengthOf(values, 2)
    assert.deepEqual(values, ['$.1', '$.2'])
  })
  it('should get multiple cap values from multiple string keys', async function () {
    const container = new SimpleRestContainer({
      caps: {
        SIMPLEREST_RESPONSE_JSONPATH_0: '$.1,$.2',
        SIMPLEREST_RESPONSE_JSONPATH_1: '$.3,$.4'
      }
    })
    const values = container._getAllCapValues(Capabilities.SIMPLEREST_RESPONSE_JSONPATH)
    assert.lengthOf(values, 4)
    assert.deepEqual(values, ['$.1', '$.2', '$.3', '$.4'])
  })
  it('should get multiple cap values from mixed keys', async function () {
    const container = new SimpleRestContainer({
      caps: {
        SIMPLEREST_RESPONSE_JSONPATH_0: [
          '$.1',
          '$.2'
        ],
        SIMPLEREST_RESPONSE_JSONPATH_1: '$.3,$.4'
      }
    })
    const values = container._getAllCapValues(Capabilities.SIMPLEREST_RESPONSE_JSONPATH)
    assert.lengthOf(values, 4)
    assert.deepEqual(values, ['$.1', '$.2', '$.3', '$.4'])
  })
})

describe('connectors.simplerest.inbound', function () {
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
})

describe('connectors.simplerest.polling', function () {
  it('should poll HTTP url', async () => {
    const caps = {
      [Capabilities.CONTAINERMODE]: 'simplerest',
      [Capabilities.SIMPLEREST_URL]: 'https://mock.com/endpoint',
      [Capabilities.SIMPLEREST_RESPONSE_JSONPATH]: ['$.text'],
      [Capabilities.SIMPLEREST_POLL_URL]: 'https://mock.com/poll'
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
})
