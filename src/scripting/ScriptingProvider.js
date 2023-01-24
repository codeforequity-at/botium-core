const LogicHookUtils = require('./logichook/LogicHookUtils')
const util = require('util')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const globby = require('globby')
const _ = require('lodash')
const randomize = require('randomatic')
const promiseRetry = require('promise-retry')
require('promise.allsettled').shim()
const debug = require('debug')('botium-core-ScriptingProvider')

const Constants = require('./Constants')
const Capabilities = require('../Capabilities')
const Defaults = require('../Defaults')
const { Convo, ConvoStep } = require('./Convo')
const ScriptingMemory = require('./ScriptingMemory')
const { BotiumError, botiumErrorFromList, botiumErrorFromErr } = require('./BotiumError')
const RetryHelper = require('../helpers/RetryHelper')
const { getMatchFunction } = require('./MatchFunctions')
const precompilers = require('./precompilers')

const globPattern = '**/+(*.convo.txt|*.utterances.txt|*.pconvo.txt|*.scriptingmemory.txt|*.xlsx|*.xlsm|*.convo.csv|*.pconvo.csv|*.utterances.csv|*.yaml|*.yml|*.json|*.md|*.markdown)'
const skipPattern = /^skip[.\-_]/i

const p = (retryHelper, fn) => {
  const promise = () => new Promise((resolve, reject) => {
    try {
      resolve(fn())
    } catch (err) {
      reject(err)
    }
  })

  if (retryHelper) {
    return promiseRetry((retry, number) => {
      return promise().catch(err => {
        if (retryHelper.shouldRetry(err)) {
          debug(`Asserter trial #${number} failed, retry activated`)
          retry(err)
        } else {
          throw err
        }
      })
    }, retryHelper.retrySettings)
  } else {
    return promise()
  }
}

const pnot = (retryHelper, fn, errTemplate) => {
  const promise = () => new Promise(async (resolve, reject) => { // eslint-disable-line no-async-promise-executor
    try {
      await fn()
      reject(errTemplate)
    } catch (err) {
      resolve()
    }
  })

  if (retryHelper) {
    return promiseRetry((retry, number) => {
      return promise().catch(() => {
        if (retryHelper.shouldRetry(errTemplate)) {
          debug(`Asserter trial #${number} failed, !retry activated`)
          retry(errTemplate)
        } else {
          throw errTemplate
        }
      })
    }, retryHelper.retrySettings)
  } else {
    return promise()
  }
}

module.exports = class ScriptingProvider {
  constructor (caps) {
    this.caps = caps || _.cloneDeep(Defaults.Capabilities)
    this.compilers = {}
    this.convos = []
    this.utterances = {}
    this.matchFn = null
    this.asserters = {}
    this.globalAsserter = {}
    this.logicHooks = {}
    this.globalLogicHook = {}
    this.userInputs = {}
    this.partialConvos = {}
    this.scriptingMemories = []

    this.scriptingEvents = {
      onConvoBegin: ({ convo, convoStep, scriptingMemory, ...rest }) => {
        return this._createLogicHookPromises({ hookType: 'onConvoBegin', logicHooks: (convo.beginLogicHook || []), convo, convoStep, scriptingMemory, ...rest })
      },
      onConvoEnd: ({ convo, convoStep, scriptingMemory, ...rest }) => {
        return this._createLogicHookPromises({ hookType: 'onConvoEnd', logicHooks: (convo.endLogicHook || []), convo, convoStep, scriptingMemory, ...rest })
      },
      onMeStart: ({ convo, convoStep, scriptingMemory, ...rest }) => {
        return this._createLogicHookPromises({ hookType: 'onMeStart', logicHooks: (convoStep.logicHooks || []), convo, convoStep, scriptingMemory, ...rest })
      },
      onMePrepare: ({ convo, convoStep, scriptingMemory, ...rest }) => {
        return this._createLogicHookPromises({ hookType: 'onMePrepare', logicHooks: (convoStep.logicHooks || []), convo, convoStep, scriptingMemory, ...rest })
      },
      onMeEnd: ({ convo, convoStep, scriptingMemory, ...rest }) => {
        return this._createLogicHookPromises({ hookType: 'onMeEnd', logicHooks: (convoStep.logicHooks || []), convo, convoStep, scriptingMemory, ...rest })
      },
      onBotStart: ({ convo, convoStep, scriptingMemory, ...rest }) => {
        return this._createLogicHookPromises({ hookType: 'onBotStart', logicHooks: (convoStep.logicHooks || []), convo, convoStep, scriptingMemory, ...rest })
      },
      onBotPrepare: ({ convo, convoStep, scriptingMemory, ...rest }) => {
        return this._createLogicHookPromises({ hookType: 'onBotPrepare', logicHooks: (convoStep.logicHooks || []), convo, convoStep, scriptingMemory, ...rest })
      },
      onBotEnd: ({ convo, convoStep, scriptingMemory, ...rest }) => {
        return this._createLogicHookPromises({ hookType: 'onBotEnd', logicHooks: (convoStep.logicHooks || []), convo, convoStep, scriptingMemory, ...rest })
      },
      assertConvoBegin: ({ convo, convoStep, scriptingMemory, ...rest }) => {
        return this._createAsserterPromises({ asserterType: 'assertConvoBegin', asserters: (convo.beginAsserter || []), convo, convoStep, scriptingMemory, ...rest })
      },
      assertConvoStep: ({ convo, convoStep, scriptingMemory, ...rest }) => {
        return this._createAsserterPromises({ asserterType: 'assertConvoStep', asserters: (convoStep.asserters || []), convo, convoStep, scriptingMemory, ...rest })
      },
      assertConvoEnd: ({ convo, convoStep, scriptingMemory, ...rest }) => {
        return this._createAsserterPromises({ asserterType: 'assertConvoEnd', asserters: (convo.endAsserter || []), convo, convoStep, scriptingMemory, ...rest })
      },
      setUserInput: ({ convo, convoStep, scriptingMemory, ...rest }) => {
        return this._createUserInputPromises({ convo, convoStep, scriptingMemory, ...rest })
      },
      resolveUtterance: ({ utterance, resolveEmptyIfUnknown }) => {
        return this._resolveUtterance({ utterance, resolveEmptyIfUnknown })
      },
      assertBotResponse: (botresponse, tomatch, stepTag, meMsg) => {
        if (!_.isArray(tomatch)) {
          tomatch = [tomatch]
        }
        debug(`assertBotResponse ${stepTag} ${meMsg ? `(${meMsg}) ` : ''}BOT: ${botresponse} = ${tomatch} ...`)
        const found = _.find(tomatch, (utt) => this.matchFn(botresponse, utt, this.caps[Capabilities.SCRIPTING_MATCHING_MODE_ARGS]))
        const asserterType = this.caps[Capabilities.SCRIPTING_MATCHING_MODE] === 'wer' ? 'Word Error Rate Asserter' : 'Text Match Asserter'
        if (_.isNil(found)) {
          let message = `${stepTag}: Bot response `
          message += meMsg ? `(on ${meMsg}) ` : ''
          message += botresponse ? ('"' + botresponse + '"') : '<no response>'
          message += ' expected to match '
          message += tomatch && tomatch.length > 1 ? 'one of ' : ''
          message += `${tomatch.map(e => e ? '"' + e + '"' : '<any response>').join(', ')}`
          throw new BotiumError(
            message,
            {
              type: 'asserter',
              source: asserterType,
              params: {
                matchingMode: this.caps[Capabilities.SCRIPTING_MATCHING_MODE],
                args: this.caps[Capabilities.SCRIPTING_MATCHING_MODE_ARGS] || null
              },
              context: {
                stepTag
              },
              cause: {
                expected: tomatch,
                actual: botresponse,
                matchingMode: this.caps[Capabilities.SCRIPTING_MATCHING_MODE],
                args: this.caps[Capabilities.SCRIPTING_MATCHING_MODE_ARGS] || null
              }
            }
          )
        }
      },
      assertBotNotResponse: (botresponse, nottomatch, stepTag, meMsg) => {
        if (!_.isArray(nottomatch)) {
          nottomatch = [nottomatch]
        }
        debug(`assertBotNotResponse ${stepTag} ${meMsg ? `(${meMsg}) ` : ''}BOT: ${botresponse} != ${nottomatch} ...`)
        const found = _.find(nottomatch, (utt) => this.matchFn(botresponse, utt, this.caps[Capabilities.SCRIPTING_MATCHING_MODE_ARGS]))
        const asserterType = this.caps[Capabilities.SCRIPTING_MATCHING_MODE] === 'wer' ? 'Word Error Rate Asserter' : 'Text Match Asserter'
        if (!_.isNil(found)) {
          let message = `${stepTag}: Bot response `
          message += meMsg ? `(on ${meMsg}) ` : ''
          message += botresponse ? ('"' + botresponse + '"') : '<no response>'
          message += ' expected NOT to match '
          message += nottomatch && nottomatch.length > 1 ? 'one of ' : ''
          message += `${nottomatch.map(e => e ? '"' + e + '"' : '<any response>').join(', ')}`
          throw new BotiumError(
            message,
            {
              type: 'asserter',
              source: asserterType,
              params: {
                matchingMode: this.caps[Capabilities.SCRIPTING_MATCHING_MODE],
                args: this.caps[Capabilities.SCRIPTING_MATCHING_MODE_ARGS] || null
              },
              context: {
                stepTag
              },
              cause: {
                not: true,
                expected: nottomatch,
                actual: botresponse,
                matchingMode: this.caps[Capabilities.SCRIPTING_MATCHING_MODE],
                args: this.caps[Capabilities.SCRIPTING_MATCHING_MODE_ARGS] || null
              }
            }
          )
        }
      },
      fail: null
    }
    this.retryHelperAsserter = new RetryHelper(this.caps, 'ASSERTER')
    this.retryHelperLogicHook = new RetryHelper(this.caps, 'LOGICHOOK')
    this.retryHelperUserInput = new RetryHelper(this.caps, 'USERINPUT')
  }

  _createAsserterPromises ({ asserterType, asserters, convo, convoStep, scriptingMemory, container, ...rest }) {
    if (!this._isValidAsserterType(asserterType)) {
      throw Error(`Unknown asserterType ${asserterType}`)
    }

    const mapNot = {
      assertConvoBegin: 'assertNotConvoBegin',
      assertConvoStep: 'assertNotConvoStep',
      assertConvoEnd: 'assertNotConvoEnd'
    }
    const callAsserter = (asserterSpec, asserter, params) => {
      if (asserterSpec.not) {
        const notAsserterType = mapNot[asserterType]
        if (asserter[notAsserterType]) {
          return p(this.retryHelperAsserter, () => asserter[notAsserterType](params))
        } else {
          return pnot(this.retryHelperAsserter, () => asserter[asserterType](params),
            new BotiumError(
              `${convoStep.stepTag}: Expected asserter ${asserter.name || asserterSpec.name} with args "${params.args}" to fail`,
              {
                type: 'asserter',
                source: asserter.name || asserterSpec.name,
                params: {
                  args: params.args
                },
                cause: {
                  not: true,
                  expected: 'failed',
                  actual: 'not failed'
                }
              }
            )
          )
        }
      } else {
        return p(this.retryHelperAsserter, () => asserter[asserterType](params))
      }
    }

    const convoAsserter = asserters
      .filter(a => this.asserters[a.name][asserterType])
      .map(a => callAsserter(a, this.asserters[a.name], {
        convo,
        convoStep,
        scriptingMemory,
        container,
        args: ScriptingMemory.applyToArgs(a.args, scriptingMemory, container.caps, rest.botMsg),
        isGlobal: false,
        ...rest
      }))
    const globalAsserter = Object.values(this.globalAsserter)
      .filter(a => a[asserterType])
      .map(a => p(this.retryHelperAsserter, () => a[asserterType]({ convo, convoStep, scriptingMemory, container, args: [], isGlobal: true, ...rest })))

    const allPromises = [...convoAsserter, ...globalAsserter]
    if (this.caps[Capabilities.SCRIPTING_ENABLE_MULTIPLE_ASSERT_ERRORS]) {
      return Promise.allSettled(allPromises).then((results) => {
        const rejected = results.filter(result => result.status === 'rejected').map(result => result.reason)
        if (rejected.length) {
          throw botiumErrorFromList(rejected, {})
        }
        return results.filter(result => result.status === 'fulfilled').map(result => result.value)
      })
    }
    if (allPromises.length > 0) return Promise.all(allPromises).then(() => true)
    return Promise.resolve(false)
  }

  _createLogicHookPromises ({ hookType, logicHooks, convo, convoStep, scriptingMemory, container, ...rest }) {
    if (hookType !== 'onMeStart' && hookType !== 'onMePrepare' && hookType !== 'onMeEnd' && hookType !== 'onBotStart' && hookType !== 'onBotPrepare' && hookType !== 'onBotEnd' &&
      hookType !== 'onConvoBegin' && hookType !== 'onConvoEnd'
    ) {
      throw Error(`Unknown hookType ${hookType}`)
    }

    const convoStepPromises = (logicHooks || [])
      .filter(l => this.logicHooks[l.name][hookType])
      .map(l => p(this.retryHelperLogicHook, () => this.logicHooks[l.name][hookType]({
        convo,
        convoStep,
        scriptingMemory,
        container,
        args: ScriptingMemory.applyToArgs(l.args, scriptingMemory, container.caps, rest.botMsg),
        isGlobal: false,
        ...rest
      })))

    const globalPromises = Object.values(this.globalLogicHook)
      .filter(l => l[hookType])
      .map(l => p(this.retryHelperLogicHook, () => l[hookType]({ convo, convoStep, scriptingMemory, container, args: [], isGlobal: true, ...rest })))

    const allPromises = [...convoStepPromises, ...globalPromises]
    if (allPromises.length > 0) return Promise.all(allPromises).then(() => true)
    return Promise.resolve(false)
  }

  _createUserInputPromises ({ convo, convoStep, scriptingMemory, container, ...rest }) {
    const convoStepPromises = (convoStep.userInputs || [])
      .filter(ui => this.userInputs[ui.name])
      .map(ui => p(this.retryHelperUserInput, () => this.userInputs[ui.name].setUserInput({
        convo,
        convoStep,
        scriptingMemory,
        container,
        args: ScriptingMemory.applyToArgs(ui.args, scriptingMemory, container.caps, rest.meMsg),
        ...rest
      })))

    if (convoStepPromises.length > 0) return Promise.all(convoStepPromises).then(() => true)
    return Promise.resolve(false)
  }

  _isValidAsserterType (asserterType) {
    return ['assertConvoBegin', 'assertConvoStep', 'assertConvoEnd'].some(t => asserterType === t)
  }

  _resolveUtterance ({ utterance, resolveEmptyIfUnknown = false }) {
    if (_.isString(utterance)) {
      if (this.utterances[utterance]) {
        return this.utterances[utterance].utterances
      } else {
        const parts = utterance.split(' ')
        if (this.utterances[parts[0]]) {
          const uttArgs = parts.slice(1)
          return this.utterances[parts[0]].utterances.map(utt => util.format(utt, ...uttArgs))
        }
      }
    }
    if (resolveEmptyIfUnknown) return null
    else return [utterance]
  }

  _buildScriptContext () {
    return {
      AddConvos: this.AddConvos.bind(this),
      AddUtterances: this.AddUtterances.bind(this),
      AddPartialConvos: this.AddPartialConvos.bind(this),
      AddScriptingMemories: this.AddScriptingMemories.bind(this),
      Match: this.Match.bind(this),
      IsAsserterValid: this.IsAsserterValid.bind(this),
      IsLogicHookValid: this.IsLogicHookValid.bind(this),
      IsUserInputValid: this.IsUserInputValid.bind(this),
      GetPartialConvos: this.GetPartialConvos.bind(this),
      scriptingEvents: {
        assertConvoBegin: this.scriptingEvents.assertConvoBegin.bind(this),
        assertConvoStep: this.scriptingEvents.assertConvoStep.bind(this),
        assertConvoEnd: this.scriptingEvents.assertConvoEnd.bind(this),
        resolveUtterance: this.scriptingEvents.resolveUtterance.bind(this),
        assertBotResponse: this.scriptingEvents.assertBotResponse.bind(this),
        assertBotNotResponse: this.scriptingEvents.assertBotNotResponse.bind(this),
        onConvoBegin: this.scriptingEvents.onConvoBegin.bind(this),
        onConvoEnd: this.scriptingEvents.onConvoEnd.bind(this),
        onMeStart: this.scriptingEvents.onMeStart.bind(this),
        onMePrepare: this.scriptingEvents.onMePrepare.bind(this),
        onMeEnd: this.scriptingEvents.onMeEnd.bind(this),
        onBotStart: this.scriptingEvents.onBotStart.bind(this),
        onBotPrepare: this.scriptingEvents.onBotPrepare.bind(this),
        onBotEnd: this.scriptingEvents.onBotEnd.bind(this),
        setUserInput: this.scriptingEvents.setUserInput.bind(this),
        fail: this.scriptingEvents.fail && this.scriptingEvents.fail.bind(this)
      }
    }
  }

  Build () {
    const CompilerXlsx = require('./CompilerXlsx')
    this.compilers[Constants.SCRIPTING_FORMAT_XSLX] = new CompilerXlsx(this._buildScriptContext(), this.caps)
    this.compilers[Constants.SCRIPTING_FORMAT_XSLX].Validate()
    const CompilerTxt = require('./CompilerTxt')
    this.compilers[Constants.SCRIPTING_FORMAT_TXT] = new CompilerTxt(this._buildScriptContext(), this.caps)
    this.compilers[Constants.SCRIPTING_FORMAT_TXT].Validate()
    const CompilerCsv = require('./CompilerCsv')
    this.compilers[Constants.SCRIPTING_FORMAT_CSV] = new CompilerCsv(this._buildScriptContext(), this.caps)
    this.compilers[Constants.SCRIPTING_FORMAT_CSV].Validate()
    const CompilerYaml = require('./CompilerYaml')
    this.compilers[Constants.SCRIPTING_FORMAT_YAML] = new CompilerYaml(this._buildScriptContext(), this.caps)
    this.compilers[Constants.SCRIPTING_FORMAT_YAML].Validate()
    const CompilerJson = require('./CompilerJson')
    this.compilers[Constants.SCRIPTING_FORMAT_JSON] = new CompilerJson(this._buildScriptContext(), this.caps)
    this.compilers[Constants.SCRIPTING_FORMAT_JSON].Validate()
    const CompilerMarkdown = require('./CompilerMarkdown')
    this.compilers[Constants.SCRIPTING_FORMAT_MARKDOWN] = new CompilerMarkdown(this._buildScriptContext(), this.caps)
    this.compilers[Constants.SCRIPTING_FORMAT_MARKDOWN].Validate()

    this.matchFn = getMatchFunction(this.caps[Capabilities.SCRIPTING_MATCHING_MODE])

    const logicHookUtils = new LogicHookUtils({ buildScriptContext: this._buildScriptContext(), caps: this.caps })
    this.asserters = logicHookUtils.asserters
    this.globalAsserter = logicHookUtils.getGlobalAsserter()
    this.logicHooks = logicHookUtils.logicHooks
    this.globalLogicHook = logicHookUtils.getGlobalLogicHook()
    this.userInputs = logicHookUtils.userInputs
  }

  IsAsserterValid (name) {
    return this.asserters[name] || false
  }

  IsLogicHookValid (name) {
    return this.logicHooks[name] || false
  }

  IsUserInputValid (name) {
    return this.userInputs[name] || false
  }

  Match (botresponse, utterance) {
    return this.matchFn(botresponse, utterance, this.caps[Capabilities.SCRIPTING_MATCHING_MODE_ARGS])
  }

  Compile (scriptBuffer, scriptFormat, scriptType) {
    const compiler = this.GetCompiler(scriptFormat)
    return compiler.Compile(scriptBuffer, scriptType)
  }

  Decompile (convos, scriptFormat) {
    const compiler = this.GetCompiler(scriptFormat)
    return compiler.Decompile(convos)
  }

  GetCompiler (scriptFormat) {
    const result = this.compilers[scriptFormat]
    if (result) return result
    throw new Error(`No compiler found for scriptFormat ${scriptFormat}`)
  }

  ReadBotiumFilesFromDirectory (convoDir, globFilter) {
    const filelist = globby.sync(globPattern, { cwd: convoDir, gitignore: true })
    if (globFilter) {
      const filelistGlobbed = globby.sync(globFilter, { cwd: convoDir, gitignore: true })
      _.remove(filelist, (file) => filelistGlobbed.indexOf(file) < 0)
    }
    _.remove(filelist, (file) => {
      const isSkip = skipPattern.test(path.basename(file))
      if (isSkip) debug(`ReadBotiumFilesFromDirectory - skipping file '${file}'`)
      return isSkip
    })
    return filelist
  }

  ReadScriptsFromDirectory (convoDir, globFilter) {
    let filelist = []

    const convoDirStats = fs.statSync(convoDir)
    if (convoDirStats.isFile()) {
      filelist = [path.basename(convoDir)]
      convoDir = path.dirname(convoDir)
    } else {
      filelist = this.ReadBotiumFilesFromDirectory(convoDir, globFilter)
    }
    debug(`ReadConvosFromDirectory(${convoDir}) found filenames: ${filelist}`)

    const dirConvos = []
    const dirUtterances = []
    const dirPartialConvos = []
    const dirScriptingMemories = []
    filelist.forEach((filename) => {
      const { convos, utterances, pconvos, scriptingMemories } = this.ReadScript(convoDir, filename)
      if (convos) dirConvos.push(...convos)
      if (utterances) dirUtterances.push(...utterances)
      if (pconvos) dirPartialConvos.push(...pconvos)
      if (scriptingMemories) dirScriptingMemories.push(...scriptingMemories)
    })
    debug(`ReadConvosFromDirectory(${convoDir}) found convos:\n ${dirConvos.length ? dirConvos.join('\n') : 'none'}`)
    debug(`ReadConvosFromDirectory(${convoDir}) found utterances:\n ${dirUtterances.length ? _.map(dirUtterances, (u) => u).join('\n') : 'none'}`)
    debug(`ReadConvosFromDirectory(${convoDir}) found partial convos:\n ${dirPartialConvos.length ? dirPartialConvos.join('\n') : 'none'}`)
    debug(`ReadConvosFromDirectory(${convoDir}) scripting memories:\n ${dirScriptingMemories.length ? dirScriptingMemories.map((dirScriptingMemory) => util.inspect(dirScriptingMemory)).join('\n') : 'none'}`)
    return { convos: dirConvos, utterances: dirUtterances, pconvos: dirPartialConvos, scriptingMemories: dirScriptingMemories }
  }

  ReadScriptFromBuffer (scriptBuffer, scriptingFormat, scriptingTypes = null) {
    if (_.isString(scriptingTypes)) scriptingTypes = [scriptingTypes]
    if (_.isArray(scriptingTypes) && scriptingTypes.length === 0) scriptingTypes = null

    const result = {
      convos: [],
      utterances: [],
      pconvos: [],
      scriptingMemories: []
    }
    if (!scriptingTypes || scriptingTypes.includes(Constants.SCRIPTING_TYPE_UTTERANCES)) {
      result.utterances = this.Compile(scriptBuffer, scriptingFormat, Constants.SCRIPTING_TYPE_UTTERANCES)
    }
    if (!scriptingTypes || scriptingTypes.includes(Constants.SCRIPTING_TYPE_PCONVO)) {
      result.pconvos = this.Compile(scriptBuffer, scriptingFormat, Constants.SCRIPTING_TYPE_PCONVO)
    }
    if (!scriptingTypes || scriptingTypes.includes(Constants.SCRIPTING_TYPE_CONVO)) {
      result.convos = this.Compile(scriptBuffer, scriptingFormat, Constants.SCRIPTING_TYPE_CONVO)
    }
    if (!scriptingTypes || scriptingTypes.includes(Constants.SCRIPTING_TYPE_SCRIPTING_MEMORY)) {
      result.scriptingMemories = this.Compile(scriptBuffer, scriptingFormat, Constants.SCRIPTING_TYPE_SCRIPTING_MEMORY)
    }
    return result
  }

  ReadScript (convoDir, filename) {
    let result = {}

    try {
      let scriptBuffer = fs.readFileSync(path.resolve(convoDir, filename))

      const precompResponse = precompilers.execute(scriptBuffer, {
        convoDir,
        filename,
        caps: this.caps
      })
      if (precompResponse) {
        scriptBuffer = precompResponse.scriptBuffer
        debug(`File ${filename} precompiled by ${precompResponse.precompiler}` +
          (precompResponse.filename ? ` and filename changed to ${precompResponse.filename}` : '')
        )
        filename = precompResponse.filename || filename
      }

      if (filename.endsWith('.xlsx') || filename.endsWith('.xlsm')) {
        result = this.ReadScriptFromBuffer(scriptBuffer, Constants.SCRIPTING_FORMAT_XSLX, [Constants.SCRIPTING_TYPE_UTTERANCES, Constants.SCRIPTING_TYPE_PCONVO, Constants.SCRIPTING_TYPE_CONVO, Constants.SCRIPTING_TYPE_SCRIPTING_MEMORY])
      } else if (filename.endsWith('.convo.txt')) {
        result = this.ReadScriptFromBuffer(scriptBuffer, Constants.SCRIPTING_FORMAT_TXT, Constants.SCRIPTING_TYPE_CONVO)
      } else if (filename.endsWith('.pconvo.txt')) {
        result = this.ReadScriptFromBuffer(scriptBuffer, Constants.SCRIPTING_FORMAT_TXT, Constants.SCRIPTING_TYPE_PCONVO)
      } else if (filename.endsWith('.utterances.txt')) {
        result = this.ReadScriptFromBuffer(scriptBuffer, Constants.SCRIPTING_FORMAT_TXT, Constants.SCRIPTING_TYPE_UTTERANCES)
      } else if (filename.endsWith('.scriptingmemory.txt')) {
        result = this.ReadScriptFromBuffer(scriptBuffer, Constants.SCRIPTING_FORMAT_TXT, Constants.SCRIPTING_TYPE_SCRIPTING_MEMORY)
      } else if (filename.endsWith('.convo.csv')) {
        result = this.ReadScriptFromBuffer(scriptBuffer, Constants.SCRIPTING_FORMAT_CSV, Constants.SCRIPTING_TYPE_CONVO)
      } else if (filename.endsWith('.pconvo.csv')) {
        result = this.ReadScriptFromBuffer(scriptBuffer, Constants.SCRIPTING_FORMAT_CSV, Constants.SCRIPTING_TYPE_PCONVO)
      } else if (filename.endsWith('.pconvo.csv')) {
        result = this.ReadScriptFromBuffer(scriptBuffer, Constants.SCRIPTING_FORMAT_CSV, Constants.SCRIPTING_TYPE_PCONVO)
      } else if (filename.endsWith('.utterance.csv')) {
        result = this.ReadScriptFromBuffer(scriptBuffer, Constants.SCRIPTING_FORMAT_CSV, Constants.SCRIPTING_TYPE_UTTERANCES)
      } else if (filename.endsWith('.yaml') || filename.endsWith('.yml')) {
        result = this.ReadScriptFromBuffer(scriptBuffer, Constants.SCRIPTING_FORMAT_YAML, [Constants.SCRIPTING_TYPE_UTTERANCES, Constants.SCRIPTING_TYPE_PCONVO, Constants.SCRIPTING_TYPE_CONVO, Constants.SCRIPTING_TYPE_SCRIPTING_MEMORY])
      } else if (filename.endsWith('.json')) {
        result = this.ReadScriptFromBuffer(scriptBuffer, Constants.SCRIPTING_FORMAT_JSON, [Constants.SCRIPTING_TYPE_UTTERANCES, Constants.SCRIPTING_TYPE_PCONVO, Constants.SCRIPTING_TYPE_CONVO, Constants.SCRIPTING_TYPE_SCRIPTING_MEMORY])
      } else if (filename.endsWith('.markdown') || filename.endsWith('.md')) {
        result = this.ReadScriptFromBuffer(scriptBuffer, Constants.SCRIPTING_FORMAT_MARKDOWN, [Constants.SCRIPTING_TYPE_UTTERANCES, Constants.SCRIPTING_TYPE_PCONVO, Constants.SCRIPTING_TYPE_CONVO])
      } else {
        debug(`ReadScript - dropped file: ${filename}, filename not supported`)
      }
    } catch (err) {
      debug(`ReadScript - an error occurred at '${filename}' file: ${err}`)
      throw botiumErrorFromErr(`ReadScript - an error occurred at '${filename}' file: ${err.message}`, err)
    }

    // Compilers saved the convos, and we alter here the saved version too
    if (result.convos && result.convos.length > 0) {
      result.convos.forEach((fileConvo) => {
        fileConvo.sourceTag = { convoDir, filename }
        if (!fileConvo.header.name) {
          fileConvo.header.name = filename
        }
      })
      const isSkip = (c) => c.header.name && skipPattern.test(c.header.name.toLowerCase())
      result.convos.filter(c => isSkip(c)).forEach(c => debug(`ReadScript - skipping convo '${c.header.name}'`))
      result.convos = result.convos.filter(c => !isSkip(c))
    }
    if (result.pconvos && result.pconvos.length > 0) {
      result.pconvos.forEach((filePartialConvo) => {
        filePartialConvo.sourceTag = { convoDir, filename }
        if (!filePartialConvo.header.name) {
          filePartialConvo.header.name = filename
        }
      })
    }
    if (result.scriptingMemories && result.scriptingMemories.length > 0) {
      result.scriptingMemories.forEach((scriptingMemory) => {
        scriptingMemory.sourceTag = { filename }
      })
    }
    if (result.utterances) {
      result.utterances = this._tagAndCleanupUtterances(result.utterances, convoDir, filename)
    }
    return { convos: result.convos || [], utterances: result.utterances || [], pconvos: result.pconvos || [], scriptingMemories: result.scriptingMemories || [] }
  }

  _tagAndCleanupUtterances (utteranceFiles, convoDir, filename) {
    return utteranceFiles.map((fileUtt) => {
      fileUtt.sourceTag = { convoDir, filename }
      fileUtt.utterances = fileUtt.utterances.filter(u => u)
      return fileUtt
    })
  }

  ExpandScriptingMemoryToConvos () {
    if (!this.caps[Capabilities.SCRIPTING_ENABLE_MEMORY]) {
      debug('ExpandScriptingMemoryToConvos - Scripting memory turned off, no convos expanded')
      return
    }

    // validating scripting memory without name
    const aggregatedNoNames = this.scriptingMemories.filter((entry) => {
      return !entry.header.name
    })
    if (aggregatedNoNames.length) {
      throw new BotiumError(
        'Scripting Memory Definition(s) without name',
        {
          type: 'Scripting Memory',
          subtype: 'Scripting Memory without name',
          source: 'ScriptingProvider',
          cause: {
            aggregatedNoNames
          }
        }
      )
    }

    // validating scripting memory without variable
    const aggregatedNoVariables = this.scriptingMemories.filter((entry) => {
      return !entry.values || !Object.keys(entry.values).length
    })
    if (aggregatedNoVariables.length) {
      throw new BotiumError(
        `Scripting Memory Definition(s) ${aggregatedNoVariables.map(e => e.header.name).join(', ')} without variable`,
        {
          type: 'Scripting Memory',
          subtype: 'Scripting Memory without variable',
          source: 'ScriptingProvider',
          cause: {
            aggregatedNoVariables
          }
        }
      )
    }

    // validating scripting memory without variable name
    const aggregatedNoVariableNames = this.scriptingMemories.filter((entry) => {
      return !_.isUndefined(entry.values[''])
    })
    if (aggregatedNoVariableNames.length) {
      throw new BotiumError(
        `Scripting Memory Definition(s) ${aggregatedNoVariableNames.map(e => e.header.name).join(', ')} without variable name`,
        {
          type: 'Scripting Memory',
          subtype: 'Scripting Memory without variable name',
          source: 'ScriptingProvider',
          cause: {
            aggregatedNoVariableNames
          }
        }
      )
    }

    // validating scripting memory name collision
    const aggregatedDuplicates = []
    for (let i = 0; i < (this.scriptingMemories || []).length; i++) {
      const scriptingMemory = this.scriptingMemories[i]
      const duplicate = this.scriptingMemories.filter((entry, j) => {
        if (j === i || !(entry.values && scriptingMemory.values && entry.header && scriptingMemory.header)) {
          return false
        }
        return (entry.header.name === scriptingMemory.header.name) && (JSON.stringify(Object.keys(entry.values)) === JSON.stringify(Object.keys(scriptingMemory.values)))
      })
      if (duplicate.length) {
        aggregatedDuplicates.push({ scriptingMemory, duplicate })
      }
    }
    if (aggregatedDuplicates.length) {
      throw new BotiumError(
        `Scripting Memory Definition name(s) "${_.uniq(aggregatedDuplicates.map(d => d.scriptingMemory.header.name)).join(', ')}" are not unique`,
        {
          type: 'Scripting Memory',
          subtype: 'Scripting Memory name collision',
          source: 'ScriptingProvider',
          cause: {
            aggregatedDuplicates
          }
        }
      )
    }

    // validating scripting memory variable name collision
    const aggregatedIntersections = []
    for (let i = 0; i < (this.scriptingMemories || []).length; i++) {
      const scriptingMemory = this.scriptingMemories[i]
      const intersection = this.scriptingMemories.filter((entry, j) => {
        if (j === i || !(entry.values && scriptingMemory.values && entry.header && scriptingMemory.header)) {
          return false
        }
        const k1 = Object.keys(entry.values)
        const k2 = Object.keys(scriptingMemory.values)
        const kInt = _.intersection(k1, k2)
        return kInt.length && (kInt.length !== k1.length || kInt.length !== k2.length)
      })
      if (intersection.length) {
        aggregatedIntersections.push({ scriptingMemory, intersection })
      }
    }
    if (aggregatedIntersections.length) {
      throw new BotiumError(
        `Scripting Memory Definitions "${aggregatedIntersections.map(i => i.scriptingMemory.header.name).join(', ')}" are invalid because variable name collision"`,
        {
          type: 'Scripting Memory',
          subtype: 'Scripting Memory variable name collision',
          source: 'ScriptingProvider',
          cause: {
            aggregatedIntersections
          }
        }
      )
    }

    const variablesToScriptingMemory = new Map()
    this.scriptingMemories.forEach((scriptingMemory) => {
      const key = JSON.stringify(Object.keys(scriptingMemory.values).sort())
      if (variablesToScriptingMemory.has(key)) {
        variablesToScriptingMemory.get(key).push(scriptingMemory)
      } else {
        variablesToScriptingMemory.set(key, [scriptingMemory])
      }
    })

    let convosExpandedAll = []
    const convosOriginalAll = []
    this.convos.forEach((convo) => {
      const convoVariables = convo.GetScriptingMemoryAllVariables(this)
      debug(`ExpandScriptingMemoryToConvos - Convo "${convo.header.name}" - Variables to replace, all: "${util.inspect(convoVariables)}"`)
      if (!convoVariables.length) {
        debug(`ExpandScriptingMemoryToConvos - Convo "${convo.header.name}" - skipped, no variable found to replace`)
      }

      let convosToExpand = [convo]
      let convosExpandedConvo = []
      // just for debug output. If we got 6 expanded convo, then this array can be for example [2, 3]
      const multipliers = []
      for (const [key, scriptingMemories] of variablesToScriptingMemory.entries()) {
        const variableNames = JSON.parse(key)
        if (_.intersection(variableNames, convoVariables).length) {
          const convosExpandedVariable = []
          multipliers.push(scriptingMemories.length)
          scriptingMemories.forEach((scriptingMemory) => {
            // Appending the case name to name
            for (const convoToExpand of convosToExpand) {
              const convoExpanded = _.cloneDeep(convoToExpand)
              convoExpanded.header.name = convoToExpand.header.name + '.' + scriptingMemory.header.name
              variableNames.forEach((name) => {
                const value = scriptingMemory.values[name]
                if (value) {
                  convoExpanded.beginLogicHook.push({ name: 'SET_SCRIPTING_MEMORY', args: [name.substring(1), scriptingMemory.values[name]] })
                } else {
                  convoExpanded.beginLogicHook.push({ name: 'CLEAR_SCRIPTING_MEMORY', args: [name.substring(1)] })
                }
              })
              convosExpandedVariable.push(convoExpanded)
            }
          })
          // This is a bit tricky. If the loop is done, then convosExpandedConvo will be used,
          // otherwise convosToExpand. They could be one variable
          convosToExpand = convosExpandedVariable
          convosExpandedConvo = convosExpandedVariable
        } else {
          debug(`ExpandScriptingMemoryToConvos - Convo "${convo.header.name}" - Scripting memory ${key} ignored because there is no common variable with convo ${util.inspect(convoVariables)}`)
        }
      }
      debug(`ExpandScriptingMemoryToConvos - Convo "${convo.header.name}" - Expanding convo "${convo.header.name}" Expanded ${convosExpandedConvo.length} convo. (Details: ${convosExpandedConvo.length} = ${multipliers ? multipliers.join('*') : 0})`)

      if (convosExpandedConvo.length) {
        convosExpandedAll = convosExpandedAll.concat(convosExpandedConvo)
        convosOriginalAll.push(convo)
      }
    })

    if (this.caps[Capabilities.SCRIPTING_MEMORYEXPANSION_KEEP_ORIG] !== true) {
      debug(`ExpandScriptingMemoryToConvos - Deleting ${convosOriginalAll.length} original convo`)
      this.convos = this.convos.filter((convo) => convosOriginalAll.indexOf(convo) === -1)
    }

    debug(`ExpandScriptingMemoryToConvos - ${convosExpandedAll.length} convo expanded, added to convos (${this.convos.length}). Result ${convosExpandedAll.length + this.convos.length} convo`)
    this.convos = this.convos.concat(convosExpandedAll)
    this._sortConvos()
    this._updateConvos()
  }

  ExpandUtterancesToConvos ({ useNameAsIntent, incomprehensionIntents, incomprehensionUtts, incomprehensionUtt } = {}) {
    const expandedConvos = []

    if (_.isUndefined(useNameAsIntent)) {
      useNameAsIntent = !!this.caps[Capabilities.SCRIPTING_UTTEXPANSION_USENAMEASINTENT]
    }
    if (_.isUndefined(incomprehensionIntents)) {
      incomprehensionIntents = this.caps[Capabilities.SCRIPTING_UTTEXPANSION_INCOMPREHENSIONINTENTS]
    }
    if (_.isUndefined(incomprehensionUtts)) {
      incomprehensionUtts = this.caps[Capabilities.SCRIPTING_UTTEXPANSION_INCOMPREHENSIONUTTS]
    }
    if (_.isUndefined(incomprehensionUtt)) {
      incomprehensionUtt = this.caps[Capabilities.SCRIPTING_UTTEXPANSION_INCOMPREHENSION]
    }

    if (incomprehensionUtt && (!incomprehensionUtts || incomprehensionUtts.length === 0) && !this.utterances[incomprehensionUtt]) {
      throw new Error(`ExpandUtterancesToConvos - incomprehension utterance '${incomprehensionUtt}' undefined (and no user examples given)`)
    }
    if (incomprehensionUtts && incomprehensionUtts.length > 0) {
      if (!incomprehensionUtt) {
        incomprehensionUtt = 'UTT_INCOMPREHENSION'
      }
      if (this.utterances[incomprehensionUtt]) {
        this.utterances[incomprehensionUtt].utterances.push(...incomprehensionUtts)
      } else {
        this.utterances[incomprehensionUtt] = {
          name: incomprehensionUtt,
          utterances: [...incomprehensionUtts]
        }
      }
    }

    if (useNameAsIntent) {
      debug('ExpandUtterancesToConvos - Using utterance name as NLU intent')
    }
    if (incomprehensionIntents && incomprehensionIntents.length > 0) {
      debug(`ExpandUtterancesToConvos - Using ${incomprehensionIntents.length} incomprehension NLU intent(s)`)
    }
    if (incomprehensionUtt) {
      debug(`ExpandUtterancesToConvos - Using incomprehension utterance expansion mode: ${incomprehensionUtt}, ${this.utterances[incomprehensionUtt].utterances.length} user example(s)`)
    }

    _.keys(this.utterances).filter(u => u !== incomprehensionUtt).forEach(uttName => {
      const utt = this.utterances[uttName]

      const responseStep = {
        sender: 'bot',
        messageText: '',
        asserters: [],
        stepTag: 'Step 2 - check bot response',
        not: false
      }
      if (useNameAsIntent) {
        responseStep.asserters.push({
          name: 'INTENT',
          args: [utt.name]
        })
      }
      if (incomprehensionIntents && incomprehensionIntents.length > 0) {
        incomprehensionIntents.forEach(ii => {
          responseStep.asserters.push({
            name: 'INTENT',
            args: [ii],
            not: true
          })
        })
      }
      if (incomprehensionUtt) {
        responseStep.messageText = incomprehensionUtt
        responseStep.not = true
      }

      expandedConvos.push(new Convo(this._buildScriptContext(), {
        header: {
          name: utt.name,
          description: `Expanded Utterances - ${utt.name}`
        },
        conversation: [
          {
            sender: 'me',
            logicHooks: [
              {
                name: 'SKIP_BOT_UNCONSUMED'
              }
            ],
            messageText: utt.name,
            stepTag: 'Step 1 - tell utterance'
          },
          responseStep
        ],
        sourceTag: Object.assign({}, utt.sourceTag, { origUttName: utt.name })
      }))
    })
    this.convos = this.convos.concat(expandedConvos)
    this._sortConvos()
    this._updateConvos()
  }

  ExpandConvos (options = {}) {
    options = Object.assign({
      // use skip and keep, or justHeader
      justHeader: false,
      // drop unwanted convos
      convoFilter: null,
      // This function is doing many things, not just convo expansion.
      // And sometimes convo expansion is turned off,
      // but the other things are required
      doConvoExpansion: true
    }, options)
    // 1 Partial convos
    this.convos.forEach((convo) => {
      convo.expandPartialConvos()
    })

    // 2 convo expansion && filtering
    if (options.doConvoExpansion) {
      const expandedConvos = []
      debug(`ExpandConvos - Using utterances expansion mode: ${this.caps[Capabilities.SCRIPTING_UTTEXPANSION_MODE]}`)
      this.convos.forEach((convo) => {
        for (const expanded of this._expandConvo(convo, { convoFilter: options.convoFilter }, {})) {
          if (options.justHeader) {
            const ConvoWithOnlyHeader = {
              header: {
                name: expanded.header.name,
                assertionCount: expanded.header.assertionCount
              }
            }
            expandedConvos.push(ConvoWithOnlyHeader)
          } else {
            expandedConvos.push(expanded)
          }
        }
      })
      this.convos = expandedConvos
    }

    // 3 filtering if convo expansion is turned off:
    if (!options.doConvoExpansion && options.convoFilter) {
      this.convos = this.convos.filter(convo => options.convoFilter(convo))
    }

    // 4 update
    if (!options.justHeader) {
      this._sortConvos()
    }
    this._updateConvos()
  }

  // If you need ExpandConvo with doConvoExpansion turned off then use ExpandConvos.
  // It is more rich (it has sorting, updateConvos)
  // This function does not support doConvoExpansion at all
  ExpandConvosIterable (options = {}) {
    options = Object.assign({
      // drop unwanted convos
      convoFilter: null
    }, options)
    if (!_.isNil(options.doConvoExpansion)) {
      debug(`ExpandConvosIterable - doConvoExpansion parameter is not supported`)
    }
    debug(`ExpandConvosIterable - Using utterances expansion mode: ${this.caps[Capabilities.SCRIPTING_UTTEXPANSION_MODE]}`)
    // creating a nested generator, calling the other.
    // We hope this.convos does not changes while this iterator is used
    const _convosIterable = function * (options) {
      for (const convo of this.convos) {
        convo.expandPartialConvos()
        // updateConvos is not called for ExpandConvosIterable.
        // But this way we will got assertion count for every convo?
        // It might be not important, because ExpandConvosIterable is limited
        // now to regression test, and we might not need assertionCount there
        // But to be consistent we fill it here too.
        convo.header.assertionCount = this.GetAssertionCount(convo)
        yield * this._expandConvo(convo, options, {})
      }
    }.bind(this)

    this.convosIterable = _convosIterable(options)
  }

  /**
   * This is a generator function with yield
   * @param currentConvo
   * @param convoStepIndex
   * @param convoStepsStack list of ConvoSteps
   * @private
   */
  * _expandConvo (currentConvo, options, context, convoStepIndex = 0, convoStepsStack = []) {
    const utterancePostfix = (lineTag, uttOrUserInput) => {
      const naming = this.caps[Capabilities.SCRIPTING_UTTEXPANSION_NAMING_MODE] || Defaults.capabilities[Capabilities.SCRIPTING_UTTEXPANSION_NAMING_MODE]
      if (naming === 'justLineTag') {
        return `L${lineTag}`
      }
      const utteranceMax = this.caps[Capabilities.SCRIPTING_UTTEXPANSION_NAMING_UTTERANCE_MAX] || 0
      let postfix
      if (utteranceMax > 3 && uttOrUserInput.length > utteranceMax) {
        postfix = uttOrUserInput.substring(0, utteranceMax - 3) + '...'
      } else {
        postfix = uttOrUserInput
      }
      return `L${lineTag}-${postfix}`
    }
    if (convoStepIndex < currentConvo.conversation.length) {
      const currentStep = currentConvo.conversation[convoStepIndex]
      if (currentStep.sender === 'bot' || currentStep.sender === 'begin' || currentStep.sender === 'end') {
        const currentStepsStack = convoStepsStack.slice()
        currentStepsStack.push(_.cloneDeep(currentStep))
        yield * this._expandConvo(currentConvo, options, context, convoStepIndex + 1, currentStepsStack)
      } else if (currentStep.sender === 'me') {
        let useUnexpanded = true
        if (currentStep.messageText) {
          let uttName = null
          let uttArgs = null
          if (this.utterances[currentStep.messageText]) {
            uttName = currentStep.messageText
          } else {
            const parts = currentStep.messageText.split(' ')
            if (this.utterances[parts[0]]) {
              uttName = parts[0]
              uttArgs = parts.slice(1)
            }
          }
          if (this.utterances[uttName]) {
            const allutterances = this.utterances[uttName].utterances
            const processSampleUtterances = function * (sampleutterances, myContext) {
              for (let index = 0; index < sampleutterances.length; index++) {
                yield * processSampleUtterance(sampleutterances[index], sampleutterances.length, index, Object.assign({ indexExpansionModeIndex: index }, myContext || context))
              }
            }
            const processSampleUtterance = function * (sampleutterance, length, index, myContext) {
              const currentStepsStack = convoStepsStack.slice()
              if (uttArgs) {
                sampleutterance = util.format(sampleutterance, ...uttArgs)
              }
              currentStepsStack.push(Object.assign(_.cloneDeep(currentStep), { messageText: sampleutterance }))
              const currentConvoLabeled = _.cloneDeep(currentConvo)
              if (length > 1) {
                const lineTag = `${index + 1}`.padStart(`${length}`.length, '0')
                Object.assign(currentConvoLabeled.header, { name: `${currentConvo.header.name}/${uttName}-${utterancePostfix(lineTag, sampleutterance)}` })
              }
              if (!currentConvoLabeled.sourceTag) currentConvoLabeled.sourceTag = {}
              if (!currentConvoLabeled.sourceTag.origConvoName) currentConvoLabeled.sourceTag.origConvoName = currentConvo.header.name
              yield * this._expandConvo(currentConvoLabeled, options, myContext || context, convoStepIndex + 1, currentStepsStack)
            }.bind(this)
            if (allutterances.length === 1) {
              yield * processSampleUtterances([allutterances[0]], context)
            } else if (this.caps[Capabilities.SCRIPTING_UTTEXPANSION_MODE] === 'index') {
              if (_.isNil(context.indexExpansionModeWidth)) {
                // executed for the first found utterance
                yield * processSampleUtterances(allutterances, Object.assign({}, context, { indexExpansionModeWidth: allutterances.length }))
              } else {
                if (_.isNil(context.indexExpansionModeIndex)) {
                  throw new Error('indexExpansionModeIndex must be set!')
                }
                // executing the current 'thread', if current utterance has no example to current index, fallback to the last one
                const localIndex = Math.min(context.indexExpansionModeIndex, allutterances.length - 1)
                if (localIndex < context.indexExpansionModeIndex && context.indexExpansionModeIndex === context.indexExpansionModeWidth - 1) {
                  debug(`While expanding convos by index found in utterance "${uttName}" less examples (${allutterances.length}) as expected (${context.indexExpansionModeWidth})`)
                }
                const myContext = Object.assign({}, context, { indexExpansionModeWidth: Math.max(allutterances.length, context.indexExpansionModeWidth) })
                yield * processSampleUtterance(allutterances[localIndex], allutterances.length, localIndex, myContext)
                if (allutterances.length > context.indexExpansionModeWidth && context.indexExpansionModeIndex + 1 === context.indexExpansionModeWidth) {
                  debug(`While expanding convos by index found in utterance "${uttName}" more examples (${allutterances.length}) as expected (${context.indexExpansionModeWidth})`)
                  for (let i = context.indexExpansionModeWidth; i < allutterances.length; i++) {
                    // if we found a utterance with more examples as any utterances before, we have to start new 'thread'
                    const myContext = Object.assign({}, context, { indexExpansionModeWidth: allutterances.length, indexExpansionModeIndex: i })
                    yield * processSampleUtterance(allutterances[i], allutterances.length, i, myContext)
                  }
                }
              }
            } else {
              if (this.caps[Capabilities.SCRIPTING_UTTEXPANSION_MODE] === 'first') {
                yield * processSampleUtterances([allutterances[0]], context)
              } else if (this.caps[Capabilities.SCRIPTING_UTTEXPANSION_MODE] === 'random') {
                yield * processSampleUtterances(allutterances
                  .map(x => ({ x, r: Math.random() }))
                  .sort((a, b) => a.r - b.r)
                  .map(a => a.x)
                  .slice(0, this.caps[Capabilities.SCRIPTING_UTTEXPANSION_RANDOM_COUNT]), context)
              } else {
                yield * processSampleUtterances(allutterances, context)
              }
            }
            useUnexpanded = false
          }
        }
        if (currentStep.userInputs && currentStep.userInputs.length > 0) {
          for (let uiIndex = 0; uiIndex < currentStep.userInputs.length; uiIndex++) {
            const ui = currentStep.userInputs[uiIndex]
            const userInput = this.userInputs[ui.name]
            if (userInput && userInput.expandConvo) {
              const expandedUserInputs = userInput.expandConvo({ convo: currentConvo, convoStep: currentStep, args: ui.args })
              if (expandedUserInputs && expandedUserInputs.length > 0) {
                // let sampleinputs = expandedUserInputs
                const processSampleInputs = function * (sampleinputs, myContext, uiIndex) {
                  for (let index = 0; index < sampleinputs.length; index++) {
                    yield * processSampleInput(sampleinputs[index], sampleinputs.length, index, Object.assign({ indexExpansionModeIndex: index }, myContext || context), uiIndex)
                  }
                }
                const processSampleInput = function * (sampleinput, length, index, myContext, uiIndex) {
                  const currentStepsStack = convoStepsStack.slice()
                  const currentStepMod = _.cloneDeep(currentStep)
                  currentStepMod.userInputs[uiIndex] = sampleinput

                  currentStepsStack.push(currentStepMod)
                  const currentConvoLabeled = _.cloneDeep(currentConvo)
                  if (length > 1) {
                    if (sampleinput.convoPostfix) {
                      Object.assign(currentConvoLabeled.header, { name: `${currentConvo.header.name}/${ui.name}-${sampleinput.convoPostfix}` })
                    } else {
                      const lineTag = `${index + 1}`.padStart(`${length}`.length, '0')
                      Object.assign(currentConvoLabeled.header, { name: `${currentConvo.header.name}/${ui.name}-${utterancePostfix(lineTag, (sampleinput.args && sampleinput.args.length) ? sampleinput.args.join(', ') : 'no-args')}` })
                    }
                  }
                  yield * this._expandConvo(currentConvoLabeled, options, myContext || context, convoStepIndex + 1, currentStepsStack)
                }.bind(this)
                if (expandedUserInputs.length === 1) {
                  yield * processSampleInputs([expandedUserInputs[0]], context, uiIndex)
                } else if (this.caps[Capabilities.SCRIPTING_UTTEXPANSION_MODE] === 'index') {
                  if (_.isNil(context.indexExpansionModeWidth)) {
                    yield * processSampleInputs(expandedUserInputs, Object.assign({}, context, { indexExpansionModeWidth: expandedUserInputs.length }), uiIndex)
                  } else {
                    if (_.isNil(context.indexExpansionModeIndex)) {
                      throw new Error('indexExpansionModeIndex must be set!')
                    }
                    // executing the current 'thread', if current utterance has no example to current index, fallback to the last one
                    const localIndex = Math.min(context.indexExpansionModeIndex, expandedUserInputs.length - 1)
                    if (localIndex < context.indexExpansionModeIndex && context.indexExpansionModeIndex === context.indexExpansionModeWidth - 1) {
                      debug(`While expanding convos by index found user input "${ui.name}, ${ui.args}" less examples (${expandedUserInputs.length}) as expected (${context.indexExpansionModeWidth})`)
                    }
                    const myContext = Object.assign({}, context, { indexExpansionModeWidth: Math.max(expandedUserInputs.length, context.indexExpansionModeWidth) })
                    yield * processSampleInput(expandedUserInputs[localIndex], expandedUserInputs.length, localIndex, myContext, uiIndex)
                    if (expandedUserInputs.length > context.indexExpansionModeWidth && context.indexExpansionModeIndex + 1 === context.indexExpansionModeWidth) {
                      debug(`While expanding convos by index found user input "${ui.name}, ${ui.args}" more examples (${expandedUserInputs.length}) as expected (${context.indexExpansionModeWidth})`)
                      for (let i = context.indexExpansionModeWidth; i < expandedUserInputs.length; i++) {
                        const myContext = Object.assign({}, context, { indexExpansionModeWidth: expandedUserInputs.length, indexExpansionModeIndex: i })
                        yield * processSampleInput(expandedUserInputs[i], expandedUserInputs.length, i, myContext, uiIndex)
                      }
                    }
                  }
                } else {
                  if (this.caps[Capabilities.SCRIPTING_UTTEXPANSION_MODE] === 'first') {
                    yield * processSampleInputs([expandedUserInputs[0]], context, uiIndex)
                  } else if (this.caps[Capabilities.SCRIPTING_UTTEXPANSION_MODE] === 'random') {
                    yield * processSampleInputs(expandedUserInputs
                      .map(x => ({
                        x,
                        r: Math.random()
                      }))
                      .sort((a, b) => a.r - b.r)
                      .map(a => a.x)
                      .slice(0, this.caps[Capabilities.SCRIPTING_UTTEXPANSION_RANDOM_COUNT]), context, uiIndex)
                  } else {
                    yield * processSampleInputs(expandedUserInputs, context, uiIndex)
                  }
                }
                useUnexpanded = false
              }
            }
          }
        }
        if (useUnexpanded) {
          const currentStepsStack = convoStepsStack.slice()
          currentStepsStack.push(_.cloneDeep(currentStep))
          yield * this._expandConvo(currentConvo, options, context, convoStepIndex + 1, currentStepsStack)
        }
      }
    } else {
      const expanded = Object.assign(_.cloneDeep(currentConvo), { conversation: _.cloneDeep(convoStepsStack) })
      if (!options.convoFilter || options.convoFilter(expanded)) {
        yield expanded
      }
    }
  }

  _sortConvos () {
    this.convos = _.sortBy(this.convos, [(convo) => convo.header.sort || convo.header.name])
  }

  _updateConvos () {
    let i = 0
    this.convos.forEach((convo) => {
      if (convo) {
        convo.header.order = ++i
        // conversation can missing to spare memory. But we have to set assertionCount before dropping it.
        // So it is not neccessary (and possible) to calculate it again.
        if (convo.conversation && !_.isNil(convo.header.assertionCount)) {
          // Maybe this is called sometimes early.
          // After injecting partial convos, this has to be re-calculated.
          convo.header.assertionCount = this.GetAssertionCount(convo)
        }
        if (!convo.header.projectname) {
          convo.header.projectname = this.caps[Capabilities.PROJECTNAME]
        }
        if (!convo.header.testsessionname) {
          convo.header.testsessionname = this.caps[Capabilities.TESTSESSIONNAME]
        }
      }
    })
  }

  AddConvos (convos) {
    if (convos && _.isArray(convos)) {
      this.convos = _.concat(this.convos, convos)
    } else if (convos) {
      this.convos.push(convos)
    }
    if (!this.convos.filter(c => _.isNil(c))) {
      this._sortConvos()
    }
    this._updateConvos()
  }

  AddUtterances (utterances) {
    const findAmbiguous = (utterances) => {
      const ambiguous = []
      let expected = null
      let base = null
      if (utterances && utterances.length > 1) {
        base = utterances[0]
        expected = ScriptingMemory.extractVarNames(utterances[0]).sort()
        const expectedString = JSON.stringify(expected)

        for (let i = 1; i < utterances.length; i++) {
          const actualString = JSON.stringify(ScriptingMemory.extractVarNames(utterances[i]).sort())

          if (actualString !== expectedString) {
            ambiguous.push(utterances[i])
          }
        }
      }

      return { expected, ambiguous, base }
    }

    if (utterances && !_.isArray(utterances)) {
      utterances = [utterances]
    }
    if (utterances) {
      _.forEach(utterances, (utt) => {
        const eu = this.utterances[utt.name]
        if (eu) {
          eu.utterances = _.uniq(_.concat(eu.utterances, utt.utterances))
        } else {
          this.utterances[utt.name] = utt
        }

        const { ambiguous, expected } = findAmbiguous(this.utterances[utt.name].utterances)

        if (ambiguous && ambiguous.length > 0) {
          debug(`Ambigous utterance "${utt.name}", expecting exact ${expected.length ? ('"' + expected.join(', ') + '"') : '<none>'} scripting memory variables in following user examples: ${ambiguous.map(d => `"${d}"`).join(', ')}`)
        }
      })
    }
  }

  AddPartialConvos (convos) {
    if (convos && _.isArray(convos)) {
      for (let i = 0; i < convos.length; i++) {
        const convo = convos[i]
        this.AddPartialConvos(convo)
      }
    } else if (convos) {
      if (!convos.header || !convos.header.name) {
        throw Error(`Header name is mandatory: ${JSON.stringify(convos.header)}`)
      }
      if (convos.header.name.indexOf('|') >= 0) {
        throw Error(`Invalid partial convo name: ${convos.header.name}`)
      }
      const name = convos.header.name
      if (this.partialConvos[name]) {
        throw Error(`Duplicate partial convo: ${name}`)
      }

      this.partialConvos[name] = convos
    }
  }

  GetPartialConvos () {
    return this.partialConvos
  }

  AddScriptingMemories (scriptingMemories) {
    if (scriptingMemories && _.isArray(scriptingMemories)) {
      for (let i = 0; i < scriptingMemories.length; i++) {
        const scriptingMemory = scriptingMemories[i]
        this.AddScriptingMemories(scriptingMemory)
      }
    } else if (scriptingMemories) {
      if (!scriptingMemories.header || !scriptingMemories.header.name) {
        throw new BotiumError(
          'Scripting Memory Definition has no name',
          {
            type: 'Compiler',
            subtype: 'Scripting memory without name',
            source: 'ScriptingProvider',
            cause: {
              scriptingMemory: scriptingMemories
            }
          }
        )
      }

      if (!scriptingMemories.values || !Object.keys(scriptingMemories.values).length) {
        throw new BotiumError(
          'Scripting Memory Definition has no variables',
          {
            type: 'Compiler',
            subtype: 'Scripting memory without variable',
            source: 'ScriptingProvider',
            cause: {
              scriptingMemory: scriptingMemories
            }
          }
        )
      }

      if (scriptingMemories.values && !_.isUndefined(scriptingMemories.values[''])) {
        throw new BotiumError(
          'Scripting Memory Definition variable has no name',
          {
            type: 'Compiler',
            subtype: 'Scripting memory without variable name',
            source: 'ScriptingProvider',
            cause: {
              scriptingMemory: scriptingMemories
            }
          }
        )
      }

      this.scriptingMemories.push(scriptingMemories)
    }
  }

  GetConversationFlowView ({
    getConvoNodeHash = null, detectLoops = false, summarizeMultiSteps = true,
    extPickMeNodeProps = [], extPickBotNodeProps = [], extPickMeHashProps = [], extPickBotHashProps = []
  } = {}) {
    const root = []
    const botNodesByHash = {}
    const pickMeNodeProps = ['index', 'sender', 'messageText', 'utteranceSamples', 'utteranceCount', 'logicHooks', 'userInputs', ...extPickMeNodeProps]
    const pickBotNodeProps = ['index', 'sender', 'messageText', 'optional', 'not', 'utteranceSamples', 'utteranceCount', 'logicHooks', 'asserters', ...extPickBotNodeProps]
    const pickMeHashProps = ['sender', 'messageText', 'logicHooks', 'userInputs', ...extPickMeHashProps]
    const pickBotHashProps = ['sender', 'messageText', 'optional', 'not', 'logicHooks', 'asserters', ...extPickBotHashProps]

    this.convos.forEach((convo) => {
      const convoNodes = []
      for (const [convoStepIndex, convoStep] of convo.conversation.entries()) {
        if (convoStep.sender === 'begin' || convoStep.sender === 'end') continue
        convoStep.index = convoStepIndex
        if (convoStep.messageText) {
          const utterances = this._resolveUtterance({ utterance: convoStep.messageText, resolveEmptyIfUnknown: true })
          if (utterances) {
            convoStep.utteranceSamples = utterances.slice(0, 3)
            convoStep.utteranceCount = utterances.length
          }
        }

        const lastConvoNode = convoNodes.length === 0 ? null : convoNodes[convoNodes.length - 1]
        if (!lastConvoNode || !summarizeMultiSteps || convoNodes[convoNodes.length - 1].sender !== convoStep.sender) {
          convoNodes.push({
            sender: convoStep.sender,
            convoSteps: [convoStep],
            convoStepIndices: [convoStepIndex],
            hash: null
          })
        } else {
          lastConvoNode.convoSteps.push(convoStep)
          lastConvoNode.convoStepIndices.push(convoStepIndex)
        }
      }

      let currentChildren = root
      for (const convoNode of convoNodes) {
        const convoNodeValues = convoNode.sender === 'me'
          ? convoNode.convoSteps.map(convoStep => _.pick(convoStep, pickMeNodeProps))
          : convoNode.convoSteps.map(convoStep => _.pick(convoStep, pickBotNodeProps))
        const convoNodeHeader = {
          header: _.pick(convo.header, ['name', 'description']),
          sourceTag: convo.sourceTag,
          convoStepIndices: convoNode.convoStepIndices
        }

        let hash = getConvoNodeHash && getConvoNodeHash({ convo, convoNode })
        if (!hash) {
          if (convoNode.sender === 'bot') {
            hash = crypto.createHash('md5').update(JSON.stringify(convoNode.convoSteps.map(convoStep => _.pick(convoStep, pickBotHashProps)))).digest('hex')
          } else {
            hash = crypto.createHash('md5').update(JSON.stringify(convoNode.convoSteps.map(convoStep => _.pick(convoStep, pickMeHashProps)))).digest('hex')
          }
        }

        const existingChildNode = currentChildren.find(c => c.hash === hash)
        if (existingChildNode) {
          existingChildNode.convos.push(_.cloneDeep(convoNodeHeader))
          currentChildren = existingChildNode.childNodes
          continue
        }

        const existingBotNode = (detectLoops && convoNode.sender === 'bot' && botNodesByHash[hash])
        if (existingBotNode) {
          if (currentChildren.findIndex(c => c.ref === existingBotNode.key) < 0) {
            currentChildren.push({
              ref: existingBotNode.key
            })
          }
          const existingConvo = existingBotNode.convos.find(c => c.header.name === convoNodeHeader.header.name)
          if (existingConvo) {
            existingConvo.convoStepIndices = [...existingConvo.convoStepIndices, ...convoNodeHeader.convoStepIndices]
          } else {
            existingBotNode.convos.push(_.cloneDeep(convoNodeHeader))
          }
          currentChildren = existingBotNode.childNodes
          continue
        }
        const node = {
          sender: convoNode.sender,
          key: randomize('0', 20),
          hash,
          convoNodes: convoNodeValues,
          convos: [_.cloneDeep(convoNodeHeader)],
          childNodes: []
        }
        if (node.sender === 'bot') {
          botNodesByHash[hash] = node
        }
        currentChildren.push(node)
        currentChildren = node.childNodes
      }
    })

    return root
  }

  GetConversationFlowDot (args) {
    const root = this.GetConversationFlowView(args)

    const nodes = []
    const lines = []

    const walkTreeForNodes = (node) => {
      nodes.push(`N_${node.hash} [label="${node.convoNodes.map(convoNode => (new ConvoStep(convoNode)).toString()).join('\r\n')}"];`)
      if (node.childNodes && node.childNodes.length > 0) {
        node.childNodes.filter(c => !c.ref).forEach(c => walkTreeForNodes(c))
      }
    }
    const walkTreeForLines = (node, path = []) => {
      if (node.childNodes && node.childNodes.length > 0) {
        node.childNodes.filter(c => !c.ref).forEach(c => walkTreeForLines(c, [...path, `N_${node.hash}`]))
        node.childNodes.filter(c => c.ref).forEach(c => lines.push(`${[...path, `N_${node.hash}`, `N_${c.ref}`].join(' -> ')};`))
      } else {
        lines.push(`${[...path, `N_${node.hash}`].join(' -> ')};`)
      }
    }
    root.forEach(r => walkTreeForNodes(r))
    root.forEach(r => walkTreeForLines(r))

    return [
      'digraph {',
      ...nodes,
      ...lines,
      '}'].join('\r\n')
  }

  GetAssertionCount (convo) {
    if (!convo) {
      return 0
    }
    let counter = 0
    for (const step of convo.conversation) {
      if (step.sender === 'bot') {
        let stepCounter = step.asserters ? step.asserters.length : 0
        if (step.messageText) {
          stepCounter++
        }
        stepCounter = stepCounter === 0 ? 1 : stepCounter
        counter += stepCounter
      }
    }

    if (convo.convoBegin && convo.convoBegin.asserters) {
      counter += convo.convoBegin.asserters.length
    }

    if (convo.convoEnd && convo.convoEnd.asserters) {
      counter += convo.convoEnd.asserters.length
    }
    return counter === 0 ? 1 : counter
  }
}
