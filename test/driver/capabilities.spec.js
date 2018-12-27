const assert = require('chai').assert
const BotDriver = require('../../').BotDriver
const Capabilities = require('../../').Capabilities
const DefaultCapabilities = require('../../src/Defaults').Capabilities

describe('driver.capabilities', function () {
  it('should merge boolean caps', function () {
    const myCaps = {
      [Capabilities.DOCKERMACHINE]: 'YES'
    }
    const driver = new BotDriver(myCaps)
    assert.isBoolean(driver.caps[Capabilities.DOCKERMACHINE])
    assert.isTrue(driver.caps[Capabilities.DOCKERMACHINE])
  })
  it('should merge boolean envs', function () {
    process.env.BOTIUM_DOCKERMACHINE = 'NO'
    const driver = new BotDriver()
    delete process.env.BOTIUM_DOCKERMACHINE
    assert.isBoolean(driver.caps[Capabilities.DOCKERMACHINE])
    assert.isFalse(driver.caps[Capabilities.DOCKERMACHINE])
  })
  it('should parse array caps', function () {
    DefaultCapabilities['MYCAP'] = []
    const myCaps = {
      'MYCAP': '[{"KEY":"VALUE"},{"KEY":"VALUE1"}]'
    }
    const driver = new BotDriver(myCaps)
    assert.isArray(driver.caps['MYCAP'])
    assert.lengthOf(driver.caps['MYCAP'], 2)
  })
  it('should merge array caps', function () {
    DefaultCapabilities['MYCAP'] = [{id: 'id1', key: 'VALUE'}]
    const myCaps = {
      'MYCAP': '[{"id":"id1", "key1": "VALUE1"},{"key":"VALUE1"}]'
    }
    const driver = new BotDriver(myCaps)
    assert.isArray(driver.caps['MYCAP'])
    assert.lengthOf(driver.caps['MYCAP'], 2)
    assert.equal(driver.caps['MYCAP'][0].key, 'VALUE')
    assert.equal(driver.caps['MYCAP'][0].key1, 'VALUE1')
    assert.isUndefined(driver.caps['MYCAP'][1].id)
    assert.equal(driver.caps['MYCAP'][1].key, 'VALUE1')
  })
  it('should parse object caps', function () {
    DefaultCapabilities['MYCAP'] = { KEY: 'VALUE' }
    const myCaps = {
      'MYCAP': '{"KEY":"VALUE1"}'
    }
    const driver = new BotDriver(myCaps)
    assert.isObject(driver.caps['MYCAP'])
    assert.equal(driver.caps['MYCAP'].KEY, 'VALUE1')
  })
  it('should merge object caps', function () {
    DefaultCapabilities['MYCAP'] = { KEY: 'VALUE' }
    const myCaps = {
      'MYCAP': '{"KEY1":"VALUE1"}'
    }
    const driver = new BotDriver(myCaps)
    assert.isObject(driver.caps['MYCAP'])
    assert.equal(driver.caps['MYCAP'].KEY, 'VALUE')
    assert.equal(driver.caps['MYCAP'].KEY1, 'VALUE1')
  })
  it('should not parse JSON caps', function () {
    const myCaps = {
      'MYJSONCAP': '{"KEY":"VALUE1"}'
    }
    const driver = new BotDriver(myCaps)
    assert.isObject(driver.caps['MYJSONCAP'])
    assert.equal(driver.caps['MYJSONCAP'].KEY, 'VALUE1')
  })
  it('should override not matching caps', function () {
    DefaultCapabilities['MYCAP'] = { KEY: 'VALUE' }
    const myCaps = {
      'MYCAP': 'SIMPLESTRING'
    }
    const driver = new BotDriver(myCaps)
    assert.isString(driver.caps['MYCAP'])
    assert.equal(driver.caps['MYCAP'], 'SIMPLESTRING')
  })
})
