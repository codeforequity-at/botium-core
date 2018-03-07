const util = require('util')
const XLSX = require('xlsx')
const _ = require('lodash')
const debug = require('debug')('botium-CompilerXlsx')

const Capabilities = require('../Capabilities')
const CompilerBase = require('./CompilerBase')
const Constants = require('./Constants')
const Utterance = require('./Utterance')
const { Convo } = require('./Convo')

module.exports = class CompilerXlsx extends CompilerBase {
  constructor (provider, caps = {}) {
    super(provider, caps)

    this.colnames = [ 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z' ]
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

    let sheetnames = []
    if (scriptType === Constants.SCRIPTING_TYPE_CONVO) {
      if (this.caps[Capabilities.SCRIPTING_XLSX_SHEETNAMES]) {
        sheetnames = this.caps[Capabilities.SCRIPTING_XLSX_SHEETNAMES].split(/\s*[;,\s|]\s*/) || []
      } else {
        sheetnames = workbook.SheetNames || []
      }
    } else if (scriptType === Constants.SCRIPTING_TYPE_UTTERANCES) {
      if (this.caps[Capabilities.SCRIPTING_XLSX_SHEETNAMES_UTTERANCES]) {
        sheetnames = this.caps[Capabilities.SCRIPTING_XLSX_SHEETNAMES_UTTERANCES].split(/\s*[;,\s|]\s*/) || []
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
        let currentConvo = []
        let emptylines = 0
        let startcell = null
        while (true) {
          const meCell = this.colnames[colindex] + rowindex
          const botCell = this.colnames[colindex + 1] + rowindex

          if (sheet[meCell] && sheet[meCell].v) {
            currentConvo.push({ sender: 'me', messageText: sheet[meCell].v, stepTag: 'Cell ' + meCell })
            if (!startcell) startcell = meCell
            emptylines = 0
          } else if (sheet[botCell] && sheet[botCell].v) {
            currentConvo.push({ sender: 'bot', messageText: sheet[botCell].v, stepTag: 'Cell ' + botCell })
            if (!startcell) startcell = botCell
            emptylines = 0
          } else {
            if (currentConvo.length > 0) {
              scriptResults.push(new Convo(this.provider, {
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
        this.provider.AddConvos(scriptResults)
      } else if (scriptType === Constants.SCRIPTING_TYPE_UTTERANCES) {
        this.provider.AddUtterances(scriptResults)
      }
      return scriptResults
    }
  }
}
