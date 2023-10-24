const _ = require('lodash')
const { BotiumError } = require('../../BotiumError')
const { extractArgs, BOTIUM_RETRY_FAILED, BOTIUM_TEXT_MATCHING_MODE, BOTIUM_TEXT_MODE } = require('./Helper')
const RetryConvoStepHelper = require('./RetryConvoStepHelper')
const { getMatchFunction } = require('../../MatchFunctions')
const debug = require('debug')('botium-core-BaseTextAsserter')

module.exports = class BaseTextAsserter {
  constructor (context, caps = {}, matchFn, mode, noArgIsJoker) {
    this.context = context
    this.caps = caps
    this.matchFn = matchFn
    this.mode = mode
    this.noArgIsJoker = noArgIsJoker
    this.retryConvoStepHelper = new RetryConvoStepHelper()
  }

  _extractAll (args) {
    const { statArgs, dynArgs } = extractArgs(args, [BOTIUM_RETRY_FAILED, BOTIUM_TEXT_MATCHING_MODE, BOTIUM_TEXT_MODE])

    const matchingMode = dynArgs.BOTIUM_TEXT_MATCHING_MODE || this.globalArgs?.matchingMode
    const matchFn = matchingMode ? getMatchFunction(matchingMode) : this.context.Match

    let noArgIsJoker = this.noArgIsJoker
    if (_.isNil(noArgIsJoker) && matchingMode) {
      noArgIsJoker = matchingMode === 'equals' || matchingMode === 'equalsIgnoreCase'
    }

    const mode = dynArgs.BOTIUM_TEXT_MODE || this.globalArgs?.mode || this.mode
    return { statArgs, dynArgs, matchingMode, matchFn, noArgIsJoker, mode }
  }

  _evalText (convo, args, botMsg, noArgIsJoker, matchFn, mode) {
    let allUtterances = []
    if (noArgIsJoker && (!args || args.length === 0)) {
      return { found: (botMsg.messageText.length > 0), allUtterances: [], founds: [], notFounds: [] }
    }
    for (const arg of args) {
      const utterances = convo.scriptingEvents.resolveUtterance({ utterance: arg })
      allUtterances = allUtterances.concat(utterances)
    }
    const founds = []
    const notFounds = []
    for (const utterance of allUtterances) {
      (matchFn(botMsg, utterance) ? founds : notFounds).push(utterance)
    }
    return { found: (mode === 'all' ? notFounds.length === 0 : founds.length > 0), allUtterances, founds, notFounds }
  }

  assertNotConvoStep ({ convo, convoStep, args, botMsg, transcriptStep }) {
    const { statArgs, dynArgs, matchFn, noArgIsJoker, mode } = this._extractAll(args)

    if ((statArgs && statArgs.length > 0) || noArgIsJoker) {
      const { found, allUtterances, founds } = this._evalText(convo, statArgs, botMsg, noArgIsJoker, matchFn, mode)
      if (found) {
        const { timeoutRemaining, timeout } = this.retryConvoStepHelper.check({ dynArgs, convoStep, transcriptStep })
        if (timeoutRemaining) {
          debug(`Retrying failed convostep "${convoStep.stepTag}" because assertation error. Timeout remaining: ${timeoutRemaining}. Expected not: ${JSON.stringify(allUtterances)}`)
          return Promise.resolve()
        } else if (!statArgs || statArgs.length === 0) {
          return Promise.reject(new BotiumError(
            `${convoStep.stepTag}: Expected empty text in response ${timeout ? (' using retries with ' + timeout + 'ms timeout') : ''}`,
            {
              type: 'asserter',
              source: this.name,
              params: {
                args
              },
              cause: {
                not: true,
                expected: allUtterances,
                actual: botMsg
              }
            }
          ))
        }
        return Promise.reject(new BotiumError(
          `${convoStep.stepTag}: Not expected ${mode === 'all' ? 'text(s)' : 'any text'} "${founds}" in response containing message "${botMsg.messageText || 'N/A'}"${timeout ? (' using retries with ' + timeout + 'ms timeout') : ''}`,
          {
            type: 'asserter',
            source: this.name,
            params: {
              args
            },
            cause: {
              not: true,
              expected: allUtterances,
              actual: botMsg
            }
          }
        ))
      }
    }
    return Promise.resolve()
  }

  assertConvoStep ({ convo, convoStep, args, botMsg, transcriptStep }) {
    const { statArgs, dynArgs, matchFn, noArgIsJoker, mode } = this._extractAll(args)

    if ((statArgs && statArgs.length > 0) || noArgIsJoker) {
      const { found, allUtterances, notFounds } = this._evalText(convo, statArgs, botMsg, noArgIsJoker, matchFn, mode)
      if (!found) {
        const { timeoutRemaining, timeout } = this.retryConvoStepHelper.check({ dynArgs, convoStep, transcriptStep })
        if (timeoutRemaining) {
          debug(`Retrying failed convostep "${convoStep.stepTag}" because assertation error. Timeout remaining: ${timeoutRemaining}. Expected: ${JSON.stringify(allUtterances)}`)
          return Promise.resolve()
        } else if (!statArgs || statArgs.length === 0) {
          return Promise.reject(new BotiumError(
            `${convoStep.stepTag}: Expected not empty text in response ${timeout ? (' using retries with ' + timeout + 'ms timeout') : ''}`,
            {
              type: 'asserter',
              source: this.name,
              params: {
                args
              },
              cause: {
                not: false,
                expected: allUtterances,
                actual: botMsg
              }
            }
          ))
        }
        return Promise.reject(new BotiumError(
          `${convoStep.stepTag}: Expected ${mode === 'all' ? 'text(s)' : 'any text'} "${notFounds}" in response containing message "${botMsg.messageText || 'N/A'}"${timeout ? (' using retries with ' + timeout + 'ms timeout') : ''}`,
          {
            type: 'asserter',
            source: this.name,
            params: {
              args
            },
            cause: {
              not: false,
              expected: allUtterances,
              actual: botMsg
            }
          }
        ))
      }
    }
    return Promise.resolve()
  }
}
