const fs = require('fs')
const path = require('path')
const assert = require('chai').assert
const Compiler = require('../../src/scripting/CompilerXlsx')
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

describe('compiler.compilerxlsx', function () {
  describe('two tabs', function () {
    it('should read 2 convos and no utterances', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, 'convos', 'convos_2convos.xlsx'))
      const context = buildContext()

      const caps = {
      }
      const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      assert.lengthOf(context.convos, 2)
      assert.equal(context.convos[0].conversation[0].messageText, 'test 1')
      assert.equal(context.convos[0].conversation[1].messageText, 'test 2')
      assert.equal(context.convos[1].conversation[0].messageText, 'test 1')
      assert.equal(context.convos[1].conversation[1].messageText, 'test 2')
      assert.lengthOf(context.utterances, 0)
    })
    it('should read 2 convos and 2 utterances', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, 'convos', 'convos_2convos_2utterances.xlsx'))
      const context = buildContext()

      const caps = {
        'SCRIPTING_XLSX_SHEETNAMES': 'Convos',
        'SCRIPTING_XLSX_SHEETNAMES_UTTERANCES': 'Utterances'
      }
      const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_UTTERANCES')
      assert.lengthOf(context.convos, 2)
      assert.lengthOf(context.convos[0].conversation, 2)
      assert.equal(context.convos[0].conversation[0].messageText, 'test 1')
      assert.equal(context.convos[0].conversation[1].messageText, 'test 2')
      assert.equal(context.convos[1].conversation[0].messageText, 'test 1')
      assert.equal(context.convos[1].conversation[1].messageText, 'test 2')
      assert.lengthOf(context.utterances, 2)
      assert.equal(context.utterances[0].name, 'TESTUTT1')
      assert.equal(context.utterances[1].name, 'TESTUTT2')
    })
    it('should read no utterances', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, 'convos', 'convos_2utterances.xlsx'))
      const context = buildContext()

      const caps = {
      }
      const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_UTTERANCES')
      assert.lengthOf(context.convos, 0)
      assert.lengthOf(context.utterances, 0)
    })
    it('should read 2 utterances', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, 'convos', 'convos_2utterances.xlsx'))
      const context = buildContext()

      const caps = {
        'SCRIPTING_XLSX_SHEETNAMES_UTTERANCES': 'Utterances'
      }
      const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_UTTERANCES')
      assert.lengthOf(context.convos, 0)
      assert.lengthOf(context.utterances, 2)
      assert.equal(context.utterances[0].name, 'TESTUTT1')
      assert.equal(context.utterances[1].name, 'TESTUTT2')
    })
    it('should read 2 convos from given region by letter', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, 'convos', 'convos_2convos_middle.xlsx'))
      const context = buildContext()

      const caps = {
        'SCRIPTING_XLSX_STARTROW': 6,
        'SCRIPTING_XLSX_STARTCOL': 'C'
      }
      const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      assert.lengthOf(context.convos, 1)
      assert.lengthOf(context.convos[0].conversation, 2)
      assert.equal(context.convos[0].conversation[0].messageText, 'test 1')
      assert.equal(context.convos[0].conversation[1].messageText, 'test 2')
      assert.lengthOf(context.utterances, 0)
    })
    it('should read 2 convos from given region by index', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, 'convos', 'convos_2convos_middle.xlsx'))
      const context = buildContext()

      const caps = {
        'SCRIPTING_XLSX_STARTROW': 6,
        'SCRIPTING_XLSX_STARTCOL': 3
      }
      const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      assert.lengthOf(context.convos, 1)
      assert.lengthOf(context.convos[0].conversation, 2)
      assert.equal(context.convos[0].conversation[0].messageText, 'test 1')
      assert.equal(context.convos[0].conversation[1].messageText, 'test 2')
      assert.lengthOf(context.utterances, 0)
    })
  })
  describe('negating', function () {
    it('should read ! as not', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, 'convos', 'convos_with!.xlsx'))
      const context = buildContext()

      const caps = {
      }
      const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      assert.equal(context.convos[0].conversation[1].messageText, 'test 2')
      assert.equal(context.convos[0].conversation[1].not, true)
    })
    it('should read !! as !', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, 'convos', 'convos_with!!.xlsx'))
      const context = buildContext()
      const caps = {
      }
      const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      assert.equal(context.convos[0].conversation[1].messageText, '!test 2')
      assert.equal(context.convos[0].conversation[1].not, false)
    })
    it('should read n*! as (n-1)*!', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, 'convos', 'convos_with!!!!.xlsx'))
      const context = buildContext()

      const caps = {
      }
      const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      assert.equal(context.convos[0].conversation[1].messageText, '!!!test 2')
      assert.equal(context.convos[0].conversation[1].not, false)
    })
    it('should read ! as ! in second line', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, 'convos', 'convos_with!_secline.xlsx'))
      const context = buildContext()
      const caps = {
      }
      const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      assert.equal(context.convos[0].conversation[1].messageText, 'test 2\r\n!test 2')
      assert.equal(context.convos[0].conversation[1].not, true)
    })
  })
})
