const { parse } = require('csv-parse/sync')
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
    const legacyModeOn = !this._GetOptionalCapability(Capabilities.SCRIPTING_CSV_LEGACY_MODE_OFF, false)

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
        columns: false,
        relax_column_count: true
      })
    } catch (err) {
      throw new Error(`Invalid CSV: ${err.message || err}`)
    }
    if (rows.length === 0) {
      return []
    }
    const columnCount = Math.max(...rows.map(row => row.length))

    const parseUtterances = () => {
      const result = []
      const startRow = this._GetOptionalCapability(Capabilities.SCRIPTING_CSV_UTTERANCE_STARTROW, 2) - 1
      const startRowHeader = this._GetOptionalCapability(Capabilities.SCRIPTING_CSV_UTTERANCE_STARTROW_HEADER)
      for (let col = 0; col < columnCount; col++) {
        const uttStruct = {
          name: rows[0][col],
          utterances: []
        }
        let skip = startRowHeader ? true : false
        for (let row = startRow; row < rows.length && (skip || !!rows[row][col]); row++) {
          if (!skip) {
            uttStruct.utterances.push(rows[row][col])
          } else {
            if (startRowHeader === rows[row][col]) {
              skip = false
            }
          }
        }
        result.push(uttStruct)
      }

      this.context.AddUtterances(result)

    }
    if ((scriptType === Constants.SCRIPTING_TYPE_CONVO || scriptType === Constants.SCRIPTING_TYPE_PCONVO)) {
      if (columnCount === 1 || (!legacyModeOn && columnCount > 3)) {
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
      if (columnCount === 2) {
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

      if (columnCount >= 3) {
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
    } else if (scriptType === Constants.SCRIPTING_TYPE_UTTERANCES) {
      if (columnCount === 2 || columnCount === 3 || (legacyModeOn && columnCount > 4)) {
        return []
      }
      const result = []
      const startRow = this._GetOptionalCapability(Capabilities.SCRIPTING_CSV_UTTERANCE_STARTROW, 2) - 1
      const startRowHeader = this._GetOptionalCapability(Capabilities.SCRIPTING_CSV_UTTERANCE_STARTROW_HEADER)
      for (let col = 0; col < columnCount; col++) {
        const uttStruct = {
          name: rows[0][col],
          utterances: []
        }
        let skip = startRowHeader ? true : false
        for (let row = startRow; row < rows.length && (skip || !!rows[row][col]); row++) {
          if (!skip) {
            uttStruct.utterances.push(rows[row][col])
          } else {
            if (startRowHeader === rows[row][col]) {
              skip = false
            }
          }
        }
        result.push(uttStruct)
      }

      this.context.AddUtterances(result)
      return result
    } else {
      return []
    }
  }
}
