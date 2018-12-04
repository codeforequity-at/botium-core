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

class ConvoStepLogicHook {
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
    this.logicHooks = _.map(fromJson.logicHooks, (logicHook) => new ConvoStepLogicHook(logicHook))
  }

  toString () {
    return this.stepTag +
      ': #' + this.sender +
      ' - ' + (this.not ? '!' : '') +
      this.messageText +
      (this.asserters ? ' ' + this.asserters.map(a => a.toString()).join(' ASS: ') : '') +
      (this.logicHooks ? ' ' + this.logicHooks.map(l => l.toString()).join(' ASS: ') : '')
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
    let {beginAsserter, endAsserter} = this.setConvoBeginAndEndAsserter(fromJson)
    this.beginAsserter = beginAsserter
    this.endAsserter = endAsserter
  }

  setConvoBeginAndEndAsserter (fromJson) {
    // collecting asserters to map e.g. "Button": List (args)
    let asserterMap = fromJson.conversation
      .map(s => s.asserters)
      .reduce((acc, val) => acc.concat(val), [])
      .reduce((xs, x) => {
        xs[x.name] = xs[x.name] || []
        xs[x.name].push(x.args)
        return xs
      }, {})
    /* assign args from first appearance of asserter-keyword as beginAsserter and last appearance of asserter-keyword
     * as endAsserter args
     */
    let beginAsserter = []
    let endAsserter = []
    for (const key in asserterMap) {
      beginAsserter.push({name: key, args: asserterMap[key][0]})
      endAsserter.push({name: key, args: asserterMap[key][asserterMap[key].length - 1]})
    }
    return {beginAsserter: beginAsserter, endAsserter: endAsserter}
  }

  toString () {
    return this.header.toString() + (this.sourceTag ? ` (${util.inspect(this.sourceTag)})` : '') + ': ' + this.conversation.map((c) => c.toString()).join(' | ')
  }

  Run (container) {
    return new Promise((resolve, reject) => {
      const scriptingMemory = {}

      async.waterfall([
        (cb) => {
          this.scriptingEvents.assertConvoBegin({convo: this, container: container})
            .catch((err) => cb(new Error(`${this.header.name}: error begin asserter ${util.inspect(err)}`)))
          cb()
        },
        (cb) => {
          this.runConversation(container, scriptingMemory, cb)
        },
        (msgs, cb) => {
          this.scriptingEvents.assertConvoEnd({convo: this, container: container, msgs: msgs})
            .then(() => cb(null, null))
            .catch((err) => cb(err))
        }
      ],
      (err, results) => {
        if (err) {
          reject(err)
        }
        resolve()
      }
      )
    })
  }

  runConversation (container, scriptingMemory, cb) {
    let lastMeMsg = null
    return async.mapSeries(this.conversation,
      (convoStep, convoStepDone) => {
        if (convoStep.sender === 'begin' || convoStep.sender === 'end') {
          convoStepDone(null, null)
        } else if (convoStep.sender === 'me') {
          convoStep.messageText = this._checkNormalizeText(container, scriptingMemory, convoStep.messageText)
          debug(`${this.header.name}/${convoStep.stepTag}: user says ${JSON.stringify(convoStep, null, 2)}`)

          let convoStepDoneCalling = false
          return this.scriptingEvents.onMeStart(this, convoStep, container, scriptingMemory)
            .then(() => {
              return new Promise(resolve => {
                if (container.caps.SIMULATE_WRITING_SPEED && convoStep.messageText && convoStep.messageText.length) {
                  setTimeout(() => resolve(), container.caps.SIMULATE_WRITING_SPEED * convoStep.messageText.length)
                } else {
                  resolve()
                }
              })
            })
            .then(() => {
              lastMeMsg = convoStep
              return container.UserSays(new BotiumMockMessage(convoStep))
            })
            .then(() => this.scriptingEvents.onMeEnd(this, convoStep, container, scriptingMemory))
            .then(() => {
              convoStepDoneCalling = true
              convoStepDone(null, convoStep)
            })
            .catch((err) => {
              try {
                this.scriptingEvents.fail(new Error(`${this.header.name}/${convoStep.stepTag}: error sending to bot ${util.inspect(err)}`))
              } catch (err) {
                // avoid calling callback twice
                if (!convoStepDoneCalling) {
                  convoStepDone(new Error(`${this.header.name}/${convoStep.stepTag}: error sending to bot ${util.inspect(err)}`))
                } else {
                  const errorMessage = `Fatal error while seinding to bot ${util.inspect(err)}`
                  console.log(errorMessage)
                  debug(errorMessage)
                }
              }
            })
        } else if (convoStep.sender === 'bot') {
          debug(`${this.header.name} wait for bot ${util.inspect(convoStep.channel)}`)
          return this.scriptingEvents.onBotStart(this, convoStep, container, scriptingMemory)
            .then(() => container.WaitBotSays(convoStep.channel))
            .then((saysmsg) => {
              return this.scriptingEvents.onBotEnd(this, convoStep, container, scriptingMemory, saysmsg)
                .then(() => saysmsg)
            })
            .then((saysmsg) => {
              debug(`${this.header.name}: bot says ${JSON.stringify(saysmsg, null, 2)}`)
              if (!saysmsg || (!saysmsg.messageText && !saysmsg.media && !saysmsg.buttons && !saysmsg.cards && !saysmsg.sourceData)) {
                try {
                  this.scriptingEvents.fail(`${this.header.name}/${convoStep.stepTag}: bot says nothing`, lastMeMsg)
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
                    this.scriptingEvents.assertBotNotResponse(response, tomatch, `${this.header.name}/${convoStep.stepTag}`, lastMeMsg)
                  } catch (err) {
                    convoStepDone(err)
                    return
                  }
                } else {
                  try {
                    this.scriptingEvents.assertBotResponse(response, tomatch, `${this.header.name}/${convoStep.stepTag}`, lastMeMsg)
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
                .then(() => convoStepDone(null, saysmsg))
                .catch((err) => {
                  try {
                    this.scriptingEvents.fail(`${this.header.name}/${convoStep.stepTag}: assertion error - ${util.inspect(err)}`, lastMeMsg)
                  } catch (err) {
                    convoStepDone(err)
                  }
                })
            }).catch((err) => {
              try {
                this.scriptingEvents.fail(`${this.header.name}/${convoStep.stepTag}: error waiting for bot ${util.inspect(err)}`, lastMeMsg)
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
          cb(err)
        } else {
          let msgs = results.filter(e => e != null)
          cb(null, msgs)
        }
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

module
  .exports = {
    ConvoHeader,
    Convo,
    ConvoStep
  }
