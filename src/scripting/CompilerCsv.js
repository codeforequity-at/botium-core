/* eslint-disable no-lone-blocks */
const parse = require('csv-parse/lib/sync')
const _ = require('lodash')
const debug = require('debug')('botium-CompilerXlsx')

const Capabilities = require('../Capabilities')
const CompilerBase = require('./CompilerBase')
const Constants = require('./Constants')
const { Convo } = require('./Convo')
const { linesToConvoStep } = require('./helper')

// From, and To texts are identified by separate Question, and Answer columns
const CSV_MODE_COLUMN = 'COLUMN'
// From, and To texts are identified by a special Sender column
const CSV_MODE_SENDER = 'SENDER'
const DEFAULT_SEPARATOR = ','
const DEFAULT_USE_HEADER = true
const DEFAULT_MAPPING_SENDER = {
  conversationId: {
    index: 0,
    cap: Capabilities.SCRIPTING_CSV_MODE_SENDER_COL_CONVERSATION_ID
  },
  sender: {
    index: 1,
    cap: Capabilities.SCRIPTING_CSV_MODE_SENDER_COL_SENDER
  },
  text: {
    index: 2,
    cap: Capabilities.SCRIPTING_CSV_MODE_SENDER_COL_TEXT
  }
}
const DEFAULT_MAPPING_SENDER_1_COLUMN = {
  text: {
    index: 2,
    cap: Capabilities.SCRIPTING_CSV_MODE_SENDER_COL_TEXT
  }
}
const DEFAULT_MAPPING_COLUMNS = {
  question: {
    index: 0,
    cap: Capabilities.SCRIPTING_CSV_MODE_COLUMN_COL_QUESTION
  },
  answer: {
    index: 1,
    cap: Capabilities.SCRIPTING_CSV_MODE_COLUMN_COL_ANSWER
  }
}

module.exports = class CompilerCsv extends CompilerBase {
  constructor (context, caps = {}) {
    super(context, caps)
  }

  Validate () {
    super.Validate()

    const mode = this._GetOptionalCapability(Capabilities.SCRIPTING_CSV_MODE)
    if (mode) {
      if (mode !== CSV_MODE_SENDER || mode !== CSV_MODE_COLUMN) {
        throw new Error('Illegal value in capability SCRIPTING_CSV_MODE. If it is set then it must be COLUMN or SENDER')
      }
    }
  }

  Compile (scriptBuffer, scriptType = Constants.SCRIPTING_TYPE_CONVO) {
    let rowsRaw
    try {
      rowsRaw = parse(scriptBuffer, {
        delimiter: this._GetOptionalCapability(Capabilities.SCRIPTING_CSV_SEPARATOR, DEFAULT_SEPARATOR)
      })
    } catch (err) {
      throw new Error('Invalid CSV!')
    }

    if (rowsRaw.length === 0) {
      return
    }

    const extractedData = {
      rowsRaw,
      header: null,
      rows: null,
      columnCount: null,
      mode: null,
      mapping: {},
      columnMappingMode: null
    }

    // adding header, rows, and columnCount
    {
      if (!rowsRaw.length) {
        debug(`Compile no data`)
        return
      }
      if (this._GetOptionalCapability(Capabilities.SCRIPTING_CSV_USE_HEADER, DEFAULT_USE_HEADER)) {
        extractedData.header = rowsRaw[0]
        extractedData.rows = rowsRaw.slice(1)
      } else {
        extractedData.rows = rowsRaw
      }
      if (!extractedData.rows.length) {
        debug(`Compile just header, no data!`)
        return
      }
      extractedData.columnCount = extractedData.rows[0].length
    }

    // adds mode
    {
      if (this._GetOptionalCapability(Capabilities.SCRIPTING_CSV_MODE)) {
        extractedData.mode = this._GetOptionalCapability(Capabilities.SCRIPTING_CSV_MODE)
      } else if (Object.keys(this._GetCapabilitiesByPrefix('SCRIPTING_CSV_MODE_COLUMN')).length) {
        extractedData.mode = CSV_MODE_COLUMN
      } else if (Object.keys(this._GetCapabilitiesByPrefix('SCRIPTING_CSV_MODE_SENDER')).length) {
        extractedData.mode = CSV_MODE_SENDER
      } else if (extractedData.header) {
        if (extractedData.header.filter((columnName) => DEFAULT_MAPPING_COLUMNS[columnName]).length > 0) {
          extractedData.mode = CSV_MODE_COLUMN
        } else {
          extractedData.mode = CSV_MODE_SENDER
        }
      } else {
        extractedData.mode = CSV_MODE_SENDER
      }
      debug(`Compile mode is ${extractedData.mode}`)
    }

    // adds columnMappingMode
    {
      if (Object.keys(this._GetCapabilitiesByPrefix('SCRIPTING_CSV_MODE_COLUMN')).length || Object.keys(this._GetCapabilitiesByPrefix('SCRIPTING_CSV_MODE_SENDER')).length) {
        extractedData.columnMappingMode = 'CAP'
      } else if (extractedData.header) {
        const columnFoundByName = extractedData.header.filter((columnName) => {
          return DEFAULT_MAPPING_SENDER[columnName] || DEFAULT_MAPPING_COLUMNS[columnName]
        })
        if (columnFoundByName) {
          extractedData.columnMappingMode = 'NAME'
        }
      }
      if (extractedData.columnMappingMode == null) {
        if (extractedData.mode === CSV_MODE_SENDER && extractedData.rows[0].length < 3) {
          extractedData.columnMappingMode = 'INDEX_SENDER_WITH_1_COLUMN'
        } else {
          extractedData.columnMappingMode = 'INDEX'
        }
      }
      debug(`Compile columnMappingMode is ${extractedData.columnMappingMode}`)
    }

    // creates mapping.
    // Examples:
    // {conversationId:0, sender: 1, text: 2 }
    // {conversationId: null, sender: 3, text: 2}
    // {question: 2, answer: 4}
    {
      const _getMappingByCap = (header, cap) => {
        cap = this._GetOptionalCapability(cap)
        if (cap === null) {
          return null
        }
        if (cap.toString() === _.toSafeInteger(cap).toString()) {
          return _.toSafeInteger(cap)
        }

        if (header) {
          let result = _getHeaderIndexFuzzy(header, cap)
          if (result != null) {
            return result
          } else {
            throw Error(`Unknown column definition ${cap}. Column not found by name`)
          }
        } else {
          throw Error(`Unknown column definition ${cap}. There is no header in CSV.`)
        }
      }
      const _getMappingByName = (header, defName) => {
        let result = _getHeaderIndexFuzzy(header, defName)
        if (result != null) {
          return result
        } else {
          return null
        }
      }
      const _getMappingByIndex = (def) => {
        return def
      }

      const defMapping = (extractedData.mode === CSV_MODE_SENDER)
        ? ((extractedData.columnMappingMode === 'INDEX_SENDER_WITH_1_COLUMN') ? DEFAULT_MAPPING_SENDER_1_COLUMN : DEFAULT_MAPPING_SENDER)
        : DEFAULT_MAPPING_COLUMNS

      Object.keys(defMapping).forEach(columnName => {
        const entry = defMapping[columnName]
        let mappedIndex
        switch (extractedData.columnMappingMode) {
          case 'CAP':
            mappedIndex = _getMappingByCap(extractedData.header, entry.cap)
            break
          case 'NAME':
            mappedIndex = _getMappingByName(extractedData.header, columnName)
            break
          case 'INDEX':
          case 'INDEX_SENDER_WITH_1_COLUMN':
            mappedIndex = _getMappingByIndex(entry.index)
            break
        }
        if (mappedIndex < 0 || mappedIndex > extractedData.columnCount) {
          throw new Error(`Tried to map column ${columnName}, but the mapped index ${mappedIndex} is invalid in CSV`)
        }
        if (mappedIndex != null) {
          Object.keys(extractedData.mapping).forEach((alreadyMappedColumnName) => {
            if (extractedData.mapping[alreadyMappedColumnName] === mappedIndex) {
              throw new Error(`Tried to map column ${columnName}, but the mapped index ${mappedIndex} is already mapped to ${alreadyMappedColumnName}`)
            }
          })
        }
        extractedData.mapping[columnName] = mappedIndex
      })
    }

    const scriptResults = []
    // extract scripts
    {
      if (extractedData.mode === CSV_MODE_SENDER) {
        if (extractedData.columnMappingMode === 'INDEX_SENDER_WITH_1_COLUMN') {
          _checkRequiredMapping(extractedData, 'text')
        } else {
          _checkRequiredMapping(extractedData, 'conversationId', 'sender', 'text')
        }
        const _getConversationId = (rowIndex, extractedData) => {
          if (extractedData.columnMappingMode === 'INDEX_SENDER_WITH_1_COLUMN') {
            return Math.floor(rowIndex / 2)
          } else {
            return _getCellByMapping(rowIndex, 'conversationId', extractedData)
          }
        }
        const _getSender = (rowIndex, extractedData) => {
          if (extractedData.columnMappingMode === 'INDEX_SENDER_WITH_1_COLUMN') {
            return (rowIndex % 2) ? 'me' : 'bot'
          } else {
            const result = _getCellByMapping(rowIndex, 'sender', extractedData)
            if (result !== 'me' && result !== 'bot') {
              throw Error(`Invalid row ${rowIndex} sender must be 'me' or 'bot'`)
            }
            return result
          }
        }
        const _getText = (rowIndex, extractedData) => {
          return _getCellByMapping(rowIndex, 'text', extractedData)
        }

        let currentConvo = null
        let currentConvoId = null
        let convoStartingRowIndex = null
        const _createConvo = (rowIndex) => {
          return new Convo(this.context, {
            header: {
              name: `${currentConvoId},${convoStartingRowIndex}-${rowIndex}`
            },
            conversation: currentConvo
          })
        }
        for (let rowIndex = 0; rowIndex < extractedData.rows.length; rowIndex++) {
          const convoId = _getConversationId(rowIndex, extractedData)
          if (convoId === null) {
            throw new Error('Convo Id cant be null!')
          }
          // start a new convo, store previous if exists
          if (currentConvoId !== convoId) {
            if (currentConvo != null) {
              scriptResults.push(_createConvo(rowIndex))
            }
            currentConvoId = convoId
            currentConvo = []
            convoStartingRowIndex = rowIndex
          }

          const convoStep = linesToConvoStep(
            [_getText(rowIndex, extractedData)],
            _getSender(rowIndex, extractedData),
            this.context
          )
          convoStep.stepTag = `Row ${rowIndex}`
          currentConvo.push(convoStep)
        }
        if (currentConvo == null || !currentConvo.length) {
          throw new Error('Illegal state, convo can be empty here')
        }
        scriptResults.push(_createConvo(extractedData.rows.length - 1))
      } else if (extractedData.mode === CSV_MODE_COLUMN) {
        _checkRequiredMapping(extractedData, 'question', 'answer')
        for (let rowIndex = 0; rowIndex < extractedData.rows.length; rowIndex++) {
          const convoId = rowIndex
          const currentConvo = []

          const convoStepQuestion = linesToConvoStep(
            [_getCellByMapping(rowIndex, 'question', extractedData)],
            'me',
            this.context
          )
          convoStepQuestion.stepTag = `Question ${rowIndex}`
          currentConvo.push(convoStepQuestion)

          const convoStepAnswer = linesToConvoStep(
            [_getCellByMapping(rowIndex, 'answer', extractedData)],
            'bot',
            this.context
          )
          convoStepAnswer.stepTag = `Answer ${rowIndex}`
          currentConvo.push(convoStepAnswer)

          scriptResults.push(
            new Convo(this.context, {
              header: {
                name: `${convoId},${rowIndex}/${extractedData.rows.length - 1}`
              },
              conversation: currentConvo
            })
          )
        }
      } else {
        throw new Error('Illegal state, unknown mode!')
      }
    }

    if (scriptResults && scriptResults.length > 0) {
      if (scriptType === Constants.SCRIPTING_TYPE_CONVO) {
        this.context.AddConvos(scriptResults)
      } else if (scriptType === Constants.SCRIPTING_TYPE_PCONVO) {
        this.context.AddPartialConvos(scriptResults)
      } else if (scriptType === Constants.SCRIPTING_TYPE_UTTERANCES) {
        throw new Error('not supported yet')
      } else if (scriptType === Constants.SCRIPTING_TYPE_SCRIPTING_MEMORY) {
        throw new Error('not supported yet')
      }
      return scriptResults
    }
  }
}

const _getHeaderIndexFuzzy = (header, field) => {
  for (let i = 0; i < header.length; i++) {
    if (header[i].toLocaleLowerCase().trim().replace('_', '').replace('-', '') === field.toLocaleLowerCase().trim().replace('_', '').replace('-', '')) {
      return i
    }
  }

  return null
}

const _getCellByMapping = (row, columnName, extractedData) => {
  const colMapping = extractedData.mapping[columnName]
  return extractedData.rows[row][colMapping]
}

const _checkRequiredMapping = (extractedData, ...columnNames) => {
  for (const columnName of columnNames) {
    if (extractedData.mapping[columnName] == null) {
      throw new Error(`Mapping not found for ${columnName}`)
    }
  }
}
