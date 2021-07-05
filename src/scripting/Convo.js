const util = require('util')
const _ = require('lodash')
const debug = require('debug')('botium-core-Convo')

const BotiumMockMessage = require('../mocks/BotiumMockMessage')
const Capabilities = require('../Capabilities')
const Events = require('../Events')
const ScriptingMemory = require('./ScriptingMemory')
const { BotiumError, botiumErrorFromErr, botiumErrorFromList } = require('./BotiumError')
const { normalizeText, toString, removeBuffers, splitStringInNonEmptyLines } = require('./helper')

const { LOGIC_HOOK_INCLUDE } = require('./logichook/LogicHookConsts')

class ConvoHeader {
  constructor (fromJson = {}) {
    this.name = fromJson.name
    this.projectname = fromJson.projectname
    this.testsessionname = fromJson.testsessionname
    this.sort = fromJson.sort
    this.order = fromJson.order
    this.description = fromJson.description
    Object.assign(this, fromJson)
  }

  toString () {
    return this.order + ' ' + this.name + (this.description ? ` (${this.description})` : '')
  }
}

class ConvoStepAssert {
  constructor (fromJson = {}) {
    this.name = fromJson.name
    this.args = fromJson.args
    this.not = fromJson.not
    this.optional = fromJson.optional
  }

  toString () {
    return (this.optional ? '?' : '') + (this.not ? '!' : '') + this.name + '(' + (this.args ? this.args.join(',') : 'no args') + ')'
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
    this.optional = fromJson.optional
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
    return (this.stepTag ? this.stepTag + ': ' : '') +
      '#' + this.sender +
      ' - ' + (this.optional ? '?' : '') + (this.not ? '!' : '') +
      (this.messageText || '') +
      (this.asserters && this.asserters.length > 0 ? ' ' + this.asserters.map(a => a.toString()).join(' ASS: ') : '') +
      (this.logicHooks && this.logicHooks.length > 0 ? ' ' + this.logicHooks.map(l => l.toString()).join(' LH: ') : '') +
      (this.userInputs && this.userInputs.length > 0 ? ' ' + this.userInputs.map(u => u.toString()).join(' UI: ') : '')
  }
}

class Transcript {
  constructor ({ steps, attachments, scriptingMemory, convoBegin, convoEnd, err }) {
    this.steps = steps
    this.attachments = attachments
    this.scriptingMemory = scriptingMemory
    this.convoBegin = convoBegin
    this.convoEnd = convoEnd
    this.err = err
  }

  prettifyActual () {
    const prettifiedSteps = this.steps.map(step => {
      if (step.actual && step.actual.prettify) {
        return step.actual.prettify()
      } else {
        return '<empty conversation step>'
      }
    })
    return prettifiedSteps.join('\n')
  }
}

class TranscriptAttachment { // eslint-disable-line no-unused-vars
  constructor (fromJson = {}) {
    this.name = fromJson.name
    this.mimeType = fromJson.mimeType
    this.base64 = fromJson.base64
    this.href = fromJson.href
  }
}

class TranscriptStep {
  constructor ({ expected, not, optional, actual, stepBegin, stepEnd, botBegin, botEnd, err }) {
    this.expected = expected
    this.not = not
    this.optional = optional
    this.actual = actual
    this.stepBegin = stepBegin
    this.stepEnd = stepEnd
    this.botBegin = botBegin
    this.botEnd = botEnd
    this.err = err
  }
}

class TranscriptError extends Error {
  constructor (err, transcript) {
    super(err.message)
    this.name = this.constructor.name
    this.transcript = transcript
    this.cause = err
    Error.captureStackTrace(this, this.constructor)
  }
}

class Convo {
  constructor (context, fromJson = {}) {
    if (fromJson instanceof Convo) {
      debug('Illegal state!!! Parameter should be a JSON, but it is a Convo')
    } else if (fromJson.beginAsserter) {
      // beginAsserter is one of the fields which are lost
      debug('Illegal state!!! Parameter should be a native JSON, but looks as a Convo converted to JSON')
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
    const { beginAsserter, endAsserter } = this.setConvoBeginAndEndAsserter(fromJson)
    this.beginAsserter = beginAsserter
    this.endAsserter = endAsserter
    const { beginLogicHook, endLogicHook } = this.setConvoBeginAndEndLogicHook(fromJson)
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

  async Run (container) {
    const transcript = new Transcript({
      steps: [],
      attachments: [],
      convoBegin: new Date(),
      convoEnd: null,
      err: null
    })
    const scriptingMemory = {
    }
    container.caps[Capabilities.TESTCASENAME] = this.header.name
    try {
      try {
        // onConvoBegin first or assertConvoBegin? If onConvoBegin, then it is possible to assert it too
        await this.scriptingEvents.onConvoBegin({ convo: this, convoStep: { stepTag: '#begin' }, container, transcript, scriptingMemory })
      } catch (err) {
        throw new TranscriptError(botiumErrorFromErr(`${this.header.name}: ${err.message}`, err), transcript)
      }
      try {
        await this.scriptingEvents.assertConvoBegin({ convo: this, convoStep: { stepTag: '#begin' }, container, scriptingMemory })
      } catch (err) {
        throw new TranscriptError(botiumErrorFromErr(`${this.header.name}: ${err.message}`, err), transcript)
      }
      await this.runConversation(container, scriptingMemory, transcript)
      await this._checkBotRepliesConsumed(container)
      try {
        await this.scriptingEvents.onConvoEnd({ convo: this, convoStep: { stepTag: '#end' }, container, transcript, scriptingMemory: scriptingMemory })
      } catch (err) {
        throw new TranscriptError(botiumErrorFromErr(`${this.header.name}: ${err.message}`, err), transcript)
      }
      if (transcript.err && container.caps[Capabilities.SCRIPTING_ENABLE_MULTIPLE_ASSERT_ERRORS]) {
        let assertConvoEndErr = null
        try {
          await this.scriptingEvents.assertConvoEnd({ convo: this, convoStep: { stepTag: '#end' }, container, transcript, scriptingMemory: scriptingMemory })
        } catch (err) {
          assertConvoEndErr = botiumErrorFromErr(`${this.header.name}: ${err.message}`, err)
        }
        if (assertConvoEndErr) {
          const err = transcript.err
          transcript.err = botiumErrorFromList([transcript.err, assertConvoEndErr], {})
          transcript.err.context.input = err.context.input
          transcript.err.context.transcript = err.context.transcript
        }
        throw new TranscriptError(transcript.err, transcript)
      } else if (transcript.err) {
        throw new TranscriptError(transcript.err, transcript)
      }
      try {
        await this.scriptingEvents.assertConvoEnd({ convo: this, convoStep: { stepTag: '#end' }, container, transcript, scriptingMemory: scriptingMemory })
      } catch (err) {
        transcript.err = botiumErrorFromErr(`${this.header.name}: ${err.message}`, err)
        throw new TranscriptError(transcript.err, transcript)
      }
      return transcript
    } finally {
      container.eventEmitter.emit(Events.MESSAGE_TRANSCRIPT, container, transcript)
    }
  }

  async runConversation (container, scriptingMemory, transcript) {
    const transcriptSteps = []
    try {
      let lastMeConvoStep = null
      let botMsg = null
      let waitForBotSays = true
      let skipTranscriptStep = false
      for (let i = 0; i < this.conversation.length; i++) {
        const convoStep = this.conversation[i]
        const currentStepIndex = i
        skipTranscriptStep = false
        const transcriptStep = new TranscriptStep({
          expected: new BotiumMockMessage(convoStep),
          not: convoStep.not,
          optional: convoStep.optional,
          actual: null,
          stepBegin: new Date(),
          stepEnd: null,
          botBegin: null,
          botEnd: null,
          err: null
        })

        try {
          if (convoStep.sender === 'begin' || convoStep.sender === 'end') {
            continue
          } else if (convoStep.sender === 'me') {
            const meMsg = new BotiumMockMessage(convoStep)
            meMsg.messageText = ScriptingMemory.apply(container, scriptingMemory, meMsg.messageText, meMsg)
            // buggy command is removed, but because sideeffects are possible, it can be reactivated.
            // If there are no sideeffects coming up, then row can be deleted permanently.
            if (process.env.WORKAROUND_OVERWRITE_JSON_MESSAGE_TEXT) {
              // if this line is active, then Random() in me section does not work in performance test
              // (first run overwrites the function with the value, and the next run has the value, not the function)
              convoStep.messageText = meMsg.messageText
            }
            transcriptStep.actual = meMsg

            try {
              await this.scriptingEvents.setUserInput({ convo: this, convoStep, container, scriptingMemory, meMsg, transcript, transcriptStep })
              await this.scriptingEvents.onMeStart({ convo: this, convoStep, container, scriptingMemory, meMsg, transcript, transcriptStep })
              await this.scriptingEvents.onMePrepare({ convo: this, convoStep, container, scriptingMemory, meMsg, transcript, transcriptStep })

              await this._checkBotRepliesConsumed(container)

              const coreMsg = _.omit(removeBuffers(meMsg), ['sourceData'])
              debug(`${this.header.name}/${convoStep.stepTag}: user says (cleaned by binary and base64 data and sourceData) ${JSON.stringify(coreMsg, null, 2)}`)
              await new Promise(resolve => {
                if (container.caps.SIMULATE_WRITING_SPEED && meMsg.messageText && meMsg.messageText.length) {
                  setTimeout(() => resolve(), container.caps.SIMULATE_WRITING_SPEED * meMsg.messageText.length)
                } else {
                  resolve()
                }
              })
              lastMeConvoStep = convoStep
              transcriptStep.botBegin = new Date()
              if (!_.isNull(meMsg.messageText) || meMsg.sourceData || (meMsg.userInputs && meMsg.userInputs.length) || (meMsg.logicHooks && meMsg.logicHooks.length)) {
                try {
                  Object.assign(meMsg, { header: this.header, conversation: this.conversation, currentStepIndex, scriptingMemory })
                  await container.UserSays(meMsg)
                } finally {
                  delete meMsg.header
                  delete meMsg.conversation
                  delete meMsg.scriptingMemory
                }

                transcriptStep.botEnd = new Date()
                await this.scriptingEvents.onMeEnd({ convo: this, convoStep, container, scriptingMemory, meMsg, transcript, transcriptStep })
                continue
              } else {
                debug(`${this.header.name}/${convoStep.stepTag}: message not found in #me section, message not sent to container ${util.inspect(convoStep)}`)
                transcriptStep.botEnd = new Date()
                await this.scriptingEvents.onMeEnd({ convo: this, convoStep, container, scriptingMemory, meMsg, transcript, transcriptStep })
                continue
              }
            } catch (err) {
              transcriptStep.botEnd = new Date()

              const failErr = botiumErrorFromErr(`${this.header.name}/${convoStep.stepTag}: error sending to bot - ${err.message || err}`, err)
              debug(failErr)
              try {
                this.scriptingEvents.fail && this.scriptingEvents.fail(failErr)
              } catch (failErr) {
              }
              throw failErr
            }
          } else if (convoStep.sender === 'bot') {
            if (waitForBotSays) {
              botMsg = null
            } else {
              waitForBotSays = true
            }

            try {
              debug(`${this.header.name} wait for bot ${convoStep.channel || ''}`)
              await this.scriptingEvents.onBotStart({ convo: this, convoStep, container, scriptingMemory, transcript, transcriptStep })
              transcriptStep.botBegin = new Date()
              if (!botMsg) {
                botMsg = await container.WaitBotSays(convoStep.channel)
              }
              transcriptStep.botEnd = new Date()
              transcriptStep.actual = new BotiumMockMessage(botMsg)

              const coreMsg = _.omit(removeBuffers(botMsg), ['sourceData'])
              debug(`${this.header.name}: bot says (cleaned by binary and base64 data and sourceData) ${JSON.stringify(coreMsg, null, 2)}`)
            } catch (err) {
              transcriptStep.botEnd = new Date()

              const failErr = botiumErrorFromErr(`${this.header.name}/${convoStep.stepTag}: error waiting for bot - ${err.message}`, err)
              debug(failErr)
              try {
                this.scriptingEvents.fail && this.scriptingEvents.fail(failErr, lastMeConvoStep)
              } catch (failErr) {
              }
              throw failErr
            }

            try {
              const prepared = await this.scriptingEvents.onBotPrepare({ convo: this, convoStep, container, scriptingMemory, botMsg, transcript, transcriptStep })
              if (prepared) {
                transcriptStep.actual = new BotiumMockMessage(botMsg)

                const coreMsg = _.omit(removeBuffers(botMsg), ['sourceData'])
                debug(`${this.header.name}: onBotPrepare (cleaned by binary and base64 data and sourceData) ${JSON.stringify(coreMsg, null, 2)}`)
              }
            } catch (err) {
              const failErr = botiumErrorFromErr(`${this.header.name}/${convoStep.stepTag}: onBotPrepare error - ${err.message || err}`, err)
              debug(failErr)
              try {
                this.scriptingEvents.fail && this.scriptingEvents.fail(failErr, lastMeConvoStep)
              } catch (failErr) {
              }
              throw failErr
            }

            if (!botMsg || (!botMsg.messageText && !botMsg.media && !botMsg.buttons && !botMsg.cards && !botMsg.sourceData && !botMsg.nlp)) {
              const failErr = new BotiumError(`${this.header.name}/${convoStep.stepTag}: bot says nothing`)
              debug(failErr)
              try {
                this.scriptingEvents.fail && this.scriptingEvents.fail(failErr, lastMeConvoStep)
              } catch (failErr) {
              }
              throw failErr
            }
            const isErrorHandledWithOptionConvoStep = (err) => {
              const nextConvoStep = this.conversation[i + 1]
              if (convoStep.optional && nextConvoStep && nextConvoStep.sender === 'bot') {
                waitForBotSays = false
                skipTranscriptStep = true
                return true
              }
              if (container.caps[Capabilities.SCRIPTING_ENABLE_MULTIPLE_ASSERT_ERRORS]) {
                assertErrors.push(err)
                return false
              } else {
                throw err
              }
            }
            const assertErrors = []
            const scriptingMemoryUpdate = {}
            if (convoStep.messageText) {
              const response = this._checkNormalizeText(container, botMsg.messageText)
              const messageText = this._checkNormalizeText(container, convoStep.messageText)
              ScriptingMemory.fill(container, scriptingMemoryUpdate, response, messageText, this.scriptingEvents)
              const tomatch = this._resolveUtterancesToMatch(container, Object.assign({}, scriptingMemoryUpdate, scriptingMemory), messageText, botMsg)
              if (convoStep.not) {
                try {
                  this.scriptingEvents.assertBotNotResponse(response, tomatch, `${this.header.name}/${convoStep.stepTag}`, lastMeConvoStep)
                } catch (err) {
                  if (isErrorHandledWithOptionConvoStep(err)) {
                    continue
                  }
                }
              } else {
                try {
                  this.scriptingEvents.assertBotResponse(response, tomatch, `${this.header.name}/${convoStep.stepTag}`, lastMeConvoStep)
                } catch (err) {
                  if (isErrorHandledWithOptionConvoStep(err)) {
                    continue
                  }
                }
              }
            } else if (convoStep.sourceData) {
              try {
                this._compareObject(container, scriptingMemory, convoStep, botMsg.sourceData, convoStep.sourceData, botMsg)
              } catch (err) {
                if (isErrorHandledWithOptionConvoStep(err)) {
                  continue
                }
              }
            }
            Object.assign(scriptingMemory, scriptingMemoryUpdate)
            try {
              await this.scriptingEvents.assertConvoStep({ convo: this, convoStep, container, scriptingMemory, botMsg, transcript, transcriptStep })
              await this.scriptingEvents.onBotEnd({ convo: this, convoStep, container, scriptingMemory, botMsg, transcript, transcriptStep })
            } catch (err) {
              const nextConvoStep = this.conversation[i + 1]
              if (convoStep.optional && nextConvoStep && nextConvoStep.sender === 'bot') {
                waitForBotSays = false
                skipTranscriptStep = true
                continue
              }
              const failErr = botiumErrorFromErr(`${this.header.name}/${convoStep.stepTag}: assertion error - ${err.message || err}`, err)
              debug(failErr)
              try {
                this.scriptingEvents.fail && this.scriptingEvents.fail(failErr, lastMeConvoStep)
              } catch (failErr) {
              }
              if (container.caps[Capabilities.SCRIPTING_ENABLE_MULTIPLE_ASSERT_ERRORS] && err instanceof BotiumError) {
                assertErrors.push(err)
              } else {
                throw failErr
              }
            }
            if (container.caps[Capabilities.SCRIPTING_ENABLE_MULTIPLE_ASSERT_ERRORS]) {
              if (assertErrors.length > 0) {
                throw botiumErrorFromList(assertErrors, {})
              }
            } else {
              if (!transcriptStep.stepEnd) {
                continue
              }
            }
          } else {
            const failErr = new BotiumError(`${this.header.name}/${convoStep.stepTag}: invalid sender - ${util.inspect(convoStep.sender)}`)
            debug(failErr)
            try {
              this.scriptingEvents.fail && this.scriptingEvents.fail(failErr)
            } catch (failErr) {
            }
            throw failErr
          }
        } catch (err) {
          if (lastMeConvoStep) {
            if (err instanceof BotiumError && err.context) {
              err.context.input = new ConvoStep(lastMeConvoStep)
              err.context.transcript = [...transcriptSteps, { ...transcriptStep }]
            } else {
              err.input = new ConvoStep(lastMeConvoStep)
              err.transcript = [...transcriptSteps, { ...transcriptStep }]
            }
          }
          transcriptStep.err = err
          throw err
        } finally {
          if (convoStep.sender !== 'begin' && convoStep.sender !== 'end' && !skipTranscriptStep) {
            transcriptStep.scriptingMemory = Object.assign({}, scriptingMemory)
            transcriptStep.stepEnd = new Date()
            transcriptSteps.push(transcriptStep)
          }
        }
      }
    } catch (err) {
      transcript.err = err
    } finally {
      transcript.steps = transcriptSteps.filter(s => s)
      transcript.scriptingMemory = scriptingMemory
      transcript.convoEnd = new Date()
    }
  }

  _compareObject (container, scriptingMemory, convoStep, result, expected, botMsg) {
    if (expected === null || expected === undefined) return

    if (_.isArray(expected)) {
      if (!_.isArray(result)) {
        throw new BotiumError(`${this.header.name}/${convoStep.stepTag}: bot response expected array, got "${result}"`)
      }
      if (expected.length !== result.length) {
        throw new BotiumError(`${this.header.name}/${convoStep.stepTag}: bot response expected array length ${expected.length}, got ${result.length}`)
      }
      for (let i = 0; i < expected.length; i++) {
        this._compareObject(container, scriptingMemory, convoStep, result[i], expected[i])
      }
    } else if (_.isObject(expected)) {
      _.forOwn(expected, (value, key) => {
        if (Object.prototype.hasOwnProperty.call(result, key)) {
          this._compareObject(container, scriptingMemory, convoStep, result[key], expected[key])
        } else {
          throw new BotiumError(`${this.header.name}/${convoStep.stepTag}: bot response "${result}" missing expected property: ${key}`)
        }
      })
    } else {
      ScriptingMemory.fill(container, scriptingMemory, result, expected, this.scriptingEvents)
      const response = this._checkNormalizeText(container, result)
      const tomatch = this._resolveUtterancesToMatch(container, scriptingMemory, expected, botMsg)
      this.scriptingEvents.assertBotResponse(response, tomatch, `${this.header.name}/${convoStep.stepTag}`)
    }
  }

  GetScriptingMemoryAllVariables (container) {
    const resultOuter = this.conversation.reduce((acc, convoStep) => {
      let result = acc
      result = result.concat(this.GetScriptingMemoryVariables(container, convoStep.messageText))
      const extractFromArgs = (convoStepItems) => {
        let resultInner = []
        for (const item of (convoStepItems || [])) {
          for (const arg of (item.args || [])) {
            resultInner = resultInner.concat(this.GetScriptingMemoryVariables(container, arg))
          }
        }
        return resultInner
      }
      result = result.concat(extractFromArgs(convoStep.asserters))
      result = result.concat(extractFromArgs(convoStep.logicHooks))
      result = result.concat(extractFromArgs(convoStep.userInputs))

      return result
    }, [])

    return [...new Set(resultOuter)]
  }

  GetScriptingMemoryVariables (container, utterance) {
    if (!utterance || !container.caps[Capabilities.SCRIPTING_ENABLE_MEMORY]) {
      return []
    }

    const utterances = this.scriptingEvents.resolveUtterance({ utterance })

    return utterances.reduce((acc, expected) => {
      if (_.isUndefined(expected)) return acc
      else return acc.concat(ScriptingMemory.extractVarNames(toString(expected)) || [])
    }, [])
  }

  _checkBotRepliesConsumed (container) {
    if (container.caps.SCRIPTING_FORCE_BOT_CONSUMED) {
      const queueLength = container._QueueLength()
      if (queueLength === 1) {
        throw new Error('There is an unread bot reply in queue')
      } else if (queueLength > 1) {
        throw new Error(`There are still ${queueLength} unread bot replies in queue`)
      }
    }
  }

  _resolveUtterancesToMatch (container, scriptingMemory, utterance, botMsg) {
    const utterances = this.scriptingEvents.resolveUtterance({ utterance })
    const normalizedUtterances = utterances.map(str => this._checkNormalizeText(container, str))
    const tomatch = normalizedUtterances.map(str => ScriptingMemory.apply(container, scriptingMemory, str, botMsg))
    return tomatch
  }

  _checkNormalizeText (container, str) {
    return normalizeText(str, !!container.caps[Capabilities.SCRIPTING_NORMALIZE_TEXT])
  }

  expandPartialConvos () {
    const _getIncludeLogicHookNames = (convoStep) => {
      if (!convoStep.logicHooks) {
        return []
      }

      const result = []
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

    const partialConvos = this.context.GetPartialConvos()

    const _getEffectiveConversationRecursive = (conversation, parentPConvos = [], result = [], ignoreBeginEnd = true) => {
      conversation.forEach((convoStep) => {
        let includeLogicHooks = []
        if (convoStep.sender === 'include') {
          if (convoStep.channel) {
            includeLogicHooks.push(convoStep.channel)
          }
          if (convoStep.messageText) {
            includeLogicHooks = includeLogicHooks.concat(splitStringInNonEmptyLines(convoStep.messageText))
          }
        } else {
          includeLogicHooks = _getIncludeLogicHookNames(convoStep)
          if (includeLogicHooks.length === 0 || convoStep.hasInteraction()) {
            if (!ignoreBeginEnd || (convoStep.sender !== 'begin' && convoStep.sender !== 'end')) {
              // dont put convo name for ConvoSteps on the root.
              const steptagPath = parentPConvos.length === 0 ? '' : parentPConvos.join('/') + '/'
              result.push(Object.assign(new ConvoStep(), convoStep, { stepTag: `${steptagPath}${convoStep.stepTag}` }))
            }
          }
        }

        includeLogicHooks.forEach((includeLogicHook) => {
          const alreadyThereAt = parentPConvos.indexOf(includeLogicHook)
          if (alreadyThereAt >= 0) {
            throw new BotiumError(`Partial convos are included circular. "${includeLogicHook}" is referenced by "/${parentPConvos.slice(0, alreadyThereAt).join('/')}" and by "/${parentPConvos.join('/')}" `)
          }
          if (!partialConvos || Object.keys(partialConvos).length === 0) {
            throw new BotiumError(`Cant find partial convo with name ${includeLogicHook} (There are no partial convos)`)
          }
          const partialConvo = partialConvos[includeLogicHook]
          if (!partialConvo) {
            throw new BotiumError(`Cant find partial convo with name ${includeLogicHook} (available partial convos: ${Object.keys(partialConvos).join(',')})`)
          }
          _getEffectiveConversationRecursive(partialConvo.conversation, [...parentPConvos, includeLogicHook], result, true)
          debug(`Partial convo ${includeLogicHook} included`)
        })
      })

      return result
    }

    this.conversation = _getEffectiveConversationRecursive(this.conversation, [], [], false)
  }
}

module
  .exports = {
    ConvoHeader,
    Convo,
    ConvoStep
  }
