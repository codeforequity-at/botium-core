const chai = require('chai')
const assert = require('chai').assert
chai.use(require('chai-as-promised'))
const util = require('util')

const IntentAsserter = require('../../../src/scripting/logichook/asserter/IntentAsserter')
const asserter = new IntentAsserter(null, {})

describe('scripting.asserters.intentAsserter', function () {
  it('positive case for intent asserter', async function () {
    return _assert(
      'greetings',
      'greetings'
    )
  })
  it('negative case for intent asserter, missing arg', async function () {
    return _assert(
      null,
      'greetings'
    )
  })
  it('negative case for intent asserter, missing intent from response', async function () {
    return _assert(
      'greetings',
      null
    )
  })
  it('negative case for intent asserter, wrong intent', async function () {
    return _assert(
      'greetings',
      'order'
    )
  })
  it('negative case for intent asserter, wrong intent, details', async function () {
    try {
      await asserter.assertConvoStep({
        convoStep: { stepTag: 'test' },
        args: ['greetings'],
        botMsg: {
          nlp: {
            intent: { name: 'order' }
          }
        }
      })
      assert.fail('should have failed')
    } catch (err) {
      assert.isTrue(err.message.indexOf('Expected intent "greetings" but found order') > 0)
      assert.isNotNull(err.context)
      assert.isNotNull(err.context.cause)
      assert.equal(err.context.cause.expected, 'greetings')
      assert.equal(err.context.cause.actual, 'order')
    }
  })
})

const _assert = (expected, found) => {
  const steptag = `Expected: ${util.inspect(expected)}, found: ${util.inspect(found)}`
  const promise = asserter.assertConvoStep(_params(
    expected,
    found,
    steptag
  ))

  if (!expected) {
    return assert.isRejected(promise, `${steptag}: IntentAsserter Missing argument`)
  } else if (!found) {
    return assert.isRejected(promise, `${steptag}: Expected intent "${expected}" but found nothing`)
  } else if (expected !== found) {
    return assert.isRejected(promise, `${steptag}: Expected intent "${expected}" but found ${found}`)
  } else {
    return assert.isFulfilled(promise)
  }
}

const _params = (expected, found, steptag) => {
  return {
    convoStep: {
      stepTag: steptag
    },
    args: expected ? [expected] : [],
    botMsg: {
      nlp: found
        ? {
            intent: {
              name: found,
              confidence: 1
            }
          }
        : null
    }
  }
}
