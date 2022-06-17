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
    const columnCount = rows[0].length
    debug(`Legacy mode ${legacyModeOn ? 'on' : 'off'} rows ${rows.length} columns ${columnCount}`)

    if ((scriptType === Constants.SCRIPTING_TYPE_CONVO || scriptType === Constants.SCRIPTING_TYPE_PCONVO)) {
      if (columnCount === 1 || (!legacyModeOn && columnCount > 3)) {
        debug(`Invalid column count '${columnCount}' in convo mode`)
        return []
      }
      let header = null
      if (rows.length > 0 && this.caps[Capabilities.SCRIPTING_CSV_SKIP_HEADER]) {
        header = rows[0]
        rows = rows.slice(1)
      }
      if (rows.length === 0) {
        debug('Datarows not found in convo mode')
        return []
      }

      const lineNumberBase = this.caps[Capabilities.SCRIPTING_CSV_SKIP_HEADER] ? 2 : 1
      if (columnCount === 2) {
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
        debug(`Found 2-column CSV file, treating it as question/answer file, extracted ${convos.length} convos`)
        return convos
      }

      if (columnCount >= 3) {
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
        debug(`Found 3-column CSV file, treating it as multi-row conversation file, extracted ${convos.length} convos`)
        return convos
      }
    } else if (scriptType === Constants.SCRIPTING_TYPE_UTTERANCES) {
      if (columnCount === 2 || columnCount === 3 || (legacyModeOn && columnCount > 4)) {
        debug(`Invalid column count '${columnCount}' in utterances mode`)
        return []
      }
      const result = []
      const startRow = this._GetOptionalCapability(Capabilities.SCRIPTING_CSV_UTTERANCE_STARTROW, 2) - 1
      const startRowHeader = this._GetOptionalCapability(Capabilities.SCRIPTING_CSV_UTTERANCE_STARTROW_HEADER)
      const stopOnEmpty = this._GetOptionalCapability(Capabilities.SCRIPTING_CSV_UTTERANCE_STOP_ON_EMPTY)

      for (let col = 0; col < columnCount; col++) {
        const name = rows[0][col]
        if (!name || name.trim().length === 0) {
          debug(`Column ${col + 1} has no header, skipping`)
          continue
        }

        const uttStruct = {
          name,
          utterances: []
        }
        let skip = !!startRowHeader
        const getData = (row) => {
          return rows[row][col] ? rows[row][col].trim() : false
        }
        //
        for (let row = startRow; row < rows.length && (skip || !stopOnEmpty || !!getData(row)); row++) { // eslint-disable-line no-unmodified-loop-condition
          const data = getData(row)
          if (!data) {
            continue
          }
          if (!skip) {
            uttStruct.utterances.push(data)
          } else {
            if (startRowHeader === rows[row][col]) {
              skip = false
            }
          }
        }
        if (uttStruct.utterances.length === 0) {
          // liveperson, skipping meta intents
          debug(`Column ${col + 1} has no utterances, skipping`)
          continue
        }
        result.push(uttStruct)
      }

      debug(`Multi-column utterance file, extracted ${result.length} utterances`)
      this.context.AddUtterances(result)
      return result
    } else {
      return []
    }
  }
}
