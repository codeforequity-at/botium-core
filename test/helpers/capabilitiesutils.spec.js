const assert = require('chai').assert

const { flat } = require('../../src/helpers/CapabilitiesUtils')

const EXPECTED = [
  {
    FIRST: 'FIRST_VALUE0',
    SECOND: 'SECOND_VALUE0'
  },
  {
    FIRST: 'FIRST_VALUE1',
    SECOND: 'SECOND_VALUE1'
  }
]

const ACTUAL_SINGLE = {
  FIRST: 'FIRST_VALUE0',
  SECOND: 'SECOND_VALUE0'
}

const EXPECTED_SINGLE = [ACTUAL_SINGLE]

describe('scripting.asserters.textAsserter', function () {
  describe('supported datatypes to read', function () {
    it('suffix', async function () {
      const actual = flat({
        'PRECOMP.0.FIRST': 'FIRST_VALUE0',
        'PRECOMP.0.SECOND': 'SECOND_VALUE0',
        'PRECOMP.1.FIRST': 'FIRST_VALUE1',
        'PRECOMP.1.SECOND': 'SECOND_VALUE1'
      }, 'PRECOMP')
      assert.deepEqual(actual, EXPECTED)
    })
    it('suffix and json', async function () {
      const actual = flat({
        'PRECOMP.0': {
          FIRST: 'FIRST_VALUE0',
          SECOND: 'SECOND_VALUE0'
        },
        'PRECOMP.1': {
          FIRST: 'FIRST_VALUE1',
          SECOND: 'SECOND_VALUE1'
        }
      }, 'PRECOMP')
      assert.deepEqual(actual, EXPECTED)
    })
    it('global and json', async function () {
      const actual = flat({
        PRECOMP: ACTUAL_SINGLE
      }, 'PRECOMP')
      assert.deepEqual(actual, EXPECTED_SINGLE)
    })
    it('global and jsonstring', async function () {
      const actual = flat({
        PRECOMP: JSON.stringify(ACTUAL_SINGLE)
      }, 'PRECOMP')
      assert.deepEqual(actual, EXPECTED_SINGLE)
    })
    it('global and array', async function () {
      const actual = flat({
        PRECOMP: JSON.stringify(EXPECTED)
      }, 'PRECOMP')
      assert.deepEqual(actual, EXPECTED)
    })
  })
  describe('key types', function () {
    it('prefix is shorter', async function () {
      const actual = flat({
        'PRECOMP_SOMETHINGELSE.0.FIRST': 'FIRST_VALUE0'
      }, 'PRECOMP')
      assert.deepEqual(actual, [])
    })
    it('global is not unique', async function () {
      try {
        flat({
          'PRECOMP.0.FIRST': 'FIRST_VALUE0',
          PRECOMP: 'precomp value'
        }, 'PRECOMP')
        assert.fail('should have failed')
      } catch (err) {
        assert.equal(err.message, 'Incorrect structure. Global definition must be unique. See Capability PRECOMP')
      }
    })
  })
})
