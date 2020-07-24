const debug = require('debug')('botium-core-CompilerMarkdown')
const MarkdownIt = require('markdown-it')
const util = require('util')
const md = new MarkdownIt()

const Capabilities = require('../Capabilities')
const CompilerBase = require('./CompilerBase')
const Constants = require('./Constants')
const { Convo } = require('./Convo')
const Utterance = require('./Utterance')
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

  Compile (scriptBuffer, scriptType = Constants.SCRIPTING_TYPE_CONVO) {
    if (Buffer.isBuffer(scriptBuffer)) scriptBuffer = scriptBuffer.toString()

    const parsed = md.parse(scriptBuffer, {})

    const _toStructuredMarkdown = (parsed) => {
      let depth = null
      const struct = [{ children: [] }, null, null, null, null, null]

      const _add = (entry) => {
        struct[depth].children.push(entry)
        entry.children = []
        struct[depth + 1] = entry
      }

      for (const entry of parsed) {
        if (entry.type === 'heading_open') {
          if (entry.tag === 'h1') {
            depth = 0
          } else if (entry.tag === 'h2') {
            depth = 1
          } else {
            debug(`Markdown entry "${util.inspect(entry)}" ignored. Unknown heading`)
          }
        } else if (entry.type === 'bullet_list_open') {
          depth++
          if (depth > 4) {
            throw new Error('Bullet list depth 3 not supported')
          }
        } else if (entry.type === 'bullet_list_close') {
          depth--
        } else if (entry.type === 'inline') {
          _add(entry)
        }
      }
      return struct[0]
    }

    const structured = _toStructuredMarkdown(parsed)
    for (const convosOrUtterances of structured.children) {
      if (convosOrUtterances.content === 'Convos' && scriptType === Constants.SCRIPTING_TYPE_CONVO) {
        const convosBotium = []
        for (const convo of convosOrUtterances.children) {
          const conversation = []
          for (const step of convo.children) {
            const sender = step.content.toLowerCase()
            if (['me', 'bot'].includes(sender)) {
              // handle booth:
              //   - BUTTONS checkbutton|checkbutton2
              // and
              // - BUTTONS
              //   - checkbutton
              //   - checkbutton2
              conversation.push(Object.assign(
                {
                  sender
                },
                linesToConvoStep(step.children.map(child => child.content +
                  (child.children ? ' ' + child.children.map(child => child.content).join('|') : '')), sender, this.context, this.eol)
              ))
            } else {
              debug(`Expected "me" or "bot" but found ${sender}`)
            }
          }
          convosBotium.push(new Convo(this.context, {
            header: {
              name: convo.content
            },
            conversation
          }))
        }
        this.context.AddConvos(convosBotium)
      } else if (convosOrUtterances.content === 'Utterances' && scriptType === Constants.SCRIPTING_TYPE_UTTERANCES) {
        const utterancesBotium = []
        for (const utteranceStruct of convosOrUtterances.children) {
          utterancesBotium.push(new Utterance({ name: utteranceStruct.content, utterances: utteranceStruct.children.map(child => child.content) }))
        }
        this.context.AddUtterances(utterancesBotium)
      }
    }
  }
}
