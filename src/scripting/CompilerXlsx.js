const util = require('util')
const XLSX = require('xlsx')
const _ = require('lodash')
const debug = require('debug')('botium-core-CompilerXlsx')

const Capabilities = require('../Capabilities')
const CompilerBase = require('./CompilerBase')
const Constants = require('./Constants')
const Utterance = require('./Utterance')
const { Convo } = require('./Convo')
const { linesToConvoStep } = require('./helper')

module.exports = class CompilerXlsx extends CompilerBase {
  constructor (context, caps = {}) {
    super(context, caps)

    this.colnames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']
  }

  _splitSheetnames (sheetnames) {
    if (sheetnames) return sheetnames.split(/\s*[;,\s|]\s*/)
  }

  Validate () {
    super.Validate()

    if (this.caps[Capabilities.SCRIPTING_XLSX_STARTCOL] !== undefined) {
      if (_.isString(this.caps[Capabilities.SCRIPTING_XLSX_STARTCOL]) && this.colnames.findIndex((c) => c === this.caps[Capabilities.SCRIPTING_XLSX_STARTCOL]) < 0) {
        throw new Error(`SCRIPTING_XLSX_STARTCOL ${this.caps[Capabilities.SCRIPTING_XLSX_STARTCOL]} invalid (A-Z)`)
      } else if (this.caps[Capabilities.SCRIPTING_XLSX_STARTCOL] < 1 || this.caps[Capabilities.SCRIPTING_XLSX_STARTCOL] > this.colnames.length) {
        throw new Error(`SCRIPTING_XLSX_STARTCOL ${this.caps[Capabilities.SCRIPTING_XLSX_STARTCOL]} invalid (1-${this.colnames.length})`)
      }
    }
  }

  Compile (scriptBuffer, scriptType = Constants.SCRIPTING_TYPE_CONVO) {
    const workbook = XLSX.read(scriptBuffer, { type: 'buffer' })
    if (!workbook) throw new Error('Workbook not readable')

    const eol = this.caps[Capabilities.SCRIPTING_XLSX_EOL_WRITE]

    let sheetnames = []
    if (scriptType === Constants.SCRIPTING_TYPE_CONVO) {
      if (this.caps[Capabilities.SCRIPTING_XLSX_SHEETNAMES]) {
        sheetnames = this._splitSheetnames(this.caps[Capabilities.SCRIPTING_XLSX_SHEETNAMES])
      } else {
        sheetnames = workbook.SheetNames.filter(s => (/convo/i.test(s) || /dialog/i.test(s)) && !/partial/i.test(s)) || []
      }
    } else if (scriptType === Constants.SCRIPTING_TYPE_PCONVO) {
      if (this.caps[Capabilities.SCRIPTING_XLSX_SHEETNAMES_PCONVOS]) {
        sheetnames = this._splitSheetnames(this.caps[Capabilities.SCRIPTING_XLSX_SHEETNAMES_PCONVOS])
      } else {
        sheetnames = workbook.SheetNames.filter(s => /partial/i.test(s)) || []
      }
    } else if (scriptType === Constants.SCRIPTING_TYPE_UTTERANCES) {
      if (this.caps[Capabilities.SCRIPTING_XLSX_SHEETNAMES_UTTERANCES]) {
        sheetnames = this._splitSheetnames(this.caps[Capabilities.SCRIPTING_XLSX_SHEETNAMES_UTTERANCES])
      } else {
        sheetnames = workbook.SheetNames.filter(s => /utter/i.test(s)) || []
      }
    } else if (scriptType === Constants.SCRIPTING_TYPE_SCRIPTING_MEMORY) {
      if (this.caps[Capabilities.SCRIPTING_XLSX_SHEETNAMES_SCRIPTING_MEMORY]) {
        sheetnames = this._splitSheetnames(this.caps[Capabilities.SCRIPTING_XLSX_SHEETNAMES_SCRIPTING_MEMORY])
      } else {
        sheetnames = workbook.SheetNames.filter(s => /memory/i.test(s) || /scripting/i.test(s)) || []
      }
    } else {
      throw Error(`Invalid script type ${scriptType}`)
    }

    debug(`sheet names for ${scriptType}: ${util.inspect(sheetnames)}`)

    const scriptResults = []

    sheetnames.forEach((sheetname) => {
      const sheet = workbook.Sheets[sheetname]
      if (!sheet) return

      let { rowindex, colindex } = this._findOrigin(sheet, scriptType)
      debug(`evaluating sheet name for ${scriptType}: ${util.inspect(sheetname)}, rowindex ${rowindex}, colindex ${colindex}`)

      if (scriptType === Constants.SCRIPTING_TYPE_CONVO || scriptType === Constants.SCRIPTING_TYPE_PCONVO) {
        const parseCell = (sender, content) => {
          if (!content) return { messageText: '' }

          if (!_.isString(content)) content = '' + content

          let eolSplit = null
          let lines = []
          if (content.indexOf('\n') >= 0) {
            eolSplit = '\n'
          } else if (content.indexOf('\r') >= 0) {
            eolSplit = '\r'
          }

          if (eolSplit) {
            lines = content.split(eolSplit).map(l => l.trim()).filter(l => l)
          } else {
            lines = [content.trim()]
          }

          return linesToConvoStep(lines, sender, this.context, eol)
        }

        const _extractRow = (rowindex) => {
          const meCell = this.colnames[colindex] + rowindex
          const meCellValue = sheet[meCell] && sheet[meCell].v
          const botCell = this.colnames[colindex + 1] + rowindex
          const botCellValue = sheet[botCell] && sheet[botCell].v

          return { meCell, meCellValue, botCell, botCellValue }
        }

        let questionAnswerMode = this._GetOptionalCapability(Capabilities.SCRIPTING_XLSX_MODE)
        if (questionAnswerMode !== null) {
          questionAnswerMode = questionAnswerMode === 'QUESTION_ANSWER'
          debug(`questionAnswerMode to ${questionAnswerMode} (capability)`)
        } else {
          let emptyRowCount = 0
          let index = 0
          while (emptyRowCount < 2) {
            const { meCellValue, botCellValue } = _extractRow(rowindex + index)
            if (!meCellValue && !botCellValue) {
              emptyRowCount++
            } else if (meCellValue && botCellValue) {
              questionAnswerMode = true
              debug('questionAnswerMode to true (question-answer row found)')
            }
            index++
          }

          if (questionAnswerMode === null) {
            questionAnswerMode = false
            debug('questionAnswerMode to false (no question-answer row found)')
          }
        }

        const convoResults = []
        let currentConvo = []
        let emptylines = 0
        let startrowindex = -1

        while (true) {
          const { meCell, meCellValue, botCell, botCellValue } = _extractRow(rowindex)
          if (questionAnswerMode) {
            if (meCellValue || botCellValue) {
              currentConvo = []
              currentConvo.push(Object.assign(
                { sender: 'me', stepTag: 'Cell ' + meCell },
                parseCell('me', meCellValue)
              ))
              startrowindex = rowindex
              currentConvo.push(Object.assign(
                { sender: 'bot', stepTag: 'Cell ' + botCell },
                parseCell('bot', botCellValue)
              ))
              convoResults.push(new Convo(this.context, {
                header: {
                  sheetname,
                  colindex,
                  rowindex: startrowindex
                },
                conversation: currentConvo
              }))
            } else {
              emptylines++
            }
          } else {
            if (meCellValue) {
              currentConvo.push(Object.assign(
                { sender: 'me', stepTag: 'Cell ' + meCell },
                parseCell('me', meCellValue)
              ))
              if (startrowindex < 0) startrowindex = rowindex
              emptylines = 0
            } else if (botCellValue) {
              currentConvo.push(Object.assign(
                { sender: 'bot', stepTag: 'Cell ' + botCell },
                parseCell('bot', botCellValue)
              ))
              if (startrowindex < 0) startrowindex = rowindex
              emptylines = 0
            } else {
              if (currentConvo.length > 0) {
                convoResults.push(new Convo(this.context, {
                  header: {
                    sheetname,
                    colindex,
                    rowindex: startrowindex
                  },
                  conversation: currentConvo
                }))
              }
              currentConvo = []
              startrowindex = -1
              emptylines++
            }
          }
          rowindex++

          if (emptylines > 1) break
        }

        if (convoResults.length > 0) {
          const formatLength = Math.max(3, `${convoResults[convoResults.length - 1].header.rowindex}`.length)
          const formatBase = '0'.repeat(formatLength)
          const formatRowIndex = (rowindex) => (formatBase + `${rowindex}`).slice(-1 * formatLength)
          convoResults.forEach(convo => {
            convo.header.name = `${convo.header.sheetname}-${this.colnames[convo.header.colindex]}${formatRowIndex(convo.header.rowindex)}`
            convo.header.sort = convo.header.name
            scriptResults.push(convo)
          })
        }
      }

      if (scriptType === Constants.SCRIPTING_TYPE_UTTERANCES) {
        let currentUtterance = null
        let emptylines = 0
        while (true) {
          const nameCell = this.colnames[colindex] + rowindex
          const uttCell = this.colnames[colindex + 1] + rowindex

          if (sheet[nameCell] && sheet[nameCell].v && sheet[uttCell] && sheet[uttCell].v) {
            currentUtterance = new Utterance({ name: sheet[nameCell].v, utterances: [sheet[uttCell].v] })
            scriptResults.push(currentUtterance)
            emptylines = 0
          } else if (sheet[uttCell] && sheet[uttCell].v) {
            if (currentUtterance) currentUtterance.utterances.push(sheet[uttCell].v)
            emptylines = 0
          } else {
            currentUtterance = null
            emptylines++
          }
          rowindex++

          if (emptylines > 1) break
        }
      }

      if (scriptType === Constants.SCRIPTING_TYPE_SCRIPTING_MEMORY) {
        const variableNames = []
        let colindexTemp = colindex + 1
        while (true) {
          const variableNameCell = this.colnames[colindexTemp] + rowindex
          if (sheet[variableNameCell] && sheet[variableNameCell].v) {
            variableNames.push(sheet[variableNameCell].v)
          } else {
            break
          }

          colindexTemp++
        }

        rowindex += 1
        while (true) {
          const caseNameCell = this.colnames[colindex] + rowindex
          if (sheet[caseNameCell] && sheet[caseNameCell].v) {
            const caseName = sheet[caseNameCell].v
            const values = {}
            for (let i = 0; i < variableNames.length; i++) {
              const variableValueCell = this.colnames[colindex + 1 + i] + rowindex
              if (sheet[variableValueCell] && sheet[variableValueCell].v) {
                values[variableNames[i]] = sheet[variableValueCell].v.toString()
              } else {
                values[variableNames[i]] = null
              }
            }
            rowindex += 1

            scriptResults.push({ header: { name: caseName }, values: values })
          } else {
            break
          }
        }
      }
    })

    if (scriptResults && scriptResults.length > 0) {
      if (scriptType === Constants.SCRIPTING_TYPE_CONVO) {
        this.context.AddConvos(scriptResults)
      } else if (scriptType === Constants.SCRIPTING_TYPE_PCONVO) {
        this.context.AddPartialConvos(scriptResults)
      } else if (scriptType === Constants.SCRIPTING_TYPE_UTTERANCES) {
        this.context.AddUtterances(scriptResults)
      } else if (scriptType === Constants.SCRIPTING_TYPE_SCRIPTING_MEMORY) {
        this.context.AddScriptingMemories(scriptResults)
      }
      return scriptResults
    }
  }

  Decompile (convos) {
    const eol = this.caps[Capabilities.SCRIPTING_XLSX_EOL_WRITE]

    let sheetname = 'Botium'
    if (this.caps[Capabilities.SCRIPTING_XLSX_SHEETNAMES]) {
      sheetname = this._splitSheetnames(this.caps[Capabilities.SCRIPTING_XLSX_SHEETNAMES])[0]
    }
    const data = []
    if (convos) {
      convos.forEach((convo) => {
        if (!convo.conversation) return

        convo.conversation.forEach((set) => {
          let cellContent = ''

          if (set.sender === 'me') {
            if (set.buttons && set.buttons.length > 0) {
              cellContent += 'BUTTON ' + (set.buttons[0].payload || set.buttons[0].text) + eol
            } else if (set.media && set.media.length > 0) {
              cellContent += 'MEDIA ' + set.media[0].mediaUri + eol
            } else {
              cellContent += set.messageText + eol
            }
            set.userInputs && set.userInputs.map((userInput) => {
              cellContent += userInput.name + (userInput.args ? ' ' + userInput.args.join('|') : '') + eol
            })
            set.logicHooks && set.logicHooks.map((logicHook) => {
              cellContent += logicHook.name + (logicHook.args ? ' ' + logicHook.args.join('|') : '') + eol
            })
          } else {
            if (set.messageText) {
              if (set.not) {
                cellContent += '!'
              }
              cellContent += set.messageText + eol
            } else if (set.sourceData) {
              if (set.not) {
                cellContent += '!'
              }
              cellContent += JSON.stringify(set.sourceData, null, 2) + eol
            }
            if (set.buttons && set.buttons.length > 0) cellContent += 'BUTTONS ' + set.buttons.map(b => b.text).join('|') + eol
            if (set.media && set.media.length > 0) cellContent += 'MEDIA ' + set.media.map(m => m.mediaUri).join('|') + eol
            if (set.cards && set.cards.length > 0) {
              set.cards.forEach(c => {
                if (c.buttons && c.buttons.length > 0) cellContent += 'BUTTONS ' + c.buttons.map(b => b.text).join('|') + eol
                if (c.image) cellContent += 'MEDIA ' + c.image.mediaUri + eol
              })
            }
            set.asserters && set.asserters.map((asserter) => {
              if (asserter.not) {
                cellContent += '!'
              }
              cellContent += asserter.name + (asserter.args ? ' ' + asserter.args.join('|') : '') + eol
            })
            set.logicHooks && set.logicHooks.map((logicHook) => {
              cellContent += logicHook.name + (logicHook.args ? ' ' + logicHook.args.join('|') : '') + eol
            })
          }
          data.push({ [set.sender]: cellContent })
        })
        data.push({})
      })
    }
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(data, { header: ['me', 'bot'] })
    XLSX.utils.book_append_sheet(wb, ws, sheetname)
    const xlsxOutput = XLSX.write(wb, { type: 'buffer' })
    return xlsxOutput
  }

  _get (sheet, rowindex, colindex) {
    const cell = this.colnames[colindex] + rowindex
    const cellValue = sheet[cell] && sheet[cell].v
    return cellValue
  }

  _findOrigin (sheet, scriptType) {
    let rowindex = this.caps[Capabilities.SCRIPTING_XLSX_STARTROW]
    let colindex = this.caps[Capabilities.SCRIPTING_XLSX_STARTCOL]

    if (_.isString(this.caps[Capabilities.SCRIPTING_XLSX_STARTCOL])) {
      colindex = this.colnames.findIndex((c) => c === this.caps[Capabilities.SCRIPTING_XLSX_STARTCOL])
    } else if (colindex !== undefined) {
      colindex = colindex - 1
    }

    if (rowindex === undefined && colindex === undefined) {
      // eslint-disable-next-line no-labels
      NestedLoop:
      for (let cr = 1; cr < 1000; cr++) {
        for (let cc = 0; cc < this.colnames.length; cc++) {
          if (this._get(sheet, cr, cc)) {
            if (scriptType === Constants.SCRIPTING_TYPE_SCRIPTING_MEMORY) {
              if (cc > 0 && this._get(sheet, cr + 1, cc - 1)) {
                rowindex = cr
                colindex = cc - 1
                // eslint-disable-next-line no-labels
                break NestedLoop
              }
            } else {
              rowindex = cr
              colindex = cc
              // eslint-disable-next-line no-labels
              break NestedLoop
            }
          }
        }
      }
      if (scriptType !== Constants.SCRIPTING_TYPE_SCRIPTING_MEMORY) {
        if (rowindex !== undefined && this.caps[Capabilities.SCRIPTING_XLSX_HASHEADERS]) {
          rowindex++
        }
      }
    } else if (rowindex === undefined && colindex !== undefined) {
      for (let i = 1; i < 1000; i++) {
        if (this._get(sheet, i, colindex)) {
          rowindex = i
          break
        }
      }
      if (this.caps[Capabilities.SCRIPTING_XLSX_HASHEADERS]) {
        rowindex++
      }
    } else if (rowindex !== undefined && colindex === undefined) {
      for (let i = 0; i < this.colnames.length; i++) {
        if (this._get(sheet, rowindex, i)) {
          colindex = i
          break
        }
      }
    }
    return { rowindex, colindex }
  }
}
