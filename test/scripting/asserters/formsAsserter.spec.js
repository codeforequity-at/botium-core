const assert = require('chai').assert
const FormsAsserter = require('../../../src/scripting/logichook/asserter/FormsAsserter')

describe('scripting.asserters.formsAsserter', function () {
  beforeEach(async function () {
    this.formsAsserter = new FormsAsserter({
      Match: (botresponse, utterance) => botresponse.toLowerCase().indexOf(utterance.toLowerCase()) >= 0
    }, {})
  })

  it('should succeed on existing form', async function () {
    await this.formsAsserter.assertConvoStep({
      convoStep: { stepTag: 'test' },
      args: ['test1'],
      botMsg: {
        forms: [
          {
            name: 'test1'
          }
        ]
      }
    })
  })
  it('should succeed on existing card form', async function () {
    await this.formsAsserter.assertConvoStep({
      convoStep: { stepTag: 'test' },
      args: ['test1'],
      botMsg: {
        cards: [
          {
            forms: [
              {
                name: 'test1'
              }
            ]
          }
        ]
      }
    })
  })
  it('should succeed on existing card forms', async function () {
    await this.formsAsserter.assertConvoStep({
      convoStep: { stepTag: 'test' },
      args: ['test1', 'test1'],
      botMsg: {
        forms: [
          {
            name: 'test1'
          }
        ],
        cards: [
          {
            forms: [
              {
                name: 'test1'
              }
            ]
          }
        ]
      }
    })
  })
  it('should succeed on existing card form (by label)', async function () {
    await this.formsAsserter.assertConvoStep({
      convoStep: { stepTag: 'test' },
      args: ['test1', 'test2'],
      botMsg: {
        forms: [
          {
            name: 'test1'
          },
          {
            name: 'otherform',
            label: 'Test2'
          }
        ]
      }
    })
  })
  it('should fail on missing form', async function () {
    try {
      await this.formsAsserter.assertConvoStep({
        convoStep: { stepTag: 'test' },
        args: ['test1', 'test2'],
        botMsg: {
          forms: [
            {
              name: 'test1'
            }
          ]
        }
      })
      assert.fail('should have failed')
    } catch (err) {
      assert.isTrue(err.message.indexOf('Expected form(s) with text "test2"') > 0)
      assert.isNotNull(err.context)
      assert.isNotNull(err.context.cause)
      assert.isArray(err.context.cause.expected)
      assert.isNotTrue(err.context.cause.not)
      assert.deepEqual(err.context.cause.expected, ['test1', 'test2'])
      assert.deepEqual(err.context.cause.actual, [{ name: 'test1' }])
      assert.deepEqual(err.context.cause.diff, ['test2'])
    }
  })
  it('should succeed on not existing form', async function () {
    await this.formsAsserter.assertNotConvoStep({
      convoStep: { stepTag: 'test' },
      args: ['test2'],
      botMsg: {
        forms: [
          {
            name: 'test1'
          }
        ]
      }
    })
  })
  it('should fail on unexpected form', async function () {
    try {
      await this.formsAsserter.assertNotConvoStep({
        convoStep: { stepTag: 'test' },
        args: ['test1', 'test2'],
        botMsg: {
          forms: [
            {
              name: 'test1'
            }
          ]
        }
      })
      assert.fail('should have failed')
    } catch (err) {
      assert.isTrue(err.message.indexOf('Not expected form(s) with text "test1"') > 0)
      assert.isNotNull(err.context)
      assert.isNotNull(err.context.cause)
      assert.isArray(err.context.cause.expected)
      assert.isTrue(err.context.cause.not)
      assert.deepEqual(err.context.cause.expected, ['test1', 'test2'])
      assert.deepEqual(err.context.cause.actual, [{ name: 'test1' }])
      assert.deepEqual(err.context.cause.diff, ['test1'])
    }
  })
  it('should succeed on existing form if has no arg', async function () {
    await this.formsAsserter.assertConvoStep({
      convoStep: { stepTag: 'test' },
      args: [],
      botMsg: {
        forms: [
          {
            name: 'test'
          }
        ]
      }
    })
  })
  it('should fail on no form if has no arg', async function () {
    try {
      await this.formsAsserter.assertConvoStep({ convoStep: { stepTag: 'test' } })
      assert.fail('should have failed')
    } catch (err) {
      assert.isTrue(err.message.indexOf('Expected some form(s)') > 0)
      assert.isNotNull(err.context)
      assert.isNotNull(err.context.cause)
      assert.isArray(err.context.cause.expected)
      assert.isNotTrue(err.context.cause.not)
      assert.deepEqual(err.context.cause.expected, [])
      assert.deepEqual(err.context.cause.actual, [])
    }
  })
  it('should succeed on not existing form if has no arg and negated', async function () {
    await this.formsAsserter.assertNotConvoStep({ convoStep: { stepTag: 'test' } })
  })
  it('should fail on form if has no arg and negated', async function () {
    try {
      await this.formsAsserter.assertNotConvoStep({
        convoStep: { stepTag: 'test' },
        args: [],
        botMsg: {
          forms: [
            {
              name: 'test'
            }
          ]
        }
      })
      assert.fail('should have failed')
    } catch (err) {
      assert.isTrue(err.message.indexOf('Not expected form(s) with text "test"') > 0)
      assert.isNotNull(err.context)
      assert.isNotNull(err.context.cause)
      assert.isArray(err.context.cause.expected)
      assert.isTrue(err.context.cause.not)
      assert.deepEqual(err.context.cause.expected, [])
      assert.deepEqual(err.context.cause.actual, [{ name: 'test' }])
    }
  })
})
