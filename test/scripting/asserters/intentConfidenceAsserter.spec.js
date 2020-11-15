const chai = require('chai')
const assert = require('chai').assert
chai.use(require('chai-as-promised'))
const util = require('util')

const IntentConfidenceAsserter = require('../../../src/scripting/logichook/asserter/IntentConfidenceAsserter')
const asserterWithGlobal = new IntentConfidenceAsserter(null, null, { expectedMinimum: 70 })
const asserterWithoutGlobal = new IntentConfidenceAsserter(null)

describe('scripting.asserters.intentConfidenceAsserter', function () {
  // useWithGlobal, expected (minimum), found, negative (expect reject)
  const cases = [
    [true, null, null, true],
    [true, 60, null, true],
    [true, null, 65, true],
    [true, null, 75, false],
    [true, 80, 75, true],
    [true, 80, 80, false],
    [true, 80, 85, false],

    [false, null, null, true],
    [false, 60, null, true],
    [false, null, 65, true],
    [false, null, 75, true],
    [false, 80, 75, true],
    [false, 80, 80, false],
    [false, 80, 85, false]
  ]

  cases.forEach((cse) => {
    const useWithGlobal = cse[0]
    const expected = cse[1]
    const found = cse[2]
    const negative = cse[3]
    const message = `${negative ? 'negative' : 'positive'} case for intent confidence asserter ${useWithGlobal ? 'with global args' : 'without global args'}, exp: ${expected}, found: ${found}`
    it(message,
      async function () {
        return _assert(...cse)
      }
    )
  })
})

const _assert = (useWithGlobal, expected, found, negative) => {
  const steptag = `UseWithGlobal: ${useWithGlobal}, expected: ${util.inspect(expected)}, found: ${util.inspect(found)}`
  const promise = (useWithGlobal ? asserterWithGlobal : asserterWithoutGlobal).assertConvoStep(_params(
    expected,
    found,
    steptag
  ))

  if (negative) {
    return assert.isRejected(promise)
  } else {
    return assert.isFulfilled(promise)
  }
}

const _params = (expected, found, steptag) => {
  found = found / 100
  return {
    convoStep: {
      stepTag: steptag
    },
    args: expected ? [expected] : [],
    botMsg: {
      nlp: found
        ? {
            intent: {
              name: 'not_important',
              confidence: found
            }
          }
        : null
    }
  }
}
