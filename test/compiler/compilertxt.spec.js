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
    it('should throw error if there is message after logichook', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_emptyrow_text_after_logichook.convo.txt'))
      const context = buildContextWithPause()
      const caps = {
      }
      const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))
      try {
        compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
        assert.fail('expected error')
      } catch (err) {
        assert.equal(err.message, 'Failed to parse conversation. No text expected here: \'Hi!\' in convo:\n PAUSE 100\nHi!\n')
      }
    })
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
      assert.deepEqual(convo.conversation[0].asserters[0], { name: 'BUTTONS', args: ['Test1', 'Test2'], not: true, optional: false })
    })
  })
})
