const assert = require('chai').assert
const JsonPathAsserter = require('../../../src/scripting/logichook/asserter/JsonPathAsserter')

describe('scripting.asserters.mediaAsserter', function () {
  beforeEach(async function () {
    this.jsonPathAsserter = new JsonPathAsserter({
      Match: (botresponse, utterance) => botresponse.toLowerCase().indexOf(utterance.toLowerCase()) >= 0
    }, {})
  })

  it('should do nothing on no arg', async function () {
    await this.jsonPathAsserter.assertConvoStep({ })
  })
  it('should succeed on existing jsonpath', async function () {
    await this.jsonPathAsserter.assertConvoStep({
      convoStep: { stepTag: 'test' },
      args: ['$.test'],
      botMsg: {
        sourceData: {
          test: true
        }
      }
    })
  })
  it('should fail on not existing jsonpath', async function () {
    try {
      await this.jsonPathAsserter.assertConvoStep({
        convoStep: { stepTag: 'test' },
        args: ['$.test'],
        botMsg: {
          sourceData: {
          }
        }
      })
      assert.fail('expected jsonPathAsserter to fail')
    } catch (err) {
      assert.isTrue(err.message.includes('Could not find any element in jsonPath $.test'))
    }
  })
  it('should succeed on matching jsonpath', async function () {
    await this.jsonPathAsserter.assertConvoStep({
      convoStep: { stepTag: 'test' },
      args: ['$.test', 'test'],
      botMsg: {
        sourceData: {
          test: 'test'
        }
      }
    })
  })
  it('should succeed on matching jsonpath array', async function () {
    await this.jsonPathAsserter.assertConvoStep({
      convoStep: { stepTag: 'test' },
      args: ['$.test[0]', 'test'],
      botMsg: {
        sourceData: {
          test: ['test']
        }
      }
    })
  })
})
