const MarkdownIt = require('markdown-it')
const md = new MarkdownIt()
const debug = require('debug')('botium-PrecompilerMarkdown')
const util = require('util')

module.exports.precompile = (scriptBuffer, options, filename) => {
  if (!filename.endsWith('.md')) {
    return
  }
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
  const convosBotium = []
  const utterancesBotium = {}
  for (const convosOrUtterances of structured.children) {
    if (convosOrUtterances.content === 'Convos') {
      for (const convo of convosOrUtterances.children) {
        const convoBotium = { name: convo.content, steps: [] }
        convosBotium.push(convoBotium)
        for (const step of convo.children) {
          const sender = step.content.toLowerCase()
          if (['me', 'bot'].includes(sender)) {
            // handle booth:
            //   - BUTTONS checkbutton|checkbutton2
            // and
            // - BUTTONS
            //   - checkbutton
            //   - checkbutton2
            convoBotium.steps.push({
              [sender]: step.children.map(child => child.content +
                (child.children ? ' ' + child.children.map(child => child.content).join('|') : ''))
            })
          } else {
            debug(`Expected "me" or "bot" but found ${sender}`)
          }
        }
      }
    } else if (convosOrUtterances.content === 'Utterances') {
      for (const utteranceStruct of convosOrUtterances.children) {
        utterancesBotium[utteranceStruct.content] = utteranceStruct.children.map(child => child.content)
      }
    } else {
      debug(`Expected "Convos" or "Utterances" but found ${convosOrUtterances.content}`)
    }
  }

  return {
    scriptBuffer: { convos: convosBotium, utterances: utterancesBotium },
    filename: `${filename}.json`
  }
}
