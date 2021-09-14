const assert = require('chai').assert
const JsonPathAsserter = require('../../../src/scripting/logichook/asserter/JsonPathAsserter')
const JsonPathCountAsserter = require('../../../src/scripting/logichook/asserter/JsonPathCountAsserter')
const { getMatchFunction } = require('../../../src/scripting/MatchFunctions')

describe('scripting.asserters.jsonPathAsserter', function () {
  beforeEach(async function () {
    this.jsonPathAsserter = new JsonPathAsserter({
      Match: (botresponse, utterance) => botresponse.toLowerCase().indexOf(utterance.toLowerCase()) >= 0
    }, {})
    this.jsonPathAsserterWildcard = new JsonPathAsserter({
      Match: getMatchFunction('wildcardIgnoreCase')
    }, {})
    this.jsonPathAsserterGlobalArgs = new JsonPathAsserter({
      Match: (botresponse, utterance) => botresponse.toLowerCase().indexOf(utterance.toLowerCase()) >= 0
    }, {}, { path: '$.test' })
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
  it('should succeed on any existing jsonpath', async function () {
    await this.jsonPathAsserter.assertConvoStep({
      convoStep: { stepTag: 'test' },
      args: ['$.messages[*].label', 'message3'],
      botMsg: {
        sourceData: {
          messages: [
            { label: 'message1' },
            { label: 'message2' },
            { label: 'message3' }
          ]
        }
      }
    })
  })
  it('should fail on not any existing jsonpath', async function () {
    try {
      await this.jsonPathAsserter.assertConvoStep({
        convoStep: { stepTag: 'test' },
        args: ['$.messages[*].label', 'message4'],
        botMsg: {
          sourceData: {
            messages: [
              { label: 'message1' },
              { label: 'message2' },
              { label: 'message3' }
            ]
          }
        }
      })
    } catch (err) {
      console.log(err.message)
      assert.isTrue(err.message.includes('Expected: message4 in jsonPath $.messages[*].label: Actual: message1,message2,message3'))
    }
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
  it('should succeed on jsonpath object', async function () {
    await this.jsonPathAsserterWildcard.assertConvoStep({
      convoStep: { stepTag: 'test' },
      args: ['$.messages[0]', '{"label":"message1"}'],
      botMsg: {
        sourceData: {
          messages: [
            { label: 'message1' },
            { label: 'message2' },
            { label: 'message3' }
          ]
        }
      }
    })
  })
  it('should fail on invalid jsonpath object', async function () {
    try {
      await this.jsonPathAsserterWildcard.assertConvoStep({
        convoStep: { stepTag: 'test' },
        args: ['$.messages[0]', '{"label":"message2"}'],
        botMsg: {
          sourceData: {
            messages: [
              { label: 'message1' },
              { label: 'message2' },
              { label: 'message3' }
            ]
          }
        }
      })
    } catch (err) {
      assert.isTrue(err.message.indexOf('Expected: {"label":"message2"} in jsonPath $.messages[0]: Actual: {"label":"message1"}') > 0)
      assert.isNotNull(err.context)
      assert.isNotNull(err.context.cause)
      assert.isNotTrue(err.context.cause.not)
      assert.equal(err.context.cause.expected, '{"label":"message2"}')
      assert.deepEqual(err.context.cause.actual, { label: 'message1' })
    }
  })

  it('should fail on not matching jsonpath', async function () {
    try {
      await this.jsonPathAsserter.assertConvoStep({
        convoStep: { stepTag: 'test' },
        args: ['$.test', 'test2'],
        botMsg: {
          sourceData: {
            test: 'test1'
          }
        }
      })
      assert.fail('should have failed')
    } catch (err) {
      assert.isTrue(err.message.indexOf('Expected: test2 in jsonPath $.test') > 0)
      assert.isNotNull(err.context)
      assert.isNotNull(err.context.cause)
      assert.isNotTrue(err.context.cause.not)
      assert.equal(err.context.cause.expected, 'test2')
      assert.equal(err.context.cause.actual, 'test1')
    }
  })
  it('should succeed on non existing jsonpath', async function () {
    await this.jsonPathAsserter.assertNotConvoStep({
      convoStep: { stepTag: 'test' },
      args: ['$.test'],
      botMsg: {
        sourceData: {
        }
      }
    })
  })
  it('should succeed on non matching jsonpath', async function () {
    await this.jsonPathAsserter.assertNotConvoStep({
      convoStep: { stepTag: 'test' },
      args: ['$.test', 'test2'],
      botMsg: {
        sourceData: {
          test: 'test1'
        }
      }
    })
  })
  it('should fail on matching jsonpath', async function () {
    try {
      await this.jsonPathAsserter.assertNotConvoStep({
        convoStep: { stepTag: 'test' },
        args: ['$.test', 'test1'],
        botMsg: {
          sourceData: {
            test: 'test1'
          }
        }
      })
      assert.fail('should have failed')
    } catch (err) {
      assert.isTrue(err.message.indexOf('Not expected: test1 in jsonPath $.test') > 0)
      assert.isNotNull(err.context)
      assert.isNotNull(err.context.cause)
      assert.isTrue(err.context.cause.not)
      assert.equal(err.context.cause.expected, 'test1')
      assert.equal(err.context.cause.actual, 'test1')
    }
  })

  it('should succeed on existing jsonpath from globalArgs', async function () {
    await this.jsonPathAsserterGlobalArgs.assertConvoStep({
      convoStep: { stepTag: 'test' },
      botMsg: {
        sourceData: {
          test: true
        }
      }
    })
  })
  it('should succeed on matching jsonpath from globalArgs', async function () {
    await this.jsonPathAsserter.assertConvoStep({
      convoStep: { stepTag: 'test' },
      args: ['test'],
      botMsg: {
        sourceData: {
          test: 'test'
        }
      }
    })
  })
  it('should fail on not existing jsonpath from globalArgs', async function () {
    try {
      await this.jsonPathAsserterGlobalArgs.assertConvoStep({
        convoStep: { stepTag: 'test' },
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
  it('should fail on not matching jsonpath from globalArgs', async function () {
    try {
      await this.jsonPathAsserterGlobalArgs.assertConvoStep({
        convoStep: { stepTag: 'test' },
        args: ['test2'],
        botMsg: {
          sourceData: {
            test: 'test1'
          }
        }
      })
      assert.fail('should have failed')
    } catch (err) {
      assert.isTrue(err.message.indexOf('Expected: test2 in jsonPath $.test') > 0)
      assert.isNotNull(err.context)
      assert.isNotNull(err.context.cause)
      assert.isNotTrue(err.context.cause.not)
      assert.equal(err.context.cause.expected, 'test2')
      assert.equal(err.context.cause.actual, 'test1')
    }
  })

  it('should fail on invalid arg length from pathPattern', async function () {
    this.jsonPathAsserter.globalArgs = {
      argCount: 0,
      pathTemplate: '$.test'
    }
    try {
      await this.jsonPathAsserter.assertConvoStep({
        convoStep: { stepTag: 'test' },
        args: ['test2'],
        botMsg: {
          sourceData: {
            test: 'test1'
          }
        }
      })
      assert.fail('should have failed')
    } catch (err) {
      assert.isTrue(err.message.indexOf('JsonPathAsserter 0 arguments expected') > 0)
    }
  })
  it('should succeed on existing jsonpath from pathPattern', async function () {
    this.jsonPathAsserter.globalArgs = {
      argCount: 1,
      pathTemplate: '$.{{args.0}}'
    }

    await this.jsonPathAsserter.assertConvoStep({
      convoStep: { stepTag: 'test' },
      args: ['test'],
      botMsg: {
        sourceData: {
          test: true
        }
      }
    })
  })
  it('should succeed on existing jsonpath from pathPattern and assertPattern', async function () {
    this.jsonPathAsserter.globalArgs = {
      argCount: 2,
      pathTemplate: '$.{{args.0}}',
      assertTemplate: '{{args.1}}'
    }

    await this.jsonPathAsserter.assertConvoStep({
      convoStep: { stepTag: 'test' },
      args: ['test', 'value'],
      botMsg: {
        sourceData: {
          test: 'value'
        }
      }
    })
  })
  it('should fail on not matching jsonpath from pathPattern and assertPattern', async function () {
    this.jsonPathAsserter.globalArgs = {
      argCount: 2,
      pathTemplate: '$.{{args.0}}',
      assertTemplate: '{{args.1}}'
    }
    try {
      await this.jsonPathAsserter.assertConvoStep({
        convoStep: { stepTag: 'test' },
        args: ['test', 'value'],
        botMsg: {
          sourceData: {
            test: 'something else'
          }
        }
      })
      assert.fail('should have failed')
    } catch (err) {
      assert.isTrue(err.message.indexOf('Expected: value in jsonPath $.test') > 0)
    }
  })
  it('should succeed on setting matching mode in global args', async function () {
    this.jsonPathAsserter.globalArgs = {
      argCount: 2,
      pathTemplate: '$.{{args.0}}',
      assertTemplate: '{{args.1}}',
      matchingMode: 'include'
    }

    await this.jsonPathAsserter.assertConvoStep({
      convoStep: { stepTag: 'test' },
      args: ['test', 'value'],
      botMsg: {
        sourceData: {
          test: 'value 123'
        }
      }
    })
  })
  it('should fail on setting matching mode in global args', async function () {
    this.jsonPathAsserter.globalArgs = {
      argCount: 2,
      pathTemplate: '$.{{args.0}}',
      assertTemplate: '{{args.1}}',
      matchingMode: 'include'
    }

    try {
      await this.jsonPathAsserter.assertConvoStep({
        convoStep: { stepTag: 'test' },
        args: ['test', 'value1'],
        botMsg: {
          sourceData: {
            test: 'value'
          }
        }
      })
      assert.fail('should have failed')
    } catch (err) {
      assert.isTrue(err.message.indexOf('Expected: value1 in jsonPath $.test') > 0)
    }
  })
})

describe('scripting.asserters.jsonPathCountAsserter', function () {
  beforeEach(async function () {
    this.jsonPathCountAsserter = new JsonPathCountAsserter({}, {})
  })

  it('should succeed on no args with one jsonpath', async function () {
    await this.jsonPathCountAsserter.assertConvoStep({
      convoStep: { stepTag: 'test' },
      args: ['$.test'],
      botMsg: {
        sourceData: {
          test: [{ e1: 'e1' }, { e2: 'e2' }]
        }
      }
    })
  })
  it('should succeed on <=2 with two jsonpath', async function () {
    await this.jsonPathCountAsserter.assertConvoStep({
      convoStep: { stepTag: 'test' },
      args: ['$.test', '<=2'],
      botMsg: {
        sourceData: {
          test: [{ e1: 'e1' }, { e2: 'e2' }]
        }
      }
    })
  })
  it('should fail on >2 with two jsonpath', async function () {
    try {
      await this.jsonPathCountAsserter.assertConvoStep({
        convoStep: { stepTag: 'test' },
        args: ['$.test', '>2'],
        botMsg: {
          sourceData: {
            test: [{ e1: 'e1' }, { e2: 'e2' }]
          }
        }
      })
      assert.fail('should have failed')
    } catch (err) {
      assert.isTrue(err.message.indexOf('Expected JsonPath count 2 to be >2') >= 0)
    }
  })
})
