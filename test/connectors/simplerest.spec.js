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
    USING_CODE: '{{#fnc.func}}1 + 2{{/fnc.func}}',
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
    const responseBody = await container.pluginInstance._waitForUrlResponse(pingConfig, 2)
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
    const responseBody = await container.pluginInstance._waitForUrlResponse(pingConfig, 2)
    assert.equal(responseBody, '{"status":"ok"}')
    scope.persist(false)
  })
  it('post stop endpoint', async () => {
    const caps = {
      [Capabilities.CONTAINERMODE]: 'simplerest',
      [Capabilities.SIMPLEREST_URL]: 'http://my-host.com/api/endpoint/{{msg.messageText}}',
      [Capabilities.SIMPLEREST_HEADERS_TEMPLATE]: { HEADER1: 'HEADER1VALUE', HEADER2: '{{msg.token}}' },
      [Capabilities.SIMPLEREST_RESPONSE_JSONPATH]: ['$'],
      [Capabilities.SIMPLEREST_STOP_URL]: 'https://mock.com/stoppost',
      [Capabilities.SIMPLEREST_STOP_RETRIES]: 2,
      [Capabilities.SIMPLEREST_STOP_VERB]: 'POST',
      [Capabilities.SIMPLEREST_STOP_BODY]: { status: 'ok?' }
    }
    const scope = nock('https://mock.com')
      .post('/stoppost', { status: 'ok?' }, null)
      .reply(200, {
        status: 'ok'
      })
      .persist()
    const driver = new BotDriver(caps)
    const container = await driver.Build()
    const responseBody = await container.pluginInstance._makeCall('SIMPLEREST_STOP')
    assert.equal(responseBody.status, 'ok')
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
      await container.pluginInstance._waitForUrlResponse(pingConfig, 2)
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
    process.env.SAMPLE_ENV = 'SAMPLE_ENV'

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

    assert.exists(request.body.SAMPLE_ENV)
    assert.equal(request.body.SAMPLE_ENV, 'SAMPLE_ENV')

    assert.exists(request.body.USING_CODE)
    assert.equal(request.body.USING_CODE, 3)

    assert.exists(request.body.VARIABLE)
    assert.equal(request.body.VARIABLE, 'varvalue')

    assert.equal(request.body.PROJECTNAME, 'MYPROJECTNAME')
    assert.equal(request.body.TESTSESSIONNAME, 'MYTESTSESSIONNAME')
    assert.equal(request.body.TESTCASENAME, 'MYTESTCASENAME')
    assert.equal(request.body.CUSTOMCAPABILITY, 'MYCUSTOMCAPABILITY')

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
  it('should query params from UPDATE_CUSTOM (without "?")', async function () {
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
  it('should query params from UPDATE_CUSTOM (with "?")', async function () {
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
    const jsonObject = { firstName: 'First', middleName: '{{msg.messageText}}', lastName: 'Last' }
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
      headerparam2: { firstName: 'First', middleName: null, lastName: 'Last' }
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
    const msgs = await container.pluginInstance._processBodyAsyncImpl({}, true)

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
    const msgs = await container.pluginInstance._processBodyAsyncImpl({}, true)

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
    const msgs = await container.pluginInstance._processBodyAsyncImpl({ media: ['hugo.jpg'] }, true)

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
      [Capabilities.SIMPLEREST_RESPONSE_HOOK]: `
        botMsg.nlp = { intent: { name: 'hugo' } }
      `,
      [Capabilities.SIMPLEREST_IGNORE_EMPTY]: true
    })
    const driver = new BotDriver(myCaps)
    const container = await driver.Build()
    assert.equal(container.pluginInstance.constructor.name, 'SimpleRestContainer')

    await container.Start()
    const msgs = await container.pluginInstance._processBodyAsyncImpl({}, true)

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
      [Capabilities.SIMPLEREST_RESPONSE_HOOK]: `
        botMsg.someextradata = 'message text from hook'
      `,
      [Capabilities.SIMPLEREST_IGNORE_EMPTY]: true
    })
    const driver = new BotDriver(myCaps)
    const container = await driver.Build()
    assert.equal(container.pluginInstance.constructor.name, 'SimpleRestContainer')

    await container.Start()
    const msgs = await container.pluginInstance._processBodyAsyncImpl({}, true)

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
      [Capabilities.SIMPLEREST_RESPONSE_HOOK]: `
        botMsg.messageText = 'message text from hook'
      `,
      [Capabilities.SIMPLEREST_IGNORE_EMPTY]: true
    })
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

describe('connectors.simplerest.useresponse', function () {
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
      [Capabilities.SIMPLEREST_PARSER_HOOK]: 'body.text = JSON.parse(body.text).prop'
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
      [Capabilities.SIMPLEREST_PARSER_HOOK]: 'changeBody({ text: body })'
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

  it('should use parser to parse response from ping', async function () {
    await this.init({
      [Capabilities.SIMPLEREST_START_URL]: 'https://mock.com/startencoded',
      [Capabilities.SIMPLEREST_START_PROCESS_RESPONSE]: true,
      [Capabilities.SIMPLEREST_PARSER_HOOK]: 'body.text = JSON.parse(body.text).prop'
    })

    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'responsefromstart.convo.txt')
    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.equal(transcript.steps.length, 1)
    assert.equal(transcript.steps[0].actual.messageText, 'response from start')
  })

  it('should use parser to parse string from ping', async function () {
    await this.init({
      [Capabilities.SIMPLEREST_START_URL]: 'https://mock.com/startstring',
      [Capabilities.SIMPLEREST_START_PROCESS_RESPONSE]: true,
      [Capabilities.SIMPLEREST_PARSER_HOOK]: 'changeBody({ text: body })'
    })

    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'responsefromstart.convo.txt')
    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.equal(transcript.steps.length, 1)
    assert.equal(transcript.steps[0].actual.messageText, 'response from start')
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

describe('connectors.simplerest.polling', function () {
  it('should poll HTTP url', async () => {
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
  it('should use request hook for polling', async () => {
    const caps = {
      [Capabilities.CONTAINERMODE]: 'simplerest',
      [Capabilities.SIMPLEREST_URL]: () => 'https://mock.com/endpoint',
      [Capabilities.SIMPLEREST_RESPONSE_JSONPATH]: () => ['$.text'],
      [Capabilities.SIMPLEREST_POLL_URL]: () => 'https://mock.com/poll',
      [Capabilities.SIMPLEREST_POLL_REQUEST_HOOK]: 'requestOptions.uri = "https://mock.com/_from_hook"'
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
