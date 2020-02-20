const assert = require('chai').assert
const ButtonsAsserter = require('../../../src/scripting/logichook/asserter/ButtonsAsserter')

describe('scripting.asserters.buttonsAsserter', function () {
  beforeEach(async function () {
    this.buttonsAsserter = new ButtonsAsserter({
      Match: (botresponse, utterance) => botresponse.toLowerCase().indexOf(utterance.toLowerCase()) >= 0
    }, {})
  })

  it('should succeed on existing button', async function () {
    await this.buttonsAsserter.assertConvoStep({
      convoStep: { stepTag: 'test' },
      args: ['test'],
      botMsg: {
        buttons: [
          {
            text: 'test'
          }
        ]
      }
    })
  })
  it('should succeed on existing card button', async function () {
    await this.buttonsAsserter.assertConvoStep({
      convoStep: { stepTag: 'test' },
      args: ['test'],
      botMsg: {
        cards: [
          {
            buttons: [
              {
                text: 'test'
              }
            ]
          }
        ]
      }
    })
  })
  it('should succeed on existing card buttons', async function () {
    await this.buttonsAsserter.assertConvoStep({
      convoStep: { stepTag: 'test' },
      args: ['test', 'test1'],
      botMsg: {
        buttons: [
          {
            text: 'test'
          }
        ],
        cards: [
          {
            buttons: [
              {
                text: 'test1'
              }
            ]
          }
        ]
      }
    })
  })
  it('should succeed on existing card buttons', async function () {
    await this.buttonsAsserter.assertConvoStep({
      convoStep: { stepTag: 'test' },
      args: ['test', 'test1'],
      botMsg: {
        buttons: [
          {
            text: 'test'
          }
        ],
        cards: [
          {
            buttons: [
              {
                text: 'test1'
              }
            ]
          }
        ]
      }
    })
  })
  it('should succeed on not existing button', async function () {
    await this.buttonsAsserter.assertNotConvoStep({
      convoStep: { stepTag: 'test' },
      args: ['test1'],
      botMsg: {
        buttons: [
          {
            text: 'test'
          }
        ]
      }
    })
  })
  it('should fail on unexpected button', async function () {
    try {
      await this.buttonsAsserter.assertNotConvoStep({
        convoStep: { stepTag: 'test' },
        args: ['test', 'test1'],
        botMsg: {
          buttons: [
            {
              text: 'test'
            }
          ]
        }
      })
      assert.fail('should have failed')
    } catch (err) {
      assert.isTrue(err.message.indexOf('Not expected button(s) with text "test"') > 0)
      assert.isNotNull(err.context)
      assert.isNotNull(err.context.cause)
      assert.isArray(err.context.cause.expected)
      assert.isTrue(err.context.cause.not)
      assert.deepEqual(err.context.cause.expected, ['test', 'test1'])
      assert.deepEqual(err.context.cause.actual, ['test'])
      assert.deepEqual(err.context.cause.diff, ['test'])
    }
  })
  it('should succeed on existing button if has no arg', async function () {
    await this.buttonsAsserter.assertConvoStep({
      convoStep: { stepTag: 'test' },
      args: [],
      botMsg: {
        buttons: [
          {
            text: 'test'
          }
        ]
      }
    })
  })
  it('should fail on no button if has no arg', async function () {
    try {
      await this.buttonsAsserter.assertConvoStep({ convoStep: { stepTag: 'test' } })
      assert.fail('should have failed')
    } catch (err) {
      assert.isTrue(err.message.indexOf('Expected some button(s)') > 0)
      assert.isNotNull(err.context)
      assert.isNotNull(err.context.cause)
      assert.isArray(err.context.cause.expected)
      assert.isNotTrue(err.context.cause.not)
      assert.deepEqual(err.context.cause.expected, [])
      assert.deepEqual(err.context.cause.actual, [])
    }
  })
  it('should succeed on not existing button if has no arg and negated', async function () {
    await this.buttonsAsserter.assertNotConvoStep({ convoStep: { stepTag: 'test' } })
  })
  it('should fail on button if has no arg and negated', async function () {
    try {
      await this.buttonsAsserter.assertNotConvoStep({
        convoStep: { stepTag: 'test' },
        args: [],
        botMsg: {
          buttons: [
            {
              text: 'test'
            }
          ]
        }
      })
      assert.fail('should have failed')
    } catch (err) {
      assert.isTrue(err.message.indexOf('Not expected button(s) with text "test"') > 0)
      assert.isNotNull(err.context)
      assert.isNotNull(err.context.cause)
      assert.isArray(err.context.cause.expected)
      assert.isTrue(err.context.cause.not)
      assert.deepEqual(err.context.cause.expected, [])
      assert.deepEqual(err.context.cause.actual, ['test'])
    }
  })
})
