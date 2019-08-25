const util = require('util')
const async = require('async')
const _ = require('lodash')
const debug = require('debug')('botium-Convo')

const BotiumMockMessage = require('../mocks/BotiumMockMessage')
const Capabilities = require('../Capabilities')
const Events = require('../Events')
const ScriptingMemory = require('./ScriptingMemory')
const { BotiumError, botiumErrorFromList } = require('./BotiumError')

const { LOGIC_HOOK_INCLUDE } = require('./logichook/LogicHookConsts')

class ConvoHeader {
  constructor (fromJson = {}) {
    this.name = fromJson.name
    this.sort = fromJson.sort
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

class ConvoStepUserInput {
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
    this.userInputs = _.map(fromJson.userInputs, (userInput) => new ConvoStepUserInput(userInput))
  }

  hasInteraction () {
    return (this.messageText && this.messageText.length > 0) ||
     this.sourceData ||
     (this.asserters && this.asserters.length > 0) ||
     (this.logicHooks && this.logicHooks.findIndex(l => l.name !== LOGIC_HOOK_INCLUDE) >= 0) ||
     (this.userInputs && this.userInputs.length > 0)
  }

  toString () {
    return this.stepTag +
      ': #' + this.sender +
      ' - ' + (this.not ? '!' : '') +
      this.messageText +
      (this.asserters && this.asserters.length > 0 ? ' ' + this.asserters.map(a => a.toString()).join(' ASS: ') : '') +
      (this.logicHooks && this.logicHooks.length > 0 ? ' ' + this.logicHooks.map(l => l.toString()).join(' LH: ') : '') +
      (this.userInputs && this.userInputs.length > 0 ? ' ' + this.userInputs.map(u => u.toString()).join(' UI: ') : '')
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
  constructor ({ expected, not, actual, stepBegin, stepEnd, botBegin, botEnd, err }) {
    this.expected = expected
    this.not = not
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
  constructor (context, fromJson = {}) {
    if (fromJson instanceof Convo) {
      debug(`Illegal state!!! Parameter should be a JSON, but it is a Convo`)
    } else if (fromJson.beginAsserter) {
      // beginAsserter is one of the fields which are lost
      debug(`Illegal state!!! Parameter should be a native JSON, but looks as a Convo converted to JSON`)
    }

    this.scriptingEvents = context.scriptingEvents
    this.context = context
    this.header = new ConvoHeader(fromJson.header)
    if (fromJson.conversation && _.isArray(fromJson.conversation)) {
      this.conversation = _.map(fromJson.conversation, (step) => new ConvoStep(step))
    } else {
      this.conversation = []
    }
    this.sourceTag = fromJson.sourceTag
    let { beginAsserter, endAsserter } = this.setConvoBeginAndEndAsserter(fromJson)
    this.beginAsserter = beginAsserter
    this.endAsserter = endAsserter
    let { beginLogicHook, endLogicHook } = this.setConvoBeginAndEndLogicHook(fromJson)
    this.beginLogicHook = beginLogicHook
    this.endLogicHook = endLogicHook
    this.effectiveConversation = null
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

  setConvoBeginAndEndLogicHook (fromJson) {
    const beginLogicHook = fromJson.conversation
      .filter(s => s.sender === 'begin' && s.logicHooks && s.logicHooks.length > 0)
      .map(s => s.logicHooks)
      .reduce((acc, val) => acc.concat(val), [])

    const endLogicHook = fromJson.conversation
      .filter(s => s.sender === 'end' && s.logicHooks && s.logicHooks.length > 0)
      .map(s => s.logicHooks)
      .reduce((acc, val) => acc.concat(val), [])

    return { beginLogicHook, endLogicHook }
  }

  toString () {
    return this.header.toString() + (this.sourceTag ? ` (${util.inspect(this.sourceTag)})` : '') + ': ' + this.conversation.map((c) => c.toString()).join(' | ')
  }

  Run (container) {
    return new Promise((resolve, reject) => {
      const scriptingMemory = {}

      async.waterfall([
        // onConvoBegin first or assertConvoBegin? If onConvoBegin, then it is possible to assert it too
        (cb) => {
          this.scriptingEvents.onConvoBegin({ convo: this, container, scriptingMemory })
            .then(() => cb())
            .catch((err) => cb(new Error(`${this.header.name}: error begin handler ${util.inspect(err)}`)))
        },
        (cb) => {
          this.scriptingEvents.assertConvoBegin({ convo: this, container, scriptingMemory })
            .then(() => cb())
            .catch((err) => cb(new Error(`${this.header.name}: error begin handler ${util.inspect(err)}`)))
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
        // onConvoEnd first or assertConvoEnd? If onConvoEnd, then it is possible to assert it too
        (transcript, cb) => {
          this.scriptingEvents.onConvoEnd({ convo: this, container, transcript, scriptingMemory: scriptingMemory })
            .then(() => cb(null, transcript))
            .catch((err) => cb(new Error(`${this.header.name}: error end handler ${util.inspect(err)}`), transcript))
        },
        (transcript, cb) => {
          this.scriptingEvents.assertConvoEnd({ convo: this, container, transcript, scriptingMemory: scriptingMemory })
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
    let effectiveConversation
    try {
      effectiveConversation = this._getEffectiveConversation()
    } catch (err) {
      transcript.err = err
      transcript.scriptingMemory = scriptingMemory
      transcript.convoEnd = new Date()
      cb(transcript)
      return
    }
    return async.mapSeries(effectiveConversation,
      (convoStep, convoStepDoneCb) => {
        const currentStepIndex = this.conversation.indexOf(convoStep)
        const transcriptStep = new TranscriptStep({
          expected: new BotiumMockMessage(convoStep),
          not: convoStep.not,
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
          convoStep.messageText = ScriptingMemory.apply(container, scriptingMemory, convoStep.messageText)

          return this.scriptingEvents.setUserInput({ convo: this, convoStep, container, scriptingMemory, meMsg: convoStep })
            .then(() => debug(`${this.header.name}/${convoStep.stepTag}: user says ${JSON.stringify(convoStep, null, 2)}`))
            .then(() => this.scriptingEvents.onMeStart({ convo: this, convoStep, container, scriptingMemory }))
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
              transcriptStep.actual = new BotiumMockMessage(convoStep)
              lastMeMsg = convoStep
              transcriptStep.botBegin = new Date()
              return container.UserSays(Object.assign({ conversation: this.conversation, currentStepIndex, scriptingMemory }, transcriptStep.actual))
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

              const coreMsg = _.omit(saysmsg, [
                'attachments',
                'sourceData'
              ])
              debug(`${this.header.name}: bot says (cleaned by attachments and sourceData) ${JSON.stringify(coreMsg, null, 2)}`)
              if (!saysmsg || (!saysmsg.messageText && !saysmsg.media && !saysmsg.buttons && !saysmsg.cards && !saysmsg.sourceData && !saysmsg.nlp)) {
                const failErr = new Error(`${this.header.name}/${convoStep.stepTag}: bot says nothing`)
                debug(failErr)
                try {
                  this.scriptingEvents.fail && this.scriptingEvents.fail(failErr, lastMeMsg)
                } catch (failErr) {
                }
                return convoStepDone(failErr)
              }
              const assertErrors = []
              if (convoStep.messageText) {
                const response = this._checkNormalizeText(container, saysmsg.messageText)
                const messageText = this._checkNormalizeText(container, convoStep.messageText)
                ScriptingMemory.fill(container, scriptingMemory, response, messageText, this.scriptingEvents)
                const tomatch = this._resolveUtterancesToMatch(container, scriptingMemory, messageText)
                if (convoStep.not) {
                  try {
                    this.scriptingEvents.assertBotNotResponse(response, tomatch, `${this.header.name}/${convoStep.stepTag}`, lastMeMsg)
                  } catch (err) {
                    if (container.caps[Capabilities.SCRIPTING_ENABLE_MULTIPLE_ASSERT_ERRORS]) {
                      assertErrors.push(err)
                    } else {
                      return convoStepDone(err)
                    }
                  }
                } else {
                  try {
                    this.scriptingEvents.assertBotResponse(response, tomatch, `${this.header.name}/${convoStep.stepTag}`, lastMeMsg)
                  } catch (err) {
                    if (container.caps[Capabilities.SCRIPTING_ENABLE_MULTIPLE_ASSERT_ERRORS]) {
                      assertErrors.push(err)
                    } else {
                      return convoStepDone(err)
                    }
                  }
                }
              } else if (convoStep.sourceData) {
                try {
                  this._compareObject(container, scriptingMemory, convoStep, saysmsg.sourceData, convoStep.sourceData)
                } catch (err) {
                  if (container.caps[Capabilities.SCRIPTING_ENABLE_MULTIPLE_ASSERT_ERRORS]) {
                    assertErrors.push(err)
                  } else {
                    return convoStepDone(err)
                  }
                }
              }
              this.scriptingEvents.assertConvoStep({ convo: this, convoStep, container, scriptingMemory, botMsg: saysmsg })
                .then(() => this.scriptingEvents.onBotEnd({ convo: this, convoStep, container, scriptingMemory, botMsg: saysmsg }))
                .catch((err) => {
                  const failErr = new Error(`${this.header.name}/${convoStep.stepTag}: assertion error - ${util.inspect(err)}`)
                  debug(failErr)
                  try {
                    this.scriptingEvents.fail && this.scriptingEvents.fail(failErr, lastMeMsg)
                  } catch (failErr) {
                  }
                  if (container.caps[Capabilities.SCRIPTING_ENABLE_MULTIPLE_ASSERT_ERRORS] && err instanceof BotiumError) {
                    assertErrors.push(err)
                  } else {
                    return convoStepDone(failErr)
                  }
                })
                .then(() => {
                  if (container.caps[Capabilities.SCRIPTING_ENABLE_MULTIPLE_ASSERT_ERRORS]) {
                    if (assertErrors.length === 0) {
                      convoStepDone()
                    } else {
                      return convoStepDone(botiumErrorFromList(assertErrors, {}))
                    }
                  } else {
                    if (!transcriptStep.stepEnd) {
                      convoStepDone()
                    }
                  }
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
        this._compareObject(container, scriptingMemory, convoStep, result[i], expected[i])
      }
    } else if (_.isObject(expected)) {
      _.forOwn(expected, (value, key) => {
        if (result.hasOwnProperty(key)) {
          this._compareObject(container, scriptingMemory, convoStep, result[key], expected[key])
        } else {
          throw new Error(`${this.header.name}/${convoStep.stepTag}: bot response "${result}" missing expected property: ${key}`)
        }
      })
    } else {
      ScriptingMemory.fill(container, scriptingMemory, result, expected, this.scriptingEvents)
      const response = this._checkNormalizeText(container, result)
      const tomatch = this._resolveUtterancesToMatch(container, scriptingMemory, expected)
      this.scriptingEvents.assertBotResponse(response, tomatch, `${this.header.name}/${convoStep.stepTag}`)
    }
  }

  GetScriptingMemoryAllVariables (container) {
    const result = this.conversation.reduce((acc, convoStep) => {
      return acc.concat(this.GetScriptingMemoryVariables(container, convoStep.messageText))
    }, [])

    return [...new Set(result)]
  }

  GetScriptingMemoryVariables (container, utterance) {
    if (!utterance || !container.caps[Capabilities.SCRIPTING_ENABLE_MEMORY]) {
      return []
    }

    const utterances = this.scriptingEvents.resolveUtterance({ utterance })

    return utterances.reduce((acc, expected) => {
      return acc.concat(expected.match(/\$\w+/g) || [])
    }, [])
  }

  _resolveUtterancesToMatch (container, scriptingMemory, utterance) {
    const utterances = this.scriptingEvents.resolveUtterance({ utterance })
    const normalizedUtterances = utterances.map(str => this._checkNormalizeText(container, str))
    const tomatch = normalizedUtterances.map(str => ScriptingMemory.apply(container, scriptingMemory, str))
    return tomatch
  }

  _checkNormalizeText (container, str) {
    if (str && _.isArray(str)) {
      str = str.join(' ')
    } else if (str && !_.isString(str)) {
      if (str.toString) {
        str = str.toString()
      } else {
        str = `${str}`
      }
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

      str = str.split('\n').map(s => s.trim()).join('\n').trim()
    }
    return str
  }

  _getEffectiveConversation () {
    if (this.effectiveConversation) {
      return this.effectiveConversation
    }

    const _getIncludeLogicHookNames = (convoStep) => {
      if (!convoStep.logicHooks) {
        return []
      }

      let result = []
      convoStep.logicHooks.forEach((logicHook) => {
        if (logicHook.name === LOGIC_HOOK_INCLUDE) {
          if (logicHook.args.length !== 1) {
            throw Error('Wrong argument for include logic hook!')
          }
          result.push(logicHook)
        }
      })

      return result.map((hook) => hook.args[0])
    }

    const _getEffectiveConversationRecursive = (conversation, parentPConvos = [], result = []) => {
      conversation.forEach((convoStep) => {
        const includeLogicHooks = _getIncludeLogicHookNames(convoStep)

        if (includeLogicHooks.length === 0 || convoStep.hasInteraction()) {
          // dont put convo name for ConvoSteps on the root.
          const steptagPath = parentPConvos.length === 0 ? '' : parentPConvos.join('/') + '/'
          result.push(Object.assign(new ConvoStep(), convoStep, { stepTag: `${steptagPath}${convoStep.stepTag}` }))
        }

        includeLogicHooks.forEach((includeLogicHook) => {
          const alreadyThereAt = parentPConvos.indexOf(includeLogicHook)
          if (alreadyThereAt >= 0) {
            throw new Error(`Partial convos are included circular. "${includeLogicHook}" is referenced by "/${parentPConvos.slice(0, alreadyThereAt).join('/')}" and by "/${parentPConvos.join('/')}" `)
          }
          const partialConvos = this.context.GetPartialConvos()
          if (!partialConvos || Object.keys(partialConvos).length === 0) {
            throw new Error(`Cant find partial convo with name ${includeLogicHook} (There are no partial convos)`)
          }
          const partialConvo = partialConvos[includeLogicHook]
          if (!partialConvo) {
            throw Error(`Cant find partial convo with name ${includeLogicHook} (available partial convos: ${Object.keys(partialConvos).join(',')})`)
          }

          _getEffectiveConversationRecursive(partialConvo.conversation, [...parentPConvos, includeLogicHook], result)
          debug(`Partial convo ${includeLogicHook} included`)
        })
      })

      return result
    }

    this.effectiveConversation = _getEffectiveConversationRecursive(this.conversation)

    return this.effectiveConversation
  }
}

module
  .exports = {
    ConvoHeader,
    Convo,
    ConvoStep
  }
