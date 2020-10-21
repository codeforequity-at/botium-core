const _ = require('lodash')

const Capabilities = require('../Capabilities')
const Constants = require('./Constants')
const CompilerBase = require('./CompilerBase')
const Utterance = require('./Utterance')
const { ConvoHeader, Convo } = require('./Convo')
const { linesToConvoStep, flatString } = require('./helper')

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

    const lines = scriptData.split(this.eol)

    const header = { }

    if (lines && !lines[0].startsWith('#')) {
      header.name = lines[0]
    }
    return new ConvoHeader(header)
  }

  Compile (scriptBuffer, scriptType = Constants.SCRIPTING_TYPE_CONVO) {
    let scriptData = scriptBuffer
    if (Buffer.isBuffer(scriptBuffer)) scriptData = scriptData.toString()

    const lines = _.map(scriptData.split(this.eol), (line) => line.trim())

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
      return linesToConvoStep(lines, convoStepSender, this.context, this.eol)
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
          convo.header.description = currentLines.slice(1).join(this.eol)
        }
      }
    }

    lines.forEach((line) => {
      currentLineIndex++
      line = line.trim()
      if (line && line.startsWith('#')) {
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
      const result = [new Utterance({ name: lines[0], utterances: lines.length > 1 ? lines.slice(1) : [] })]
      this.context.AddUtterances(result)
      return result
    }
  }

  _compileScriptingMemory (lines) {
    if (lines && lines.length > 1) {
      const names = lines[0].split('|').map((name) => name.trim()).slice(1)
      const scriptingMemories = []
      for (let row = 1; row < lines.length; row++) {
        if (!lines[row] || lines[row].length === 0) continue
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
      if (set.channel && set.channel !== 'default') {
        script += ' ' + set.channel
      }
      script += this.eol

      if (set.sender === 'me') {
        set.forms && set.forms.filter(form => form.value).map((form) => {
          script += `FORM ${form.name}|${form.value}${this.eol}`
        })
        if (set.buttons && set.buttons.length > 0) {
          script += 'BUTTON ' + this._decompileButton(set.buttons[0]) + this.eol
        } else if (set.media && set.media.length > 0) {
          script += 'MEDIA ' + set.media[0].mediaUri + this.eol
        } else if (set.messageText) {
          script += set.messageText + this.eol
        }
        set.userInputs && set.userInputs.map((userInput) => {
          script += userInput.name + (userInput.args ? ' ' + userInput.args.join('|') : '') + this.eol
        })
        set.logicHooks && set.logicHooks.map((logicHook) => {
          script += logicHook.name + (logicHook.args ? ' ' + logicHook.args.join('|') : '') + this.eol
        })
      } else {
        if (set.messageText) {
          if (set.not) {
            script += '!'
          }
          script += set.messageText + this.eol
        }
        if (set.buttons && set.buttons.length > 0) script += 'BUTTONS ' + set.buttons.map(b => flatString(b.text)).join('|') + this.eol
        if (set.media && set.media.length > 0) script += 'MEDIA ' + set.media.map(m => m.mediaUri).join('|') + this.eol
        if (set.cards && set.cards.length > 0) {
          set.cards.forEach(c => {
            let cardTexts = []
            if (c.text) cardTexts = cardTexts.concat(_.isArray(c.text) ? c.text : [c.text])
            if (c.subtext) cardTexts = cardTexts.concat(_.isArray(c.subtext) ? c.subtext : [c.subtext])
            if (c.content) cardTexts = cardTexts.concat(_.isArray(c.content) ? c.content : [c.content])
            if (cardTexts.length > 0) script += 'CARDS ' + cardTexts.map(c => flatString(c)).join('|') + this.eol

            if (c.buttons && c.buttons.length > 0) script += 'BUTTONS ' + c.buttons.map(b => flatString(b.text)).join('|') + this.eol
            if (c.image) script += 'MEDIA ' + c.image.mediaUri + this.eol
          })
        }
        set.asserters && set.asserters.map((asserter) => {
          if (asserter.not) {
            script += '!'
          }
          script += asserter.name + (asserter.args ? ' ' + asserter.args.join('|') : '') + this.eol
        })
        set.logicHooks && set.logicHooks.map((logicHook) => {
          script += logicHook.name + (logicHook.args ? ' ' + logicHook.args.join('|') : '') + this.eol
        })
      }
    })
    return script
  }

  _decompileButton (b) {
    let buttonScript = ''
    if (b.payload) {
      buttonScript += _.isObject(b.payload) ? JSON.stringify(b.payload) : flatString(b.payload)
      if (b.text) {
        buttonScript += `|${flatString(b.text)}`
      }
    } else {
      buttonScript += flatString(b.text)
    }
    return buttonScript
  }
}
