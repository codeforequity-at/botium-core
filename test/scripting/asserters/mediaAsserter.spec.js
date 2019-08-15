const assert = require('chai').assert
const MediaAsserter = require('../../../src/scripting/logichook/asserter/MediaAsserter')

describe('scripting.asserters.mediaAsserter', function () {
  beforeEach(async function () {
    this.mediaAsserter = new MediaAsserter({
      Match: (botresponse, utterance) => botresponse.toLowerCase().indexOf(utterance.toLowerCase()) >= 0
    }, {})
  })

  it('should do nothing on no arg', async function () {
    await this.mediaAsserter.assertConvoStep({ })
  })
  it('should succeed on existing media', async function () {
    await this.mediaAsserter.assertConvoStep({
      convoStep: { stepTag: 'test' },
      args: [ 'test.jpg' ],
      botMsg: {
        media: [
          {
            mediaUri: 'test.jpg'
          }
        ]
      }
    })
  })
  it('should succeed on existing card image', async function () {
    await this.mediaAsserter.assertConvoStep({
      convoStep: { stepTag: 'test' },
      args: [ 'test.jpg' ],
      botMsg: {
        cards: [
          {
            image: { mediaUri: 'test.jpg' }
          }
        ]
      }
    })
  })
  it('should succeed on existing card media', async function () {
    await this.mediaAsserter.assertConvoStep({
      convoStep: { stepTag: 'test' },
      args: [ 'test.jpg', 'test1.jpg' ],
      botMsg: {
        cards: [
          {
            image: { mediaUri: 'test.jpg' },
            media: [
              {
                mediaUri: 'test1.jpg'
              }
            ]
          }
        ]
      }
    })
  })
  it('should fail on missing media', async function () {
    try {
      await this.mediaAsserter.assertConvoStep({
        convoStep: { stepTag: 'test' },
        args: [ 'test.jpg' ],
        botMsg: { }
      })
      assert.fail('should have failed')
    } catch (err) {
      assert.isTrue(err.message.indexOf('Expected media with uri "test.jpg"') > 0)
      assert.isNotNull(err.context)
      assert.isNotNull(err.context.cause)
      assert.isArray(err.context.cause.expected)
      assert.deepEqual(err.context.cause.expected, ['test.jpg'])
      assert.deepEqual(err.context.cause.actual, [])
      assert.deepEqual(err.context.cause.diff, ['test.jpg'])
    }
  })
})
