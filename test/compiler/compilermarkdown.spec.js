const fs = require('fs')
const path = require('path')
const assert = require('chai').assert
const Compiler = require('../../src/scripting/CompilerMarkdown')
const Constants = require('../../src/scripting/Constants')
const DefaultCapabilities = require('../../src/Defaults').Capabilities

const buildContext = () => {
  const result = {
    IsAsserterValid: (name) => {
      if (['INTENT', 'BUTTONS'].includes(name)) {
        return true
      }

      return false
    },
    IsUserInputValid: () => false,
    IsLogicHookValid: (name) => {
      if (name === 'PAUSE') {
        return true
      }

      return false
    },
    AddConvos: (c) => { result.convos = result.convos.concat(c) },
    AddUtterances: (u) => { result.utterances = result.utterances.concat(u) },
    convos: [],
    utterances: []
  }
  return result
}

describe('compiler.compilermarkdown', function () {
  it('should read convos', async function () {
    const scriptBuffer = fs.readFileSync(path.resolve(__dirname, 'convos', 'convos_precompiler_markdown.md'))
    const context = buildContext()
    const caps = {
    }
    const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

    compiler.Compile(scriptBuffer, Constants.SCRIPTING_TYPE_CONVO)
    assert.equal(context.convos.length, 2)

    assert.equal(context.convos[0].conversation.length, 2)
    assert.equal(context.convos[0].conversation[0].sender, 'me')
    assert.equal(context.convos[0].conversation[0].messageText, 'hello bot')
    assert.equal(context.convos[0].conversation[0].stepTag, 'Line 3')
    assert.equal(context.convos[0].conversation[1].sender, 'bot')
    assert.equal(context.convos[0].conversation[1].stepTag, 'Line 5')
    assert.equal(context.convos[0].conversation[1].asserters.length, 1)
    assert.equal(context.convos[0].conversation[1].asserters[0].name, 'BUTTONS')
    assert.equal(context.convos[0].conversation[1].asserters[0].args.length, 2)
    assert.equal(context.convos[0].conversation[1].asserters[0].args[0], 'checkbutton')
    assert.equal(context.convos[0].conversation[1].asserters[0].args[1], 'checkbutton2')

    assert.equal(context.convos[1].conversation.length, 2)
    assert.equal(context.convos[1].conversation[0].sender, 'me')
    assert.equal(context.convos[1].conversation[0].messageText, 'hello bot')
    assert.equal(context.convos[1].conversation[1].sender, 'bot')
    assert.equal(context.convos[1].conversation[1].asserters.length, 1)
    assert.equal(context.convos[1].conversation[1].asserters[0].name, 'BUTTONS')
    assert.equal(context.convos[1].conversation[1].asserters[0].args.length, 2)
    assert.equal(context.convos[1].conversation[1].asserters[0].args[0], 'checkbutton')
    assert.equal(context.convos[1].conversation[1].asserters[0].args[1], 'checkbutton2')

    assert.equal(context.utterances.length, 0)
  })

  it('should read utterances', async function () {
    const scriptBuffer = fs.readFileSync(path.resolve(__dirname, 'convos', 'convos_precompiler_markdown_utterances.md'))
    const context = buildContext()
    const caps = {
    }
    const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

    compiler.Compile(scriptBuffer, Constants.SCRIPTING_TYPE_UTTERANCES)
    assert.equal(context.utterances.length, 1)
    assert.equal(context.utterances[0].utterances.length, 3)
    assert.equal(context.utterances[0].utterances[0], 'hi')
    assert.equal(context.utterances[0].utterances[1], 'hello')
    assert.equal(context.utterances[0].utterances[2], 'greeting')

    assert.equal(context.convos.length, 0)
  })

  it('should handle invalid markdown (no h1)', async function () {
    const scriptBuffer = fs.readFileSync(path.resolve(__dirname, 'convos', 'convos_precompiler_markdown_invalid_noh1.md'))
    const context = buildContext()
    const caps = {
    }
    const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

    try {
      compiler.Compile(scriptBuffer, Constants.SCRIPTING_TYPE_CONVO)
    } catch (err) {
      assert.isTrue(err.message === '"##" not expected here (Line 0): expecting parent "#" for "##"')
      return
    }
    assert.fail('should have failed')
  })

  it('should handle invalid markdown (no h2)', async function () {
    const scriptBuffer = fs.readFileSync(path.resolve(__dirname, 'convos', 'convos_precompiler_markdown_invalid_noh2.md'))
    const context = buildContext()
    const caps = {
    }
    const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

    try {
      compiler.Compile(scriptBuffer, Constants.SCRIPTING_TYPE_CONVO)
    } catch (err) {
      assert.isTrue(err.message === '"-" not expected here (Line 1): expecting parent "##" for "-"')
      return
    }
    assert.fail('should have failed')
  })
})
