const fs = require('fs')
const path = require('path')
const assert = require('chai').assert
const Compiler = require('../../src/scripting/CompilerYaml')
const Constants = require('../../src/scripting/Constants')
const DefaultCapabilities = require('../../src/Defaults').Capabilities

const buildContext = () => {
  const result = {
    IsAsserterValid: (name) => {
      if (name === 'INTENT') {
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

describe('compiler.compileryml', function () {
  it('should read convos', async function () {
    const scriptBuffer = fs.readFileSync(path.resolve(__dirname, 'convos', 'convos_and_utterances.yml'))
    const context = buildContext()
    const caps = {
    }
    const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

    compiler.Compile(scriptBuffer, Constants.SCRIPTING_TYPE_CONVO)
    assert.equal(context.convos.length, 2)
    assert.equal(context.convos[1].conversation.length, 5)
    assert.equal(context.convos[1].conversation[0].messageText, 'hi')
    assert.equal(context.convos[1].conversation[0].logicHooks.length, 1)
    assert.equal(context.convos[1].conversation[0].logicHooks[0].name, 'PAUSE')
    assert.equal(context.convos[1].conversation[0].logicHooks[0].args.length, 1)
    assert.equal(context.convos[1].conversation[0].logicHooks[0].args[0], '500')

    assert.equal(context.utterances.length, 0)
  })

  describe('compiler.compileryml', function () {
    it('should read utterances', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, 'convos', 'convos_and_utterances.yml'))
      const context = buildContext()
      const caps = {
      }
      const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

      compiler.Compile(scriptBuffer, Constants.SCRIPTING_TYPE_UTTERANCES)
      assert.equal(context.utterances.length, 1)
      assert.equal(context.utterances[0].name, 'GREETING')
      assert.equal(context.utterances[0].utterances.length, 2)
      assert.equal(context.utterances[0].utterances[1], 'hello!')

      assert.equal(context.convos.length, 0)
    })
  })
})
