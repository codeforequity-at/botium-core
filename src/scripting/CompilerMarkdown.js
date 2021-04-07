const debug = require('debug')('botium-core-CompilerMarkdown')
const MarkdownIt = require('markdown-it')
const util = require('util')
const md = new MarkdownIt()

const Capabilities = require('../Capabilities')
const CompilerBase = require('./CompilerBase')
const Constants = require('./Constants')
const { Convo } = require('./Convo')
const Utterance = require('./Utterance')
const { linesToConvoStep, validSenders, validateSender } = require('./helper')

module.exports = class CompilerMarkdown extends CompilerBase {
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
      let depth = -1
      const struct = [{ children: [] }, null, null, null, null, null]

      const _add = (entry) => {
        if (!struct[depth] || !struct[depth].children) throw new Error(`"${entry.markup}" not expected here (Line ${entry.map[0] + 1}): format invalid`)
        struct[depth].children.push(entry)
        entry.children = []
        struct[depth + 1] = entry
      }

      for (const entry of parsed) {
        if (entry.type === 'heading_open') {
          if (entry.tag === 'h1') {
            depth = 0
          } else if (entry.tag === 'h2') {
            if (depth < 0 || depth > 1) {
              throw new Error(`"${entry.markup}" not expected here (Line ${entry.map[0] + 1}): expecting parent "#" for "${entry.markup}"`)
            }
            depth = 1
          } else {
            debug(`Markdown entry "${util.inspect(entry)}" ignored. Unknown heading`)
          }
        } else if (entry.type === 'bullet_list_open') {
          if (depth < 1) {
            throw new Error(`"${entry.markup}" not expected here (Line ${entry.map[0] + 1}): expecting parent "##" for "${entry.markup}"`)
          }
          if (depth > 3) {
            throw new Error(`"${entry.markup}" not expected here (Line ${entry.map[0] + 1}): Bullet list depth 3 not supported`)
          }
          depth++
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
      if ((convosOrUtterances.content === 'Convos' && scriptType === Constants.SCRIPTING_TYPE_CONVO) ||
        (convosOrUtterances.content === 'PartialConvos' && scriptType === Constants.SCRIPTING_TYPE_PCONVO)) {
        const convosBotium = []
        for (const convo of convosOrUtterances.children) {
          const conversation = []
          for (const step of convo.children) {
            const sender = step.content.toLowerCase()
            if (validateSender(sender)) {
              // handle both:
              //   - BUTTONS checkbutton|checkbutton2
              // and
              // - BUTTONS
              //   - checkbutton
              //   - checkbutton2
              conversation.push(Object.assign(
                {
                  sender,
                  stepTag: 'Line ' + (step.map[0] + 1)
                },
                linesToConvoStep(step.children.map(child => child.content +
                  (child.children ? ' ' + child.children.map(child => child.content).join('|') : '')), sender, this.context, this.eol)
              ))
            } else {
              debug(`Expected sender ${validSenders.map(s => `'${s}'`).join(' or ')} but found ${sender}`)
            }
          }
          convosBotium.push(new Convo(this.context, {
            header: {
              name: convo.content
            },
            conversation
          }))
        }
        if (scriptType === Constants.SCRIPTING_TYPE_CONVO) {
          this.context.AddConvos(convosBotium)
        } else if (scriptType === Constants.SCRIPTING_TYPE_PCONVO) {
          this.context.AddPartialConvos(convosBotium)
        }
      } else if (convosOrUtterances.content === 'Utterances' && scriptType === Constants.SCRIPTING_TYPE_UTTERANCES) {
        const utterancesBotium = []
        for (const utteranceStruct of convosOrUtterances.children) {
          utterancesBotium.push(new Utterance({ name: utteranceStruct.content, utterances: utteranceStruct.children.map(child => `${child.content}`) }))
        }
        this.context.AddUtterances(utterancesBotium)
      }
    }
  }
}
