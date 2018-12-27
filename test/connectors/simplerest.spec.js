const assert = require('chai').assert
const BotDriver = require('../../').BotDriver
const Capabilities = require('../../').Capabilities

const myCapsGet = {
  [Capabilities.CONTAINERMODE]: 'simplerest',
  [Capabilities.SIMPLEREST_URL]: 'http://my-host.com/api/endpoint/{{msg.messageText}}',
  [Capabilities.SIMPLEREST_HEADERS_TEMPLATE]: { HEADER1: 'HEADER1VALUE', HEADER2: '{{msg.token}}' },
  [Capabilities.SIMPLEREST_RESPONSE_JSONPATH]: '$'
}
const myCapsPost = {
  [Capabilities.CONTAINERMODE]: 'simplerest',
  [Capabilities.SIMPLEREST_URL]: 'http://my-host.com/api/endpoint',
  [Capabilities.SIMPLEREST_METHOD]: 'POST',
  [Capabilities.SIMPLEREST_HEADERS_TEMPLATE]: { HEADER1: 'HEADER1VALUE', HEADER2: '{{msg.token}}' },
  [Capabilities.SIMPLEREST_BODY_TEMPLATE]: { BODY1: 'BODY1VALUE', BODY2: '{{msg.messageText}}' },
  [Capabilities.SIMPLEREST_RESPONSE_JSONPATH]: '$'
}
const msg = {
  messageText: 'messageText',
  token: 'myToken'
}

describe('connectors.simplerest', function () {
  it('should build JSON GET url', async function () {
    const myCaps = Object.assign({}, myCapsGet)
    const driver = new BotDriver(myCaps)
    const container = await driver.Build()
    assert.equal(container.constructor.name, 'SimpleRestContainer')

    await container.Start()
    const request = container._buildRequest(msg)

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
    assert.equal(container.constructor.name, 'SimpleRestContainer')

    await container.Start()
    const request = container._buildRequest(myMsg)
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
    assert.equal(container.constructor.name, 'SimpleRestContainer')

    await container.Start()
    const request = container._buildRequest(msg)

    assert.isTrue(request.json)
    assert.isObject(request.headers)
    assert.isObject(request.body)
    assert.equal(request.headers.HEADER2, msg.token)
    assert.equal(request.body.BODY2, msg.messageText)

    await container.Clean()
  })
  it('should build JSON POST request body from strings', async function () {
    const myCaps = Object.assign({}, myCapsPost)
    myCaps[Capabilities.SIMPLEREST_BODY_TEMPLATE] = JSON.stringify(myCaps[Capabilities.SIMPLEREST_BODY_TEMPLATE])
    myCaps[Capabilities.SIMPLEREST_HEADERS_TEMPLATE] = JSON.stringify(myCaps[Capabilities.SIMPLEREST_HEADERS_TEMPLATE])

    const driver = new BotDriver(myCaps)
    const container = await driver.Build()
    assert.equal(container.constructor.name, 'SimpleRestContainer')

    await container.Start()
    const request = container._buildRequest(msg)

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
    assert.equal(container.constructor.name, 'SimpleRestContainer')

    await container.Start()
    const request = container._buildRequest(msg)
    assert.isObject(request.headers)
    assert.isString(request.body)
    assert.equal(request.body, 'BODY1=BODY1VALUE&BODY2=messageText')

    await container.Clean()
  })
})
