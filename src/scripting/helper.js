const _ = require('lodash')
const isJSON = require('is-json')

const normalizeText = (str, doCleanup) => {
  if (str && _.isArray(str)) {
    str = str.join(' ')
  } else if (str && !_.isString(str)) {
    if (str.toString) {
      str = str.toString()
    } else {
      str = `${str}`
    }
  }
  if (str && doCleanup) {
    // remove html tags
    str = str.replace(/<p[^>]*>/g, ' ')
    str = str.replace(/<\/p>/g, ' ')
    str = str.replace(/<br[^>]*>/g, ' ')
    str = str.replace(/<[^>]*>/g, '')
    /* eslint-disable no-control-regex */
    // remove not printable characters
    str = str.replace(/[\x00-\x1F\x7F]/g, ' ')
    /* eslint-enable no-control-regex */
    // replace html entities
    str = str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#39;/g, '\'')
      .replace(/&quot;/g, '"')
    // replace two spaces with one
    str = str.replace(/\s+/g, ' ')

    str = str.split('\n').map(s => s.trim()).join('\n').trim()
  }
  return str
}

const splitStringInNonEmptyLines = (str) => str ? str.split('\n').map(s => s.trim()).filter(s => s.length > 0) : []

const quoteRegexpString = (str) => {
  return str.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&')
}

const removeBuffers = obj => {
  const jsonString = JSON.stringify(obj, (key, value) => {
    if (_.isBuffer(value)) {
      return '(binary data)'
    } else if (value && value.type && value.type === 'Buffer') {
      return '(binary data)'
    } else if (key.toLowerCase() === 'base64') {
      return '(base64 data)'
    } else if (_.isString(value) && value.startsWith('data:')) {
      return '(base64 data url)'
    }
    return value
  })
  return JSON.parse(jsonString)
}

const toString = (value) => {
  if (_.isUndefined(value)) return undefined
  if (_.isString(value)) return value
  if (_.isNumber(value)) return value.toString()
  if (_.isArray(value)) return value.map(v => toString(v)).join(',')
  try {
    return JSON.stringify(value)
  } catch (err) {
  }
  if (value && value.toString) return value.toString()
  return '' + value
}

const flatString = (str) => {
  return str ? str.split('\n').map(s => s.trim()).join(' ') : ''
}

const linesToConvoStep = (lines, sender, context, eol, singleLineMode = false) => {
  if (!validateSender(sender)) throw new Error(`Failed to parse conversation. Section "${sender}" unknown.`)

  const convoStep = { asserters: [], logicHooks: [], userInputs: [], not: false, optional: false, sender }

  let textLinesRaw = []
  const textLines = []
  // local eslint accepts it without disable, but build on github does not
  // eslint-disable-next-line no-unused-vars
  let textLinesAccepted = true
  for (const rawLine of lines) {
    if (_.isString(rawLine)) {
      let optional = false
      let not = false
      let logicLine = rawLine
      if (logicLine.startsWith('?')) {
        if (!logicLine.startsWith('??')) {
          optional = true
        }
        logicLine = logicLine.substr(1)
      }
      if (logicLine.startsWith('!')) {
        if (!logicLine.startsWith('!!')) {
          not = true
        }
        logicLine = logicLine.substr(1)
      }
      const name = logicLine.split(' ')[0]
      if (sender !== 'me' && context.IsAsserterValid(name)) {
        const args = (logicLine.length > name.length ? logicLine.substr(name.length + 1).split('|').map(a => a.trim()) : [])
        convoStep.asserters.push({ name, args, not, optional })
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
          not: !!rawLine.not,
          optional: !!rawLine.optional
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
        let optional = false
        let not = false
        if (name.startsWith('?')) {
          optional = true
          name = name.substr(1)
        } else if (name.startsWith('OPTIONAL_')) {
          optional = true
          name = name.substr(9)
        }
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
            not,
            optional
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
    if (textLines[0].startsWith('?')) {
      if (!textLines[0].startsWith('??')) {
        convoStep.optional = true
      }
      textLines[0] = textLines[0].substr(1)
    }
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

  // Check if all element in convo step is optional or not optional
  const optionalSet = new Set()
  if (convoStep.messageText) {
    optionalSet.add(convoStep.optional)
  }
  for (const asserter of convoStep.asserters) {
    optionalSet.add(asserter.optional)
  }
  if (optionalSet.size > 1) {
    throw new Error(`Failed to parse conversation. All element in convo step has to be optional or not optional: ${JSON.stringify(lines)}`)
  }

  return convoStep
}

const convoStepToObject = (step) => {
  const result = []
  if (step.sender === 'me') {
    for (const form of (step.forms || []).filter(form => form.value)) {
      result.push({
        userinput: 'FORM',
        args: [form.name, form.value]
      })
    }
    if (step.buttons && step.buttons.length > 0) {
      const userinput = {
        userinput: 'BUTTON',
        args: []
      }
      if (step.buttons[0].payload) {
        userinput.args.push(step.buttons[0].payload)
        if (step.buttons[0].text) {
          userinput.args.push(step.buttons[0].text)
        }
      } else {
        userinput.args.push(step.buttons[0].text)
      }
      result.push(userinput)
    } else if (step.media && step.media.length > 0) {
      result.push({
        userinput: 'MEDIA',
        args: [step.media[0].mediaUri]
      })
    } else if (step.messageText) {
      result.push(step.messageText)
    }
    for (const logicHook of step.logicHooks || []) {
      result.push({
        logichook: logicHook.name,
        args: logicHook.args || []
      })
    }
  } else {
    if (step.messageText) {
      let messageTextPrefix = ''
      if (step.optional) messageTextPrefix += '?'
      if (step.not) messageTextPrefix += '!'
      result.push(messageTextPrefix + step.messageText)
    }
    if (step.buttons && step.buttons.length > 0) {
      result.push({
        asserter: 'BUTTONS',
        args: step.buttons.map(b => flatString(b.text))
      })
    }
    if (step.media && step.media.length > 0) {
      result.push({
        asserter: 'MEDIA',
        args: step.media.map(m => { return m.buffer && m.buffer.startsWith('data:') ? 'data:' : m.mediaUri })
      })
    }
    if (step.cards && step.cards.length > 0) {
      step.cards.forEach(c => {
        let cardTexts = []
        if (c.text) cardTexts = cardTexts.concat(_.isArray(c.text) ? c.text : [c.text])
        if (c.subtext) cardTexts = cardTexts.concat(_.isArray(c.subtext) ? c.subtext : [c.subtext])
        if (c.content) cardTexts = cardTexts.concat(_.isArray(c.content) ? c.content : [c.content])
        if (cardTexts.length > 0) {
          result.push({
            asserter: 'CARDS',
            args: cardTexts.map(c => flatString(c))
          })
        }

        if (c.buttons && c.buttons.length > 0) {
          result.push({
            asserter: 'BUTTONS',
            args: c.buttons.map(b => b.text)
          })
        }
        if (c.image) {
          result.push({
            asserter: 'MEDIA',
            args: c.image.mediaUr,
            not: !!step.not
          })
        }
      })
    }
    for (const asserter of step.asserters || []) {
      result.push({
        asserter: asserter.name,
        args: asserter.args || [],
        optional: !!asserter.optional,
        not: !!asserter.not
      })
    }
    for (const logicHook of step.logicHooks || []) {
      result.push({
        logichook: logicHook.name,
        args: logicHook.args || []
      })
    }
  }
  return result
}

const validSenders = ['begin', 'include', 'me', 'bot', 'end']

const validateSender = (sender) => {
  if (validSenders.indexOf(sender) >= 0) return true
  else return false
}

const validateConvo = (convo) => {
  const validationResult = {
    errors: []
  }
  for (let i = 0; i < convo.conversation.length; i++) {
    const step = convo.conversation[i]
    if (step.sender === 'bot') {
      // Check if all element in convo step is optional or not optional
      const optionalSet = new Set()
      if (step.messageText) {
        optionalSet.add(step.optional)
      }
      if (step.asserters) {
        for (const asserter of step.asserters) {
          optionalSet.add(asserter.optional)
        }
      }
      if (optionalSet.size > 1) {
        validationResult.errors.push(new Error(`Step ${i + 1}: Failed to decompile conversation. Mixed optional flag is not allowed inside one step.`))
      }

      if (optionalSet.size === 1 && optionalSet.has(true)) {
        const nextStep = convo.conversation[i + 1]
        if (!nextStep || nextStep.sender !== 'bot') {
          validationResult.errors.push(new Error(`Step ${i + 1}: Optional bot convo step has to be followed by a bot convo step.`))
        }
      }
    }
    if (!validateSender(step.sender)) {
      validationResult.errors.push(new Error(`Step ${i + 1}: Sender #${step.sender} is invalid.`))
    }
  }
  return validationResult
}

const _decompileButton = (b) => {
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

const convoStepToLines = (step) => {
  const lines = []
  if (step.sender === 'me') {
    step.forms && step.forms.filter(form => form.value).forEach((form) => {
      lines.push(`FORM ${form.name}|${form.value}`)
    })
    if (step.buttons && step.buttons.length > 0) {
      lines.push('BUTTON ' + _decompileButton(step.buttons[0]))
    } else if (step.media && step.media.length > 0) {
      lines.push('MEDIA ' + step.media[0].mediaUri)
    } else if (step.messageText) {
      lines.push(step.messageText)
    }
    step.userInputs && step.userInputs.forEach((userInput) => {
      lines.push(userInput.name + (userInput.args ? ' ' + userInput.args.join('|') : ''))
    })
    step.logicHooks && step.logicHooks.forEach((logicHook) => {
      lines.push(logicHook.name + (logicHook.args ? ' ' + logicHook.args.join('|') : ''))
    })
  } else {
    if (step.messageText) {
      lines.push((step.optional ? '?' : '') + (step.not ? '!' : '') + step.messageText)
    }
    if (step.buttons && step.buttons.length > 0) lines.push('BUTTONS ' + step.buttons.filter(b => b.text).map(b => flatString(b.text)).join('|'))
    if (step.media && step.media.length > 0) lines.push('MEDIA ' + step.media.filter(m => !m.buffer && m.mediaUri).map(m => m.mediaUri).join('|'))
    if (step.cards && step.cards.length > 0) {
      step.cards.forEach(c => {
        let cardTexts = []
        if (c.text) cardTexts = cardTexts.concat(_.isArray(c.text) ? c.text : [c.text])
        if (c.subtext) cardTexts = cardTexts.concat(_.isArray(c.subtext) ? c.subtext : [c.subtext])
        if (c.content) cardTexts = cardTexts.concat(_.isArray(c.content) ? c.content : [c.content])
        if (cardTexts.length > 0) lines.push('CARDS ' + cardTexts.map(c => flatString(c)).join('|'))

        if (c.buttons && c.buttons.length > 0) lines.push('BUTTONS ' + c.buttons.filter(b => b.text).map(b => flatString(b.text)).join('|'))
        if (c.image && !c.image.buffer && c.image.mediaUri) lines.push('MEDIA ' + c.image.mediaUri)
      })
    }
    step.asserters && step.asserters.forEach((asserter) => {
      lines.push((asserter.optional ? '?' : '') + (asserter.not ? '!' : '') + asserter.name + (asserter.args ? ' ' + asserter.args.join('|') : ''))
    })
    step.logicHooks && step.logicHooks.forEach((logicHook) => {
      lines.push(logicHook.name + (logicHook.args ? ' ' + logicHook.args.join('|') : ''))
    })
  }
  return lines.map(l => l.trim())
}

module.exports = {
  normalizeText,
  splitStringInNonEmptyLines,
  quoteRegexpString,
  toString,
  flatString,
  removeBuffers,
  linesToConvoStep,
  convoStepToLines,
  convoStepToObject,
  validSenders,
  validateSender,
  validateConvo
}
