const assert = require('chai').assert
const { escapeJSONString, formatTimeout } = require('../src/helpers/Utils')

describe('utils', function () {
  describe('escapeJSON', function () {
    it('should not modify JSON string which is not containing double quotes', function () {
      assert.equal(
        escapeJSONString('test 123'),
        'test 123',
        'JSON string should not be modified'
      )
    })

    it('should escape nested double quotes within JSON string', function () {
      assert.equal(
        escapeJSONString('{"test 123"}'),
        '{\\"test 123\\"}',
        'nested double quotes should be escaped within JSON string'
      )
    })

    it('should not escape nested single quotes within JSON string', function () {
      assert.equal(
        escapeJSONString('{\'test 123\'}'),
        '{\'test 123\'}',
        'nested single quotes should not be escaped within JSON string'
      )
    })

    it('should escape nested newline within JSON string', function () {
      assert.equal(
        escapeJSONString('test \n123'),
        'test \\n123',
        'nested newlines should be escaped within JSON string'
      )
    })
  })

  describe('formatTimeout', function () {
    it('should format seconds', function () {
      assert.equal(formatTimeout(2000), '2s')
    })
    it('should format milliseconds', function () {
      assert.equal(formatTimeout(800), '800ms')
    })
    it('should format seconds and milliseconds', function () {
      assert.equal(formatTimeout(2400), '2s 400ms')
    })
  })
})
