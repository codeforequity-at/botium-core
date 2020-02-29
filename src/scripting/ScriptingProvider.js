const LogicHookUtils = require('./logichook/LogicHookUtils')
const util = require('util')
const fs = require('fs')
const path = require('path')
const glob = require('glob')
const _ = require('lodash')
const promiseRetry = require('promise-retry')
require('promise.allsettled').shim()
const debug = require('debug')('botium-ScriptingProvider')

const Constants = require('./Constants')
const Capabilities = require('../Capabilities')
const { Convo } = require('./Convo')
const ScriptingMemory = require('./ScriptingMemory')
const { BotiumError, botiumErrorFromList } = require('./BotiumError')
const RetryHelper = require('../helpers/RetryHelper')
const MatchFunctions = require('./MatchFunctions')
const precompilers = require('./precompilers')

const globPattern = '**/+(*.convo.txt|*.utterances.txt|*.pconvo.txt|*.scriptingmemory.txt|*.xlsx|*.convo.csv|*.pconvo.csv|*.yaml|*.yml|*.json|*.md)'

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
  const promise = () => new Promise((resolve, reject) => {
    try {
      fn()
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
  constructor (caps = {}) {
    this.caps = caps
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
      onMeEnd: ({ convo, convoStep, scriptingMemory, ...rest }) => {
        return this._createLogicHookPromises({ hookType: 'onMeEnd', logicHooks: (convoStep.logicHooks || []), convo, convoStep, scriptingMemory, ...rest })
      },
      onBotStart: ({ convo, convoStep, scriptingMemory, ...rest }) => {
        return this._createLogicHookPromises({ hookType: 'onBotStart', logicHooks: (convoStep.logicHooks || []), convo, convoStep, scriptingMemory, ...rest })
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
      resolveUtterance: ({ utterance }) => {
        if (this.utterances[utterance]) {
          return this.utterances[utterance].utterances
        } else {
          return [utterance]
        }
      },
      assertBotResponse: (botresponse, tomatch, stepTag, meMsg) => {
        if (!_.isArray(tomatch)) {
          tomatch = [tomatch]
        }
        debug(`assertBotResponse ${stepTag} ${meMsg ? `(${meMsg}) ` : ''}BOT: ${botresponse} = ${tomatch} ...`)
        const found = _.find(tomatch, (utt) => this.matchFn(botresponse, utt))
        if (found === undefined) {
          throw new BotiumError(
            `${stepTag}: Expected bot response ${meMsg ? `(on ${meMsg}) ` : ''}"${botresponse}" to match one of "${tomatch}"`,
            {
              type: 'asserter',
              source: 'TextMatchAsserter',
              context: {
                stepTag
              },
              cause: {
                expected: tomatch,
                actual: botresponse
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
        const found = _.find(nottomatch, (utt) => this.matchFn(botresponse, utt))
        if (found) {
          throw new BotiumError(
            `${stepTag}: Expected bot response ${meMsg ? `(on ${meMsg}) ` : ''}"${botresponse}" NOT to match "${found}"`,
            {
              type: 'asserter',
              source: 'TextMatchAsserter',
              context: {
                stepTag
              },
              cause: {
                not: true,
                expected: nottomatch,
                actual: botresponse
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

  _createAsserterPromises ({ asserterType, asserters, convo, convoStep, scriptingMemory, ...rest }) {
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
        args: ScriptingMemory.applyToArgs(a.args, scriptingMemory),
        isGlobal: false,
        ...rest
      }))
    const globalAsserter = Object.values(this.globalAsserter)
      .filter(a => a[asserterType])
      .map(a => p(this.retryHelperAsserter, () => a[asserterType]({ convo, convoStep, scriptingMemory, args: [], isGlobal: true, ...rest })))

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
    return Promise.all(allPromises)
  }

  _createLogicHookPromises ({ hookType, logicHooks, convo, convoStep, scriptingMemory, ...rest }) {
    if (hookType !== 'onMeStart' && hookType !== 'onMeEnd' && hookType !== 'onBotStart' && hookType !== 'onBotEnd' &&
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
        args: ScriptingMemory.applyToArgs(l.args, scriptingMemory),
        isGlobal: false,
        ...rest
      })))

    const globalPromises = Object.values(this.globalLogicHook)
      .filter(l => l[hookType])
      .map(l => p(this.retryHelperLogicHook, () => l[hookType]({ convo, convoStep, scriptingMemory, args: [], isGlobal: true, ...rest })))

    const allPromises = [...convoStepPromises, ...globalPromises]
    return Promise.all(allPromises)
  }

  _createUserInputPromises ({ convo, convoStep, scriptingMemory, ...rest }) {
    const convoStepPromises = (convoStep.userInputs || [])
      .filter(ui => this.userInputs[ui.name])
      .map(ui => p(this.retryHelperUserInput, () => this.userInputs[ui.name].setUserInput({
        convo,
        convoStep,
        scriptingMemory,
        args: ScriptingMemory.applyToArgs(ui.args, scriptingMemory),
        ...rest
      })))

    return Promise.all(convoStepPromises)
  }

  _isValidAsserterType (asserterType) {
    return ['assertConvoBegin', 'assertConvoStep', 'assertConvoEnd'].some(t => asserterType === t)
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
        onMeEnd: this.scriptingEvents.onMeEnd.bind(this),
        onBotStart: this.scriptingEvents.onBotStart.bind(this),
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

    debug('Using matching mode: ' + this.caps[Capabilities.SCRIPTING_MATCHING_MODE])
    if (this.caps[Capabilities.SCRIPTING_MATCHING_MODE] === 'regexp' || this.caps[Capabilities.SCRIPTING_MATCHING_MODE] === 'regexpIgnoreCase') {
      this.matchFn = MatchFunctions.regexp(this.caps[Capabilities.SCRIPTING_MATCHING_MODE] === 'regexpIgnoreCase')
    } else if (this.caps[Capabilities.SCRIPTING_MATCHING_MODE] === 'wildcard' || this.caps[Capabilities.SCRIPTING_MATCHING_MODE] === 'wildcardIgnoreCase' || this.caps[Capabilities.SCRIPTING_MATCHING_MODE] === 'wildcardLowerCase') {
      this.matchFn = MatchFunctions.wildcard(this.caps[Capabilities.SCRIPTING_MATCHING_MODE] === 'wildcardIgnoreCase' || this.caps[Capabilities.SCRIPTING_MATCHING_MODE] === 'wildcardLowerCase')
    } else if (this.caps[Capabilities.SCRIPTING_MATCHING_MODE] === 'include' || this.caps[Capabilities.SCRIPTING_MATCHING_MODE] === 'includeIgnoreCase' || this.caps[Capabilities.SCRIPTING_MATCHING_MODE] === 'includeLowerCase') {
      this.matchFn = MatchFunctions.include(this.caps[Capabilities.SCRIPTING_MATCHING_MODE] === 'includeIgnoreCase' || this.caps[Capabilities.SCRIPTING_MATCHING_MODE] === 'includeLowerCase')
    } else {
      this.matchFn = MatchFunctions.equals(false)
    }
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
    return this.matchFn(botresponse, utterance)
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

  ReadScriptsFromDirectory (convoDir, globFilter) {
    let filelist = []

    const convoDirStats = fs.statSync(convoDir)
    if (convoDirStats.isFile()) {
      filelist = [path.basename(convoDir)]
      convoDir = path.dirname(convoDir)
    } else {
      filelist = glob.sync(globPattern, { cwd: convoDir })
      if (globFilter) {
        const filelistGlobbed = glob.sync(globFilter, { cwd: convoDir })
        _.remove(filelist, (file) => filelistGlobbed.indexOf(file) < 0)
      }
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

  ReadScript (convoDir, filename) {
    let fileConvos = []
    let fileUtterances = []
    let filePartialConvos = []
    let fileScriptingMemories = []

    let scriptBuffer = fs.readFileSync(path.resolve(convoDir, filename))

    const precompResponse = precompilers.execute(scriptBuffer, { convoDir, filename, caps: this.caps })
    if (precompResponse) {
      scriptBuffer = precompResponse.scriptBuffer
      debug(`File ${filename} precompiled by ${precompResponse.precompiler}` +
        (precompResponse.filename ? ` and filename changed to ${precompResponse.filename}` : '')
      )
      filename = precompResponse.filename || filename
    }

    if (filename.endsWith('.xlsx')) {
      fileUtterances = this.Compile(scriptBuffer, Constants.SCRIPTING_FORMAT_XSLX, Constants.SCRIPTING_TYPE_UTTERANCES)
      filePartialConvos = this.Compile(scriptBuffer, Constants.SCRIPTING_FORMAT_XSLX, Constants.SCRIPTING_TYPE_PCONVO)
      fileConvos = this.Compile(scriptBuffer, Constants.SCRIPTING_FORMAT_XSLX, Constants.SCRIPTING_TYPE_CONVO)
      fileScriptingMemories = this.Compile(scriptBuffer, Constants.SCRIPTING_FORMAT_XSLX, Constants.SCRIPTING_TYPE_SCRIPTING_MEMORY)
    } else if (filename.endsWith('.convo.txt')) {
      fileConvos = this.Compile(scriptBuffer, Constants.SCRIPTING_FORMAT_TXT, Constants.SCRIPTING_TYPE_CONVO)
    } else if (filename.endsWith('.pconvo.txt')) {
      filePartialConvos = this.Compile(scriptBuffer, Constants.SCRIPTING_FORMAT_TXT, Constants.SCRIPTING_TYPE_PCONVO)
    } else if (filename.endsWith('.utterances.txt')) {
      fileUtterances = this.Compile(scriptBuffer, Constants.SCRIPTING_FORMAT_TXT, Constants.SCRIPTING_TYPE_UTTERANCES)
    } else if (filename.endsWith('.scriptingmemory.txt')) {
      fileScriptingMemories = this.Compile(scriptBuffer, Constants.SCRIPTING_FORMAT_TXT, Constants.SCRIPTING_TYPE_SCRIPTING_MEMORY)
    } else if (filename.endsWith('.convo.csv')) {
      fileConvos = this.Compile(scriptBuffer, Constants.SCRIPTING_FORMAT_CSV, Constants.SCRIPTING_TYPE_CONVO)
    } else if (filename.endsWith('.pconvo.csv')) {
      filePartialConvos = this.Compile(scriptBuffer, Constants.SCRIPTING_FORMAT_CSV, Constants.SCRIPTING_TYPE_PCONVO)
    } else if (filename.endsWith('.yaml') || filename.endsWith('.yml')) {
      fileUtterances = this.Compile(scriptBuffer, Constants.SCRIPTING_FORMAT_YAML, Constants.SCRIPTING_TYPE_UTTERANCES)
      filePartialConvos = this.Compile(scriptBuffer, Constants.SCRIPTING_FORMAT_YAML, Constants.SCRIPTING_TYPE_PCONVO)
      fileConvos = this.Compile(scriptBuffer, Constants.SCRIPTING_FORMAT_YAML, Constants.SCRIPTING_TYPE_CONVO)
      fileScriptingMemories = this.Compile(scriptBuffer, Constants.SCRIPTING_FORMAT_YAML, Constants.SCRIPTING_TYPE_SCRIPTING_MEMORY)
    } else if (filename.endsWith('.json')) {
      fileUtterances = this.Compile(scriptBuffer, Constants.SCRIPTING_FORMAT_JSON, Constants.SCRIPTING_TYPE_UTTERANCES)
      filePartialConvos = this.Compile(scriptBuffer, Constants.SCRIPTING_FORMAT_JSON, Constants.SCRIPTING_TYPE_PCONVO)
      fileConvos = this.Compile(scriptBuffer, Constants.SCRIPTING_FORMAT_JSON, Constants.SCRIPTING_TYPE_CONVO)
      fileScriptingMemories = this.Compile(scriptBuffer, Constants.SCRIPTING_FORMAT_JSON, Constants.SCRIPTING_TYPE_SCRIPTING_MEMORY)
    } else if (filename.endsWith('.markdown')) {
      fileUtterances = this.Compile(scriptBuffer, Constants.SCRIPTING_FORMAT_MARKDOWN, Constants.SCRIPTING_TYPE_UTTERANCES)
      fileConvos = this.Compile(scriptBuffer, Constants.SCRIPTING_FORMAT_MARKDOWN, Constants.SCRIPTING_TYPE_CONVO)
    } else {
      debug(`ReadScript - dropped file: ${filename}`)
    }

    // Compilers saved the convos, and we alter here the saved version too
    if (fileConvos) {
      fileConvos.forEach((fileConvo) => {
        fileConvo.sourceTag = { convoDir, filename }
        if (!fileConvo.header.name) {
          fileConvo.header.name = filename
        }
      })
    }
    if (filePartialConvos) {
      filePartialConvos.forEach((filePartialConvo) => {
        filePartialConvo.sourceTag = { convoDir, filename }
        if (!filePartialConvo.header.name) {
          filePartialConvo.header.name = filename
        }
      })
    }
    if (fileScriptingMemories && fileScriptingMemories.length) {
      fileScriptingMemories.forEach((scriptingMemory) => {
        scriptingMemory.sourceTag = { filename }
      })
    }

    if (fileUtterances) {
      this.fileUtterances = this._tagAndCleanupUtterances(fileUtterances, convoDir, filename)
    }
    return { convos: fileConvos, utterances: fileUtterances, pconvos: filePartialConvos, scriptingMemories: fileScriptingMemories }
  }

  _tagAndCleanupUtterances (utteranceFiles, convoDir, filename) {
    return utteranceFiles.map((fileUtt) => {
      fileUtt.sourceTag = { convoDir, filename }
      fileUtt.utterances = fileUtt.utterances
        .filter(u => u)
      return fileUtt
    })
  }

  ExpandScriptingMemoryToConvos () {
    if (!this.caps[Capabilities.SCRIPTING_ENABLE_MEMORY]) {
      debug('ExpandScriptingMemoryToConvos - Scripting memory turned off, no convos expanded')
      return
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
      // // debug output, & filling fileToVariables
      // variables.forEach((variable) => {
      //   const alreadyUsedVariable = convo.beginLogicHook.filter((logicHook) => {
      //     // .substring(1): cut the $ because logichooks
      //     return (logicHook.name === 'SET_SCRIPTING_MEMORY' || logicHook.name === 'CLEAR_SCRIPTING_MEMORY') &&
      //       logicHook.args.indexOf(variable.substring(1)) >= 0
      //   })
      //
      //   if (alreadyUsedVariable.length) {
      //     debug(`ExpandScriptingMemoryToConvos - Convo "${convo.header.name}" - Scripting memory variable "${variable}" defined external (scripting memory file?), and in logicHook(s) "${util.inspect(alreadyUsedVariable)}"`)
      //   }
      // })

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
  }

  ExpandUtterancesToConvos ({ useNameAsIntent, incomprehensionUtt } = {}) {
    const expandedConvos = []

    if (_.isUndefined(useNameAsIntent)) {
      useNameAsIntent = !!this.caps[Capabilities.SCRIPTING_UTTEXPANSION_USENAMEASINTENT]
    }
    if (_.isUndefined(incomprehensionUtt)) {
      incomprehensionUtt = this.caps[Capabilities.SCRIPTING_UTTEXPANSION_INCOMPREHENSION]
    }

    if (useNameAsIntent && incomprehensionUtt) {
      throw new Error('ExpandUtterancesToConvos - SCRIPTING_UTTEXPANSION_USENAMEASINTENT and SCRIPTING_UTTEXPANSION_INCOMPREHENSION are incompatible')
    }
    if (incomprehensionUtt && !this.utterances[incomprehensionUtt]) {
      throw new Error(`ExpandUtterancesToConvos - incomprehension utterance '${incomprehensionUtt}' undefined`)
    }

    if (useNameAsIntent) {
      debug('ExpandUtterancesToConvos - Using utterance name as NLU intent')
    } else if (incomprehensionUtt) {
      debug(`ExpandUtterancesToConvos - Using incomprehension utterance expansion mode: ${incomprehensionUtt}`)
    }

    _.keys(this.utterances).filter(u => u !== incomprehensionUtt).forEach(uttName => {
      const utt = this.utterances[uttName]
      expandedConvos.push(new Convo(this._buildScriptContext(), {
        header: {
          name: utt.name,
          description: `Expanded Utterances - ${utt.name}`
        },
        conversation: [
          {
            sender: 'me',
            messageText: utt.name,
            stepTag: 'Step 1 - tell utterance'
          },
          useNameAsIntent
            ? {
              sender: 'bot',
              asserters: [
                {
                  name: 'INTENT',
                  args: [utt.name]
                }
              ],
              stepTag: 'Step 2 - check intent',
              not: false
            }
            : incomprehensionUtt
              ? {
                sender: 'bot',
                messageText: incomprehensionUtt,
                stepTag: 'Step 2 - check incomprehension',
                not: true
              }
              : {
                sender: 'bot',
                messageText: '',
                stepTag: 'Step 2 - check bot response',
                not: false
              }
        ],
        sourceTag: utt.sourceTag
      }))
    })
    this.convos = this.convos.concat(expandedConvos)
    this._sortConvos()
  }

  ExpandConvos () {
    const expandedConvos = []
    debug(`ExpandConvos - Using utterances expansion mode: ${this.caps[Capabilities.SCRIPTING_UTTEXPANSION_MODE]}`)
    this.convos.forEach((convo) => {
      this._expandConvo(expandedConvos, convo)
    })
    this.convos = expandedConvos
    this._sortConvos()
  }

  /**
   *
   * @param expandedConvos
   * @param currentConvo
   * @param convoStepIndex
   * @param convoStepsStack list of ConvoSteps
   * @private
   */
  _expandConvo (expandedConvos, currentConvo, convoStepIndex = 0, convoStepsStack = []) {
    if (convoStepIndex < currentConvo.conversation.length) {
      const currentStep = currentConvo.conversation[convoStepIndex]
      if (currentStep.sender === 'bot' || currentStep.sender === 'begin' || currentStep.sender === 'end') {
        const currentStepsStack = convoStepsStack.slice()
        currentStepsStack.push(_.cloneDeep(currentStep))
        this._expandConvo(expandedConvos, currentConvo, convoStepIndex + 1, currentStepsStack)
      } else if (currentStep.sender === 'me') {
        if (currentStep.messageText) {
          const parts = currentStep.messageText.split(' ')
          const uttName = parts[0]
          const uttArgs = parts.slice(1)
          if (this.utterances[uttName]) {
            const allutterances = this.utterances[uttName].utterances
            let sampleutterances = allutterances
            if (this.caps[Capabilities.SCRIPTING_UTTEXPANSION_MODE] === 'first') {
              sampleutterances = [allutterances[0]]
            } else if (this.caps[Capabilities.SCRIPTING_UTTEXPANSION_MODE] === 'random') {
              sampleutterances = allutterances
                .map(x => ({ x, r: Math.random() }))
                .sort((a, b) => a.r - b.r)
                .map(a => a.x)
                .slice(0, this.caps[Capabilities.SCRIPTING_UTTEXPANSION_RANDOM_COUNT])
            }
            sampleutterances.forEach((utt, index) => {
              const lineTag = `${index + 1}`.padStart(`${sampleutterances.length}`.length, '0')
              const currentStepsStack = convoStepsStack.slice()
              if (uttArgs) {
                utt = util.format(utt, ...uttArgs)
              }
              currentStepsStack.push(Object.assign(_.cloneDeep(currentStep), { messageText: utt }))
              const currentConvoLabeled = _.cloneDeep(currentConvo)
              Object.assign(currentConvoLabeled.header, { name: `${currentConvo.header.name}/${uttName}-L${lineTag}` })
              this._expandConvo(expandedConvos, currentConvoLabeled, convoStepIndex + 1, currentStepsStack)
            })
            return
          }
        }
        const currentStepsStack = convoStepsStack.slice()
        currentStepsStack.push(_.cloneDeep(currentStep))
        this._expandConvo(expandedConvos, currentConvo, convoStepIndex + 1, currentStepsStack)
      }
    } else {
      expandedConvos.push(Object.assign(_.cloneDeep(currentConvo), { conversation: convoStepsStack }))
    }
  }

  _sortConvos () {
    this.convos = _.sortBy(this.convos, [(convo) => convo.header.sort || convo.header.name])
    let i = 0
    this.convos.forEach((convo) => {
      convo.header.order = ++i
    })
  }

  AddConvos (convos) {
    if (convos && _.isArray(convos)) {
      this.convos = _.concat(this.convos, convos)
    } else if (convos) {
      this.convos.push(convos)
    }
    this._sortConvos()
  }

  AddUtterances (utterances) {
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
      this.scriptingMemories.push(scriptingMemories)
    }
  }
}
