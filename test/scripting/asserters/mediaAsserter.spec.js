const assert = require('chai').assert
const MediaAsserter = require('../../../src/scripting/logichook/asserter/MediaAsserter')
const MediaCountAsserter = require('../../../src/scripting/logichook/asserter/MediaCountAsserter')
const MediaCountRecAsserter = require('../../../src/scripting/logichook/asserter/MediaCountRecAsserter')

describe('scripting.asserters.mediaAsserter', function () {
  beforeEach(async function () {
    this.mediaAsserter = new MediaAsserter({
      Match: (botresponse, utterance) => botresponse.toLowerCase().indexOf(utterance.toLowerCase()) >= 0
    }, {})
  })

  it('should succeed on existing media', async function () {
    await this.mediaAsserter.assertConvoStep({
      convoStep: { stepTag: 'test' },
      args: ['test.jpg'],
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
      args: ['test.jpg'],
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
      args: ['test.jpg', 'test1.jpg'],
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
        args: ['test.jpg'],
        botMsg: { }
      })
      assert.fail('should have failed')
    } catch (err) {
      assert.isTrue(err.message.indexOf('Expected media with uri "test.jpg"') > 0)
      assert.isNotNull(err.context)
      assert.isNotNull(err.context.cause)
      assert.isArray(err.context.cause.expected)
      assert.isNotTrue(err.context.cause.not)
      assert.deepEqual(err.context.cause.expected, ['test.jpg'])
      assert.deepEqual(err.context.cause.actual, [])
      assert.deepEqual(err.context.cause.diff, ['test.jpg'])
    }
  })
  it('should succeed on not existing media', async function () {
    await this.mediaAsserter.assertNotConvoStep({
      convoStep: { stepTag: 'test' },
      args: ['test1.jpg'],
      botMsg: {
        media: [
          {
            mediaUri: 'test.jpg'
          }
        ]
      }
    })
  })
  it('should fail on unexpected media', async function () {
    try {
      await this.mediaAsserter.assertNotConvoStep({
        convoStep: { stepTag: 'test' },
        args: ['test1.jpg'],
        botMsg: {
          media: [
            {
              mediaUri: 'test1.jpg'
            },
            {
              mediaUri: 'test2.jpg'
            }
          ]
        }
      })
      assert.fail('should have failed')
    } catch (err) {
      assert.isTrue(err.message.indexOf('Not expected media with uri "test1.jpg"') > 0)
      assert.isNotNull(err.context)
      assert.isNotNull(err.context.cause)
      assert.isArray(err.context.cause.expected)
      assert.isTrue(err.context.cause.not)
      assert.deepEqual(err.context.cause.expected, ['test1.jpg'])
      assert.deepEqual(err.context.cause.actual, ['test1.jpg', 'test2.jpg'])
      assert.deepEqual(err.context.cause.diff, ['test1.jpg'])
    }
  })
  it('should succeed on existing media if has no arg', async function () {
    await this.mediaAsserter.assertConvoStep({
      convoStep: { stepTag: 'test' },
      args: [],
      botMsg: {
        media: [
          {
            mediaUri: 'test'
          }
        ]
      }
    })
  })
  it('should fail on no media if has no arg', async function () {
    try {
      await this.mediaAsserter.assertConvoStep({ convoStep: { stepTag: 'test' } })
      assert.fail('should have failed')
    } catch (err) {
      assert.isTrue(err.message.indexOf('Expected some media') > 0)
      assert.isNotNull(err.context)
      assert.isNotNull(err.context.cause)
      assert.isArray(err.context.cause.expected)
      assert.isNotTrue(err.context.cause.not)
      assert.deepEqual(err.context.cause.expected, [])
      assert.deepEqual(err.context.cause.actual, [])
    }
  })
  it('should succeed on not existing media if has no arg and negated', async function () {
    await this.mediaAsserter.assertNotConvoStep({ convoStep: { stepTag: 'test' } })
  })
  it('should fail on media if has no arg and negated', async function () {
    try {
      await this.mediaAsserter.assertNotConvoStep({
        convoStep: { stepTag: 'test' },
        args: [],
        botMsg: {
          media: [
            {
              mediaUri: 'test'
            }
          ]
        }
      })
      assert.fail('should have failed')
    } catch (err) {
      assert.isTrue(err.message.indexOf('Not expected media with uri "test"') > 0)
      assert.isNotNull(err.context)
      assert.isNotNull(err.context.cause)
      assert.isArray(err.context.cause.expected)
      assert.isTrue(err.context.cause.not)
      assert.deepEqual(err.context.cause.expected, [])
      assert.deepEqual(err.context.cause.actual, ['test'])
    }
  })
})

describe('scripting.asserters.mediaCountAsserter', function () {
  beforeEach(async function () {
    this.mediaCountAsserter = new MediaCountAsserter({}, {})
    this.mediaCountRecAsserter = new MediaCountRecAsserter({}, {})
  })

  it('should succeed on no args with one media', async function () {
    await this.mediaCountAsserter.assertConvoStep({
      convoStep: { stepTag: 'test' },
      args: [],
      botMsg: {
        media: [{ mediaUri: 'test.jpg' }]
      }
    })
  })
  it('should fail on no args with no media', async function () {
    try {
      await this.mediaCountAsserter.assertConvoStep({
        convoStep: { stepTag: 'test' },
        args: [],
        botMsg: {
          media: []
        }
      })
      assert.fail('should have failed')
    } catch (err) {
      assert.isTrue(err.message.indexOf('Expected Media count 0 to be >0') >= 0)
    }
  })
  it('should succeed on >=0 with one media', async function () {
    await this.mediaCountAsserter.assertConvoStep({
      convoStep: { stepTag: 'test' },
      args: ['>=0'],
      botMsg: {
        media: [{ mediaUri: 'test.jpg' }]
      }
    })
  })
  it('should succeed on >0 with one media', async function () {
    await this.mediaCountAsserter.assertConvoStep({
      convoStep: { stepTag: 'test' },
      args: ['>0'],
      botMsg: {
        media: [{ mediaUri: 'test.jpg' }]
      }
    })
  })
  it('should fail on >1 with one media', async function () {
    try {
      await this.mediaCountAsserter.assertConvoStep({
        convoStep: { stepTag: 'test' },
        args: ['>1'],
        botMsg: {
          media: [{ mediaUri: 'test.jpg' }]
        }
      })
      assert.fail('should have failed')
    } catch (err) {
      assert.isTrue(err.message.indexOf('Expected Media count 1 to be >1') >= 0)
    }
  })
  it('should succeed on <=1 with one media', async function () {
    await this.mediaCountAsserter.assertConvoStep({
      convoStep: { stepTag: 'test' },
      args: ['<=1'],
      botMsg: {
        media: [{ mediaUri: 'test.jpg' }]
      }
    })
  })
  it('should succeed on <2 with one media', async function () {
    await this.mediaCountAsserter.assertConvoStep({
      convoStep: { stepTag: 'test' },
      args: ['<2'],
      botMsg: {
        media: [{ mediaUri: 'test.jpg' }]
      }
    })
  })
  it('should succeed on no args with ! no media', async function () {
    await this.mediaCountAsserter.assertNotConvoStep({
      convoStep: { stepTag: 'test' },
      args: [],
      botMsg: {
        media: []
      }
    })
  })
  it('should fail on one args with ! one media', async function () {
    try {
      await this.mediaCountAsserter.assertNotConvoStep({
        convoStep: { stepTag: 'test' },
        args: [],
        botMsg: {
          media: [{ mediaUri: 'test.jpg' }]
        }
      })
      assert.fail('should have failed')
    } catch (err) {
      assert.isTrue(err.message.indexOf('Not expected Media count 1 to be >0') >= 0)
    }
  })
  it('should succeed on >1 with ! no media', async function () {
    await this.mediaCountAsserter.assertNotConvoStep({
      convoStep: { stepTag: 'test' },
      args: ['>1'],
      botMsg: {
        media: []
      }
    })
  })
  it('should fail on >1 with ! two media', async function () {
    try {
      await this.mediaCountAsserter.assertNotConvoStep({
        convoStep: { stepTag: 'test' },
        args: ['>1'],
        botMsg: {
          media: [{ mediaUri: 'test.jpg' }, { mediaUri: 'test.jpg' }]
        }
      })
      assert.fail('should have failed')
    } catch (err) {
      assert.isTrue(err.message.indexOf('Not expected Media count 2 to be >1') >= 0)
    }
  })
  it('should succeed on >3 with rec media', async function () {
    await this.mediaCountRecAsserter.assertConvoStep({
      convoStep: { stepTag: 'test' },
      args: ['>3'],
      botMsg: {
        media: [{ mediaUri: 'test.jpg' }],
        cards: [
          { image: { mediaUri: 'test.jpg ' } },
          { media: [{ mediaUri: 'test.jpg' }, { mediaUri: 'test.jpg' }] }
        ]
      }
    })
  })
})
