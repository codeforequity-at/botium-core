const fs = require('fs')
const path = require('path')
const assert = require('chai').assert
const Compiler = require('../../src/scripting/CompilerYaml')
const Constants = require('../../src/scripting/Constants')
const DefaultCapabilities = require('../../src/Defaults').Capabilities

const CONVOS_DIR = 'convos/yaml'

const buildContext = () => {
  const result = {
    IsAsserterValid: (name) => {
      if (name === 'INTENT') {
        return true
      }
      if (name === 'TEXT') {
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
    AddScriptingMemories: (s) => { result.scriptingMemories = result.scriptingMemories.concat(s) },
    convos: [],
    utterances: [],
    scriptingMemories: []
  }
  return result
}

describe('compiler.compileryml', function () {
  it('should read convos', async function () {
    const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_and_utterances.yml'))
    const context = buildContext()
    const caps = {
    }
    const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

    compiler.Compile(scriptBuffer, Constants.SCRIPTING_TYPE_CONVO)
    assert.equal(context.convos.length, 2)

    assert.equal(context.convos[0].conversation.length, 3)
    assert.equal(context.convos[0].conversation[0].sender, 'begin')

    assert.equal(context.convos[1].conversation.length, 5)
    assert.equal(context.convos[1].conversation[0].messageText, 'hi')
    assert.equal(context.convos[1].conversation[0].logicHooks.length, 1)
    assert.equal(context.convos[1].conversation[0].logicHooks[0].name, 'PAUSE')
    assert.equal(context.convos[1].conversation[0].logicHooks[0].args.length, 1)
    assert.equal(context.convos[1].conversation[0].logicHooks[0].args[0], '500')
    assert.isNull(context.convos[1].conversation[1].messageText)
    assert.equal(context.convos[1].conversation[1].asserters.length, 2)
    assert.equal(context.convos[1].conversation[1].asserters[0].name, 'TEXT')
    assert.equal(context.convos[1].conversation[1].asserters[0].not, true)
    assert.equal(context.convos[1].conversation[1].asserters[0].optional, true)
    assert.equal(context.convos[1].conversation[1].asserters[0].args.length, 1)
    assert.equal(context.convos[1].conversation[1].asserters[0].args[0], 'hello')
    assert.equal(context.convos[1].conversation[1].asserters[1].name, 'INTENT')
    assert.equal(context.convos[1].conversation[1].asserters[1].not, false)
    assert.equal(context.convos[1].conversation[1].asserters[1].optional, true)
    assert.equal(context.convos[1].conversation[1].asserters[1].args.length, 1)
    assert.equal(context.convos[1].conversation[1].asserters[1].args[0], 'intent_greeting')
    assert.equal(context.convos[1].conversation[2].messageText, 'what can i do for you?')
    assert.equal(context.convos[1].conversation[2].not, false)
    assert.equal(context.convos[1].conversation[2].optional, false)
    assert.equal(context.convos[1].conversation[4].messageText, 'thanks')
    assert.equal(context.convos[1].conversation[4].not, true)
    assert.equal(context.convos[1].conversation[4].optional, true)

    assert.equal(context.utterances.length, 0)
  })

  it('should read utterances', async function () {
    const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_and_utterances.yml'))
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

  it('should read scripting memory', async function () {
    const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'scripting_memory.yml'))
    const context = buildContext()
    const caps = {
    }
    const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

    compiler.Compile(scriptBuffer, Constants.SCRIPTING_TYPE_SCRIPTING_MEMORY)
    assert.equal(context.scriptingMemories.length, 2)
    assert.equal(context.scriptingMemories[0].header.name, 'scenario1')
    assert.equal(context.scriptingMemories[0].values.$var1, 'var1_1')
  })
})
