const assert = require('chai').assert
const ScriptingProvider = require('../../src/scripting/ScriptingProvider')

describe('validate if valid asserterType', function () {
  it('valid asserterType', async function () {
    let scriptingProvider = new ScriptingProvider()
    assert.equal(scriptingProvider._isValidAsserterType('assertConvoStep'), true)
  })
  it('valid asserterType', async function () {
    let scriptingProvider = new ScriptingProvider()
    assert.equal(scriptingProvider._isValidAsserterType('assertStep'), false)
  })
})

describe('exchange variable with value in asserterArgs', function () {
  it('exchange var with real value', async function () {
    let scriptingProvider = new ScriptingProvider()
    let asserter = {
      'name': 'DUMMY',
      'args': [
        'dbUrl',
        '$count',
        "INSERT INTO dummy(name, birthday) VALUES ('Max Mustermann', 1991-03-26);"
      ]
    }
    let scriptingMemory = {
      '$count': '5'
    }
    assert.equal(scriptingProvider._addScriptingMemoryToArgs(asserter, scriptingMemory).args[1], 5)
  })
  it('typo of reference', async function () {
    let scriptingProvider = new ScriptingProvider()
    let asserter = {
      'name': 'DUMMY',
      'args': [
        'dbUrl',
        '$ount',
        "INSERT INTO dummy(name, birthday) VALUES ('Max Mustermann', 1991-03-26);"
      ]
    }
    let scriptingMemory = {
      '$count': '5'
    }
    assert.notEqual(scriptingProvider._addScriptingMemoryToArgs(asserter, scriptingMemory).args[1], 5)
  })
})
