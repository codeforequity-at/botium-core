const isJSON = require('is-json')
const _ = require('lodash')

const Capabilities = require('../Capabilities')
const Constants = require('./Constants')
const CompilerBase = require('./CompilerBase')
const Utterance = require('./Utterance')
const { ConvoHeader, Convo } = require('./Convo')

module.exports = class CompilerTxt extends CompilerBase {
  constructor (provider, caps = {}) {
    super(provider, caps)

    this.eol = caps[Capabilities.SCRIPTING_TXT_EOL]
  }

  Validate () {
    super.Validate()
    this._AssertCapabilityExists(Capabilities.SCRIPTING_TXT_EOL)
  }

  GetHeaders (scriptBuffer) {
    let scriptData = scriptBuffer
    if (Buffer.isBuffer(scriptBuffer)) scriptData = scriptData.toString()

    let lines = scriptData.split(this.eol)

    let header = { }

    if (lines && !lines[0].startsWith('#')) {
      header.name = lines[0]
    }
    return new ConvoHeader(header)
  }

  Compile (scriptBuffer, scriptType = Constants.SCRIPTING_TYPE_CONVO) {
    let scriptData = scriptBuffer
    if (Buffer.isBuffer(scriptBuffer)) scriptData = scriptData.toString()

    let lines = _.map(scriptData.split(this.eol), (line) => line.trim())

    if (scriptType === Constants.SCRIPTING_TYPE_CONVO) {
      return this._compileConvo(lines)
    } else if (scriptType === Constants.SCRIPTING_TYPE_UTTERANCES) {
      return this._compileUtterances(lines)
    }
  }

  _compileConvo (lines) {
    let convo = {
      header: {},
      conversation: []
    }

    let currentLineIndex = 0
    let currentLines = []
    let currentSender = null
    let currentChannel = null

    let parseMsg = (lines) => {
      if (!lines) return null

      let content = lines.join(' ')
      if (isJSON(content)) {
        return JSON.parse(content)
      } else {
        return lines.join(this.eol)
      }
    }

    let pushPrev = () => {
      if (currentSender && currentLines) {
        const convoStep = {
          sender: currentSender,
          channel: currentChannel,
          stepTag: 'Line ' + currentLineIndex
        }
        let msg = parseMsg(currentLines)
        if (_.isString(msg)) {
          convoStep.messageText = msg
        } else {
          convoStep.sourceData = msg
        }
        convo.conversation.push(convoStep)
      } else if (!currentSender && currentLines) {
        convo.header.name = currentLines[0]
        if (currentLines.length > 1) {
          convo.header.description = currentLines.slice(1).join(this.eol)
        }
      }
    }

    lines.forEach((line) => {
      currentLineIndex++
      line = line.trim()
      if (!line) {
      } else if (line.startsWith('#')) {
        pushPrev()

        currentSender = line.substr(1)
        currentChannel = null
        if (currentSender.indexOf(' ') > 0) {
          currentChannel = currentSender.substr(currentSender.indexOf(' ') + 1).trim()
          currentSender = currentSender.substr(0, currentSender.indexOf(' ')).trim()
        }
        currentLines = []
      } else {
        currentLines.push(line)
      }
    })
    pushPrev()

    let result = [ new Convo(this.provider, convo) ]
    this.provider.AddConvos(result)
    return result
  }

  _compileUtterances (lines) {
    if (lines && lines.length > 1) {
      let result = [ new Utterance({ name: lines[0], utterances: lines.slice(1) }) ]
      this.provider.AddUtterances(result)
      return result
    }
  }

  Decompile (convos) {
    if (convos.length > 1) {
      throw new Error('only one convo per script')
    }

    const convo = convos[0]

    let script = ''

    if (convo.header.name) {
      script += convo.header.name + this.eol
    }
    if (convo.header.description) {
      script += convo.header.description + this.eol
    }

    convo.conversation.forEach((set) => {
      if (!set.messageText && !set.sourceData) return

      script += this.eol

      script += '#' + set.sender
      if (set.channel) {
        script += ' ' + set.channel
      }
      script += this.eol

      if (set.messageText) {
        script += set.messageText + this.eol
      } else if (set.sourceData) {
        script += JSON.stringify(set.sourceData, null, 2) + this.eol
      }
    })
    return script
  }
}
