const util = require('util')
const async = require('async')
const _ = require('lodash')
const debug = require('debug')('botium-Convo')

const BotiumMockMessage = require('../mocks/BotiumMockMessage')
const Capabilities = require('../Capabilities')

class ConvoHeader {
  constructor (fromJson = {}) {
    this.name = fromJson.name
    this.order = fromJson.order
    this.description = fromJson.description
  }

  toString () {
    return this.order + ' ' + this.name + (this.description ? ` (${this.description})` : '')
  }
}

class ConvoStepAssert {
  constructor (fromJson = {}) {
    this.name = fromJson.name
    this.args = fromJson.args
  }

  toString () {
    return this.name + '(' + (this.args ? this.args.join(',') : 'no args') + ')'
  }
}

class ConvoStep {
  constructor (fromJson = {}) {
    this.sender = fromJson.sender
    this.channel = fromJson.channel
    this.messageText = fromJson.messageText
    this.sourceData = fromJson.sourceData
    this.stepTag = fromJson.stepTag
    this.not = fromJson.not
    this.asserters = _.map(fromJson.asserters, (asserter) => new ConvoStepAssert(asserter))
  }

  toString () {
    return this.stepTag + ': #' + this.sender + ' - ' + (this.not ? '!' : '') + this.messageText + (this.asserters ? ' ' + this.asserters.map(a => a.toString()).join(' ASS: ') : '')
  }
}

class Convo {
  constructor ({scriptingEvents}, fromJson = {}) {
    this.scriptingEvents = scriptingEvents
    this.header = new ConvoHeader(fromJson.header)
    if (fromJson.conversation && _.isArray(fromJson.conversation)) {
      this.conversation = _.map(fromJson.conversation, (step) => new ConvoStep(step))
    } else {
      this.conversation = []
    }
    this.sourceTag = fromJson.sourceTag
    if (fromJson.asserter) {
      this.asserters = Object.keys(fromJson.asserter)
    }
  }

  toString () {
    return this.header.toString() + (this.sourceTag ? ` (${util.inspect(this.sourceTag)})` : '') + ': ' + this.conversation.map((c) => c.toString()).join(' | ')
  }

  Run (container) {
    return new Promise((resolve, reject) => {
      const scriptingMemory = {}

      this.scriptingEvents.assertConvoBegin({convo: this, container: container})
        .catch(err => {
          reject(new Error(`${this.header.name}: error on ConvoBegin assertion ${util.inspect(err)}`))
        })

      async.mapSeries(this.conversation,
        (convoStep, convoStepDone) => {
          if (convoStep.sender === 'me') {
            convoStep.messageText = this._checkNormalizeText(container, scriptingMemory, convoStep.messageText)
            debug(`${this.header.name}/${convoStep.stepTag}: user says ${JSON.stringify(convoStep, null, 2)}`)
            container.UserSays(new BotiumMockMessage(convoStep))
              .then(() => convoStepDone(null, {me: convoStep.messageText, bot: null}))
              .catch((err) => {
                convoStepDone(new Error(`${this.header.name}/${convoStep.stepTag}: error sending to bot ${util.inspect(err)}`))
              })
          } else if (convoStep.sender === 'bot') {
            debug(`${this.header.name} wait for bot ${util.inspect(convoStep.channel)}`)
            container.WaitBotSays(convoStep.channel).then((saysmsg) => {
              debug(`${this.header.name}: bot says ${JSON.stringify(saysmsg, null, 2)}`)
              if (!saysmsg || (!saysmsg.messageText && !saysmsg.media && !saysmsg.buttons && !saysmsg.cards && !saysmsg.sourceData)) {
                try {
                  this.scriptingEvents.fail(`${this.header.name}/${convoStep.stepTag}: bot says nothing`)
                  return
                } catch (err) {
                  convoStepDone(err)
                  return
                }
              }

              if (convoStep.messageText) {
                this._fillScriptingMemory(container, scriptingMemory, saysmsg.messageText, convoStep.messageText)
                const response = this._checkNormalizeText(container, scriptingMemory, saysmsg.messageText)
                const tomatch = this._checkNormalizeText(container, scriptingMemory, convoStep.messageText)
                if (convoStep.not) {
                  try {
                    this.scriptingEvents.assertBotNotResponse(response, tomatch, `${this.header.name}/${convoStep.stepTag}`)
                  } catch (err) {
                    convoStepDone(err)
                    return
                  }
                } else {
                  try {
                    this.scriptingEvents.assertBotResponse(response, tomatch, `${this.header.name}/${convoStep.stepTag}`)
                  } catch (err) {
                    convoStepDone(err)
                    return
                  }
                }
              } else if (convoStep.sourceData) {
                try {
                  this._compareObject(container, scriptingMemory, convoStep, saysmsg.sourceData, convoStep.sourceData)
                } catch (err) {
                  convoStepDone(err)
                  return
                }
              }
              this.scriptingEvents.assertConvoStep(this, convoStep, saysmsg)
                .then(() => convoStepDone(null, {me: null, bot: saysmsg}))
                .catch(convoStepDone)
            }).catch((err) => {
              try {
                this.scriptingEvents.fail(`${this.header.name}/${convoStep.stepTag}: error waiting for bot ${util.inspect(err)}`)
              } catch (err) {
                convoStepDone(err)
              }
            })
          } else {
            try {
              this.scriptingEvents.fail(`${this.header.name}/${convoStep.stepTag}: invalid sender ${util.inspect(convoStep.sender)}`)
            } catch (err) {
              convoStepDone(err)
            }
          }
        },
        (err, results) => {
          if (err) {
            reject(err)
          } else {
            this.scriptingEvents.assertConvoEnd({convo: this, container: container, msgs: results})
              .catch(err => {
                reject(new Error(`${this.header.name}: error on ConvoBegin assertion ${util.inspect(err)}`))
              })
          }
        })
    })
  }

  _compareObject (container, scriptingMemory, convoStep, result, expected) {
    if (expected === null || expected === undefined) return

    if (_.isArray(expected)) {
      if (!_.isArray(result)) {
        throw new Error(`${this.header.name}/${convoStep.stepTag}: bot response expected array, got "${result}"`)
      }
      if (expected.length !== result.length) {
        throw new Error(`${this.header.name}/${convoStep.stepTag}: bot response expected array length ${expected.length}, got ${result.length}`)
      }
      for (var i = 0; i < expected.length; i++) {
        this._compareObject(container, convoStep, result[i], expected[i])
      }
    } else if (_.isObject(expected)) {
      _.forOwn(expected, (value, key) => {
        if (result.hasOwnProperty(key)) {
          this._compareObject(container, convoStep, result[key], expected[key])
        } else {
          throw new Error(`${this.header.name}/${convoStep.stepTag}: bot response "${result}" missing expected property: ${key}`)
        }
      })
    } else {
      this._fillScriptingMemory(container, scriptingMemory, result, expected)
      const response = this._checkNormalizeText(container, scriptingMemory, result)
      const tomatch = this._checkNormalizeText(container, scriptingMemory, expected)
      this.scriptingEvents.assertBotResponse(response, tomatch, `${this.header.name}/${convoStep.stepTag}`)
    }
  }

  _fillScriptingMemory (container, scriptingMemory, result, expected) {
    if (result && expected && container.caps[Capabilities.SCRIPTING_ENABLE_MEMORY]) {
      let reExpected = expected
      const varMatches = expected.match(/\$\w+/g) || []
      for (let i = 0; i < varMatches.length; i++) {
        reExpected = reExpected.replace(varMatches[i], '(\\w+)')
      }
      const resultMatches = result.match(reExpected) || []
      for (let i = 1; i < resultMatches.length; i++) {
        if (i <= varMatches.length) {
          scriptingMemory[varMatches[i - 1]] = resultMatches[i]
        }
      }
      debug(`_fillScriptingMemory scriptingMemory: ${util.inspect(scriptingMemory)}`)
    }
  }

  _checkNormalizeText (container, scriptingMemory, str) {
    if (str && _.isArray(str)) {
      str = str.join(' ')
    } else if (str && !_.isString(str)) {
      if (str.toString) {
        str = str.toString()
      } else {
        str = `${str}`
      }
    }
    if (str && container.caps[Capabilities.SCRIPTING_ENABLE_MEMORY]) {
      _.forOwn(scriptingMemory, (value, key) => {
        str = str.replace(key, value)
      })
    }
    if (str && container.caps[Capabilities.SCRIPTING_NORMALIZE_TEXT]) {
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
