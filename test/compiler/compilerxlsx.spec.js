const fs = require('fs')
const path = require('path')
const assert = require('chai').assert
const Compiler = require('../../src/scripting/CompilerXlsx')
const DefaultCapabilities = require('../../src/Defaults').Capabilities

const CONVOS_DIR = 'convos/xlsx'

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
    IsAsserterValid: () => false,
    IsUserInputValid: () => false,
    IsLogicHookValid: (name) => name === 'PAUSE',
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
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_2convos.xlsx'))
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
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_2convos_2utterances.xlsx'))
      const context = buildContext()

      const caps = {
        SCRIPTING_XLSX_SHEETNAMES: 'Convos',
        SCRIPTING_XLSX_SHEETNAMES_UTTERANCES: 'Utterances'
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
    it('should read utterances from default worksheet', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_2utterances.xlsx'))
      const context = buildContext()

      const caps = {
      }
      const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_UTTERANCES')
      assert.lengthOf(context.convos, 0)
      assert.lengthOf(context.utterances, 2)
    })
    it('should read 2 utterances', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_2utterances.xlsx'))
      const context = buildContext()

      const caps = {
        SCRIPTING_XLSX_SHEETNAMES_UTTERANCES: 'Utterances'
      }
      const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_UTTERANCES')
      assert.lengthOf(context.convos, 0)
      assert.lengthOf(context.utterances, 2)
      assert.equal(context.utterances[0].name, 'TESTUTT1')
      assert.equal(context.utterances[1].name, 'TESTUTT2')
    })
    it('should read 2 utterances separated by empty lines', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_2utterances_emptylines.xlsx'))
      const context = buildContext()

      const caps = {
        SCRIPTING_XLSX_SHEETNAMES_UTTERANCES: 'Utterances'
      }
      const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_UTTERANCES')
      assert.lengthOf(context.convos, 0)
      assert.lengthOf(context.utterances, 2)
      assert.equal(context.utterances[0].name, 'TESTUTT1')
      assert.equal(context.utterances[0].utterances.length, 2)
      assert.equal(context.utterances[1].name, 'TESTUTT2')
      assert.equal(context.utterances[1].utterances.length, 3)
    })
    it('should read 2 convos from given region by letter', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_2convos_middle.xlsx'))
      const context = buildContext()

      const caps = {
        SCRIPTING_XLSX_STARTROW: 6,
        SCRIPTING_XLSX_STARTCOL: 'C'
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
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_2convos_middle.xlsx'))
      const context = buildContext()

      const caps = {
        SCRIPTING_XLSX_STARTROW: 6,
        SCRIPTING_XLSX_STARTCOL: 3
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
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_with!.xlsx'))
      const context = buildContext()

      const caps = {
      }
      const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      assert.equal(context.convos[0].conversation[1].messageText, 'test 2')
      assert.equal(context.convos[0].conversation[1].not, true)
    })
    it('should read !! as !', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_with!!.xlsx'))
      const context = buildContext()
      const caps = {
      }
      const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      assert.equal(context.convos[0].conversation[1].messageText, '!test 2')
      assert.equal(context.convos[0].conversation[1].not, false)
    })
    it('should read n*! as (n-1)*!', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_with!!!!.xlsx'))
      const context = buildContext()

      const caps = {
      }
      const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      assert.equal(context.convos[0].conversation[1].messageText, '!!!test 2')
      assert.equal(context.convos[0].conversation[1].not, false)
    })
    it('should read ! as ! in second line', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_with!_secline.xlsx'))
      const context = buildContext()
      const caps = {
      }
      const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      assert.equal(context.convos[0].conversation[1].messageText, 'test 2\r\n!test 2')
      assert.equal(context.convos[0].conversation[1].not, true)
    })
  })
  describe('optional', function () {
    it('should read ? as optional', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_with?.xlsx'))
      const context = buildContext()

      const caps = {
      }
      const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      assert.equal(context.convos[0].conversation[1].messageText, 'test 2')
      assert.equal(context.convos[0].conversation[1].optional, true)
    })
    it('should read ?? as ?', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_with??.xlsx'))
      const context = buildContext()
      const caps = {
      }
      const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      assert.equal(context.convos[0].conversation[1].messageText, '?test 2')
      assert.equal(context.convos[0].conversation[1].optional, false)
    })
    it('should read n*? as (n-1)*?', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_with????.xlsx'))
      const context = buildContext()

      const caps = {
      }
      const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      assert.equal(context.convos[0].conversation[1].messageText, '???test 2')
      assert.equal(context.convos[0].conversation[1].optional, false)
    })
    it('should read ? as ? in second line', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_with?_secline.xlsx'))
      const context = buildContext()
      const caps = {
      }
      const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      assert.equal(context.convos[0].conversation[1].messageText, 'test 2\r\n?test 2')
      assert.equal(context.convos[0].conversation[1].optional, true)
    })
  })
  describe('optional and negate', function () {
    it('should read ?! as optional and not', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_with?!.xlsx'))
      const context = buildContext()

      const caps = {}
      const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      assert.equal(context.convos[0].conversation[1].messageText, 'test 2')
      assert.equal(context.convos[0].conversation[1].optional, true)
      assert.equal(context.convos[0].conversation[1].not, true)
    })
    it('should read ??! as ?!', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_with??!.xlsx'))
      const context = buildContext()
      const caps = {}
      const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      assert.equal(context.convos[0].conversation[1].messageText, '?!test 2')
      assert.equal(context.convos[0].conversation[1].optional, false)
      assert.equal(context.convos[0].conversation[1].not, false)
    })
  })
  describe('logichooks', function () {
    it('should accept logic hook if it is before message', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_logichook_after.xlsx'))
      const context = buildContextWithPause()
      const caps = {
      }
      const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      const convo = context.convos[0]
      assert.equal(convo.conversation[0].logicHooks.length, 1)
    })
    it('should throw error if logic hook is after message', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_logichook_before.xlsx'))
      const context = buildContextWithPause()
      const caps = {
      }
      const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

      try {
        compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
        assert.fail('expected error')
      } catch (err) {
        assert.equal(err.message, 'Failed to parse conversation. No text expected here: \'Hello\' in convo:\n PAUSE 100\nHello')
      }
    })
  })

  it('should read 2x2 convos and no utterances in simplified mode', async function () {
    const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_2x2convos_simplified.xlsx'))
    const context = buildContext()

    const caps = {
    }
    const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

    compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
    assert.lengthOf(context.convos, 4)
    assert.lengthOf(context.convos[0].conversation, 2)
    assert.lengthOf(context.convos[1].conversation, 2)
    assert.lengthOf(context.convos[2].conversation, 2)
    assert.lengthOf(context.convos[3].conversation, 2)
    assert.equal(context.convos[0].conversation[0].messageText, 'test 1')
    assert.equal(context.convos[0].conversation[1].messageText, 'test 2')
    assert.equal(context.convos[1].conversation[0].messageText, 'test 3')
    assert.equal(context.convos[1].conversation[1].messageText, 'test 4')
    assert.equal(context.convos[2].conversation[0].messageText, 'test 1')
    assert.equal(context.convos[2].conversation[1].messageText, 'test 2')
    assert.equal(context.convos[3].conversation[0].messageText, 'test 3')
    assert.equal(context.convos[3].conversation[1].messageText, 'test 4')
    assert.lengthOf(context.utterances, 0)
  })
  it('should read 2 convos and no utterances in simplified mode forced', async function () {
    const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_2convos_simplified_to_force.xlsx'))
    const context = buildContext()

    const caps = {
      SCRIPTING_XLSX_MODE: 'QUESTION_ANSWER'
    }
    const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

    compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
    assert.lengthOf(context.convos, 2)
    assert.lengthOf(context.convos[0].conversation, 2)
    assert.lengthOf(context.convos[1].conversation, 2)
    assert.equal(context.convos[0].conversation[0].messageText, 'test 1')
    assert.equal(context.convos[0].conversation[1].messageText, '')
    assert.equal(context.convos[1].conversation[0].messageText, '')
    assert.equal(context.convos[1].conversation[1].messageText, 'test 4')
    assert.lengthOf(context.utterances, 0)
  })
  it('should sort convos by position in file', async function () {
    const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_sortorder.xlsx'))
    const context = buildContext()

    const caps = {
    }
    const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

    compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
    assert.lengthOf(context.convos, 5)
    assert.equal(context.convos[0].header.name, 'Convos1-A002')
    assert.equal(context.convos[1].header.name, 'Convos1-A005')
    assert.equal(context.convos[2].header.name, 'Convos1-A008')
    assert.equal(context.convos[3].header.name, 'Convos1-A011')
    assert.equal(context.convos[4].header.name, 'Convos1-A014')
  })
  it('should fail on intermixing q&a and convo sections', async function () {
    const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_mix_qa_and_convos.xlsx'))
    const context = buildContext()

    const caps = {
    }
    const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

    try {
      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      assert.fail('should have failed')
    } catch (err) {
      assert.isTrue(err.message.indexOf('Excel sheet "Convos1" invalid. Detected intermixed Q&A sections (for instance A5) and convo sections (for instance A2,B3)') >= 0)
    }
  })
  it('should read sheet names from filter with full match', async function () {
    const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_sheetnames.xlsx'))
    const context = buildContext()

    const caps = {
      SCRIPTING_XLSX_SHEETNAMES: 'Sheet Number One,Some Other Sheet'
    }
    const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

    compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
    assert.lengthOf(context.convos, 2)
  })
  it('should read sheet names from filter with wildcard', async function () {
    const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_sheetnames.xlsx'))
    const context = buildContext()

    const caps = {
      SCRIPTING_XLSX_SHEETNAMES: '*'
    }
    const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

    compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
    assert.lengthOf(context.convos, 3)
  })
  it('should read 3 convos with name', async function () {
    const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_2convos_with_names.xlsx'))
    const context = buildContext()

    const caps = {
    }
    const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

    compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
    assert.lengthOf(context.convos, 3)
    assert.equal(context.convos[0].header.name, 'Convo1')
    assert.equal(context.convos[1].header.name, 'Convo2')
    assert.equal(context.convos[2].header.name, 'Convo3')

    assert.lengthOf(context.convos[0].conversation, 5)
    assert.lengthOf(context.convos[1].conversation, 2)
    assert.equal(context.convos[0].conversation[0].messageText, 'test 1')
    assert.equal(context.convos[0].conversation[1].messageText, 'test 2')
    assert.equal(context.convos[0].conversation[2].messageText, 'test 3')
    assert.equal(context.convos[0].conversation[3].messageText, 'test 4')
    assert.equal(context.convos[0].conversation[4].messageText, 'test 5')

    assert.lengthOf(context.utterances, 0)
  })
  it('should read 3 convos with name (forced)', async function () {
    const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_2convos_with_names_noheader.xlsx'))
    const context = buildContext()

    const caps = {
      SCRIPTING_XLSX_HASHEADERS: false,
      SCRIPTING_XLSX_HASNAMECOL: true
    }
    const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

    compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
    assert.lengthOf(context.convos, 3)
    assert.equal(context.convos[0].header.name, 'Convo1')
    assert.equal(context.convos[1].header.name, 'Convo2')
    assert.equal(context.convos[2].header.name, 'Convo3')

    assert.lengthOf(context.convos[0].conversation, 5)
    assert.lengthOf(context.convos[1].conversation, 2)
    assert.equal(context.convos[0].conversation[0].messageText, 'test 1')
    assert.equal(context.convos[0].conversation[1].messageText, 'test 2')
    assert.equal(context.convos[0].conversation[2].messageText, 'test 3')
    assert.equal(context.convos[0].conversation[3].messageText, 'test 4')
    assert.equal(context.convos[0].conversation[4].messageText, 'test 5')

    assert.lengthOf(context.utterances, 0)
  })
  it('should read 3 convos without name (forced)', async function () {
    const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_2convos_without_names.xlsx'))
    const context = buildContext()

    const caps = {
      SCRIPTING_XLSX_HASNAMECOL: false
    }
    const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

    compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
    assert.lengthOf(context.convos, 3)
    assert.equal(context.convos[0].header.name, 'Convos1-A002')
    assert.equal(context.convos[1].header.name, 'Convos2-A002')
    assert.equal(context.convos[2].header.name, 'Convos2-A005')

    assert.lengthOf(context.convos[0].conversation, 5)
    assert.lengthOf(context.convos[1].conversation, 2)
    assert.equal(context.convos[0].conversation[0].messageText, 'test 1')
    assert.equal(context.convos[0].conversation[1].messageText, 'test 2')
    assert.equal(context.convos[0].conversation[2].messageText, 'test 3')
    assert.equal(context.convos[0].conversation[3].messageText, 'test 4')
    assert.equal(context.convos[0].conversation[4].messageText, 'test 5')

    assert.lengthOf(context.utterances, 0)
  })
  it('should read 3 convos without name (forced)', async function () {
    const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_2convos_without_names_noheader.xlsx'))
    const context = buildContext()

    const caps = {
      SCRIPTING_XLSX_HASHEADERS: false,
      SCRIPTING_XLSX_HASNAMECOL: false
    }
    const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

    compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
    assert.lengthOf(context.convos, 3)
    assert.equal(context.convos[0].header.name, 'Convos1-A001')
    assert.equal(context.convos[1].header.name, 'Convos2-A001')
    assert.equal(context.convos[2].header.name, 'Convos2-A004')

    assert.lengthOf(context.convos[0].conversation, 5)
    assert.lengthOf(context.convos[1].conversation, 2)
    assert.equal(context.convos[0].conversation[0].messageText, 'test 1')
    assert.equal(context.convos[0].conversation[1].messageText, 'test 2')
    assert.equal(context.convos[0].conversation[2].messageText, 'test 3')
    assert.equal(context.convos[0].conversation[3].messageText, 'test 4')
    assert.equal(context.convos[0].conversation[4].messageText, 'test 5')

    assert.lengthOf(context.utterances, 0)
  })
})
