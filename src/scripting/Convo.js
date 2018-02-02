const util = require('util')
const async = require('async')
const _ = require('lodash')
const debug = require('debug')('botium-Convo')

const BotiumMockMessage = require('../mocks/BotiumMockMessage')
const Capabilities = require('../Capabilities')

class ConvoHeader {
  constructor (fromJson = {}) {
    this.name = fromJson.name
    this.description = fromJson.description
  }
}

class ConvoStep {
  constructor (fromJson = {}) {
    this.sender = fromJson.sender
    this.channel = fromJson.channel
    this.messageText = fromJson.messageText
    this.sourceData = fromJson.sourceData
    this.stepTag = fromJson.stepTag
  }
}

class Convo {
  constructor (fromJson = {}) {
    this.header = new ConvoHeader(fromJson.header)
    if (fromJson.conversation && _.isArray(fromJson.conversation)) {
      this.conversation = _.map(fromJson.conversation, (step) => new ConvoStep(step))
    } else {
      this.conversation = []
    }
  }

  Run (container, assertCb = () => true, failCb = () => true) {
    return new Promise((resolve, reject) => {
      async.someSeries(this.conversation,
        (convoStep, convoStepDone) => {
          if (convoStep.sender === 'me') {
            convoStep.messageText = this._checkNormalizeText(container, convoStep.messageText)
            debug(`${this.header.name}: user says ${util.inspect(convoStep)}`)
            container.UserSays(new BotiumMockMessage(convoStep))
              .then(() => convoStepDone(null, false))
              .catch((err) => {
                debug(`${this.header.name}: error sending to bot ${util.inspect(err)}`)
                convoStepDone(err, true)
              })
          } else if (convoStep.sender === 'bot') {
            debug(`${this.header.name}: wait for bot ${util.inspect(convoStep.channel)}`)
            container.WaitBotSays(convoStep.channel).then((saysmsg) => {
              debug(`${this.header.name}: bot says ${util.inspect(saysmsg)}`)
              if (saysmsg && saysmsg.messageText) {
                var response = this._checkNormalizeText(container, saysmsg.messageText)
                var tomatch = this._checkNormalizeText(container, convoStep.messageText)
                assertCb(response, tomatch)
                convoStepDone(null, false)
              } else if (saysmsg && saysmsg.sourceData) {
                this._compareObject(container, assertCb, failCb, saysmsg.sourceData, convoStep.sourceData)
                convoStepDone(null, false)
              } else {
                debug(`${this.header.name}: bot says nothing`)
                failCb('bot says nothing')
                convoStepDone(null, true)
              }
            }).catch((err) => {
              debug(`${this.header.name}: error waiting for bot ${util.inspect(err)}`)
              convoStepDone(null, true)
            })
          } else {
            debug(`${this.header.name}: invalid sender ${util.inspect(convoStep.sender)}`)
            convoStepDone(null, true)
          }
        },
        (err, failed) => {
          if (err) {
            reject(new Error(`${this.header.name}: failed: ${util.inspect(err)}`))
          } else if (failed) {
            reject(new Error(`${this.header.name}: failed`))
          } else {
            resolve()
          }
        })
    })
  }

  _compareObject (container, assertCb, failCb, result, expected) {
    if (expected === null || expected === undefined) return true

    if (_.isObject(expected)) {
      _.forOwn(expected, (value, key) => {
        if (result.hasOwnProperty(key)) {
          return this._compareObject(container, assertCb, failCb, result[key], expected[key])
        } else {
          failCb(`missing expected property: ${key}`)
          return false
        }
      })
    } else {
      return assertCb(
        this._checkNormalizeText(container, result),
        this._checkNormalizeText(container, expected))
    }
  }

  _checkNormalizeText (container, str) {
    if (str && _.isString(str) && container.caps[Capabilities.SCRIPTING_NORMALIZE_TEXT]) {
      // remove html tags
      str = str.replace(/<p[^>]*>/g, ' ')
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
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
      // replace two spaces with one
      str = str.replace(/\s+/g, ' ')

      str = str.trim()
    }
    return str
  }
}

module.exports = {
  ConvoHeader,
  Convo,
  ConvoStep
}
