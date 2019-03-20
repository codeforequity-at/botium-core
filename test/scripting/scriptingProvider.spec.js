const assert = require('chai').assert
const expect = require('chai').expect
const ScriptingProvider = require('../../src/scripting/ScriptingProvider')
const ScriptingMemory = require('../../src/scripting/ScriptingMemory')
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

describe('scriptingProvider._tagAndCleanupUtterances', function () {
  it('positive case remove empty String from utterances', async function () {
    let scriptingProvider = new ScriptingProvider()
    let utterances = ['don\'t understand', 'sorry', '']
    const fileUtterances = [{ name: 'INCOMPREHENSION', utterances: utterances }]
    let actualResult = scriptingProvider._tagAndCleanupUtterances(fileUtterances, 'incomprehension.utterances.txt')
    expect(actualResult[0].utterances).to.eql(utterances.slice(0, 2))
  })
})

describe('scriptingProvider.ExpandUtterancesToConvos', function () {
  it('should build plain convos for utterance', async function () {
    const scriptingProvider = new ScriptingProvider(DefaultCapabilities)
    await scriptingProvider.Build()
    scriptingProvider.AddUtterances({
      name: 'utt1',
      utterances: ['TEXT1', 'TEXT2']
    })

    scriptingProvider.ExpandUtterancesToConvos()
    assert.equal(scriptingProvider.convos.length, 1)
    assert.equal(scriptingProvider.convos[0].conversation.length, 2)
    assert.equal(scriptingProvider.convos[0].header.name, 'utt1')
    assert.equal(scriptingProvider.convos[0].conversation[0].messageText, 'utt1')

    scriptingProvider.ExpandConvos()
    assert.equal(scriptingProvider.convos.length, 2)
    assert.equal(scriptingProvider.convos[0].conversation.length, 2)
    assert.equal(scriptingProvider.convos[0].header.name, 'utt1/utt1-L1')
    assert.equal(scriptingProvider.convos[0].conversation[0].messageText, 'TEXT1')
    assert.equal(scriptingProvider.convos[1].conversation.length, 2)
    assert.equal(scriptingProvider.convos[1].header.name, 'utt1/utt1-L2')
    assert.equal(scriptingProvider.convos[1].conversation[0].messageText, 'TEXT2')
  })
  it('should build incomprehension convos for utterance', async function () {
    const scriptingProvider = new ScriptingProvider(Object.assign({}, DefaultCapabilities, { 'SCRIPTING_UTTEXPANSION_INCOMPREHENSION': 'INCOMPREHENSION' }))
    await scriptingProvider.Build()
    scriptingProvider.AddUtterances({
      name: 'utt1',
      utterances: ['TEXT1', 'TEXT2']
    })
    scriptingProvider.AddUtterances({
      name: 'INCOMPREHENSION',
      utterances: ['INCOMPREHENSION1', 'INCOMPREHENSION2']
    })

    scriptingProvider.ExpandUtterancesToConvos()
    assert.equal(scriptingProvider.convos.length, 1)
    assert.equal(scriptingProvider.convos[0].conversation.length, 2)
    assert.equal(scriptingProvider.convos[0].conversation[0].messageText, 'utt1')
    assert.equal(scriptingProvider.convos[0].conversation[1].messageText, 'INCOMPREHENSION')
    assert.equal(scriptingProvider.convos[0].conversation[1].not, true)

    scriptingProvider.ExpandConvos()
    assert.equal(scriptingProvider.convos.length, 2)
    assert.equal(scriptingProvider.convos[0].conversation.length, 2)
    assert.equal(scriptingProvider.convos[0].conversation[0].messageText, 'TEXT1')
    assert.equal(scriptingProvider.convos[0].conversation[1].messageText, 'INCOMPREHENSION')
    assert.equal(scriptingProvider.convos[0].conversation[1].not, true)
    assert.equal(scriptingProvider.convos[1].conversation.length, 2)
    assert.equal(scriptingProvider.convos[1].conversation[0].messageText, 'TEXT2')
    assert.equal(scriptingProvider.convos[1].conversation[1].messageText, 'INCOMPREHENSION')
    assert.equal(scriptingProvider.convos[1].conversation[1].not, true)
  })
  it('should build check-only convos for utterance', async function () {
    const scriptingProvider = new ScriptingProvider(Object.assign({}, DefaultCapabilities))
    await scriptingProvider.Build()
    scriptingProvider.AddUtterances({
      name: 'utt1',
      utterances: ['TEXT1', 'TEXT2']
    })

    scriptingProvider.ExpandUtterancesToConvos()
    assert.lengthOf(scriptingProvider.convos, 1)
    assert.lengthOf(scriptingProvider.convos[0].conversation, 2)
    assert.equal(scriptingProvider.convos[0].conversation[0].messageText, 'utt1')
    assert.equal(scriptingProvider.convos[0].conversation[1].messageText, '')
    assert.isFalse(scriptingProvider.convos[0].conversation[1].not)

    scriptingProvider.ExpandConvos()
    assert.lengthOf(scriptingProvider.convos, 2)
    assert.lengthOf(scriptingProvider.convos[0].conversation, 2)
    assert.equal(scriptingProvider.convos[0].conversation[0].messageText, 'TEXT1')
    assert.equal(scriptingProvider.convos[0].conversation[1].messageText, '')
    assert.isFalse(scriptingProvider.convos[0].conversation[1].not)
    assert.lengthOf(scriptingProvider.convos[1].conversation, 2)
    assert.equal(scriptingProvider.convos[1].conversation[0].messageText, 'TEXT2')
    assert.equal(scriptingProvider.convos[1].conversation[1].messageText, '')
    assert.isFalse(scriptingProvider.convos[1].conversation[1].not)
  })
  it('should fail incomprehension convos for utterance without incomprehension utt', async function () {
    const scriptingProvider = new ScriptingProvider(Object.assign({}, DefaultCapabilities, { 'SCRIPTING_UTTEXPANSION_INCOMPREHENSION': 'INCOMPREHENSION' }))
    await scriptingProvider.Build()

    try {
      scriptingProvider.ExpandUtterancesToConvos()
      assert.fail('should have failed')
    } catch (err) {
      assert.isTrue(err.message.indexOf('incomprehension utterance \'INCOMPREHENSION\' undefined') > 0)
    }
  })
})
