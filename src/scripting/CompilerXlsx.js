const util = require('util')
const XLSX = require('xlsx')
const _ = require('lodash')
const debug = require('debug')('botium-CompilerXlsx')

const Capabilities = require('../Capabilities')
const CompilerBase = require('./CompilerBase')
const Constants = require('./Constants')
const Utterance = require('./Utterance')
const { Convo } = require('./Convo')
const { linesToConvoStep } = require('./helper')

module.exports = class CompilerXlsx extends CompilerBase {
  constructor (context, caps = {}) {
    super(context, caps)

    this.colnames = [ 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z' ]
  }

  _splitSheetnames (sheetnames) {
    if (sheetnames) return sheetnames.split(/\s*[;,\s|]\s*/)
  }

  Validate () {
    super.Validate()
    this._AssertCapabilityExists(Capabilities.SCRIPTING_XLSX_STARTROW)
    this._AssertCapabilityExists(Capabilities.SCRIPTING_XLSX_STARTCOL)

    if (_.isString(this.caps[Capabilities.SCRIPTING_XLSX_STARTCOL]) && this.colnames.findIndex((c) => c === this.caps[Capabilities.SCRIPTING_XLSX_STARTCOL]) < 0) {
      throw new Error(`SCRIPTING_XLSX_STARTCOL ${this.caps[Capabilities.SCRIPTING_XLSX_STARTCOL]} invalid (A-Z)`)
    } else if (this.caps[Capabilities.SCRIPTING_XLSX_STARTCOL] < 1 || this.caps[Capabilities.SCRIPTING_XLSX_STARTCOL] > this.colnames.length) {
      throw new Error(`SCRIPTING_XLSX_STARTCOL ${this.caps[Capabilities.SCRIPTING_XLSX_STARTCOL]} invalid (1-${this.colnames.length})`)
    }
  }

  Compile (scriptBuffer, scriptType = Constants.SCRIPTING_TYPE_CONVO) {
    const workbook = XLSX.read(scriptBuffer, { type: 'buffer' })
    if (!workbook) throw new Error(`Workbook not readable`)

    const eol = this.caps[Capabilities.SCRIPTING_XLSX_EOL_WRITE]

    let sheetnames = []
    if (scriptType === Constants.SCRIPTING_TYPE_CONVO) {
      if (this.caps[Capabilities.SCRIPTING_XLSX_SHEETNAMES]) {
        sheetnames = this._splitSheetnames(this.caps[Capabilities.SCRIPTING_XLSX_SHEETNAMES])
      } else {
        sheetnames = workbook.SheetNames || []
      }
    } else if (scriptType === Constants.SCRIPTING_TYPE_PCONVO) {
      if (this.caps[Capabilities.SCRIPTING_XLSX_SHEETNAMES_PCONVOS]) {
        sheetnames = this._splitSheetnames(this.caps[Capabilities.SCRIPTING_XLSX_SHEETNAMES_PCONVOS])
      } else {
        sheetnames = []
      }
    } else if (scriptType === Constants.SCRIPTING_TYPE_UTTERANCES) {
      if (this.caps[Capabilities.SCRIPTING_XLSX_SHEETNAMES_UTTERANCES]) {
        sheetnames = this._splitSheetnames(this.caps[Capabilities.SCRIPTING_XLSX_SHEETNAMES_UTTERANCES])
      } else {
        sheetnames = []
      }
    } else if (scriptType === Constants.SCRIPTING_TYPE_SCRIPTING_MEMORY) {
      if (this.caps[Capabilities.SCRIPTING_XLSX_SHEETNAMES_SCRIPTING_MEMORY]) {
        sheetnames = this._splitSheetnames(this.caps[Capabilities.SCRIPTING_XLSX_SHEETNAMES_SCRIPTING_MEMORY])
      } else {
        sheetnames = []
      }
    } else {
      throw Error(`Invalid script type ${scriptType}`)
    }

    debug(`sheet names for ${scriptType}: ${util.inspect(sheetnames)}`)

    const scriptResults = []

    sheetnames.forEach((sheetname) => {
      const sheet = workbook.Sheets[sheetname]
      if (!sheet) return

      let rowindex = this.caps[Capabilities.SCRIPTING_XLSX_STARTROW]
      let colindex = this.caps[Capabilities.SCRIPTING_XLSX_STARTCOL] - 1
      if (_.isString(this.caps[Capabilities.SCRIPTING_XLSX_STARTCOL])) {
        colindex = this.colnames.findIndex((c) => c === this.caps[Capabilities.SCRIPTING_XLSX_STARTCOL])
      }
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
            lines = [ content.trim() ]
          }

          return linesToConvoStep(lines, sender, this.context, eol)
        }

        const formatRowIndex = (rowindex) => ('00' + rowindex).slice(-3)

        const _extractRow = (rowindex) => {
          const meCell = this.colnames[colindex] + rowindex
          const meCellSort = this.colnames[colindex] + formatRowIndex(rowindex)
          const meCellValue = sheet[meCell] && sheet[meCell].v
          const botCell = this.colnames[colindex + 1] + rowindex
          const botCellSort = this.colnames[colindex + 1] + formatRowIndex(rowindex)
          const botCellValue = sheet[botCell] && sheet[botCell].v

          return { meCell, meCellSort, meCellValue, botCell, botCellSort, botCellValue }
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
              debug(`questionAnswerMode to true (question-answer row found)`)
            }
            index++
          }

          if (questionAnswerMode === null) {
            questionAnswerMode = false
            debug(`questionAnswerMode to false (no question-answer row found)`)
          }
        }

        let currentConvo = []
        let emptylines = 0
        let startcell = null
        let startcellsort = null
        // each row is a conversation with a question and an answer

        while (true) {
          const { meCell, meCellSort, meCellValue, botCell, botCellValue } = _extractRow(rowindex)
          if (questionAnswerMode) {
            if (meCellValue || botCellValue) {
              currentConvo = []
              currentConvo.push(Object.assign(
                { sender: 'me', stepTag: 'Cell ' + meCell },
                parseCell('me', meCellValue)
              ))
              startcell = meCell
              startcellsort = meCellSort
              currentConvo.push(Object.assign(
                { sender: 'bot', stepTag: 'Cell ' + botCell },
                parseCell('bot', botCellValue)
              ))
              scriptResults.push(new Convo(this.context, {
                header: {
                  name: `${sheetname}-${startcell}`,
                  sort: `${sheetname}-${startcellsort}`
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
              if (!startcell) startcell = meCell
              if (!startcellsort) startcellsort = meCellSort
              emptylines = 0
            } else if (botCellValue) {
              currentConvo.push(Object.assign(
                { sender: 'bot', stepTag: 'Cell ' + botCell },
                parseCell('bot', botCellValue)
              ))
              if (!startcell) startcell = meCell
              if (!startcellsort) startcellsort = meCellSort
              emptylines = 0
            } else {
              if (currentConvo.length > 0) {
                scriptResults.push(new Convo(this.context, {
                  header: {
                    name: `${sheetname}-${startcell}`,
                    sort: `${sheetname}-${startcellsort}`
                  },
                  conversation: currentConvo
                }))
              }
              currentConvo = []
              startcell = null
              emptylines++
            }
          }
          rowindex++

          if (emptylines > 1) break
        }
      }

      if (scriptType === Constants.SCRIPTING_TYPE_UTTERANCES) {
        let currentUtterance = null
        let emptylines = 0
        while (true) {
          const nameCell = this.colnames[colindex] + rowindex
          const uttCell = this.colnames[colindex + 1] + rowindex

          if (sheet[nameCell] && sheet[nameCell].v && sheet[uttCell] && sheet[uttCell].v) {
            currentUtterance = new Utterance({ name: sheet[nameCell].v, utterances: [ sheet[uttCell].v ] })
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
}
