const util = require('util')
const async = require('async')
const _ = require('lodash')
const debug = require('debug')('botium-Convo')

const BotiumMockMessage = require('../mocks/BotiumMockMessage')
const Capabilities = require('../Capabilities')
const Events = require('../Events')

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

class Transcript {
  constructor ({ steps, scriptingMemory, convoBegin, convoEnd, err }) {
    this.steps = steps
    this.scriptingMemory = scriptingMemory
    this.convoBegin = convoBegin
    this.convoEnd = convoEnd
    this.err = err
  }
}

class TranscriptStep {
  constructor ({ expected, actual, stepBegin, stepEnd, botBegin, botEnd, err }) {
    this.expected = expected
    this.actual = actual
    this.stepBegin = stepBegin
    this.stepEnd = stepEnd
    this.botBegin = botBegin
    this.botEnd = botEnd
    this.err = err
  }
}

class TranscriptError extends Error {
  constructor (message, transcript) {
    super(message)
    this.name = this.constructor.name
    this.transcript = transcript
    Error.captureStackTrace(this, this.constructor)
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
    const beginAsserter = fromJson.conversation
      .filter(s => s.sender === 'begin' && s.asserters && s.asserters.length > 0)
      .map(s => s.asserters)
      .reduce((acc, val) => acc.concat(val), [])

    const endAsserter = fromJson.conversation
      .filter(s => s.sender === 'end' && s.asserters && s.asserters.length > 0)
      .map(s => s.asserters)
      .reduce((acc, val) => acc.concat(val), [])

    return { beginAsserter, endAsserter }
  }

  toString () {
    return this.header.toString() + (this.sourceTag ? ` (${util.inspect(this.sourceTag)})` : '') + ': ' + this.conversation.map((c) => c.toString()).join(' | ')
  }

  Run (container) {
    return new Promise((resolve, reject) => {
      const scriptingMemory = {}

      async.waterfall([
        (cb) => {
          this.scriptingEvents.assertConvoBegin({convo: this, container})
            .then(() => cb())
            .catch((err) => cb(new Error(`${this.header.name}: error begin asserter ${util.inspect(err)}`)))
        },
        (cb) => {
          this.runConversation(container, scriptingMemory, (transcript) => {
            if (transcript.err) {
              cb(transcript.err, transcript)
            } else {
              cb(null, transcript)
            }
          })
        },
        (transcript, cb) => {
          this.scriptingEvents.assertConvoEnd({convo: this, container, transcript, scriptingMemory: scriptingMemory})
            .then(() => cb(null, transcript))
            .catch((err) => cb(new Error(`${this.header.name}: error end asserter ${util.inspect(err)}`), transcript))
        }
      ],
      (err, transcript) => {
        container.eventEmitter.emit(Events.MESSAGE_TRANSCRIPT, container, transcript)

        if (err) {
          return reject(new TranscriptError(err, transcript))
        } else {
          resolve(transcript)
        }
      }
      )
    })
  }

  runConversation (container, scriptingMemory, cb) {
    const transcript = new Transcript({
      steps: [],
      convoBegin: new Date(),
      convoEnd: null,
      err: null
    })

    let lastMeMsg = null
    return async.mapSeries(this.conversation,
      (convoStep, convoStepDoneCb) => {
        const transcriptStep = new TranscriptStep({
          expected: new BotiumMockMessage(convoStep),
          actual: null,
          stepBegin: new Date(),
          stepEnd: null,
          botBegin: null,
          botEnd: null,
          err: null
        })
        const convoStepDone = (err) => {
          transcriptStep.stepEnd = new Date()
          transcriptStep.err = err
          convoStepDoneCb(err, transcriptStep)
        }

        if (convoStep.sender === 'begin' || convoStep.sender === 'end') {
          convoStepDoneCb()
        } else if (convoStep.sender === 'me') {
          convoStep.messageText = this._checkNormalizeText(container, scriptingMemory, convoStep.messageText)
          debug(`${this.header.name}/${convoStep.stepTag}: user says ${JSON.stringify(convoStep, null, 2)}`)

          return this.scriptingEvents.onMeStart({ convo: this, convoStep, container, scriptingMemory })
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
              transcriptStep.botBegin = new Date()
              transcriptStep.actual = new BotiumMockMessage(convoStep)
              lastMeMsg = convoStep
              return container.UserSays(transcriptStep.actual)
                .then(() => {
                  transcriptStep.botEnd = new Date()
                  return this.scriptingEvents.onMeEnd({ convo: this, convoStep, container, scriptingMemory })
                })
                .then(() => convoStepDone())
            })
            .catch((err) => {
              transcriptStep.botEnd = new Date()

              const failErr = new Error(`${this.header.name}/${convoStep.stepTag}: error sending to bot ${util.inspect(err)}`)
              debug(failErr)
              try {
                this.scriptingEvents.fail && this.scriptingEvents.fail(failErr)
              } catch (failErr) {
              }
              convoStepDone(failErr)
            })
        } else if (convoStep.sender === 'bot') {
          debug(`${this.header.name} wait for bot ${util.inspect(convoStep.channel)}`)
          return this.scriptingEvents.onBotStart({ convo: this, convoStep, container, scriptingMemory })
            .then(() => {
              transcriptStep.botBegin = new Date()
              return container.WaitBotSays(convoStep.channel)
            }).then((saysmsg) => {
              transcriptStep.botEnd = new Date()
              transcriptStep.actual = new BotiumMockMessage(saysmsg)

              debug(`${this.header.name}: bot says ${JSON.stringify(saysmsg, null, 2)}`)
              if (!saysmsg || (!saysmsg.messageText && !saysmsg.media && !saysmsg.buttons && !saysmsg.cards && !saysmsg.sourceData)) {
                const failErr = new Error(`${this.header.name}/${convoStep.stepTag}: bot says nothing`)
                debug(failErr)
                try {
                  this.scriptingEvents.fail && this.scriptingEvents.fail(failErr, lastMeMsg)
                } catch (failErr) {
                }
                return convoStepDone(failErr)
              }
              if (convoStep.messageText) {
                this._fillScriptingMemory(container, scriptingMemory, saysmsg.messageText, convoStep.messageText)
                const response = this._checkNormalizeText(container, scriptingMemory, saysmsg.messageText)
                const tomatch = this._checkNormalizeText(container, scriptingMemory, convoStep.messageText)
                if (convoStep.not) {
                  try {
                    this.scriptingEvents.assertBotNotResponse(response, tomatch, `${this.header.name}/${convoStep.stepTag}`, lastMeMsg)
                  } catch (err) {
                    return convoStepDone(err)
                  }
                } else {
                  try {
                    this.scriptingEvents.assertBotResponse(response, tomatch, `${this.header.name}/${convoStep.stepTag}`, lastMeMsg)
                  } catch (err) {
                    return convoStepDone(err)
                  }
                }
              } else if (convoStep.sourceData) {
                try {
                  this._compareObject(container, scriptingMemory, convoStep, saysmsg.sourceData, convoStep.sourceData)
                } catch (err) {
                  return convoStepDone(err)
                }
              }
              this.scriptingEvents.assertConvoStep({ convo: this, convoStep, container, scriptingMemory, botMsg: saysmsg })
                .then(() => this.scriptingEvents.onBotEnd({ convo: this, convoStep, container, scriptingMemory, botMsg: saysmsg }))
                .then(() => convoStepDone())
                .catch((err) => {
                  const failErr = new Error(`${this.header.name}/${convoStep.stepTag}: assertion error - ${util.inspect(err)}`)
                  debug(failErr)
                  try {
                    this.scriptingEvents.fail && this.scriptingEvents.fail(failErr, lastMeMsg)
                  } catch (failErr) {
                  }
                  convoStepDone(failErr)
                })
            }).catch((err) => {
              transcriptStep.botEnd = new Date()

              const failErr = new Error(`${this.header.name}/${convoStep.stepTag}: error waiting for bot ${util.inspect(err)}`)
              debug(failErr)
              try {
                this.scriptingEvents.fail && this.scriptingEvents.fail(failErr, lastMeMsg)
              } catch (failErr) {
              }
              convoStepDone(failErr)
            })
        } else {
          const failErr = new Error(`${this.header.name}/${convoStep.stepTag}: invalid sender ${util.inspect(convoStep.sender)}`)
          debug(failErr)
          try {
            this.scriptingEvents.fail && this.scriptingEvents.fail(failErr)
          } catch (failErr) {
          }
          convoStepDone(failErr)
        }
      },
      (err, transcriptSteps) => {
        transcript.err = err
        transcript.steps = transcriptSteps.filter(s => s)
        transcript.scriptingMemory = scriptingMemory
        transcript.convoEnd = new Date()
        cb(transcript)
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
