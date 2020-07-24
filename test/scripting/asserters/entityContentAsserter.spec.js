const chai = require('chai')
const assert = require('chai').assert
chai.use(require('chai-as-promised'))

const EntityContentAsserter = require('../../../src/scripting/logichook/asserter/EntityContentAsserter')

describe('scripting.asserters.entityContentAsserter', function () {
  beforeEach(async function () {
    this.asserter = new EntityContentAsserter({
      Match: (botresponse, utterance) => botresponse.toLowerCase().indexOf(utterance.toLowerCase()) >= 0
    }, {})
  })

  it('should fail on no arg', async function () {
    try {
      await this.asserter.assertConvoStep({
        convoStep: { stepTag: 'test' },
        args: [],
        botMsg: {}
      })
      assert.fail('should have failed')
    } catch (err) {
      assert.isTrue(err.message.indexOf('EntityContentAsserter Missing argument') > 0)
      assert.isNotNull(err.context)
      assert.equal(err.context.type, 'asserter')
      assert.equal(err.context.source, 'EntityContentAsserter')
    }
  })

  it('should fail on 1 arg', async function () {
    try {
      await this.asserter.assertConvoStep({
        convoStep: { stepTag: 'test' },
        args: ['something'],
        botMsg: {}
      })
      assert.fail('should have failed')
    } catch (err) {
      assert.isTrue(err.message.indexOf('EntityContentAsserter Missing argument') > 0)
      assert.isNotNull(err.context)
      assert.equal(err.context.type, 'asserter')
      assert.equal(err.context.source, 'EntityContentAsserter')
    }
  })

  it('should fail if entity is missing', async function () {
    try {
      await this.asserter.assertConvoStep({
        convoStep: { stepTag: 'test' },
        args: ['something', 'something_value'],
        botMsg: {}
      })
      assert.fail('should have failed')
    } catch (err) {
      assert.isTrue(err.message.indexOf('Expected entity "something" but found nothing') > 0)
      assert.isNotNull(err.context)
      assert.equal(err.context.type, 'asserter')
      assert.equal(err.context.source, 'EntityContentAsserter')
    }
  })

  it('should fail if entity is not found', async function () {
    try {
      await this.asserter.assertConvoStep({
        convoStep: { stepTag: 'test' },
        args: ['something', 'something_value'],
        botMsg: {
          nlp: {
            entities: [
              {
                name: 'entity1',
                value: 'entity1_value1'
              },
              {
                name: 'entity1',
                value: 'entity1_value2'
              },
              {
                name: 'entity2',
                value: 'entity2_value'
              }
            ]
          }
        }
      })
      assert.fail('should have failed')
    } catch (err) {
      assert.isTrue(err.message.indexOf('test: Missing entity content: [ \'something_value\' ] of entity "something"') >= 0)
      assert.isNotNull(err.context)
      assert.equal(err.context.type, 'asserter')
      assert.equal(err.context.source, 'EntityContentAsserter')
      assert.isNotNull(err.context.cause)
      assert.equal(err.context.cause.entity, 'something')
      assert.deepEqual(err.context.cause.expected, ['something_value'])
      assert.deepEqual(err.context.cause.actual, [])
      assert.deepEqual(err.context.cause.notInActual, ['something_value'])
    }
  })

  it('should fail if we except more', async function () {
    try {
      await this.asserter.assertConvoStep({
        convoStep: { stepTag: 'test' },
        args: ['entity1', 'entity1_value1', 'entity1_value1', 'entity1_value3'],
        botMsg: {
          nlp: {
            entities: [
              {
                name: 'entity1',
                value: 'entity1_value1'
              },
              {
                name: 'entity1',
                value: 'entity1_value2'
              },
              {
                name: 'entity2',
                value: 'entity2_value'
              }
            ]
          }
        }
      })
      assert.fail('should have failed')
    } catch (err) {
      assert.isTrue(err.message.indexOf('test: Missing entity content: [ \'entity1_value1\', \'entity1_value3\' ] of entity "entity1"') >= 0)
      assert.isNotNull(err.context)
      assert.equal(err.context.type, 'asserter')
      assert.equal(err.context.source, 'EntityContentAsserter')
      assert.isNotNull(err.context.cause)
      assert.equal(err.context.cause.entity, 'entity1')
      assert.deepEqual(err.context.cause.expected, ['entity1_value1', 'entity1_value1', 'entity1_value3'])
      assert.deepEqual(err.context.cause.actual, ['entity1_value1', 'entity1_value2'])
      assert.deepEqual(err.context.cause.notInActual, ['entity1_value1', 'entity1_value3'])
    }
  })

  it('should success if we except less', async function () {
    await this.asserter.assertConvoStep({
      convoStep: { stepTag: 'test' },
      args: ['entity1', 'entity1_value1', 'entity1_value2'],
      botMsg: {
        nlp: {
          entities: [
            {
              name: 'entity1',
              value: 'entity1_value1'
            },
            {
              name: 'entity1',
              value: 'entity1_value2'
            },
            {
              name: 'entity2',
              value: 'entity2_value'
            }
          ]
        }
      }
    })
  })

  it('should success on single joker-match', async function () {
    await this.asserter.assertConvoStep({
      convoStep: { stepTag: 'test' },
      args: ['entity1', 'value1'],
      botMsg: {
        nlp: {
          entities: [
            {
              name: 'entity1',
              value: 'entity1_value1'
            },
            {
              name: 'entity1',
              value: 'entity1_value2'
            }
          ]
        }
      }
    })
  })

  it('should success on multiple joker-match', async function () {
    await this.asserter.assertConvoStep({
      convoStep: { stepTag: 'test' },
      args: ['entity1', 'entity1'],
      botMsg: {
        nlp: {
          entities: [
            {
              name: 'entity1',
              value: 'entity1_value1'
            },
            {
              name: 'entity1',
              value: 'entity1_value2'
            }
          ]
        }
      }
    })
  })
})
