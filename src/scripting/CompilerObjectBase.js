const _ = require('lodash')
const debug = require('debug')('botium-core-CompilerObject')

const Capabilities = require('../Capabilities')
const CompilerBase = require('./CompilerBase')
const Constants = require('./Constants')
const Utterance = require('./Utterance')
const { Convo } = require('./Convo')
const { linesToConvoStep, validSenders } = require('./helper')

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

  Deserialize (scriptData) {
    throw new Error('not implemented')
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
      const conversation = []
      for (const [convoStepLineIndex, convoStepRaw] of convoRaw.steps.entries()) {
        const lineTag = `${convoStepLineIndex + 1}`.padStart(`${convoRaw.steps.length}`.length, '0')

        if (Object.keys(convoStepRaw).length > 1) {
          throw new Error(`Use just one from ${validSenders.join(',')} fields in step ${JSON.stringify(convoStepRaw)}`)
        }
        if (validSenders.findIndex(sender => convoStepRaw[sender]) < 0) {
          throw new Error(`Use ${validSenders.map(s => `'${s}'`).join(' or ')} field in step ${JSON.stringify(convoStepRaw)}`)
        }

        const convoStepSender = Object.keys(convoStepRaw)[0]
        const convoStepObject = convoStepRaw[convoStepSender]

        conversation.push(Object.assign(
          {
            sender: convoStepSender,
            stepTag: 'Line ' + lineTag
          },
          linesToConvoStep(convoStepObject, convoStepSender, this.context, this.eol)
        ))
      }

      const convo = {
        header: {
          name: convoRaw.name,
          description: convoRaw.description
        },
        conversation
      }

      const toAdd = new Convo(this.context, convo)
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
    const names = Object.keys(utterancesRaw || {})
    for (const name of names) {
      if (!_.isArray(utterancesRaw[name])) {
        throw new Error(`The '${name}' utterance has to be an array.`)
      }
      result.push(new Utterance({ name, utterances: (utterancesRaw[name]).map(u => `${u}`) }))
    }
    this.context.AddUtterances(result)
    return result
  }

  _compileScriptingMemory (lines) {
    if (lines && lines.length > 0) {
      if (_.isString(lines[0])) {
        if (lines.length > 1) {
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
      } else {
        this.context.AddScriptingMemories(lines)
        return lines
      }
    }
    return []
  }

  Decompile (convos) {
    throw new Error('not implemented')
  }
}
