const fs = require('fs')
const path = require('path')
const assert = require('chai').assert
const Compiler = require('../../src/scripting/CompilerTxt')
const DefaultCapabilities = require('../../src/Defaults').Capabilities

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

describe('compiler.compilertxt', function () {
  it('should read ! as not', async function () {
    const scriptBuffer = fs.readFileSync(path.resolve(__dirname, 'convos', 'convos_with!.convo.txt'))
    const context = buildContext()

    const caps = {
    }
    const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

    compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
    assert.equal(context.convos[0].conversation[1].messageText, 'test 2')
    assert.equal(context.convos[0].conversation[1].not, true)
  })
  it('should read !! as !', async function () {
    const scriptBuffer = fs.readFileSync(path.resolve(__dirname, 'convos', 'convos_with!!.convo.txt'))
    const context = buildContext()
    const caps = {
    }
    const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

    compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
    assert.equal(context.convos[0].conversation[1].messageText, '!test 2')
    assert.equal(context.convos[0].conversation[1].not, false)
  })
  it('should read n*! as (n-1)*!', async function () {
    const scriptBuffer = fs.readFileSync(path.resolve(__dirname, 'convos', 'convos_with!!!!.convo.txt'))
    const context = buildContext()

    const caps = {
    }
    const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

    compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
    assert.equal(context.convos[0].conversation[1].messageText, '!!!test 2')
    assert.equal(context.convos[0].conversation[1].not, false)
  })
  it('should read ! as ! in second line', async function () {
    const scriptBuffer = fs.readFileSync(path.resolve(__dirname, 'convos', 'convos_with!_secline.convo.txt'))
    const context = buildContext()
    const caps = {
    }
    const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

    compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
    assert.equal(context.convos[0].conversation[1].messageText, 'test 2\n!test 2')
    assert.equal(context.convos[0].conversation[1].not, true)
  })
})
