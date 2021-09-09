const assert = require('chai').assert
const ScriptingProvider = require('../../src/scripting/ScriptingProvider')
const DefaultCapabilities = require('../../src/Defaults').Capabilities

describe('scriptingModificator.assertions', function () {
  it('should use assertConvoNotStep for "not" modificator and succeed', async function () {
    const scriptingProvider = new ScriptingProvider(DefaultCapabilities)
    await scriptingProvider.Build()
    const scriptingContext = scriptingProvider._buildScriptContext()
    const onBotResult = await scriptingContext.scriptingEvents.onBot({
      convo: {},
      convoStep: {
        stepTag: 'test',
        asserters: [
          {
            name: 'BUTTONS',
            args: ['test1'],
            not: true,
            order: 1
          }
        ]
      },
      scriptingMemory: {},
      botMsg: {
        buttons: [
          {
            text: 'test'
          }
        ]
      }
    })
    assert.isNull(onBotResult.error)
  })
  it('should use assertConvoNotStep for "not" modificator and fail with generic handler', async function () {
    const scriptingProvider = new ScriptingProvider(DefaultCapabilities)
    await scriptingProvider.Build()
    const scriptingContext = scriptingProvider._buildScriptContext()
    const onBotResult = await scriptingContext.scriptingEvents.onBot({
      convo: {},
      convoStep: {
        stepTag: 'test',
        asserters: [
          {
            name: 'INTENT',
            args: ['test1'],
            not: true,
            order: 1
          }
        ]
      },
      scriptingMemory: {},
      botMsg: {
        nlp: {
          intent: { name: 'test1' }
        }
      }
    })
    assert.isNotNull(onBotResult.error)
    assert.isTrue(onBotResult.error.message.indexOf('Expected asserter IntentAsserter with args "test1" to fail') > 0)
    assert.isNotNull(onBotResult.error.context)
    assert.equal(onBotResult.error.context.source, 'IntentAsserter')
  })
})
