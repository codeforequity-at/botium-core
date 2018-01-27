const isJSON = require('is-json')
const _ = require('lodash')

const { ConvoHeader, Convo } = require('./Convo')

const EOL = '\n'

module.exports = class CompilerTxt {
  GetHeader (script) {
    return new Promise((resolve) => {
      let lines = script.split(EOL)

      let header = {
      }

      if (lines && !lines[0].startsWith('#')) {
        header.name = lines[0]
      }
      resolve(new ConvoHeader(header))
    })
  }

  Compile (script) {
    return new Promise((resolve, reject) => {
      let lines = script.split(EOL)

      let convo = {
        header: {},
        conversation: []
      }

      let currentLines = []
      let currentSender = null
      let currentChannel = null

      let parseMsg = (lines) => {
        if (!lines) return null

        let content = lines.join(' ')
        if (isJSON(content)) {
          return JSON.parse(content)
        } else {
          return lines.join(EOL)
        }
      }

      let pushPrev = () => {
        if (currentSender && currentLines) {
          const convoStep = {
            sender: currentSender,
            channel: currentChannel
          }
          let msg = parseMsg(currentLines)
          if (_.isString(msg)) {
            convoStep.messageText = msg
          } else {
            convoStep.sourceData = msg
          }
          convo.conversation.push(convoStep)
        } else if (!currentSender && currentLines) {
          convo.header.name = currentLines[0]
          if (currentLines.length > 1) {
            convo.header.description = currentLines.slice(1).join(EOL)
          }
        }
      }

      lines.forEach((line) => {
        line = line.trim()
        if (!line) {
        } else if (line.startsWith('#')) {
          pushPrev()

          currentSender = line.substr(1)
          currentChannel = null
          if (currentSender.indexOf(' ') > 0) {
            currentChannel = currentSender.substr(currentSender.indexOf(' ') + 1).trim()
            currentSender = currentSender.substr(0, currentSender.indexOf(' ')).trim()
          }
          currentLines = []
        } else {
          currentLines.push(line)
        }
      })
      pushPrev()

      if (convo.conversation.length === 0) {
        reject(new Error('empty conversation'))
      } else {
        resolve(new Convo(convo))
      }
    })
  }
}
