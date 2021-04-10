const assert = require('chai').assert
const BotDriver = require('../../').BotDriver
const Capabilities = require('../../').Capabilities
const DefaultCapabilities = require('../../src/Defaults').Capabilities

describe('driver.fetchConfigFromFiles', function () {
  it('fetch capabilities from files', function () {
    const driver = new BotDriver()
    const result = driver._fetchConfigFromFiles(['test/driver/configFiles/config1.json'])
    assert.isArray(result)
    assert.lengthOf(result, 1)
  })
  it('fetch capabilities from non existing files', function () {
    const driver = new BotDriver()
    const result = driver._fetchConfigFromFiles(['test/driver/configFiles/configNotExists.json'])
    assert.isArray(result)
    assert.lengthOf(result, 0)
  })
  it('fetch capabilities from multiple files', function () {
    const driver = new BotDriver()
    const result = driver._fetchConfigFromFiles(['test/driver/configFiles/config1.json', 'test/driver/configFiles/config2.json'])
    assert.isArray(result)
    assert.lengthOf(result, 2)
  })
  it('fetch capabilities from multiple files and check if overwritten', function () {
    const driver = new BotDriver()
    driver._fetchConfigFromFiles(['test/driver/configFiles/config1.json', 'test/driver/configFiles/config2.json'])
    assert.equal(driver.caps.PROJECTNAME, 'Botium Example 2')
    assert.equal(driver.sources.GITURL, 'https://github.com/codeforequity-at/botium-bindings')
    assert.equal(driver.envs.IS_BOTIUM_CONTAINER, true)
  })
})

describe('driver.loadConfigFile', function () {
  it('load Config from file', function () {
    const driver = new BotDriver()
    const result = driver._loadConfigFile('test/driver/configFiles/config1.json')
    assert.isTrue(result)
  })
  it('load Config from non existing file', function () {
    const driver = new BotDriver()
    assert.throws(() => driver._loadConfigFile('test/driver/configFiles/configNonExisting.json'))
  })
  it('load Config from file only once', function () {
    const driver = new BotDriver()
    driver._fetchConfigFromFiles(['test/driver/configFiles/config1.json', 'test/driver/configFiles/config1.json', 'test/driver/configFiles/config1.json'])
    assert.lengthOf(driver._fetchedConfigFiles, 1)
    assert.lengthOf(driver.caps.ARR_CAP, 2)
  })
  it('should make unique array', function () {
    const driver = new BotDriver()
    driver._fetchConfigFromFiles(['test/driver/configFiles/config1.json', 'test/driver/configFiles/config2.json'])
    assert.lengthOf(driver._fetchedConfigFiles, 2)
    assert.lengthOf(driver.caps.ARR_CAP, 3)
    assert.deepEqual(driver.caps.ARR_CAP, ['val1', 'val2', 'val3'])
  })
})

describe('driver.capabilities', function () {
  it('should merge boolean caps', function () {
    const myCaps = {
      [Capabilities.SIMULATE_WRITING_SPEED]: 'YES'
    }
    const driver = new BotDriver(myCaps)
    assert.isBoolean(driver.caps[Capabilities.SIMULATE_WRITING_SPEED])
    assert.isTrue(driver.caps[Capabilities.SIMULATE_WRITING_SPEED])
  })
  it('should merge string caps', function () {
    const myCaps = {
      CAP_STRING_1: 'Test',
      CAP_STRING_2: '12345'
    }
    const driver = new BotDriver(myCaps)
    assert.isString(driver.caps.CAP_STRING_1)
    assert.isString(driver.caps.CAP_STRING_2)
  })
  it('should merge boolean envs', function () {
    process.env.BOTIUM_SIMULATE_WRITING_SPEED = 'NO'
    const driver = new BotDriver()
    delete process.env.BOTIUM_SIMULATE_WRITING_SPEED
    assert.isBoolean(driver.caps[Capabilities.SIMULATE_WRITING_SPEED])
    assert.isFalse(driver.caps[Capabilities.SIMULATE_WRITING_SPEED])
  })
  it('should parse array caps', function () {
    DefaultCapabilities.MYCAP = []
    const myCaps = {
      MYCAP: '[{"KEY":"VALUE"},{"KEY":"VALUE1"}]'
    }
    const driver = new BotDriver(myCaps)
    assert.isArray(driver.caps.MYCAP)
    assert.lengthOf(driver.caps.MYCAP, 2)
  })
  it('should merge array caps', function () {
    DefaultCapabilities.MYCAP = [{ id: 'id1', key: 'VALUE' }]
    const myCaps = {
      MYCAP: '[{"id":"id1", "key1": "VALUE1"},{"key":"VALUE1"}]'
    }
    const driver = new BotDriver(myCaps)
    assert.isArray(driver.caps.MYCAP)
    assert.lengthOf(driver.caps.MYCAP, 2)
    assert.equal(driver.caps.MYCAP[0].key, 'VALUE')
    assert.equal(driver.caps.MYCAP[0].key1, 'VALUE1')
    assert.isUndefined(driver.caps.MYCAP[1].id)
    assert.equal(driver.caps.MYCAP[1].key, 'VALUE1')
  })
  it('should parse object caps', function () {
    DefaultCapabilities.MYCAP = { KEY: 'VALUE' }
    const myCaps = {
      MYCAP: '{"KEY":"VALUE1"}'
    }
    const driver = new BotDriver(myCaps)
    assert.isObject(driver.caps.MYCAP)
    assert.equal(driver.caps.MYCAP.KEY, 'VALUE1')
  })
  it('should merge object caps', function () {
    DefaultCapabilities.MYCAP = { KEY: 'VALUE' }
    const myCaps = {
      MYCAP: '{"KEY1":"VALUE1"}'
    }
    const driver = new BotDriver(myCaps)
    assert.isObject(driver.caps.MYCAP)
    assert.equal(driver.caps.MYCAP.KEY, 'VALUE')
    assert.equal(driver.caps.MYCAP.KEY1, 'VALUE1')
  })
  it('should not parse JSON caps', function () {
    const myCaps = {
      MYJSONCAP: '{"KEY":"VALUE1"}'
    }
    const driver = new BotDriver(myCaps)
    assert.isObject(driver.caps.MYJSONCAP)
    assert.equal(driver.caps.MYJSONCAP.KEY, 'VALUE1')
  })
  it('should override not matching object caps', function () {
    DefaultCapabilities.MYCAP = { KEY: 'VALUE' }
    const myCaps = {
      MYCAP: 'SIMPLESTRING'
    }
    const driver = new BotDriver(myCaps)
    assert.isString(driver.caps.MYCAP)
    assert.equal(driver.caps.MYCAP, 'SIMPLESTRING')
  })
  it('should override not matching array caps', function () {
    DefaultCapabilities.MYCAP = ['VAL1', 'VAL2']
    const myCaps = {
      MYCAP: { VAL1: 'VALUE1' }
    }
    const driver = new BotDriver(myCaps)
    assert.isObject(driver.caps.MYCAP)
    assert.equal(driver.caps.MYCAP.VAL1, 'VALUE1')
  })
})

describe('driver.constructor', function () {
  it('should deep copy caps', function () {
    const myCaps = {
      ASSERTERS: [{ name: 'ASSERTER1' }]
    }
    const driver = new BotDriver(myCaps)
    assert.isArray(driver.caps.ASSERTERS)
    assert.lengthOf(driver.caps.ASSERTERS, 1)
    assert.isArray(DefaultCapabilities.ASSERTERS)
    assert.lengthOf(DefaultCapabilities.ASSERTERS, 0)
  })
})
