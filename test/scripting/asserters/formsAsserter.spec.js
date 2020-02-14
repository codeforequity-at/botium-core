const assert = require('chai').assert
const FormsAsserter = require('../../../src/scripting/logichook/asserter/FormsAsserter')

describe('scripting.asserters.formsAsserter', function () {
  beforeEach(async function () {
    this.formsAsserter = new FormsAsserter({
      Match: (botresponse, utterance) => botresponse.toLowerCase().indexOf(utterance.toLowerCase()) >= 0
    }, {})
  })

  it('should do nothing on no arg', async function () {
    await this.formsAsserter.assertConvoStep({ })
  })
  it('should succeed on existing form', async function () {
    await this.formsAsserter.assertConvoStep({
      convoStep: { stepTag: 'test' },
      args: ['test'],
      botMsg: {
        forms: [
          {
            name: 'test'
          }
        ]
      }
    })
  })
  it('should succeed on existing card form', async function () {
    await this.formsAsserter.assertConvoStep({
      convoStep: { stepTag: 'test' },
      args: ['test'],
      botMsg: {
        cards: [
          {
            forms: [
              {
                name: 'test'
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
      args: ['test', 'test1'],
      botMsg: {
        forms: [
          {
            name: 'test'
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
  it('should fail on missing form', async function () {
    try {
      await this.formsAsserter.assertConvoStep({
        convoStep: { stepTag: 'test' },
        args: ['test', 'test1'],
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
      assert.isTrue(err.message.indexOf("test: Wrong number of forms. The difference is [ { form: 'test1', diff: -1 } ]") >= 0)
      assert.isNotNull(err.context)
      assert.isNotNull(err.context.cause)
      assert.isArray(err.context.cause.expected)
      assert.isNotTrue(err.context.cause.not)
      assert.deepEqual(err.context.cause.expected, ['test', 'test1'])
      assert.deepEqual(err.context.cause.actual, ['test'])
      assert.deepEqual(err.context.cause.diff, [{ form: 'test1', diff: -1 }])
    }
  })
})
