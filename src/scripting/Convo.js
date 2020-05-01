const util = require('util')
const _ = require('lodash')
const debug = require('debug')('botium-Convo')

const BotiumMockMessage = require('../mocks/BotiumMockMessage')
const Capabilities = require('../Capabilities')
const Events = require('../Events')
const ScriptingMemory = require('./ScriptingMemory')
const { BotiumError, botiumErrorFromErr, botiumErrorFromList } = require('./BotiumError')
const { toString, removeBuffers } = require('./helper')

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
    this.not = fromJson.not
  }

  toString () {
    return (this.not ? '!' : '') + this.name + '(' + (this.args ? this.args.join(',') : 'no args') + ')'
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
      convoBegin: new Date(),
      convoEnd: null,
      err: null
    })
    const scriptingMemory = {}

    try {
      try {
        const effectiveConversation = this._getEffectiveConversation()
        this.originConversation = this.conversation
        this.conversation = effectiveConversation
      } catch (err) {
        transcript.err = err
        transcript.scriptingMemory = scriptingMemory
        transcript.convoEnd = new Date()
        throw new TranscriptError(err, transcript)
      }
      try {
        // onConvoBegin first or assertConvoBegin? If onConvoBegin, then it is possible to assert it too
        await this.scriptingEvents.onConvoBegin({ convo: this, container, scriptingMemory })
      } catch (err) {
        throw new TranscriptError(botiumErrorFromErr(`${this.header.name}: error begin handler - ${err.message}`, err), transcript)
      }
      try {
        await this.scriptingEvents.assertConvoBegin({ convo: this, container, scriptingMemory })
      } catch (err) {
        throw new TranscriptError(botiumErrorFromErr(`${this.header.name}: error begin handler - ${err.message}`, err), transcript)
      }
      await this.runConversation(container, scriptingMemory, transcript)
      if (transcript.err) {
        throw new TranscriptError(transcript.err, transcript)
      }
      try {
        // onConvoEnd first or assertConvoEnd? If onConvoEnd, then it is possible to assert it too
        await this.scriptingEvents.onConvoEnd({ convo: this, container, transcript, scriptingMemory: scriptingMemory })
      } catch (err) {
        throw new TranscriptError(botiumErrorFromErr(`${this.header.name}: error end handler - ${err.message}`, err), transcript)
      }
      try {
        await this.scriptingEvents.assertConvoEnd({ convo: this, container, transcript, scriptingMemory: scriptingMemory })
      } catch (err) {
        throw new TranscriptError(botiumErrorFromErr(`${this.header.name}: error end handler - ${err.message}`, err), transcript)
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
      for (const [currentStepIndex, convoStep] of this.conversation.entries()) {
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

        try {
          if (convoStep.sender === 'begin' || convoStep.sender === 'end') {
            continue
          } else if (convoStep.sender === 'me') {
            const meMsg = new BotiumMockMessage(convoStep)
            meMsg.messageText = ScriptingMemory.apply(container, scriptingMemory, meMsg.messageText)
            convoStep.messageText = meMsg.messageText
            transcriptStep.actual = meMsg

            try {
              await this.scriptingEvents.setUserInput({ convo: this, convoStep, container, scriptingMemory, meMsg, transcript: [...transcriptSteps] })
              await this.scriptingEvents.onMeStart({ convo: this, convoStep, container, scriptingMemory, meMsg })

              const coreMsg = _.omit(removeBuffers(meMsg), ['sourceData'])
              debug(`${this.header.name}/${convoStep.stepTag}: user says (cleaned by attachments and sourceData and media) ${JSON.stringify(coreMsg, null, 2)}`)
              await new Promise(resolve => {
                if (container.caps.SIMULATE_WRITING_SPEED && meMsg.messageText && meMsg.messageText.length) {
                  setTimeout(() => resolve(), container.caps.SIMULATE_WRITING_SPEED * meMsg.messageText.length)
                } else {
                  resolve()
                }
              })
              lastMeConvoStep = convoStep
              transcriptStep.botBegin = new Date()
              if (!_.isNull(meMsg.messageText) || meMsg.sourceData || (meMsg.userInputs && meMsg.userInputs.length)) {
                transcriptStep.botBegin = new Date()

                try {
                  Object.assign(meMsg, { conversation: this.conversation, currentStepIndex, scriptingMemory })
                  await container.UserSays(meMsg)
                } finally {
                  delete meMsg.conversation
                  delete meMsg.scriptingMemory
                }

                transcriptStep.botEnd = new Date()
                await this.scriptingEvents.onMeEnd({ convo: this, convoStep, container, scriptingMemory, meMsg })
                continue
              } else {
                debug(`${this.header.name}/${convoStep.stepTag}: message not found in #me section, message not sent to container ${util.inspect(convoStep)}`)
                await this.scriptingEvents.onMeEnd({ convo: this, convoStep, container, scriptingMemory, meMsg })
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
            let saysmsg = null
            try {
              debug(`${this.header.name} wait for bot ${convoStep.channel || ''}`)
              await this.scriptingEvents.onBotStart({ convo: this, convoStep, container, scriptingMemory })
              transcriptStep.botBegin = new Date()
              saysmsg = await container.WaitBotSays(convoStep.channel)
              transcriptStep.botEnd = new Date()
              transcriptStep.actual = new BotiumMockMessage(saysmsg)

              const coreMsg = _.omit(removeBuffers(saysmsg), ['sourceData'])
              debug(`${this.header.name}: bot says (cleaned by attachments and sourceData) ${JSON.stringify(coreMsg, null, 2)}`)
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

            if (!saysmsg || (!saysmsg.messageText && !saysmsg.media && !saysmsg.buttons && !saysmsg.cards && !saysmsg.sourceData && !saysmsg.nlp)) {
              const failErr = new BotiumError(`${this.header.name}/${convoStep.stepTag}: bot says nothing`)
              debug(failErr)
              try {
                this.scriptingEvents.fail && this.scriptingEvents.fail(failErr, lastMeConvoStep)
              } catch (failErr) {
              }
              throw failErr
            }
            const assertErrors = []
            const scriptingMemoryUpdate = {}
            if (convoStep.messageText) {
              const response = this._checkNormalizeText(container, saysmsg.messageText)
              const messageText = this._checkNormalizeText(container, convoStep.messageText)
              ScriptingMemory.fill(container, scriptingMemoryUpdate, response, messageText, this.scriptingEvents)
              const tomatch = this._resolveUtterancesToMatch(container, Object.assign({}, scriptingMemoryUpdate, scriptingMemory), messageText)
              if (convoStep.not) {
                try {
                  this.scriptingEvents.assertBotNotResponse(response, tomatch, `${this.header.name}/${convoStep.stepTag}`, lastMeConvoStep)
                } catch (err) {
                  if (container.caps[Capabilities.SCRIPTING_ENABLE_MULTIPLE_ASSERT_ERRORS]) {
                    assertErrors.push(err)
                  } else {
                    throw err
                  }
                }
              } else {
                try {
                  this.scriptingEvents.assertBotResponse(response, tomatch, `${this.header.name}/${convoStep.stepTag}`, lastMeConvoStep)
                } catch (err) {
                  if (container.caps[Capabilities.SCRIPTING_ENABLE_MULTIPLE_ASSERT_ERRORS]) {
                    assertErrors.push(err)
                  } else {
                    throw err
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
                  throw err
                }
              }
            }
            Object.assign(scriptingMemory, scriptingMemoryUpdate)
            try {
              await this.scriptingEvents.assertConvoStep({ convo: this, convoStep, container, scriptingMemory, botMsg: saysmsg })
              await this.scriptingEvents.onBotEnd({ convo: this, convoStep, container, scriptingMemory, botMsg: saysmsg })
            } catch (err) {
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
            } else {
              err.input = new ConvoStep(lastMeConvoStep)
            }
          }
          transcriptStep.err = err
          throw err
        } finally {
          if (convoStep.sender !== 'begin' && convoStep.sender !== 'end') {
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

  _compareObject (container, scriptingMemory, convoStep, result, expected) {
    if (expected === null || expected === undefined) return

    if (_.isArray(expected)) {
      if (!_.isArray(result)) {
        throw new BotiumError(`${this.header.name}/${convoStep.stepTag}: bot response expected array, got "${result}"`)
      }
      if (expected.length !== result.length) {
        throw new BotiumError(`${this.header.name}/${convoStep.stepTag}: bot response expected array length ${expected.length}, got ${result.length}`)
      }
      for (var i = 0; i < expected.length; i++) {
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
      if (_.isUndefined(expected)) return acc
      else return acc.concat(ScriptingMemory.extractVarNames(toString(expected)) || [])
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
            throw new BotiumError(`Partial convos are included circular. "${includeLogicHook}" is referenced by "/${parentPConvos.slice(0, alreadyThereAt).join('/')}" and by "/${parentPConvos.join('/')}" `)
          }
          const partialConvos = this.context.GetPartialConvos()
          if (!partialConvos || Object.keys(partialConvos).length === 0) {
            throw new BotiumError(`Cant find partial convo with name ${includeLogicHook} (There are no partial convos)`)
          }
          const partialConvo = partialConvos[includeLogicHook]
          if (!partialConvo) {
            throw new BotiumError(`Cant find partial convo with name ${includeLogicHook} (available partial convos: ${Object.keys(partialConvos).join(',')})`)
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
