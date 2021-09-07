const fs = require('fs')
const path = require('path')
const assert = require('chai').assert
const Compiler = require('../../src/scripting/CompilerTxt')
const DefaultCapabilities = require('../../src/Defaults').Capabilities

const CONVOS_DIR = 'convos/txt'

const buildContext = () => {
  const result = {
    IsAsserterValid: () => false,
    IsUserInputValid: () => false,
    IsLogicHookValid: () => false,
    AddConvos: (c) => { result.convos = result.convos.concat(c) },
    AddUtterances: (u) => { result.utterances = result.utterances.concat(u) },
    convos: [],
    utterances: []
  }
  return result
}

const buildContextWithPause = () => {
  const result = {
    IsAsserterValid: (name) => name === 'BUTTONS',
    IsUserInputValid: () => false,
    IsLogicHookValid: (name) => name === 'PAUSE',
    AddConvos: (c) => { result.convos = result.convos.concat(c) },
    AddUtterances: (u) => { result.utterances = result.utterances.concat(u) },
    convos: [],
    utterances: []
  }
  return result
}
describe('compiler.compilertxt', function () {
  it('should trim invalid sender', async function () {
    const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_invalidsender.convo.txt'))
    const context = buildContext()
    const caps = {
    }
    const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))
    compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
    assert.equal(context.convos[0].conversation.length, 0)
  })
  // this group uses different compiler, because here are asserters
  it('should keep newlines within message', async function () {
    const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_with_newlines.convo.txt'))
    const context = buildContext()
    const caps = {
    }
    const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

    compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
    const convo = context.convos[0]
    assert.equal(convo.conversation[0].messageText, 'Hallo\n\nHallo2')
    assert.equal(convo.conversation[1].messageText, 'Hallo\n\nHallo2')
  })
  it('should read msg if there is just text', async function () {
    const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_emptyrow_just_text.convo.txt'))
    const context = buildContext()
    const caps = {
    }
    const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

    compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
    const convo = context.convos[0]
    assert.equal(convo.conversation.length, 2)
    assert.equal(convo.conversation[0].messageText, 'Hello')
    assert.equal(convo.conversation[1].messageText, 'Hi')
  })
  it('should read msg if there is just text, even if it is not separated by newline', async function () {
    const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_emptyrow_just_text_no_separator_row.convo.txt'))
    const context = buildContext()
    const caps = {
    }
    const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

    compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
    const convo = context.convos[0]
    assert.equal(convo.conversation.length, 2)
    assert.equal(convo.conversation[0].messageText, 'Hello')
    assert.equal(convo.conversation[1].messageText, 'Hi')
  })
  it('should read nothing if there is nothing', async function () {
    const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_emptyrow_empty.convo.txt'))
    const context = buildContext()
    const caps = {
    }
    const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

    compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
    const convo = context.convos[0]
    assert.equal(convo.conversation.length, 2)
    assert.equal(convo.conversation[0].messageText, '')
    assert.equal(convo.conversation[0].logicHooks.length, 0)
    assert.equal(convo.conversation[1].messageText, 'Hi')
  })
  it('should read empty row if there are at least 2 empty rows', async function () {
    const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_emptyrow_just_emptyrow.convo.txt'))
    const context = buildContext()
    const caps = {
    }
    const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

    compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
    const convo = context.convos[0]
    assert.equal(convo.conversation.length, 2)
    assert.equal(convo.conversation[0].messageText, '')
    assert.equal(convo.conversation[0].logicHooks.length, 0)
    assert.equal(convo.conversation[1].messageText, 'Hi')
  })
  it('should read nothing if there is nothing (even no separator)', async function () {
    const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_emptyrow_no_separator_row.convo.txt'))
    const context = buildContext()
    const caps = {
    }
    const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

    compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
    const convo = context.convos[0]
    assert.equal(convo.conversation.length, 2)
    assert.equal(convo.conversation[0].messageText, null)
    assert.equal(convo.conversation[0].logicHooks.length, 0)
    assert.equal(convo.conversation[1].messageText, 'Hi')
  })

  /*
  It is possible to create bot sections like
  #bot
  hello
  BUTTON anybutton
  Joe!
  maybe its a bad behaviour. This section checks just that it does not disturbs the
  "order of asserters/logichooks/maintext matters" feature
  */
  describe('compiler.compilertxt.multitext', function () {
    it('should accept multi text messages assertes between them. Text before, text after', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_multi_text_in_bot_asserter_text_text.convo.txt'))
      const context = buildContextWithPause()
      const compiler = new Compiler(context, DefaultCapabilities)

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      const convo = context.convos[0]

      assert.equal(convo.conversation.length, 1)

      assert.equal(convo.conversation[0].asserters.length, 1)
      assert.deepEqual(convo.conversation[0].asserters[0], { name: 'BUTTONS', args: ['Test'], not: false, optional: false, order: 1 })
      assert.equal(convo.conversation[0].messageText, 'sometext\nsometext2')
    })
    it('should accept multi text messages assertes between them. Empty before, text after', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_multi_text_in_bot_asserter_empty_text.convo.txt'))
      const context = buildContextWithPause()
      const compiler = new Compiler(context, DefaultCapabilities)

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      const convo = context.convos[0]

      assert.equal(convo.conversation.length, 1)

      assert.equal(convo.conversation[0].asserters.length, 1)
      assert.deepEqual(convo.conversation[0].asserters[0], { name: 'BUTTONS', args: ['Test'], not: false, optional: false, order: 0 })
      assert.equal(convo.conversation[0].messageText, 'sometext')
    })
    it('should accept multi text messages assertes between them. Text before, empty after', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_multi_text_in_bot_asserter_text_empty.convo.txt'))
      const context = buildContextWithPause()
      const compiler = new Compiler(context, DefaultCapabilities)

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      const convo = context.convos[0]

      assert.equal(convo.conversation.length, 1)

      assert.equal(convo.conversation[0].asserters.length, 1)
      assert.deepEqual(convo.conversation[0].asserters[0], { name: 'BUTTONS', args: ['Test'], not: false, optional: false, order: 1 })
      assert.equal(convo.conversation[0].messageText, 'sometext')
    })
    it('should should accept multi text messages logichooks between them. Text before, text after', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_multi_text_in_bot_logichook_text_text.convo.txt'))
      const context = buildContextWithPause()
      const compiler = new Compiler(context, DefaultCapabilities)

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      const convo = context.convos[0]

      assert.equal(convo.conversation.length, 1)

      assert.equal(convo.conversation[0].logicHooks.length, 1)
      assert.deepEqual(convo.conversation[0].logicHooks[0], { name: 'PAUSE', args: ['1'], order: 1 })
      assert.equal(convo.conversation[0].messageText, 'sometext\nsometext2')
    })
    it('should should accept multi text messages logichooks between them. Empty before, text after', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_multi_text_in_bot_logichook_empty_text.convo.txt'))
      const context = buildContextWithPause()
      const compiler = new Compiler(context, DefaultCapabilities)

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      const convo = context.convos[0]

      assert.equal(convo.conversation.length, 1)

      assert.equal(convo.conversation[0].logicHooks.length, 1)
      assert.deepEqual(convo.conversation[0].logicHooks[0], { name: 'PAUSE', args: ['1'], order: 0 })
      assert.equal(convo.conversation[0].messageText, 'sometext')
    })
    it('should should accept multi text messages logichooks between them. Text before, empty after', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_multi_text_in_bot_logichook_text_empty.convo.txt'))
      const context = buildContextWithPause()
      const compiler = new Compiler(context, DefaultCapabilities)

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      const convo = context.convos[0]

      assert.equal(convo.conversation.length, 1)

      assert.equal(convo.conversation[0].logicHooks.length, 1)
      assert.deepEqual(convo.conversation[0].logicHooks[0], { name: 'PAUSE', args: ['1'], order: 1 })
      assert.equal(convo.conversation[0].messageText, 'sometext')
    })
    it('should should accept multi text messages in me section logichooks between them. Text before, text after', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_multi_text_in_me_text_text.convo.txt'))
      const context = buildContextWithPause()
      const compiler = new Compiler(context, DefaultCapabilities)

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      const convo = context.convos[0]

      assert.equal(convo.conversation.length, 1)

      assert.equal(convo.conversation[0].logicHooks.length, 1)
      assert.deepEqual(convo.conversation[0].logicHooks[0], { name: 'PAUSE', args: ['1'], order: 1 })
      assert.equal(convo.conversation[0].messageText, 'sometext\nsometext2')
    })
    it('should should accept multi text messages in me section logichooks between them. Empty before, text after', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_multi_text_in_me_empty_text.convo.txt'))
      const context = buildContextWithPause()
      const compiler = new Compiler(context, DefaultCapabilities)

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      const convo = context.convos[0]

      assert.equal(convo.conversation.length, 1)

      assert.equal(convo.conversation[0].logicHooks.length, 1)
      assert.deepEqual(convo.conversation[0].logicHooks[0], { name: 'PAUSE', args: ['1'], order: 0 })
      assert.equal(convo.conversation[0].messageText, 'sometext')
    })
    it('should should accept multi text messages in me section logichooks between them. Text before, empty after', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_multi_text_in_me_text_empty.convo.txt'))
      const context = buildContextWithPause()
      const compiler = new Compiler(context, DefaultCapabilities)

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      const convo = context.convos[0]

      assert.equal(convo.conversation.length, 1)

      assert.equal(convo.conversation[0].logicHooks.length, 1)
      assert.deepEqual(convo.conversation[0].logicHooks[0], { name: 'PAUSE', args: ['1'], order: 1 })
      assert.equal(convo.conversation[0].messageText, 'sometext')
    })
  })

  describe('compiler.compilertxt.modifiers', function () {
    it('should read ! as not', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_with!.convo.txt'))
      const context = buildContext()

      const caps = {
      }
      const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      assert.equal(context.convos[0].conversation[1].messageText, 'test 2')
      assert.equal(context.convos[0].conversation[1].not, true)
    })
    it('should read !! as !', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_with!!.convo.txt'))
      const context = buildContext()
      const caps = {
      }
      const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      assert.equal(context.convos[0].conversation[1].messageText, '!test 2')
      assert.equal(context.convos[0].conversation[1].not, false)
    })
    it('should read n*! as (n-1)*!', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_with!!!!.convo.txt'))
      const context = buildContext()

      const caps = {
      }
      const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      assert.equal(context.convos[0].conversation[1].messageText, '!!!test 2')
      assert.equal(context.convos[0].conversation[1].not, false)
    })
    it('should read ! as ! in second line', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_with!_secline.convo.txt'))
      const context = buildContext()
      const caps = {
      }
      const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      assert.equal(context.convos[0].conversation[1].messageText, 'test 2\n!test 2')
      assert.equal(context.convos[0].conversation[1].not, true)
    })
    it('should read ? as optional', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_with?.convo.txt'))
      const context = buildContext()

      const caps = {
      }
      const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      assert.equal(context.convos[0].conversation[1].messageText, 'test 2')
      assert.equal(context.convos[0].conversation[1].optional, true)
    })
    it('should read ?? as ?', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_with??.convo.txt'))
      const context = buildContext()
      const caps = {
      }
      const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      assert.equal(context.convos[0].conversation[1].messageText, '?test 2')
      assert.equal(context.convos[0].conversation[1].optional, false)
    })
    it('should read ?! as optional and not', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_with?!.convo.txt'))
      const context = buildContext()

      const caps = {
      }
      const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      assert.equal(context.convos[0].conversation[1].messageText, 'test 2')
      assert.equal(context.convos[0].conversation[1].not, true)
      assert.equal(context.convos[0].conversation[1].optional, true)
    })
    it('should read ??! as ?!', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_with??!.convo.txt'))
      const context = buildContext()

      const caps = {
      }
      const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      assert.equal(context.convos[0].conversation[1].messageText, '?!test 2')
      assert.equal(context.convos[0].conversation[1].not, false)
      assert.equal(context.convos[0].conversation[1].optional, false)
    })
    it('should read n*? as (n-1)*?', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_with????.convo.txt'))
      const context = buildContext()

      const caps = {
      }
      const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      assert.equal(context.convos[0].conversation[1].messageText, '???test 2')
      assert.equal(context.convos[0].conversation[1].optional, false)
    })
    it('should read ? as ? in second line', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_with?_secline.convo.txt'))
      const context = buildContext()
      const caps = {
      }
      const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      assert.equal(context.convos[0].conversation[1].messageText, 'test 2\n?test 2')
      assert.equal(context.convos[0].conversation[1].optional, true)
    })
    it('should allow text starting with ##', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_with_#.convo.txt'))
      const context = buildContext()
      const caps = {
      }
      const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      assert.equal(context.convos[0].conversation.length, 2)
      assert.equal(context.convos[0].conversation[0].messageText, '# one hash')
      assert.equal(context.convos[0].conversation[1].messageText, '## two hashes')
    })
  })

  describe('compiler.compilertxt.logichooks', function () {
    it('should read logicHook if there is just logicHook', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_emptyrow_just_asserter.convo.txt'))
      const context = buildContextWithPause()
      const caps = {
      }
      const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      const convo = context.convos[0]
      assert.equal(convo.conversation.length, 2)
      assert.equal(convo.conversation[0].messageText, null)
      assert.equal(convo.conversation[0].logicHooks.length, 1)
      assert.equal(convo.conversation[1].messageText, 'Hi')
    })
    it('should read logicHook if there is just logicHook, even if it is not separated by newline', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_emptyrow_just_asserter_no_separator_row.convo.txt'))
      const context = buildContextWithPause()
      const caps = {
      }
      const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      const convo = context.convos[0]
      assert.equal(convo.conversation.length, 2)
      assert.equal(convo.conversation[0].messageText, null)
      assert.equal(convo.conversation[0].logicHooks.length, 1)
      assert.equal(convo.conversation[1].messageText, 'Hi')
    })
  })

  describe('compiler.compilertxt.asserter', function () {
    it('should consider modificator for asserter', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_asserter_modificator.convo.txt'))
      const context = buildContextWithPause()
      const caps = {
      }
      const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      const convo = context.convos[0]
      assert.equal(convo.conversation.length, 2)
      assert.equal(convo.conversation[0].asserters.length, 1)
      assert.deepEqual(convo.conversation[0].asserters[0], { name: 'BUTTONS', args: ['Test1', 'Test2'], not: true, optional: false, order: 0 })
    })
  })

  describe('compiler.compilertxt.order', function () {
    it('should parse order in bot section', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_logichook_asserter_order_bot_good.convo.txt'))
      const context = buildContextWithPause()
      const caps = {
      }
      const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      const convo = context.convos[0]
      assert.equal(convo.conversation.length, 1)

      assert.equal(convo.conversation[0].asserters.length, 4)
      assert.equal(convo.conversation[0].logicHooks.length, 4)

      assert.deepEqual(convo.conversation[0].logicHooks[0], { name: 'PAUSE', args: ['1'], order: 0 })
      assert.deepEqual(convo.conversation[0].logicHooks[1], { name: 'PAUSE', args: ['2'], order: 1 })
      assert.deepEqual(convo.conversation[0].asserters[0], { name: 'BUTTONS', args: ['Test1'], not: false, optional: false, order: 2 })
      assert.deepEqual(convo.conversation[0].asserters[1], { name: 'BUTTONS', args: ['Test2'], not: false, optional: false, order: 3 })
      // gap order 5
      assert.deepEqual(convo.conversation[0].logicHooks[2], { name: 'PAUSE', args: ['3'], order: 5 })
      assert.deepEqual(convo.conversation[0].asserters[2], { name: 'BUTTONS', args: ['Test3'], not: false, optional: false, order: 6 })
      assert.deepEqual(convo.conversation[0].logicHooks[3], { name: 'PAUSE', args: ['4'], order: 7 })
      assert.deepEqual(convo.conversation[0].asserters[3], { name: 'BUTTONS', args: ['Test4'], not: false, optional: false, order: 8 })
    })
    it('should parse asserters and logichooks after main text asserter after main text asserter even if there is no text asserter in script', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_logichook_asserter_order_bot_no_main_asserter.convo.txt'))
      const context = buildContextWithPause()
      const compiler = new Compiler(context, DefaultCapabilities)

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      const convo = context.convos[0]
      assert.equal(convo.conversation.length, 1)

      assert.equal(convo.conversation[0].asserters.length, 2)
      assert.equal(convo.conversation[0].logicHooks.length, 2)

      // gap order 0
      assert.deepEqual(convo.conversation[0].logicHooks[0], { name: 'PAUSE', args: ['1'], order: 1 })
      assert.deepEqual(convo.conversation[0].asserters[0], { name: 'BUTTONS', args: ['Test1'], not: false, optional: false, order: 2 })
      assert.deepEqual(convo.conversation[0].logicHooks[1], { name: 'PAUSE', args: ['2'], order: 3 })
      assert.deepEqual(convo.conversation[0].asserters[1], { name: 'BUTTONS', args: ['Test2'], not: false, optional: false, order: 4 })
    })
    it('should throw error if logichooks/asserters are not in correct order in bot section', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_logichook_asserter_order_bot_bad.convo.txt'))
      const context = buildContextWithPause()
      const compiler = new Compiler(context, DefaultCapabilities)

      try {
        compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
        assert.fail('expected error')
      } catch (err) {
        assert.equal(err.message, 'Before main asserter logichooks must be before asserters. Check logichook(s) "PAUSE" and asserter "BUTTONS"')
      }
    })
    it('should parse order in me section', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_logichook_asserter_order_me.convo.txt'))
      const context = buildContextWithPause()
      const compiler = new Compiler(context, DefaultCapabilities)

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      const convo = context.convos[0]
      assert.equal(convo.conversation.length, 1)

      assert.equal(convo.conversation[0].asserters.length, 0)
      assert.equal(convo.conversation[0].logicHooks.length, 2)

      assert.deepEqual(convo.conversation[0].logicHooks[0], { name: 'PAUSE', args: ['1'], order: 0 })
      // gap order 1
      assert.deepEqual(convo.conversation[0].logicHooks[1], { name: 'PAUSE', args: ['2'], order: 2 })
    })
    it('should parse logichooks after main text asserter even if there is no text asserter in script in me section', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_logichook_asserter_order_me_no_main_asserter.convo.txt'))
      const context = buildContextWithPause()
      const compiler = new Compiler(context, DefaultCapabilities)

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      const convo = context.convos[0]
      assert.equal(convo.conversation.length, 1)

      assert.equal(convo.conversation[0].asserters.length, 0)
      assert.equal(convo.conversation[0].logicHooks.length, 1)

      // gap order 0
      assert.deepEqual(convo.conversation[0].logicHooks[0], { name: 'PAUSE', args: ['1'], order: 1 })
    })
  })
})
