const chai = require('chai')
const assert = require('chai').assert
chai.use(require('chai-as-promised'))
const util = require('util')

const EntitiesAsserter = require('../../../src/scripting/logichook/asserter/EntitiesAsserter')
const asserter = new EntitiesAsserter(null, {})

describe('EntitiesAsserter', function () {
  it('expected 0 entities, found 1 enitities, negative case', async function () {
    return _assert(
      [],
      ['e1'],
      { e1: 1 }
    )
  })

  it('expected 0... entities, found 0 enitities, positive case', async function () {
    return _assert(
      ['...'],
      []
    )
  })

  it('expected 0... entities, found 1 enitities, positive case', async function () {
    return _assert(
      ['...'],
      ['e1']
    )
  })

  it('expected 3 entities, found 0 enitities, positive case', async function () {
    return _assert(
      ['e1', 'e2', 'e3'],
      [],
      { e1: -1, e2: -1, e3: -1 }
    )
  })

  it('expected 3 entities, found 1 enitities, negative case', async function () {
    return _assert(
      ['e1', 'e2', 'e3'],
      ['e1'],
      { e2: -1, e3: -1 }
    )
  })

  it('expected 3 entities, found 3 enitities, positive case', async function () {
    return _assert(
      ['e1', 'e2', 'e3'],
      ['e1', 'e2', 'e3']
    )
  })

  it('expected 3 entities, found 3 enitities, but not same 1, negative case', async function () {
    return _assert(
      ['e1', 'e2', 'e3'],
      ['e1', 'e2', 'e4'],
      { e3: -1, e4: 1 }
    )
  })

  it('expected 3 entities, found 3 enitities, but not same 2, negative case', async function () {
    return _assert(
      ['e1', 'e2', 'e2'],
      ['e1', 'e1', 'e2'],
      { e1: 1, e2: -1 }
    )
  })

  it('expected 3 entities, found 4 enitities, nagative case', async function () {
    return _assert(
      ['e1', 'e2', 'e3'],
      ['e1', 'e2', 'e3', 'e4'],
      { e4: 1 }
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
    return assert.isRejected(promise, `${steptag}: Wrong number of entities. The difference is ${util.inspect(diffAsArray)}`)
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
        entities: found.map((entityName) => { return { name: entityName, confidence: 1, value: 'value' } })
      }
    }
  }
}
