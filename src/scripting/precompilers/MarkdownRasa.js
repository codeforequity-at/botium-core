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

  const _utteranceKey = (entityName) => {
    return `UTTERANCE_${entityName}`
  }

  const _extractFromRasaSentence = (rasaSentence) => {
    const regex = /\[([^\]]+)\]\(([a-zA-Z][_:\-a-zA-Z0-9]+)\)/
    let matched = rasaSentence.match(regex)
    const utterances = []
    while (matched) {
      const value = matched[1]
      const splitted = matched[2].split(':')
      const [name] = splitted
      if (splitted.length > 1) {
        debug(`Entity synonim ${splitted[1]} ignored in sentence ${rasaSentence} `)
      }
      const key = _utteranceKey(name)
      utterances.push({ name: key, value })
      rasaSentence = rasaSentence.replace(matched[0], key)
      matched = rasaSentence.match(regex)
    }
    return { meText: rasaSentence, utterances }
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
  const utterances = {}
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
        const { meText, utterances: utterancesSub } = _extractFromRasaSentence(entry.content)
        meTexts.push(meText)
        for (const utterance of utterancesSub) {
          utterances[utterance.name] = (utterances[utterance.name] || []).concat([utterance.value])
        }
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
          meTexts = _.uniq(meTexts).sort()
          convos.push(..._toConvos(intent, meTexts))
        }
      }
      intent = null
      meTexts = []
    } else {
      debug(`Markdown entry ignored ${util.inspect(entry)}`)
    }
  }

  for (const [key, values] of Object.entries(utterances)) {
    utterances[key] = _.uniq(values.sort())
  }
  return {
    scriptBuffer: { convos, utterances },
    filename: `${filename}.json`
  }
}
