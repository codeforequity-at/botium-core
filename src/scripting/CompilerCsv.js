const parse = require('csv-parse/lib/sync')
const _ = require('lodash')
const debug = require('debug')('botium-core-CompilerCsv')

const Capabilities = require('../Capabilities')
const CompilerBase = require('./CompilerBase')
const Constants = require('./Constants')
const { Convo } = require('./Convo')
const { linesToConvoStep } = require('./helper')

const DELIMITERS_CHECK = [',', ';', '|', '\t']
const DEFAULT_DELIMITER = ','

const DEFAULT_QA_COLUMN_QUESTION = 0
const DEFAULT_QA_COLUMN_ANSWER = 1

const DEFAULT_MULTIROW_COLUMN_CONVERSATION = 0
const DEFAULT_MULTIROW_COLUMN_SENDER = 1
const DEFAULT_MULTIROW_COLUMN_TEXT = 2

const _findColIndex = (header, colName) => {
  if (_.isString(colName)) {
    const result = header.findIndex(h => h === colName)
    if (result >= 0) return result
    throw new Error(`Column name ${colName} not found.`)
  }
  if (_.isNumber(colName)) {
    return colName
  }
  throw new Error(`Column ${colName} not found.`)
}

module.exports = class CompilerCsv extends CompilerBase {
  constructor (context, caps = {}) {
    super(context, caps)
  }

  Validate () {
    this._AssertCapabilityExists(Capabilities.SCRIPTING_CSV_QUOTE)
    this._AssertCapabilityExists(Capabilities.SCRIPTING_CSV_ESCAPE)

    return super.Validate()
  }

  Compile (scriptBuffer, scriptType = Constants.SCRIPTING_TYPE_CONVO) {
    const scriptData = Buffer.isBuffer(scriptBuffer) ? scriptBuffer.toString() : scriptBuffer
    if (scriptData.length === 0) {
      return []
    }

    let delimiter = this._GetOptionalCapability(Capabilities.SCRIPTING_CSV_DELIMITER)
    if (!delimiter) {
      const firstline = scriptData.split('\n')[0].trim()
      for (const d of DELIMITERS_CHECK) {
        if (firstline.indexOf(d) >= 0) {
          delimiter = d
          break
        }
      }
      if (!delimiter) {
        delimiter = DEFAULT_DELIMITER
        debug(`Couldn't detect column delimiter automatically, using "${delimiter}" by default. Please set the SCRIPTING_CSV_DELIMITER capability.`)
      } else {
        debug(`Detected column delimiter automatically, using "${delimiter}".`)
      }
    }

    let rows
    try {
      rows = parse(scriptData, {
        delimiter,
        escape: this.caps[Capabilities.SCRIPTING_CSV_ESCAPE],
        quote: this.caps[Capabilities.SCRIPTING_CSV_QUOTE],
        columns: false
      })
    } catch (err) {
      throw new Error(`Invalid CSV: ${err.message || err}`)
    }
    if (rows.length === 0) {
      return []
    }
    if (rows[0].length === 1) {
      debug('Found 1-column CSV file, treating it as utterance file')
      if (scriptType === Constants.SCRIPTING_TYPE_UTTERANCES) {
        const result = [{ name: rows[0][0], utterances: rows.slice(1).map(r => r[0]) }]
        this.context.AddUtterances(result)
        return result
      } else {
        return []
      }
    }

    if (scriptType !== Constants.SCRIPTING_TYPE_CONVO && scriptType !== Constants.SCRIPTING_TYPE_PCONVO) {
      return []
    }
    let header = null
    if (rows.length > 0 && this.caps[Capabilities.SCRIPTING_CSV_SKIP_HEADER]) {
      header = rows[0]
      rows = rows.slice(1)
    }
    if (rows.length === 0) {
      return []
    }

    const lineNumberBase = this.caps[Capabilities.SCRIPTING_CSV_SKIP_HEADER] ? 2 : 1
    if (rows[0].length === 2) {
      debug('Found 2-column CSV file, treating it as question/answer file')

      let colQuestion = DEFAULT_QA_COLUMN_QUESTION
      let colAnswer = DEFAULT_QA_COLUMN_ANSWER

      if (header) {
        if (this.caps[Capabilities.SCRIPTING_CSV_QA_COLUMN_QUESTION] !== undefined) {
          colQuestion = _findColIndex(header, this.caps[Capabilities.SCRIPTING_CSV_QA_COLUMN_QUESTION])
        }
        if (this.caps[Capabilities.SCRIPTING_CSV_QA_COLUMN_ANSWER] !== undefined) {
          colAnswer = _findColIndex(header, this.caps[Capabilities.SCRIPTING_CSV_QA_COLUMN_ANSWER])
        }
      }

      const convos = rows.map((row, i) => new Convo(this.context, {
        header: {
          name: `L${i + lineNumberBase}`
        },
        conversation: [
          Object.assign({},
            linesToConvoStep(
              [row[colQuestion]],
              'me',
              this.context,
              undefined,
              true
            ), { stepTag: `L${i + lineNumberBase}-Question` }),
          Object.assign({},
            linesToConvoStep(
              [row[colAnswer]],
              'bot',
              this.context,
              undefined,
              true
            ), { stepTag: `L${i + lineNumberBase}-Answer` })
        ]
      }))
      if (scriptType === Constants.SCRIPTING_TYPE_CONVO) {
        this.context.AddConvos(convos)
      } else if (scriptType === Constants.SCRIPTING_TYPE_PCONVO) {
        this.context.AddPartialConvos(convos)
      }
      return convos
    }

    if (rows[0].length >= 3) {
      debug('Found 3-column CSV file, treating it as multi-row conversation file')

      let colConversationId = DEFAULT_MULTIROW_COLUMN_CONVERSATION
      let colSender = DEFAULT_MULTIROW_COLUMN_SENDER
      let colText = DEFAULT_MULTIROW_COLUMN_TEXT

      if (header) {
        if (this.caps[Capabilities.SCRIPTING_CSV_MULTIROW_COLUMN_CONVERSATION_ID] !== undefined) {
          colConversationId = _findColIndex(header, this.caps[Capabilities.SCRIPTING_CSV_MULTIROW_COLUMN_CONVERSATION_ID])
        }
        if (this.caps[Capabilities.SCRIPTING_CSV_MULTIROW_COLUMN_SENDER] !== undefined) {
          colSender = _findColIndex(header, this.caps[Capabilities.SCRIPTING_CSV_MULTIROW_COLUMN_SENDER])
        }
        if (this.caps[Capabilities.SCRIPTING_CSV_MULTIROW_COLUMN_TEXT] !== undefined) {
          colText = _findColIndex(header, this.caps[Capabilities.SCRIPTING_CSV_MULTIROW_COLUMN_TEXT])
        }
      }

      const conversationIds = _.uniq(rows.map(r => r[colConversationId]))
      const convos = conversationIds.map(conversationId => {
        const convoRows = rows.map((row, i) => {
          if (row[colConversationId] === conversationId) {
            return Object.assign({},
              linesToConvoStep(
                [row[colText]],
                row[colSender],
                this.context,
                undefined,
                true
              ), { stepTag: `L${i + lineNumberBase}` })
          }
          return null
        }).filter(c => c)
        return new Convo(this.context, {
          header: {
            name: conversationId
          },
          conversation: convoRows
        })
      })
      if (scriptType === Constants.SCRIPTING_TYPE_CONVO) {
        this.context.AddConvos(convos)
      } else if (scriptType === Constants.SCRIPTING_TYPE_PCONVO) {
        this.context.AddPartialConvos(convos)
      }
      return convos
    }
  }
}
