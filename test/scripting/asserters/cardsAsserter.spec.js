const assert = require('chai').assert
const CardsAsserter = require('../../../src/scripting/logichook/asserter/CardsAsserter')

describe('scripting.asserters.cardsAsserter', function () {
  beforeEach(async function () {
    this.cardsAsserter = new CardsAsserter({
      Match: (botresponse, utterance) => botresponse.toLowerCase().indexOf(utterance.toLowerCase()) >= 0
    }, {})
  })

  it('should do nothing on no arg', async function () {
    await this.cardsAsserter.assertConvoStep({ })
  })
  it('should succeed on existing card text', async function () {
    await this.cardsAsserter.assertConvoStep({
      convoStep: { stepTag: 'test' },
      args: ['cardtext'],
      botMsg: {
        cards: [
          {
            text: 'cardtext'
          }
        ]
      }
    })
  })
  it('should succeed on existing card subtext', async function () {
    await this.cardsAsserter.assertConvoStep({
      convoStep: { stepTag: 'test' },
      args: ['cardtext'],
      botMsg: {
        cards: [
          {
            subtext: 'cardtext'
          }
        ]
      }
    })
  })
  it('should succeed on existing card content', async function () {
    await this.cardsAsserter.assertConvoStep({
      convoStep: { stepTag: 'test' },
      args: ['cardtext'],
      botMsg: {
        cards: [
          {
            content: 'cardtext'
          }
        ]
      }
    })
  })
  it('should succeed on multiple existing cards', async function () {
    await this.cardsAsserter.assertConvoStep({
      convoStep: { stepTag: 'test' },
      args: ['cardtext1', 'cardtext2'],
      botMsg: {
        cards: [
          {
            text: 'cardtext1'
          },
          {
            text: 'cardtext2'
          }
        ]
      }
    })
  })
  it('should fail on missing card', async function () {
    try {
      await this.cardsAsserter.assertConvoStep({
        convoStep: { stepTag: 'test' },
        args: ['missingcard'],
        botMsg: { }
      })
      assert.fail('should have failed')
    } catch (err) {
      assert.isTrue(err.message.indexOf('Expected card(s) with text "missingcard"') > 0)
      assert.isNotNull(err.context)
      assert.isNotNull(err.context.cause)
      assert.isArray(err.context.cause.expected)
      assert.deepEqual(err.context.cause.expected, ['missingcard'])
      assert.deepEqual(err.context.cause.actual, [])
      assert.deepEqual(err.context.cause.diff, ['missingcard'])
    }
  })
  it('should fail on one missing card', async function () {
    try {
      await this.cardsAsserter.assertConvoStep({
        convoStep: { stepTag: 'test' },
        args: ['existingcard', 'missingcard'],
        botMsg: {
          cards: [
            {
              text: 'existingcard'
            },
            {
              text: 'cardtext2'
            }
          ]
        }
      })
      assert.fail('should have failed')
    } catch (err) {
      assert.isTrue(err.message.indexOf('Expected card(s) with text "missingcard"') > 0)
      assert.isNotNull(err.context)
      assert.isNotNull(err.context.cause)
      assert.isArray(err.context.cause.expected)
      assert.isNotTrue(err.context.cause.not)
      assert.deepEqual(err.context.cause.expected, ['existingcard', 'missingcard'])
      assert.deepEqual(err.context.cause.actual, ['existingcard', 'cardtext2'])
      assert.deepEqual(err.context.cause.diff, ['missingcard'])
    }
  })
  it('should succeed on unexpected card text', async function () {
    await this.cardsAsserter.assertNotConvoStep({
      convoStep: { stepTag: 'test' },
      args: ['cardtext1'],
      botMsg: {
        cards: [
          {
            text: 'cardtext'
          }
        ]
      }
    })
  })
  it('should fail on one unexpected card', async function () {
    try {
      await this.cardsAsserter.assertNotConvoStep({
        convoStep: { stepTag: 'test' },
        args: ['existingcard', 'missingcard'],
        botMsg: {
          cards: [
            {
              text: 'existingcard'
            },
            {
              text: 'cardtext2'
            }
          ]
        }
      })
      assert.fail('should have failed')
    } catch (err) {
      assert.isTrue(err.message.indexOf('Not expected card(s) with text "existingcard"') > 0)
      assert.isNotNull(err.context)
      assert.isNotNull(err.context.cause)
      assert.isArray(err.context.cause.expected)
      assert.isTrue(err.context.cause.not)
      assert.deepEqual(err.context.cause.expected, ['existingcard', 'missingcard'])
      assert.deepEqual(err.context.cause.actual, ['existingcard', 'cardtext2'])
      assert.deepEqual(err.context.cause.diff, ['existingcard'])
    }
  })
})
