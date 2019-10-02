const assert = require('chai').assert
const ScriptingProvider = require('../../src/scripting/ScriptingProvider')
const DefaultCapabilities = require('../../src/Defaults').Capabilities

describe('scriptingModificator.assertions', function () {
  it('should use assertConvoNotStep for "not" modificator and succeed', async function () {
    const scriptingProvider = new ScriptingProvider(DefaultCapabilities)
    await scriptingProvider.Build()
    const scriptingContext = scriptingProvider._buildScriptContext()
    await scriptingContext.scriptingEvents.assertConvoStep({
      convo: {},
      convoStep: {
        stepTag: 'test',
        asserters: [
          {
            name: 'BUTTONS',
            args: ['test1'],
            not: true
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
  })
  it('should use assertConvoNotStep for "not" modificator and fail with generic handler', async function () {
    const scriptingProvider = new ScriptingProvider(DefaultCapabilities)
    await scriptingProvider.Build()
    const scriptingContext = scriptingProvider._buildScriptContext()
    try {
      await scriptingContext.scriptingEvents.assertConvoStep({
        convo: {},
        convoStep: {
          stepTag: 'test',
          asserters: [
            {
              name: 'INTENT',
              args: ['test1'],
              not: true
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
      assert.fail('should have failed')
    } catch (err) {
      assert.isTrue(err.message.indexOf('Expected asserter IntentAsserter with args "test1" to fail') > 0)
      assert.isNotNull(err.context)
      assert.equal(err.context.source, 'IntentAsserter')
    }
  })
})
