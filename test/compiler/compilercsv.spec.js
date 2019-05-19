const fs = require('fs')
const path = require('path')
const assert = require('chai').assert
const Compiler = require('../../src/scripting/CompilerCsv')
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

describe('compiler.compilercsv', function () {
  describe('Sender mode, full', function () {
    it('should read basic case', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, 'convos', 'convos_sender_basic.csv'))
      const context = buildContext()

      const caps = {
      }
      const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      assert.lengthOf(context.convos, 1)
      assert.equal(context.convos[0].conversation[0].messageText, 'test 1')
      assert.equal(context.convos[0].conversation[0].sender, 'me')
      assert.equal(context.convos[0].conversation[1].messageText, 'test 2')
      assert.equal(context.convos[0].conversation[1].sender, 'bot')
    })
    it('should read different sequence and extra row', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, 'convos', 'convos_sender_sequence_and_extra_row.csv'))
      const context = buildContext()

      const caps = {
      }
      const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      assert.lengthOf(context.convos, 1)
      assert.equal(context.convos[0].conversation[0].messageText, 'test 1')
      assert.equal(context.convos[0].conversation[0].sender, 'me')
      assert.equal(context.convos[0].conversation[1].messageText, 'test 2')
      assert.equal(context.convos[0].conversation[1].sender, 'bot')
    })
    it('should read by name', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, 'convos', 'convos_sender_sequence_and_extra_row_no_def_colname.csv'))
      const context = buildContext()

      const caps = {
        SCRIPTING_CSV_MODE_SENDER_COL_CONVERSATION_ID: 'alter conversationId',
        SCRIPTING_CSV_MODE_SENDER_COL_SENDER: 'alter sender',
        SCRIPTING_CSV_MODE_SENDER_COL_TEXT: 'alter text'
      }
      const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      assert.lengthOf(context.convos, 1)
      assert.equal(context.convos[0].conversation[0].messageText, 'test 1')
      assert.equal(context.convos[0].conversation[0].sender, 'me')
      assert.equal(context.convos[0].conversation[1].messageText, 'test 2')
      assert.equal(context.convos[0].conversation[1].sender, 'bot')
    })
    it('should read by index', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, 'convos', 'convos_sender_sequence_and_extra_row_no_def_colname.csv'))
      const context = buildContext()

      const caps = {
        SCRIPTING_CSV_MODE_SENDER_COL_CONVERSATION_ID: 1,
        SCRIPTING_CSV_MODE_SENDER_COL_SENDER: 0,
        SCRIPTING_CSV_MODE_SENDER_COL_TEXT: 2
      }
      const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      assert.lengthOf(context.convos, 1)
      assert.equal(context.convos[0].conversation[0].messageText, 'test 1')
      assert.equal(context.convos[0].conversation[0].sender, 'me')
      assert.equal(context.convos[0].conversation[1].messageText, 'test 2')
      assert.equal(context.convos[0].conversation[1].sender, 'bot')
    })
    it('should read by index, no header', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, 'convos', 'convos_sender_no_header.csv'))
      const context = buildContext()

      const caps = {
        SCRIPTING_CSV_USE_HEADER: false
      }
      const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      assert.lengthOf(context.convos, 1)
      assert.equal(context.convos[0].conversation[0].messageText, 'test 1')
      assert.equal(context.convos[0].conversation[0].sender, 'me')
      assert.equal(context.convos[0].conversation[1].messageText, 'test 2')
      assert.equal(context.convos[0].conversation[1].sender, 'bot')
    })
    it('should read more convos', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, 'convos', 'convos_sender_more_convos.csv'))
      const context = buildContext()

      const caps = {
      }
      const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      assert.lengthOf(context.convos, 2)
      assert.equal(context.convos[0].conversation[0].messageText, 'test 1')
      assert.equal(context.convos[0].conversation[0].sender, 'me')
      assert.equal(context.convos[0].conversation[1].messageText, 'test 2')
      assert.equal(context.convos[0].conversation[1].sender, 'bot')
      assert.equal(context.convos[1].conversation[0].messageText, 'test 3')
      assert.equal(context.convos[1].conversation[0].sender, 'me')
      assert.equal(context.convos[1].conversation[1].messageText, 'test 4')
      assert.equal(context.convos[1].conversation[1].sender, 'bot')
    })
    it('should read no text', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, 'convos', 'convos_sender_no_text.csv'))
      const context = buildContext()

      const caps = {
      }
      const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      assert.lengthOf(context.convos, 1)
      assert.equal(context.convos[0].conversation[0].messageText, '')
      assert.equal(context.convos[0].conversation[0].sender, 'me')
      assert.equal(context.convos[0].conversation[1].messageText, 'test 2')
      assert.equal(context.convos[0].conversation[1].sender, 'bot')
    })
  })
  describe('Sender mode, 1 col', function () {
    it('should read basic case', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, 'convos', 'convos_sender_just_text_basic.csv'))
      const context = buildContext()

      const caps = {
      }
      const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      assert.lengthOf(context.convos, 2)
      assert.equal(context.convos[0].conversation[0].messageText, 'test 1')
      assert.equal(context.convos[0].conversation[0].sender, 'me')
      assert.equal(context.convos[0].conversation[1].messageText, 'test 2')
      assert.equal(context.convos[0].conversation[1].sender, 'bot')
      assert.equal(context.convos[1].conversation[0].messageText, 'test 3')
      assert.equal(context.convos[1].conversation[0].sender, 'me')
      assert.equal(context.convos[1].conversation[1].messageText, 'test 4')
      assert.equal(context.convos[1].conversation[1].sender, 'bot')
    })
    it('should read no header', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, 'convos', 'convos_sender_just_text_no_header.csv'))
      const context = buildContext()

      const caps = {
        SCRIPTING_CSV_USE_HEADER: false
      }
      const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      assert.lengthOf(context.convos, 2)
      assert.equal(context.convos[0].conversation[0].messageText, 'test 1')
      assert.equal(context.convos[0].conversation[0].sender, 'me')
      assert.equal(context.convos[0].conversation[1].messageText, 'test 2')
      assert.equal(context.convos[0].conversation[1].sender, 'bot')
      assert.equal(context.convos[1].conversation[0].messageText, 'test 3')
      assert.equal(context.convos[1].conversation[0].sender, 'me')
      assert.equal(context.convos[1].conversation[1].messageText, 'test 4')
      assert.equal(context.convos[1].conversation[1].sender, 'bot')
    })
    it('should read no header_4cols', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, 'convos', 'convos_sender_just_text_no_header_4cols.csv'))
      const context = buildContext()

      const caps = {
        SCRIPTING_CSV_USE_HEADER: false,
        SCRIPTING_CSV_MODE_SENDER_COL_TEXT: 0
      }
      const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      assert.lengthOf(context.convos, 2)
      assert.equal(context.convos[0].conversation[0].messageText, 'test 1')
      assert.equal(context.convos[0].conversation[0].sender, 'me')
      assert.equal(context.convos[0].conversation[1].messageText, 'test 2')
      assert.equal(context.convos[0].conversation[1].sender, 'bot')
      assert.equal(context.convos[1].conversation[0].messageText, 'test 3')
      assert.equal(context.convos[1].conversation[0].sender, 'me')
      assert.equal(context.convos[1].conversation[1].messageText, 'test 4')
      assert.equal(context.convos[1].conversation[1].sender, 'bot')
    })
  })
  describe('Column mode', function () {
    it('should read basic case', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, 'convos', 'convos_column_basic.csv'))
      const context = buildContext()

      const caps = {
      }
      const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      assert.lengthOf(context.convos, 1)
      assert.equal(context.convos[0].conversation[0].messageText, 'test 1')
      assert.equal(context.convos[0].conversation[0].sender, 'me')
      assert.equal(context.convos[0].conversation[1].messageText, 'test 2')
      assert.equal(context.convos[0].conversation[1].sender, 'bot')
    })
    it('should read different sequence and extra row', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, 'convos', 'convos_column_sequence_and_extra_row.csv'))
      const context = buildContext()

      const caps = {
      }
      const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      assert.lengthOf(context.convos, 1)
      assert.equal(context.convos[0].conversation[0].messageText, 'test 1')
      assert.equal(context.convos[0].conversation[0].sender, 'me')
      assert.equal(context.convos[0].conversation[1].messageText, 'test 2')
      assert.equal(context.convos[0].conversation[1].sender, 'bot')
    })
    it('should read by name', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, 'convos', 'convos_column_sequence_and_extra_row_no_def_colname.csv'))
      const context = buildContext()

      const caps = {
        SCRIPTING_CSV_MODE_COLUMN_COL_QUESTION: 'alter question',
        SCRIPTING_CSV_MODE_COLUMN_COL_ANSWER: 'alter answer'
      }
      const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      assert.lengthOf(context.convos, 1)
      assert.equal(context.convos[0].conversation[0].messageText, 'test 1')
      assert.equal(context.convos[0].conversation[0].sender, 'me')
      assert.equal(context.convos[0].conversation[1].messageText, 'test 2')
      assert.equal(context.convos[0].conversation[1].sender, 'bot')
    })
    it('should read by index', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, 'convos', 'convos_column_sequence_and_extra_row_no_def_colname.csv'))
      const context = buildContext()

      const caps = {
        SCRIPTING_CSV_MODE_COLUMN_COL_QUESTION: 1,
        SCRIPTING_CSV_MODE_COLUMN_COL_ANSWER: 0
      }
      const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      assert.lengthOf(context.convos, 1)
      assert.equal(context.convos[0].conversation[0].messageText, 'test 1')
      assert.equal(context.convos[0].conversation[0].sender, 'me')
      assert.equal(context.convos[0].conversation[1].messageText, 'test 2')
      assert.equal(context.convos[0].conversation[1].sender, 'bot')
    })
    it('should read by index, no header', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, 'convos', 'convos_column_no_header.csv'))
      const context = buildContext()

      const caps = {
        SCRIPTING_CSV_MODE: 'COLUMN',
        SCRIPTING_CSV_USE_HEADER: false
      }
      const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      assert.lengthOf(context.convos, 1)
      assert.equal(context.convos[0].conversation[0].messageText, 'test 1')
      assert.equal(context.convos[0].conversation[0].sender, 'me')
      assert.equal(context.convos[0].conversation[1].messageText, 'test 2')
      assert.equal(context.convos[0].conversation[1].sender, 'bot')
    })
    it('should read more convos', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, 'convos', 'convos_column_more_convos.csv'))
      const context = buildContext()

      const caps = {
        SCRIPTING_CSV_MODE: 'COLUMN'
      }
      const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      assert.lengthOf(context.convos, 2)
      assert.equal(context.convos[0].conversation[0].messageText, 'test 1')
      assert.equal(context.convos[0].conversation[0].sender, 'me')
      assert.equal(context.convos[0].conversation[1].messageText, 'test 2')
      assert.equal(context.convos[0].conversation[1].sender, 'bot')
      assert.equal(context.convos[1].conversation[0].messageText, 'test 3')
      assert.equal(context.convos[1].conversation[0].sender, 'me')
      assert.equal(context.convos[1].conversation[1].messageText, 'test 4')
      assert.equal(context.convos[1].conversation[1].sender, 'bot')
    })
  })
})
