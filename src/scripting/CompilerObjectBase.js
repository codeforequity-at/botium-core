const _ = require('lodash')
const debug = require('debug')('botium-CompilerObject')

const Capabilities = require('../Capabilities')
const CompilerBase = require('./CompilerBase')
const Constants = require('./Constants')
const Utterance = require('./Utterance')
const { Convo } = require('./Convo')
const { linesToConvoStep } = require('./helper')

module.exports = class CompilerObjectBase extends CompilerBase {
  constructor (context, caps = {}) {
    super(context, caps)

    this.eol = caps[Capabilities.SCRIPTING_TXT_EOL]
  }

  Validate () {
    super.Validate()
    this._AssertCapabilityExists(Capabilities.SCRIPTING_TXT_EOL)
  }

  GetHeaders (scriptBuffer) {
    debug('GetHeaders is not implemented!')
  }

  Deserialize (sciptData) {
    throw new Error(`not implemented`)
  }

  Compile (scriptBuffer, scriptType = Constants.SCRIPTING_TYPE_CONVO) {
    let scriptData = scriptBuffer
    if (Buffer.isBuffer(scriptBuffer)) scriptData = scriptData.toString()
    scriptData = this.Deserialize(scriptData)

    const result = []
    if (scriptType === Constants.SCRIPTING_TYPE_CONVO) {
      result.push(...this._compileConvo(scriptData.convos, false))
    } else if (scriptType === Constants.SCRIPTING_TYPE_PCONVO) {
      result.push(...this._compileConvo(scriptData.partialConvos, true))
    } else if (scriptType === Constants.SCRIPTING_TYPE_UTTERANCES) {
      result.push(...this._compileUtterances(scriptData.utterances))
    } else if (scriptType === Constants.SCRIPTING_TYPE_SCRIPTING_MEMORY) {
      result.push(...this._compileScriptingMemory(scriptData.scriptingMemory))
    }

    return result
  }

  _compileConvo (convos, isPartial = false) {
    const result = []
    for (const convoRaw of (convos || [])) {
      let convoStepLineIndex = 0
      const conversation = []
      for (const convoStepRaw of (convoRaw.steps || [])) {
        convoStepLineIndex++
        if (convoStepRaw.me && convoStepRaw.bot) {
          throw new Error(`Use just one from 'me' and 'bot' fields in step ${JSON.stringify(convoStepRaw)}`)
        }
        if (!convoStepRaw.me && !convoStepRaw.bot) {
          throw new Error(`Use 'me' or 'bot' field in step ${JSON.stringify(convoStepRaw)}`)
        }

        const convoStepSender = convoStepRaw.me ? 'me' : 'bot'
        const convoStepObject = convoStepRaw.me || convoStepRaw.bot
        const lines = convoStepObject.map((line) => line.startsWith('TEXT ') ? line.substring(5) : line)
        conversation.push(Object.assign(
          {
            sender: convoStepSender,
            stepTag: 'Line ' + convoStepLineIndex
          },
          linesToConvoStep(lines, convoStepSender, this.context, this.eol)
        ))
      }

      let convo = {
        header: {
          name: convoRaw.name,
          description: convoRaw.description
        },
        conversation
      }

      let toAdd = new Convo(this.context, convo)
      result.push(toAdd)
      if (isPartial) {
        this.context.AddPartialConvos([toAdd])
      } else {
        this.context.AddConvos([toAdd])
      }
    }
    return result
  }

  _compileUtterances (utterancesRaw) {
    const result = []
    const names = Object.keys(utterancesRaw)
    for (const name of names) {
      result.push(new Utterance({ name, utterances: utterancesRaw[name] }))
    }
    this.context.AddUtterances(result)
    return result
  }

  _compileScriptingMemory (lines) {
    if (lines && lines.length > 1) {
      const names = lines[0].split('|').map((name) => name.trim()).slice(1)
      const scriptingMemories = []
      for (let row = 1; row < lines.length; row++) {
        const rawRow = lines[row].split('|').map((name) => name.trim())
        const caseName = rawRow[0]
        const values = rawRow.slice(1)
        const json = {}
        for (let col = 0; col < names.length; col++) {
          json[names[col]] = values[col]
        }
        const scriptingMemory = { header: { name: caseName }, values: json }
        scriptingMemories.push(scriptingMemory)
      }
      this.context.AddScriptingMemories(scriptingMemories)
      return scriptingMemories
    }
    return []
  }

  Decompile (convos) {
    throw new Error(`not implemented`)
  }
}
