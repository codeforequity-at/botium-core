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
    let convoStepSender = null
    let convoStepChannel = null
    let convoStepLineIndex = null

    const parseMsg = (lines) => {
      lines = lines || []

      const convoStep = { asserters: [], logicHooks: [], not: false }

      const textLines = []
      lines.forEach(l => {
        const name = l.split(' ')[0]
        if (this.context.IsAsserterValid(name)) {
          const args = (l.length > name.length ? l.substr(name.length + 1).split('|').map(a => a.trim()) : [])
          convoStep.asserters.push({ name, args })
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
          convoStep.messageText = textLines.join(this.eol)
        }
      } else {
        convoStep.messageText = ''
      }
      return convoStep
    }

    let pushPrev = () => {
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
          convo.header.description = currentLines.slice(1).join(this.eol)
        }
      }
    }

    lines.forEach((line) => {
      currentLineIndex++
      line = line.trim()
      if (line && line.startsWith('#')) {
        pushPrev()

        convoStepSender = line.substr(1)
        convoStepChannel = null
        convoStepLineIndex = currentLineIndex
        if (convoStepSender.indexOf(' ') > 0) {
          convoStepChannel = convoStepSender.substr(convoStepSender.indexOf(' ') + 1).trim()
          convoStepSender = convoStepSender.substr(0, convoStepSender.indexOf(' ')).trim()
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

      if (set.buttons && set.buttons.length > 0) script += 'BUTTONS ' + set.buttons.map(b => b.text).join('|') + this.eol
      if (set.media && set.media.length > 0) script += 'MEDIA ' + set.media.map(m => m.mediaUri).join('|') + this.eol
      if (set.cards && set.cards.length > 0) {
        set.cards.forEach(c => {
          if (c.buttons && c.buttons.length > 0) script += 'BUTTONS ' + c.buttons.map(b => b.text).join('|') + this.eol
          if (c.image) script += 'MEDIA ' + c.image.mediaUri + this.eol
        })
      }
      set.asserters && set.asserters.map((asserter) => {
        script += asserter.name + (asserter.args ? ' ' + asserter.args.join('|') : '') + this.eol
      })
      set.logicHooks && set.logicHooks.map((logicHook) => {
        script += logicHook.name + (logicHook.args ? ' ' + logicHook.args.join('|') : '') + this.eol
      })
    })
    return script
  }
}
