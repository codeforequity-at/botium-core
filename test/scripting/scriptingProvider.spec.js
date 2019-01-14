const assert = require('chai').assert
const ScriptingProvider = require('../../src/scripting/ScriptingProvider')
const DefaultCapabilities = require('../../src/Defaults').Capabilities

describe('scriptingProvider._resolveUtterances', function () {
  it('should resolve utterance', async function () {
    const scriptingProvider = new ScriptingProvider(DefaultCapabilities)
    await scriptingProvider.Build()
    const scriptingContext = scriptingProvider._buildScriptContext()
    scriptingProvider.AddUtterances({
      name: 'utt1',
      utterances: ['TEXT1', 'TEXT2']
    })

    const tomatch = scriptingContext.scriptingEvents.resolveUtterance({ utterance: 'utt1' })
    assert.isArray(tomatch)
    assert.equal(tomatch.length, 2)
    assert.equal(tomatch[0], 'TEXT1')
    assert.equal(tomatch[1], 'TEXT2')
    scriptingContext.scriptingEvents.assertBotResponse('TEXT1', tomatch, 'test1')
  })
  it('should fail on invalid utterance', async function () {
    const scriptingProvider = new ScriptingProvider(DefaultCapabilities)
    await scriptingProvider.Build()
    const scriptingContext = scriptingProvider._buildScriptContext()
    scriptingProvider.AddUtterances({
      name: 'utt1',
      utterances: ['TEXT1', 'TEXT2']
    })

    const tomatch = scriptingContext.scriptingEvents.resolveUtterance({ utterance: 'utt2' })
    assert.isArray(tomatch)
    assert.equal(tomatch.length, 1)
    assert.equal(tomatch[0], 'utt2')
    try {
      scriptingContext.scriptingEvents.assertBotResponse('TEXT1', tomatch, 'test1')
      assert.fail('expected error')
    } catch (err) {
      assert.isTrue(err.message.indexOf('Expected bot response') > 0)
    }
  })
  it('should fail on unresolved utterance', async function () {
    const scriptingProvider = new ScriptingProvider(DefaultCapabilities)
    await scriptingProvider.Build()
    const scriptingContext = scriptingProvider._buildScriptContext()
    scriptingProvider.AddUtterances({
      name: 'utt1',
      utterances: ['TEXT1', 'TEXT2']
    })
    try {
      scriptingContext.scriptingEvents.assertBotResponse('TEXT1', 'utt1', 'test1')
      assert.fail('expected error')
    } catch (err) {
      assert.isTrue(err.message.indexOf('Expected bot response') > 0)
    }
  })
})

describe('scriptingProvider._isValidAsserterType', function () {
  it('valid asserterType', async function () {
    let scriptingProvider = new ScriptingProvider()
    assert.equal(scriptingProvider._isValidAsserterType('assertConvoStep'), true)
  })
  it('invalid asserterType', async function () {
    let scriptingProvider = new ScriptingProvider()
    assert.equal(scriptingProvider._isValidAsserterType('assertStep'), false)
  })
})

describe('scriptingProvider._addScriptingMemoryToArgs', function () {
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
  it('different value', async function () {
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
      '$count': '4'
    }
    assert.notEqual(scriptingProvider._addScriptingMemoryToArgs(asserter, scriptingMemory).args[1], 5)
  })
})
