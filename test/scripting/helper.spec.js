const Capabilities = require('../../index').Capabilities
const { normalizeText } = require('../../src/scripting/helper')
const assert = require('chai').assert

describe('scripting.helper', function () {
  describe('NormalizeText', function () {
    it('Basic', async function () {
      assert.equal(normalizeText('Hello!  <br>And this is the body!!!', { [Capabilities.SCRIPTING_NORMALIZE_TEXT]: true }), 'Hello! And this is the body!!!')
    })

    it('Remove specific characters', async function () {
      // (,/,, +,-,//) -> ([",", "+", "-", "/"])
      assert.equal(normalizeText('Hello,!+-/  <br>And this is the body!!!', { [Capabilities.SCRIPTING_NORMALIZE_TEXT_REMOVE_CHARACTERES]: ',/,, +,-,//' }), 'Hello!  <br>And this is the body!!!')
    })

    it('Remove characters via multilang regex', async function () {
      // remove all emojis, currency symbols, and "`" character
      assert.equal(normalizeText('A ticket` to 大阪 costs ¥2000👌.', { [Capabilities.SCRIPTING_NORMALIZE_TEXT_REMOVE_REGEXP]: '[\\p{Emoji_Presentation}\\p{Currency_Symbol}`]' }), 'A ticket to 大阪 costs 2000.')
    })
  })
})
