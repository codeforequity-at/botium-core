const assert = require('chai').assert
const { escapeJSONString, formatTimeout } = require('../src/helpers/Utils')

describe('utils.escapeJSON', function () {
  it('should not modify JSON string which is not containing double quotes', () => {
    assert.equal(
      escapeJSONString('test 123'),
      'test 123',
      'JSON string should not be modified'
    )
  })

  it('should escape nested double quotes within JSON string', () => {
    assert.equal(
      escapeJSONString('{"test 123"}'),
      '{\\"test 123\\"}',
      'nested double quotes should be escaped within JSON string'
    )
  })

  it('should not escape nested single quotes within JSON string', () => {
    assert.equal(
      escapeJSONString("{'test 123'}"),
      "{'test 123'}",
      'nested single quotes should not be escaped within JSON string'
    )
  })

  it('should escape nested newline within JSON string', () => {
    assert.equal(
      escapeJSONString('test \n123'),
      'test \\n123',
      'nested newlines should be escaped within JSON string'
    )
  })
})

describe('utils.formatTimeout', function () {
  it('should format seconds', () => {
    assert.equal(formatTimeout(2000), '2s')
  })
  it('should format milliseconds', () => {
    assert.equal(formatTimeout(800), '800ms')
  })
  it('should format seconds and milliseconds', () => {
    assert.equal(formatTimeout(2400), '2s 400ms')
  })
})
