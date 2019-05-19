const isJSON = require('is-json')

module.exports.linesToConvoStep = (lines, sender, context, eol) => {
  const convoStep = { asserters: [], logicHooks: [], userInputs: [], not: false, sender }

  const textLines = []
  lines.forEach(l => {
    const name = l.split(' ')[0]
    if (sender !== 'me' && context.IsAsserterValid(name)) {
      const args = (l.length > name.length ? l.substr(name.length + 1).split('|').map(a => a.trim()) : [])
      convoStep.asserters.push({ name, args })
    } else if (sender === 'me' && context.IsUserInputValid(name)) {
      const args = (l.length > name.length ? l.substr(name.length + 1).split('|').map(a => a.trim()) : [])
      convoStep.userInputs.push({ name, args })
    } else if (context.IsLogicHookValid(name)) {
      const args = (l.length > name.length ? l.substr(name.length + 1).split('|').map(a => a.trim()) : [])
      convoStep.logicHooks.push({ name, args })
    } else {
      textLines.push(l)
    }
  })
  if (textLines.length > 0) {
    if (textLines[0].startsWith('!')) {
      if (!textLines[0].startsWith('!!')) {
        convoStep.not = true
      }
      textLines[0] = textLines[0].substr(1)
    }
    let content = textLines.join(' ')
    if (isJSON(content)) {
      convoStep.sourceData = JSON.parse(content)
    } else {
      /// csv has always just 1 line, and has no eol setting
      if (textLines.length === 1) {
        convoStep.messageText = textLines[0]
      } else {
        if (eol === null) {
          throw new Error('eol cant be null')
        }
        convoStep.messageText = textLines.join(eol)
      }
    }
  } else {
    convoStep.messageText = ''
  }
  return convoStep
}
