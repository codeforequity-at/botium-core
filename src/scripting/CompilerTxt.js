const isJSON = require('is-json')
const _ = require('lodash')

const Capabilities = require('../Capabilities')
const Constants = require('./Constants')
const CompilerBase = require('./CompilerBase')
const Utterance = require('./Utterance')
const { ConvoHeader, Convo } = require('./Convo')

module.exports = class CompilerTxt extends CompilerBase {
  constructor (context, caps = {}) {
    super(context, caps)

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

    const parseMsg = (lines) => {
      if (!lines || lines.length === 0) return {}

      const convoStep = { asserters: [], not: false }

      const textLines = []
      lines.forEach(l => {
        const checkAsserterName = l.split(' ')[0]
        if (this.context.IsAsserterValid(checkAsserterName)) {
          const asserterArgs = (l.length > checkAsserterName.length ? l.substr(checkAsserterName.length + 1).split('|').map(a => a.trim()) : [])
          convoStep.asserters.push({ name: checkAsserterName, args: asserterArgs })
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
          convoStep.messageText = textLines.join(this.eol)
        }
      }
      return convoStep
    }

    let pushPrev = () => {
      if (currentSender && currentLines) {
        const convoStep = {
          sender: currentSender,
          channel: currentChannel,
          stepTag: 'Line ' + currentLineIndex
        }
        Object.assign(convoStep, parseMsg(currentLines))
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
      if (line && line.startsWith('#')) {
        pushPrev()

        currentSender = line.substr(1)
        currentChannel = null
        if (currentSender.indexOf(' ') > 0) {
          currentChannel = currentSender.substr(currentSender.indexOf(' ') + 1).trim()
          currentSender = currentSender.substr(0, currentSender.indexOf(' ')).trim()
        }
        currentLines = []
      } else if (line && line.length > 0) {
        currentLines.push(line)
      }
    })
    pushPrev()

    let result = [ new Convo(this.context, convo) ]
    this.context.AddConvos(result)
    return result
  }

  _compileUtterances (lines) {
    if (lines && lines.length > 1) {
      let result = [ new Utterance({ name: lines[0], utterances: lines.slice(1) }) ]
      this.context.AddUtterances(result)
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
        if (set.not) {
          script += '!'
        }
        script += set.messageText + this.eol
      } else if (set.sourceData) {
        if (set.not) {
          script += '!'
        }
        script += JSON.stringify(set.sourceData, null, 2) + this.eol
      }
    })
    return script
  }
}
