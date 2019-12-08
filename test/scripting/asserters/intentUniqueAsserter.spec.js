const chai = require('chai')
const assert = require('chai').assert
chai.use(require('chai-as-promised'))

const IntentUniqueAsserter = require('../../../src/scripting/logichook/asserter/IntentUniqueAsserter')
const asserter = new IntentUniqueAsserter(null, {})

describe('scripting.asserters.intentUniqueAsserter', function () {
  it('positive case for intent unique asserter, no alternate', async function () {
    await asserter.assertConvoStep({
      convoStep: { stepTag: 'test' },
      args: [],
      botMsg: {
        nlp: {
          intent: {
            name: 'order',
            confidence: 0.5
          }
        }
      }
    })
  })
  it('positive case for intent unique asserter, with alternate', async function () {
    await asserter.assertConvoStep({
      convoStep: { stepTag: 'test' },
      args: [],
      botMsg: {
        nlp: {
          intent: {
            name: 'order',
            confidence: 0.5,
            intents: [
              {
                name: 'alt1',
                confidence: 0.4
              },
              {
                name: 'alt2',
                confidence: 0.3
              }
            ]
          }
        }
      }
    })
  })
  it('negative case for intent unique asserter, details', async function () {
    try {
      await asserter.assertConvoStep({
        convoStep: { stepTag: 'test' },
        args: [],
        botMsg: {
          nlp: {
            intent: {
              name: 'order',
              confidence: 0.5,
              intents: [
                {
                  name: 'alt1',
                  confidence: 0.5
                },
                {
                  name: 'alt2',
                  confidence: 0.3
                }
              ]
            }
          }
        }
      })
      assert.fail('should have failed')
    } catch (err) {
      assert.isTrue(err.message.indexOf('Expected intent "order" (confidence: 0.5) to be unique') > 0)
      assert.isNotNull(err.context)
      assert.isNotNull(err.context.cause)
      assert.equal(err.context.cause.expected, 'order')
      assert.equal(err.context.cause.actual, 'alt1')
    }
  })
})
