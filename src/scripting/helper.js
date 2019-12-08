const _ = require('lodash')
const isJSON = require('is-json')

module.exports.quoteRegexpString = (str) => {
  return str.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&')
}

module.exports.toString = (value) => {
  if (_.isUndefined(value)) return undefined
  if (_.isString(value)) return value
  if (_.isNumber(value)) return value.toString()
  try {
    return JSON.stringify(value)
  } catch (err) {
  }
  if (value && value.toString) return value.toString()
  return '' + value
}

module.exports.linesToConvoStep = (lines, sender, context, eol, singleLineMode = false) => {
  const convoStep = { asserters: [], logicHooks: [], userInputs: [], not: false, sender }

  let textLinesRaw = []
  const textLines = []
  // local eslint accepts it without disable, but build on github does not
  // eslint-disable-next-line no-unused-vars
  let textLinesAccepted = true
  lines.forEach(rawLine => {
    let not = false
    let logicLine = rawLine
    if (logicLine.startsWith('!')) {
      if (!logicLine.startsWith('!!')) {
        not = true
      }
      logicLine = logicLine.substr(1)
    }
    const name = logicLine.split(' ')[0]
    if (sender !== 'me' && context.IsAsserterValid(name)) {
      const args = (logicLine.length > name.length ? logicLine.substr(name.length + 1).split('|').map(a => a.trim()) : [])
      convoStep.asserters.push({ name, args, not })
    } else if (sender === 'me' && context.IsUserInputValid(name)) {
      const args = (logicLine.length > name.length ? logicLine.substr(name.length + 1).split('|').map(a => a.trim()) : [])
      convoStep.userInputs.push({ name, args })
      textLinesAccepted = false
    } else if (context.IsLogicHookValid(name)) {
      const args = (logicLine.length > name.length ? logicLine.substr(name.length + 1).split('|').map(a => a.trim()) : [])
      convoStep.logicHooks.push({ name, args })
      textLinesAccepted = false
    } else {
      rawLine = rawLine.startsWith('TEXT ') ? rawLine.substring(5) : rawLine.startsWith('!TEXT ') ? rawLine.substring(6) : rawLine
      if (sender === 'me') {
        if (!textLinesAccepted) {
          if (rawLine.trim().length) {
            throw new Error(`Failed to parse conversation. No text expected here: '${rawLine.trim()}' in convo:\n ${lines.join('\n')}`)
          } else {
            // skip empty lines
          }
        } else {
          textLinesRaw.push(rawLine)
        }
      } else {
        textLinesRaw.push(rawLine)
      }
    }
    // line is not textline if it is empty, and there is no line with data after it.
    if (textLinesRaw.length > 0) {
      if (rawLine.trim().length) {
        textLines.push(...textLinesRaw)
        textLinesRaw = []
      }
    }
  })

  // deal with just message convosteps
  if (textLinesRaw.length >= 1 && textLines.length === 0) {
    textLines.push(...textLinesRaw)
    textLinesRaw.pop()
  }

  if (textLines.length > 0) {
    if (textLines[0].startsWith('!')) {
      if (!textLines[0].startsWith('!!')) {
        convoStep.not = true
      }
      textLines[0] = textLines[0].substr(1)
    }
    const content = textLines.join(' ')
    if (isJSON(content)) {
      convoStep.sourceData = JSON.parse(content)
    } else {
      /// csv has always just 1 line, and has no eol setting
      if (singleLineMode) {
        convoStep.messageText = textLines[0]
      } else {
        if (eol === null) {
          throw new Error('eol cant be null')
        }
        convoStep.messageText = textLines.join(eol).trim()
      }
    }
  } else {
    // no message is different from empty message
    convoStep.messageText = null
  }
  return convoStep
}
