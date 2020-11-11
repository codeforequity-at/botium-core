const fs = require('fs')
const path = require('path')
const assert = require('chai').assert
const Compiler = require('../../src/scripting/CompilerCsv')
const Capabilities = require('../../src/Capabilities')
const DefaultCapabilities = require('../../src/Defaults').Capabilities

const CONVOS_DIR = 'convos/csv'

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
  describe('ROW_PER_MESSAGE mode, full', function () {
    it('should read basic case', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_sender_basic.csv'))
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
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_sender_sequence_and_extra_row.csv'))
      const context = buildContext()

      const caps = {
        [Capabilities.SCRIPTING_CSV_MULTIROW_COLUMN_CONVERSATION_ID]: 'conversationId',
        [Capabilities.SCRIPTING_CSV_MULTIROW_COLUMN_SENDER]: 'sender',
        [Capabilities.SCRIPTING_CSV_MULTIROW_COLUMN_TEXT]: 'text'
      }
      const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      assert.lengthOf(context.convos, 1)
      assert.equal(context.convos[0].conversation[0].messageText, 'test 1')
      assert.equal(context.convos[0].conversation[0].sender, 'me')
      assert.equal(context.convos[0].conversation[1].messageText, 'test 2')
      assert.equal(context.convos[0].conversation[1].sender, 'bot')
    })
    it('should read by cap', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_sender_sequence_and_extra_row_no_def_colname.csv'))
      const context = buildContext()

      const caps = {
        [Capabilities.SCRIPTING_CSV_MULTIROW_COLUMN_CONVERSATION_ID]: 'alter conversationId',
        [Capabilities.SCRIPTING_CSV_MULTIROW_COLUMN_SENDER]: 'alter sender',
        [Capabilities.SCRIPTING_CSV_MULTIROW_COLUMN_TEXT]: 'alter text'
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
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_sender_sequence_and_extra_row_no_def_colname.csv'))
      const context = buildContext()

      const caps = {
        [Capabilities.SCRIPTING_CSV_MULTIROW_COLUMN_CONVERSATION_ID]: 1,
        [Capabilities.SCRIPTING_CSV_MULTIROW_COLUMN_SENDER]: 0,
        [Capabilities.SCRIPTING_CSV_MULTIROW_COLUMN_TEXT]: 2
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
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_sender_no_header.csv'))
      const context = buildContext()

      const caps = {
        SCRIPTING_CSV_SKIP_HEADER: false
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
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_sender_more_convos.csv'))
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
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_sender_no_text.csv'))
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
  describe('QUESTION_ANSWER mode', function () {
    it('should read basic case', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_column_basic.csv'))
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
    it('should read different sequence', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_column_sequence.csv'))
      const context = buildContext()

      const caps = {
        SCRIPTING_CSV_QA_COLUMN_QUESTION: 'question',
        SCRIPTING_CSV_QA_COLUMN_ANSWER: 'answer'
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
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_column_sequence_no_def_colname.csv'))
      const context = buildContext()

      const caps = {
        SCRIPTING_CSV_QA_COLUMN_QUESTION: 'alter question',
        SCRIPTING_CSV_QA_COLUMN_ANSWER: 'alter answer'
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
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_column_sequence_no_def_colname.csv'))
      const context = buildContext()

      const caps = {
        SCRIPTING_CSV_QA_COLUMN_QUESTION: 1,
        SCRIPTING_CSV_QA_COLUMN_ANSWER: 0
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
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_column_no_header.csv'))
      const context = buildContext()

      const caps = {
        SCRIPTING_CSV_SKIP_HEADER: false
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
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_column_more_convos.csv'))
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
    it('should read user and bot columns', async function () {
      const scriptBuffer = fs.readFileSync(path.resolve(__dirname, CONVOS_DIR, 'convos_column_me_bot.csv'))
      const context = buildContext()

      const caps = {
        SCRIPTING_CSV_QA_COLUMN_QUESTION: 'user',
        SCRIPTING_CSV_QA_COLUMN_ANSWER: 'bot'
      }
      const compiler = new Compiler(context, Object.assign({}, DefaultCapabilities, caps))

      compiler.Compile(scriptBuffer, 'SCRIPTING_TYPE_CONVO')
      assert.lengthOf(context.convos, 1)
      assert.equal(context.convos[0].conversation[0].messageText, 'test 1')
      assert.equal(context.convos[0].conversation[0].sender, 'me')
      assert.equal(context.convos[0].conversation[1].messageText, 'test 2')
      assert.equal(context.convos[0].conversation[1].sender, 'bot')
    })
  })
})
