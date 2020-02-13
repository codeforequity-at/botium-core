const MarkdownIt = require('markdown-it')
const debug = require('debug')('botium-PrecompilerMarkdownRasa')
const util = require('util')
const _ = require('lodash')

module.exports.precompile = (scriptBuffer, options, filename) => {
  if (!filename.endsWith('.md')) {
    return
  }

  const md = new MarkdownIt()
  const parsed = md.parse(scriptBuffer, {})

  const _extractFromRasaSentence = (rasaSentence) => {
    const regex = /\[([^\]]+)\]\(([a-zA-Z][_:\-a-zA-Z0-9]+)\)/
    let matched = rasaSentence.match(regex)
    while (matched) {
      const value = matched[1]
      const splitted = matched[2].split(':')
      // const [name] = splitted
      if (splitted.length > 1) {
        debug(`Entity synonim ${splitted[1]} ignored in sentence ${rasaSentence} `)
      }
      rasaSentence = rasaSentence.replace(matched[0], value)
      matched = rasaSentence.match(regex)
    }
    return { meText: rasaSentence }
  }

  const _toConvos = (intent, meTexts, options) => {
    return meTexts.map(meText => ({
      name: `${intent}/${meText}`,
      description: `${intent}/${meText}`,
      steps: [
        {
          me: [
            meText
          ]
        },
        {
          bot: [
            `INTENT ${intent}`
          ]
        }
      ]
    }))
  }
  const convos = []
  let meTexts = []
  let intent = null
  // state got every possible value, but just few are used. Could be simplified.
  let state = 'START'
  let processLeafs = null
  for (const entry of parsed) {
    if (entry.type === 'heading_open') {
      state = 'heading_open'
    } else if (entry.type === 'inline' && entry.content.startsWith('intent:')) {
      intent = entry.content.substring('intent:'.length)
      processLeafs = true
      state = 'inline_intent'
    } else if (entry.type === 'inline' && entry.content.startsWith('synonym:')) {
      processLeafs = false
      debug(`Synonym "${entry.content}" ignored`)
      state = 'inline_synonym'
    } else if (entry.type === 'inline' && entry.content.startsWith('regex:')) {
      processLeafs = false
      debug(`Regex "${entry.content}" ignored`)
      state = 'inline_regex'
    } else if (entry.type === 'inline' && entry.content.startsWith('lookup:')) {
      processLeafs = false
      debug(`Lookup "${entry.content}" ignored`)
      state = 'inline_lookup'
    } else if (entry.type === 'heading_close') {
      state = 'heading_close'
    } else if (entry.type === 'bullet_list_open') {
      state = 'bullet_list_open'
    } else if (entry.type === 'list_item_open') {
      state = 'list_item_open'
    } else if (entry.type === 'paragraph_open') {
      state = 'paragraph_open'
    } else if (entry.type === 'inline' && state === 'paragraph_open') {
      if (processLeafs) {
        const { meText} = _extractFromRasaSentence(entry.content)
        meTexts.push(meText)
      }
      state = 'inline_leaf'
    } else if (entry.type === 'paragraph_close') {
      state = 'paragraph_close'
    } else if (entry.type === 'list_item_close') {
      state = 'list_item_close'
    } else if (entry.type === 'bullet_list_close') {
      state = 'bullet_list_close'
      if (meTexts.length) {
        if (!intent) {
          debug(`Intent not found, dropping me texts ${JSON.stringify(meTexts)}`)
        } else {
          meTexts = _.uniq(meTexts)//.sort()
          convos.push(..._toConvos(intent, meTexts))
        }
      }
      intent = null
      meTexts = []
    } else {
      debug(`Markdown entry ignored ${util.inspect(entry)}`)
    }
  }

  return {
    scriptBuffer: { convos },
    filename: `${filename}.json`
  }
}
