const assert = require('chai').assert
const CardsAsserter = require('../../../src/scripting/logichook/asserter/CardsAsserter')
const CardsCountAsserter = require('../../../src/scripting/logichook/asserter/CardsCountAsserter')
const CardsCountRecAsserter = require('../../../src/scripting/logichook/asserter/CardsCountRecAsserter')

describe('scripting.asserters.cardsAsserter', function () {
  beforeEach(async function () {
    this.cardsAsserter = new CardsAsserter({
      Match: (botresponse, utterance) => botresponse.toLowerCase().indexOf(utterance.toLowerCase()) >= 0
    }, {})
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
  it('should succeed on existing card if has no arg', async function () {
    await this.cardsAsserter.assertConvoStep({
      convoStep: { stepTag: 'test' },
      args: [],
      botMsg: {
        cards: [
          {
            text: 'test'
          }
        ]
      }
    })
  })
  it('should fail on no card if has no arg', async function () {
    try {
      await this.cardsAsserter.assertConvoStep({ convoStep: { stepTag: 'test' } })
      assert.fail('should have failed')
    } catch (err) {
      assert.isTrue(err.message.indexOf('Expected some card(s)') > 0)
      assert.isNotNull(err.context)
      assert.isNotNull(err.context.cause)
      assert.isArray(err.context.cause.expected)
      assert.isNotTrue(err.context.cause.not)
      assert.deepEqual(err.context.cause.expected, [])
      assert.deepEqual(err.context.cause.actual, [])
    }
  })
  it('should succeed on not existing card if has no arg and negated', async function () {
    await this.cardsAsserter.assertNotConvoStep({ convoStep: { stepTag: 'test' } })
  })
  it('should fail on card if has no arg and negated', async function () {
    try {
      await this.cardsAsserter.assertNotConvoStep({
        convoStep: { stepTag: 'test' },
        args: [],
        botMsg: {
          cards: [
            {
              text: 'test'
            }
          ]
        }
      })
      assert.fail('should have failed')
    } catch (err) {
      assert.isTrue(err.message.indexOf('Not expected card(s) with text "test"') > 0)
      assert.isNotNull(err.context)
      assert.isNotNull(err.context.cause)
      assert.isArray(err.context.cause.expected)
      assert.isTrue(err.context.cause.not)
      assert.deepEqual(err.context.cause.expected, [])
      assert.deepEqual(err.context.cause.actual, ['test'])
    }
  })
})
describe('scripting.asserters.cardsCountAsserter', function () {
  beforeEach(async function () {
    this.cardsCountAsserter = new CardsCountAsserter({}, {})
    this.cardsCountRecAsserter = new CardsCountRecAsserter({}, {})
  })

  it('should succeed on no args with one card', async function () {
    await this.cardsCountAsserter.assertConvoStep({
      convoStep: { stepTag: 'test' },
      args: [],
      botMsg: {
        cards: [{ text: 'test.jpg' }]
      }
    })
  })

  it('should succeed on >=3 with rec cards', async function () {
    await this.cardsCountRecAsserter.assertConvoStep({
      convoStep: { stepTag: 'test' },
      args: ['>=3'],
      botMsg: {
        cards: [
          {
            text: 'card1',
            cards: [
              {
                text: 'card2',
                cards: [{ text: 'card3' }]
              }
            ]
          }
        ]
      }
    })
  })
})
