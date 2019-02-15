const util = require('util')
const isJSON = require('is-json')
const XLSX = require('xlsx')
const _ = require('lodash')
const debug = require('debug')('botium-CompilerXlsx')

const Capabilities = require('../Capabilities')
const CompilerBase = require('./CompilerBase')
const Constants = require('./Constants')
const Utterance = require('./Utterance')
const { Convo } = require('./Convo')

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

    const eolSplit = this.caps[Capabilities.SCRIPTING_XLSX_EOL_SPLIT]
    const eol = this.caps[Capabilities.SCRIPTING_XLSX_EOL_WRITE]

    let sheetnames = []
    if (scriptType === Constants.SCRIPTING_TYPE_CONVO) {
      if (this.caps[Capabilities.SCRIPTING_XLSX_SHEETNAMES]) {
        sheetnames = this._splitSheetnames(this.caps[Capabilities.SCRIPTING_XLSX_SHEETNAMES])
      } else {
        sheetnames = workbook.SheetNames || []
      }
    } else if (scriptType === Constants.SCRIPTING_TYPE_UTTERANCES) {
      if (this.caps[Capabilities.SCRIPTING_XLSX_SHEETNAMES_UTTERANCES]) {
        sheetnames = this._splitSheetnames(this.caps[Capabilities.SCRIPTING_XLSX_SHEETNAMES_UTTERANCES])
      } else {
        sheetnames = workbook.SheetNames || []
      }
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

      if (scriptType === Constants.SCRIPTING_TYPE_CONVO) {
        const parseCell = (sender, content) => {
          if (!content) return { messageText: '' }

          if (!_.isString(content)) content = '' + content
          const lines = content.split(eolSplit).map(l => l.trim()).filter(l => l)

          const convoStep = { asserters: [], logicHooks: [], not: false }

          const textLines = []
          lines.forEach(l => {
            const name = l.split(' ')[0]
            if (sender !== 'me' && this.context.IsAsserterValid(name)) {
              const args = (l.length > name.length ? l.substr(name.length + 1).split('|').map(a => a.trim()) : [])
              convoStep.asserters.push({ name, args })
            } else if (sender === 'me' && this.context.IsUserInputValid(name)) {
              const args = (l.length > name.length ? l.substr(name.length + 1).split('|').map(a => a.trim()) : [])
              convoStep.userInputs.push({ name, args })
            } else if (this.context.IsLogicHookValid(name)) {
              const args = (l.length > name.length ? l.substr(name.length + 1).split('|').map(a => a.trim()) : [])
              convoStep.logicHooks.push({ name, args })
            } else {
              textLines.push(l)
            }
          })
          if (textLines.length > 0) {
            if (textLines[0].startsWith('!')) {
              convoStep.not = true
              textLines[0] = textLines[0].substr(1)
            }
            let content = textLines.join(' ')
            if (isJSON(content)) {
              convoStep.sourceData = JSON.parse(content)
            } else {
              convoStep.messageText = textLines.join(eol)
            }
          } else {
            convoStep.messageText = ''
          }
          return convoStep
        }

        let currentConvo = []
        let emptylines = 0
        let startcell = null
        while (true) {
          const meCell = this.colnames[colindex] + rowindex
          const botCell = this.colnames[colindex + 1] + rowindex

          if (sheet[meCell] && sheet[meCell].v) {
            currentConvo.push(Object.assign(
              { sender: 'me', stepTag: 'Cell ' + meCell },
              parseCell('me', sheet[meCell].v)
            ))
            if (!startcell) startcell = meCell
            emptylines = 0
          } else if (sheet[botCell] && sheet[botCell].v) {
            currentConvo.push(Object.assign(
              { sender: 'bot', stepTag: 'Cell ' + botCell },
              parseCell('bot', sheet[botCell].v)
            ))
            if (!startcell) startcell = botCell
            emptylines = 0
          } else {
            if (currentConvo.length > 0) {
              scriptResults.push(new Convo(this.context, {
                header: {
                  name: `${sheetname}-${startcell}`
                },
                conversation: currentConvo
              }))
            }
            currentConvo = []
            startcell = null
            emptylines++
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
    })

    if (scriptResults && scriptResults.length > 0) {
      if (scriptType === Constants.SCRIPTING_TYPE_CONVO) {
        this.context.AddConvos(scriptResults)
      } else if (scriptType === Constants.SCRIPTING_TYPE_UTTERANCES) {
        this.context.AddUtterances(scriptResults)
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
