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

module.exports.flatString = (str) => {
  return str.split('\n').map(s => s.trim()).join(' ')
}

module.exports.linesToConvoStep = (lines, sender, context, eol, singleLineMode = false) => {
  const convoStep = { asserters: [], logicHooks: [], userInputs: [], not: false, sender }

  let textLinesRaw = []
  const textLines = []
  // local eslint accepts it without disable, but build on github does not
  // eslint-disable-next-line no-unused-vars
  let textLinesAccepted = true
  for (const rawLine of lines) {
    if (_.isString(rawLine)) {
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
    } else if (_.isObject(rawLine)) {
      if (rawLine.asserter) {
        if (sender !== 'bot') throw new Error(`Failed to parse conversation. No asserter "${rawLine.asserter}" expected in section "${sender}"`)
        if (!context.IsAsserterValid(rawLine.asserter)) throw new Error(`Failed to parse conversation. No asserter "${rawLine.asserter}" registered for section "${sender}"`)
        convoStep.asserters.push({
          name: rawLine.asserter,
          args: (rawLine.args && _.isString(rawLine.args) ? [rawLine.args] : rawLine.args) || [],
          not: !!rawLine.not
        })
      } else if (rawLine.logichook || rawLine.logicHook) {
        const logicHookName = rawLine.logichook || rawLine.logicHook
        if (!context.IsLogicHookValid(logicHookName)) throw new Error(`Failed to parse conversation. No logichook "${logicHookName}" registered for section "${sender}"`)
        convoStep.logicHooks.push({
          name: logicHookName,
          args: (rawLine.args && _.isString(rawLine.args) ? [rawLine.args] : rawLine.args) || []
        })
      } else if (rawLine.userinput || rawLine.userInput) {
        const userInputName = rawLine.userinput || rawLine.userInput
        if (sender !== 'me') throw new Error(`Failed to parse conversation. No userinput "${userInputName}" expected in section "${sender}"`)
        if (!context.IsUserInputValid(userInputName)) throw new Error(`Failed to parse conversation. No userinput "${userInputName}" registered for section "${sender}"`)
        convoStep.userInputs.push({
          name: userInputName,
          args: (rawLine.args && _.isString(rawLine.args) ? [rawLine.args] : rawLine.args) || []
        })
      } else {
        let name = Object.keys(rawLine)[0]
        const content = rawLine[name]
        let not = false
        if (name.startsWith('!')) {
          not = true
          name = name.substr(1)
        } else if (name.startsWith('NOT_')) {
          not = true
          name = name.substr(4)
        }
        if (sender !== 'me' && context.IsAsserterValid(name)) {
          convoStep.asserters.push({
            name,
            args: (content && _.isString(content) ? [content] : content) || [],
            not
          })
        } else if (sender === 'me' && context.IsUserInputValid(name)) {
          convoStep.userInputs.push({
            name,
            args: (content && _.isString(content) ? [content] : content) || []
          })
        } else if (context.IsLogicHookValid(name)) {
          convoStep.logicHooks.push({
            name,
            args: (content && _.isString(content) ? [content] : content) || []
          })
        } else {
          throw new Error(`Failed to parse conversation. Line not recognized '${JSON.stringify(rawLine)}'`)
        }
      }
    } else {
      throw new Error(`Failed to parse conversation. Line not recognized '${JSON.stringify(rawLine)}'`)
    }
  }

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
