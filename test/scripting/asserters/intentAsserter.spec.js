const chai = require('chai')
const assert = require('chai').assert
chai.use(require('chai-as-promised'))
const util = require('util')

const EntitiesAsserter = require('../../../src/scripting/logichook/asserter/IntentAsserter')
const asserter = new EntitiesAsserter(null, {})

describe('IntentAsserter', function () {
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
