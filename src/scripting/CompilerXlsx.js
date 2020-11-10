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
    if (sheetnames) return sheetnames.split(/\s*[;,|]\s*/)
  }

  _filterSheetnames (sheetnames, selectors) {
    return sheetnames.filter(sheetname => !!selectors.find(selector => selector === '*' || sheetname === selector))
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
    const maxEmptyRowCount = 10

    let sheetnames = []
    if (scriptType === Constants.SCRIPTING_TYPE_CONVO) {
      if (this.caps[Capabilities.SCRIPTING_XLSX_SHEETNAMES]) {
        sheetnames = this._filterSheetnames(workbook.SheetNames, this._splitSheetnames(this.caps[Capabilities.SCRIPTING_XLSX_SHEETNAMES]))
      } else {
        sheetnames = workbook.SheetNames.filter(s => (/convo/i.test(s) || /dialog/i.test(s)) && !/partial/i.test(s)) || []
      }
    } else if (scriptType === Constants.SCRIPTING_TYPE_PCONVO) {
      if (this.caps[Capabilities.SCRIPTING_XLSX_SHEETNAMES_PCONVOS]) {
        sheetnames = this._filterSheetnames(workbook.SheetNames, this._splitSheetnames(this.caps[Capabilities.SCRIPTING_XLSX_SHEETNAMES_PCONVOS]))
      } else {
        sheetnames = workbook.SheetNames.filter(s => /partial/i.test(s)) || []
      }
    } else if (scriptType === Constants.SCRIPTING_TYPE_UTTERANCES) {
      if (this.caps[Capabilities.SCRIPTING_XLSX_SHEETNAMES_UTTERANCES]) {
        sheetnames = this._filterSheetnames(workbook.SheetNames, this._splitSheetnames(this.caps[Capabilities.SCRIPTING_XLSX_SHEETNAMES_UTTERANCES]))
      } else {
        sheetnames = workbook.SheetNames.filter(s => /utter/i.test(s)) || []
      }
    } else if (scriptType === Constants.SCRIPTING_TYPE_SCRIPTING_MEMORY) {
      if (this.caps[Capabilities.SCRIPTING_XLSX_SHEETNAMES_SCRIPTING_MEMORY]) {
        sheetnames = this._filterSheetnames(workbook.SheetNames, this._splitSheetnames(this.caps[Capabilities.SCRIPTING_XLSX_SHEETNAMES_SCRIPTING_MEMORY]))
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

      let { rowindex, colindex, hasNameCol } = this._findOrigin(sheet, scriptType)
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
          const cell1 = this.colnames[colindex] + rowindex
          const cell1Value = (sheet[cell1] && sheet[cell1].v) || null
          const cell2 = this.colnames[colindex + 1] + rowindex
          const cell2Value = (sheet[cell2] && sheet[cell2].v) || null
          const cell3 = this.colnames[colindex + 2] + rowindex
          const cell3Value = (sheet[cell3] && sheet[cell3].v) || null

          if (hasNameCol) {
            return {
              nameCell: cell1,
              nameCellValue: cell1Value,
              meCell: cell2,
              meCellValue: cell2Value,
              botCell: cell3,
              botCellValue: cell3Value
            }
          } else {
            return {
              nameCell: null,
              nameCellValue: null,
              meCell: cell1,
              meCellValue: cell1Value,
              botCell: cell2,
              botCellValue: cell2Value
            }
          }
        }

        let questionAnswerMode = this._GetOptionalCapability(Capabilities.SCRIPTING_XLSX_MODE)
        if (questionAnswerMode !== null) {
          questionAnswerMode = questionAnswerMode === 'QUESTION_ANSWER'
          debug(`questionAnswerMode to ${questionAnswerMode} (capability)`)
        } else {
          let emptyRowCount = 0
          let index = 0
          const foundQARows = []
          const foundConvoRows = []

          while (emptyRowCount <= maxEmptyRowCount) {
            const { meCell, meCellValue, botCell, botCellValue } = _extractRow(rowindex + index)
            if (!meCellValue && !botCellValue) {
              emptyRowCount++
            } else if (meCellValue && botCellValue) {
              foundQARows.push(meCell)
            } else if (meCellValue && !botCellValue) {
              foundConvoRows.push(meCell)
            } else if (!meCellValue && botCellValue) {
              foundConvoRows.push(botCell)
            }
            index++
          }
          if (foundQARows.length > 0 && foundConvoRows.length > 0) {
            throw new Error(`Excel sheet "${sheetname}" invalid. Detected intermixed Q&A sections (for instance ${foundQARows.slice(0, 3).join(',')}) and convo sections (for instance ${foundConvoRows.slice(0, 3).join(',')})`)
          } else if (foundQARows.length > 0 && foundConvoRows.length === 0) {
            questionAnswerMode = true
            debug('questionAnswerMode to true (question-answer row found)')
          } else {
            questionAnswerMode = false
            debug('questionAnswerMode to false (no question-answer row found)')
          }
        }

        const convoResults = []
        let currentConvo = []
        let currentConvoName = null
        let emptyRowCount = 0
        let startrowindex = -1

        while (true) {
          const { nameCellValue, meCell, meCellValue, botCell, botCellValue } = _extractRow(rowindex)

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
                  name: nameCellValue || null,
                  sheetname,
                  colindex,
                  rowindex: startrowindex
                },
                conversation: currentConvo
              }))
            } else {
              emptyRowCount++
            }
          } else {
            if (currentConvo.length === 0) {
              currentConvoName = nameCellValue || null
            }
            if (meCellValue) {
              currentConvo.push(Object.assign(
                { sender: 'me', stepTag: 'Cell ' + meCell },
                parseCell('me', meCellValue)
              ))
              if (startrowindex < 0) startrowindex = rowindex
              emptyRowCount = 0
            } else if (botCellValue) {
              currentConvo.push(Object.assign(
                { sender: 'bot', stepTag: 'Cell ' + botCell },
                parseCell('bot', botCellValue)
              ))
              if (startrowindex < 0) startrowindex = rowindex
              emptyRowCount = 0
            } else {
              if (currentConvo.length > 0) {
                convoResults.push(new Convo(this.context, {
                  header: {
                    name: currentConvoName,
                    sheetname,
                    colindex,
                    rowindex: startrowindex
                  },
                  conversation: currentConvo
                }))
              }
              currentConvo = []
              currentConvoName = null
              startrowindex = -1
              emptyRowCount++
            }
          }
          rowindex++

          if (emptyRowCount > maxEmptyRowCount) break
        }

        if (convoResults.length > 0) {
          const formatLength = Math.max(3, `${convoResults[convoResults.length - 1].header.rowindex}`.length)
          const formatBase = '0'.repeat(formatLength)
          const formatRowIndex = (rowindex) => (formatBase + `${rowindex}`).slice(-1 * formatLength)
          convoResults.forEach(convo => {
            if (!convo.header.name) {
              convo.header.name = `${convo.header.sheetname}-${this.colnames[convo.header.colindex]}${formatRowIndex(convo.header.rowindex)}`
            }
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
              if (set.optional) {
                cellContent += '?'
              }
              if (set.not) {
                cellContent += '!'
              }
              cellContent += set.messageText + eol
            } else if (set.sourceData) {
              if (set.optional) {
                cellContent += '?'
              }
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
              if (asserter.optional) {
                cellContent += '?'
              }
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
    let hasNameCol = _.has(this.caps, Capabilities.SCRIPTING_XLSX_HASNAMECOL) ? !!this.caps[Capabilities.SCRIPTING_XLSX_HASNAMECOL] : null

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

    if (_.isNull(hasNameCol)) {
      if (scriptType === Constants.SCRIPTING_TYPE_CONVO || scriptType === Constants.SCRIPTING_TYPE_PCONVO) {
        if (this.caps[Capabilities.SCRIPTING_XLSX_HASHEADERS]) {
          if (this._get(sheet, rowindex - 1, colindex) && this._get(sheet, rowindex - 1, colindex + 1) && this._get(sheet, rowindex - 1, colindex + 2)) {
            hasNameCol = true
          }
        }
      }
    }
    return { rowindex, colindex, hasNameCol }
  }
}
