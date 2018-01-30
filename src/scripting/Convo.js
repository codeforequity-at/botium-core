const util = require('util')
const async = require('async')
const _ = require('lodash')
const debug = require('debug')('botium-Convo')

const BotiumMockMessage = require('../mocks/BotiumMockMessage')

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
            debug(`${this.header.name}: user says ${util.inspect(convoStep)}`)
            container.UserSays(new BotiumMockMessage(convoStep))
              .then(() => convoStepDone(null, false))
              .catch((err) => {
                debug(`${this.header.name}: error sending to bot ${util.inspect(err)}`)
                convoStepDone(null, true)
              })
          } else if (convoStep.sender === 'bot') {
            debug(`${this.header.name}: wait for bot ${util.inspect(convoStep.channel)}`)
            container.WaitBotSays(convoStep.channel).then((saysmsg) => {
              debug(`${this.header.name}: bot says ${util.inspect(saysmsg)}`)
              if (saysmsg && saysmsg.messageText) {
                var response = saysmsg.messageText.split(/\r?\n/).map((line) => line.trim()).join(' ').trim()
                var tomatch = convoStep.messageText.split(/\r?\n/).map((line) => line.trim()).join(' ').trim()
                convoStepDone(null, !assertCb(response, tomatch))
              } else if (saysmsg && saysmsg.sourceData) {
                convoStepDone(null, !this._compareObject(assertCb, failCb, saysmsg.sourceData, convoStep.sourceData))
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

  _compareObject (assertCb, failCb, result, expected) {
    if (expected === null || expected === undefined) return true

    if (_.isObject(expected)) {
      _.forOwn(expected, (value, key) => {
        if (result.hasOwnProperty(key)) {
          return this._compareObject(assertCb, failCb, result[key], expected[key])
        } else {
          failCb(`missing expected property: ${key}`)
          return false
        }
      })
    } else {
      return assertCb(result, expected)
    }
  }
}

module.exports = {
  ConvoHeader,
  Convo,
  ConvoStep
}
