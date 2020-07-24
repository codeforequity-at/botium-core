const chai = require('chai')
const assert = require('chai').assert
chai.use(require('chai-as-promised'))
const util = require('util')

const EntityValuesAsserter = require('../../../src/scripting/logichook/asserter/EntityValuesAsserter')
const asserter = new EntityValuesAsserter({
  Match: (botresponse, utterance) => botresponse.toLowerCase().indexOf(utterance.toLowerCase()) >= 0
}, {})

describe('scripting.asserters.entityValuesAsserter', function () {
  it('expected 0 entities, found 1 entities, negative case', async function () {
    return _assert(
      [],
      ['e1'],
      { e1: 1 }
    )
  })

  it('expected 0... entities, found 0 entities, positive case', async function () {
    return _assert(
      ['...'],
      []
    )
  })

  it('expected 0... entities, found 1 entities, positive case', async function () {
    return _assert(
      ['...'],
      ['e1']
    )
  })

  it('expected 3 entities, found 0 entities, positive case', async function () {
    return _assert(
      ['e1', 'e2', 'e3'],
      [],
      { e1: -1, e2: -1, e3: -1 }
    )
  })

  it('expected 3 entities, found 1 entities, negative case', async function () {
    return _assert(
      ['e1', 'e2', 'e3'],
      ['e1'],
      { e2: -1, e3: -1 }
    )
  })

  it('expected 3 entities, found 3 entities, positive case', async function () {
    return _assert(
      ['e1', 'e2', 'e3'],
      ['e1', 'e2', 'e3']
    )
  })

  it('expected 3 entities, found 3 entities, but not same 1, negative case', async function () {
    return _assert(
      ['e1', 'e2', 'e3'],
      ['e1', 'e2', 'e4'],
      { e3: -1, e4: 1 }
    )
  })

  it('expected 3 entities, found 3 entities, but not same 2, negative case', async function () {
    return _assert(
      ['e1', 'e2', 'e2'],
      ['e1', 'e1', 'e2'],
      { e1: 1, e2: -1 }
    )
  })

  it('expected 3 entities, found 4 entities, negative case', async function () {
    return _assert(
      ['e1', 'e2', 'e3'],
      ['e1', 'e2', 'e3', 'e4'],
      { e4: 1 }
    )
  })
  it('expected 3 entities, found 4 entities, negative case, details', async function () {
    try {
      await asserter.assertConvoStep({
        convoStep: { stepTag: 'test' },
        args: ['e1', 'e2', 'e3'],
        botMsg: {
          nlp: {
            entities: [
              { name: 'e1', confidence: 1, value: 'e1' },
              { name: 'e2', confidence: 1, value: 'e2' },
              { name: 'e3', confidence: 1, value: 'e3' },
              { name: 'e4', confidence: 1, value: 'e4' }
            ]
          }
        }
      })
      assert.fail('should have failed')
    } catch (err) {
      assert.isTrue(err.message.indexOf('Wrong number of entity values') > 0)
      assert.isNotNull(err.context)
      assert.isNotNull(err.context.cause)
      assert.isArray(err.context.cause.expected)
      assert.deepEqual(err.context.cause.expected, ['e1', 'e2', 'e3'])
      assert.deepEqual(err.context.cause.actual, ['e1', 'e2', 'e3', 'e4'])
    }
  })

  it('expected 1... entities, found 0 entities, positive case', async function () {
    return _assert(
      ['e1', '...'],
      [],
      { e1: -1 }
    )
  })
  it('expected 1... entities, found 1 entities, positive case', async function () {
    return _assert(
      ['e1', '...'],
      ['e2'],
      { e1: -1, e2: 1 }
    )
  })
  it('Joker match multiple, positive case', async function () {
    return _assert(
      ['pre1post1', 'pre1'],
      ['pre1post1', 'pre1post2', 'pre1'],
      { pre1post2: 1 }
    )
  })
  it('Joker match multiple, reversed order, positive case', async function () {
    return _assert(
      ['pre1', 'pre1post1'],
      ['pre1post1', 'pre1post2', 'pre1'],
      { pre1post2: 1 }
    )
  })
  it('Joker match, just one match, negative case', async function () {
    return _assert(
      ['pre1'],
      ['pre1post1', 'pre1post2', 'pre1'],
      { pre1post1: 1, pre1post2: 1 }
    )
  })
  it('Joker match, just one match, reversed order, negative case', async function () {
    return _assert(
      ['pre1'],
      ['pre1', 'pre1post1', 'pre1post2'],
      { pre1post1: 1, pre1post2: 1 }
    )
  })
  it('Joker match, multiple by same expected, negative case', async function () {
    return _assert(
      ['pre1', 'pre1'],
      ['pre1', 'pre1post1', 'pre2'],
      { pre2: 1 }
    )
  })
})

const _assert = (expected, found, diff) => {
  const steptag = `Expected: ${util.inspect(expected)}, found: ${util.inspect(found)}`
  const promise = asserter.assertConvoStep(_params(
    expected,
    found,
    steptag
  ))
  if (diff) {
    const diffAsArray = []
    Object.keys(diff).forEach((key) => diffAsArray.push({ entity: key, diff: diff[key] }))
    diffAsArray.sort(
      (o1, o2) => {
        if (o1.entity < o2.entity) { return -1 }
        if (o1.entity > o2.entity) { return 1 }
        return 0
      }
    )
    return assert.isRejected(promise, `${steptag}: Wrong number of entity values. The difference is ${util.inspect(diffAsArray)}`)
  } else {
    return assert.isFulfilled(promise)
  }
}

const _params = (expected, found, steptag) => {
  return {
    convoStep: {
      stepTag: steptag
    },
    args: expected,
    botMsg: {
      nlp: {
        entities: found.map((entityValue) => { return { name: `NameOf${entityValue}`, confidence: 1, value: entityValue } })
      }
    }
  }
}
