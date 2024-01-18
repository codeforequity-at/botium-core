_ = require('lodash')

const Capabilities = require('../Capabilities')
const Constants = require('./Constants')
const CompilerBase = require('./CompilerBase')
const Utterance = require('./Utterance')
const { ConvoHeader, Convo } = require('./Convo')
const { linesToConvoStep, convoStepToLines, validateConvo, validSenders, linesToScriptingMemories, trimExceptSpaceEnd } = require('./helper')

module.exports = class CompilerTxt extends CompilerBase {
  constructor (context, caps = {}) {
    super(context, caps)

    this.eolRead = caps[Capabilities.SCRIPTING_TXT_EOL] || /\r\n|\r|\n/
    this.eolWrite = (caps[Capabilities.SCRIPTING_TXT_EOL] && !_.isRegExp(caps[Capabilities.SCRIPTING_TXT_EOL])) ? caps[Capabilities.SCRIPTING_TXT_EOL] : '\n'
  }

  Validate () {
    super.Validate()
  }

  GetHeaders (scriptBuffer) {
    let scriptData = scriptBuffer
    if (Buffer.isBuffer(scriptBuffer)) scriptData = scriptData.toString()

    const lines = scriptData.split(this.eolRead)

    const header = { }

    if (lines && !lines[0].startsWith('#')) {
      header.name = lines[0]
    }
    return new ConvoHeader(header)
  }

  Compile (scriptBuffer, scriptType = Constants.SCRIPTING_TYPE_CONVO) {
    let scriptData = scriptBuffer
    if (Buffer.isBuffer(scriptBuffer)) scriptData = scriptData.toString()

    const lines = scriptData.split(this.eolRead)

    if (scriptType === Constants.SCRIPTING_TYPE_CONVO) {
      return this._compileConvo(lines, false)
    } else if (scriptType === Constants.SCRIPTING_TYPE_PCONVO) {
      return this._compileConvo(lines, true)
    } else if (scriptType === Constants.SCRIPTING_TYPE_UTTERANCES) {
      return this._compileUtterances(lines)
    } else if (scriptType === Constants.SCRIPTING_TYPE_SCRIPTING_MEMORY) {
      return this._compileScriptingMemory(lines)
    } else {
      throw Error(`Invalid script type ${scriptType}`)
    }
  }

  _compileConvo (lines, isPartial = false) {
    const convo = {
      header: {},
      conversation: []
    }

    let currentLineIndex = 0
    let currentLines = []
    let convoStepSender = null
    let convoStepChannel = null
    let convoStepLineIndex = null

    const parseMsg = (lines) => {
      lines = lines || []
      return linesToConvoStep(lines, convoStepSender, this.context)
    }

    const pushPrev = () => {
      if (convoStepSender && currentLines) {
        const convoStep = {
          sender: convoStepSender,
          channel: convoStepChannel,
          stepTag: 'Line ' + convoStepLineIndex
        }
        Object.assign(convoStep, parseMsg(currentLines))
        convo.conversation.push(convoStep)
      } else if (!convoStepSender && currentLines) {
        convo.header.name = currentLines[0]
        if (currentLines.length > 1) {
          convo.header.description = currentLines.slice(1).join(this.eolWrite)
        }
      }
    }

    const isValidTagLine = (line) => {
      if (!line || !line.startsWith('#')) return false
      const sender = line.substr(1).split(' ')[0]
      return validSenders.includes(sender)
    }

    lines.forEach((line) => {
      currentLineIndex++
      if (isValidTagLine(line)) {
        pushPrev()

        convoStepSender = line.substr(1).trim()
        convoStepChannel = null
        convoStepLineIndex = currentLineIndex
        if (convoStepSender.indexOf(' ') > 0) {
          convoStepChannel = convoStepSender.substr(convoStepSender.indexOf(' ') + 1).trim()
          convoStepSender = convoStepSender.substr(0, convoStepSender.indexOf(' ')).trim()
        }
        currentLines = []
      } else {
        currentLines.push(line)
      }
    })
    pushPrev()

    const result = [new Convo(this.context, convo)]
    if (isPartial) {
      this.context.AddPartialConvos(result)
    } else {
      this.context.AddConvos(result)
    }
    return result
  }

  _compileUtterances (lines) {
    if (lines && lines.length > 0) {
      const result = [new Utterance({ name: lines[0].trim(), utterances: lines.length > 1 ? lines.slice(1).map(line => trimExceptSpaceEnd(line)) : [] })]
      this.context.AddUtterances(result)
      return result
    }
  }

  _compileScriptingMemory (lines) {
    if (lines && lines.length > 1) {
      const scriptingMemories = linesToScriptingMemories(lines, this.caps[Capabilities.SCRIPTING_MEMORY_COLUMN_MODE])
      if (scriptingMemories && scriptingMemories.length > 0) {
        this.context.AddScriptingMemories(scriptingMemories)
      }
      return scriptingMemories
    }
  }

  Decompile (convos) {
    if (convos.length > 1) {
      throw new Error('only one convo per script')
    }

    const convo = convos[0]

    const validationResult = validateConvo(convo)
    if (validationResult.errors.length > 0) {
      throw new Error(validationResult.errors.map(e => e.message).join(' - '))
    }

    let script = ''

    if (convo.header.name) {
      script += convo.header.name + this.eolWrite
    }
    if (convo.header.description) {
      script += convo.header.description + this.eolWrite
    }

    convo.conversation.forEach((step) => {
      script += this.eolWrite

      script += '#' + step.sender
      if (step.channel && step.channel !== 'default') {
        script += ' ' + step.channel
      }
      script += this.eolWrite

      const stepLines = convoStepToLines(step)
      if (stepLines && stepLines.length > 0) script += stepLines.join(this.eolWrite) + this.eolWrite
    })
    return script
  }
}
