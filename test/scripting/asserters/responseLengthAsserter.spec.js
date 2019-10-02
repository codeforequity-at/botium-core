const assert = require('chai').assert
const ResponseLengthAsserter = require('../../../src/scripting/logichook/asserter/ResponseLengthAsserter')

describe('scripting.asserters.responseLengthAsserter', function () {
  beforeEach(async function () {
    this.responseLengthAsserter = new ResponseLengthAsserter({
      Match: (botresponse, utterance) => botresponse.toLowerCase().indexOf(utterance.toLowerCase()) >= 0
    }, {})
  })

  it('should do nothing on no arg', async function () {
    await this.responseLengthAsserter.assertConvoStep({ })
  })
  it('should succeed on short text', async function () {
    await this.responseLengthAsserter.assertConvoStep({
      convoStep: { stepTag: 'test' },
      args: ['20'],
      botMsg: {
        messageText: 'hallo'
      }
    })
  })
  it('should succeed on short texts', async function () {
    await this.responseLengthAsserter.assertConvoStep({
      convoStep: { stepTag: 'test' },
      args: ['20', '5'],
      botMsg: {
        messageText: [
          'hallo1',
          'hallo2'
        ]
      }
    })
  })
  it('should fail on long text', async function () {
    try {
      await this.responseLengthAsserter.assertConvoStep({
        convoStep: { stepTag: 'test' },
        args: ['20'],
        botMsg: {
          messageText: 'hallo hallo hallo hallo hallo hallo'
        }
      })
      assert.fail('should have failed')
    } catch (err) {
      assert.isTrue(err.message.indexOf('Expected maximum response length 20 characters') > 0)
      assert.isNotNull(err.context)
      assert.isNotNull(err.context.cause)
      assert.equal(err.context.cause.expected, 20)
      assert.equal(err.context.cause.actual, 35)
    }
  })
  it('should fail on lots of texts', async function () {
    try {
      await this.responseLengthAsserter.assertConvoStep({
        convoStep: { stepTag: 'test' },
        args: ['20', '5'],
        botMsg: {
          messageText: [
            'hallo',
            'hallo',
            'hallo',
            'hallo',
            'hallo',
            'hallo',
            'hallo'
          ]
        }
      })
      assert.fail('should have failed')
    } catch (err) {
      assert.isTrue(err.message.indexOf('Expected maximum response count 5') > 0)
      assert.isNotNull(err.context)
      assert.isNotNull(err.context.cause)
      assert.equal(err.context.cause.expected, 5)
      assert.equal(err.context.cause.actual, 7)
    }
  })
})
