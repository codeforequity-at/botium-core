const assert = require('chai').assert
const { escapeJSONString } = require('../src/helpers/Utils')

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

  it('should escape nested newline within JSON string', () => {
    assert.equal(
      escapeJSONString('test \n123'),
      'test \\n123',
      'nested newlines should be escaped within JSON string'
    )
  })
})
