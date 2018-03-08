const fs = require('fs')
const path = require('path')
const glob = require('glob')
const _ = require('lodash')
const debug = require('debug')('botium-ScriptingProvider')

const Constants = require('./Constants')
const Capabilities = require('../Capabilities')

const globPattern = '**/+(*.convo.txt|*.utterances.txt|*.xlsx)'

module.exports = class ScriptingProvider {
  constructor (caps = {}) {
    this.caps = caps
    this.compilers = {}
    this.convos = []
    this.utterances = { }
    this.match = null

    this.scriptingEvents = {
      assertBotResponse: (botresponse, tomatch, stepTag) => {
        if (!_.isArray(tomatch)) {
          if (this.utterances[tomatch]) {
            tomatch = this.utterances[tomatch].utterances
          } else {
            tomatch = [ tomatch ]
          }
        }
        const found = _.find(tomatch, (utt) => this.match(botresponse, utt))
        if (!found) {
          throw new Error(`${stepTag}: Expected bot response "${botresponse}" to match one of "${tomatch}"`)
        }
      },
      assertBotNotResponse: (botresponse, nottomatch, stepTag) => {
        try {
          this.scriptingEvents.assertBotResponse(botresponse, nottomatch)
          throw new Error(`${stepTag}: Expected bot response "${botresponse}" NOT to match one of "${nottomatch}"`)
        } catch (err) {
        }
      },
      fail: (msg) => {
        throw new Error(msg)
      }
    }
  }

  Build () {
    const CompilerXlsx = require('./CompilerXlsx')
    this.compilers[Constants.SCRIPTING_FORMAT_XSLX] = new CompilerXlsx(this, this.caps)
    this.compilers[Constants.SCRIPTING_FORMAT_XSLX].Validate()
    const CompilerTxt = require('./CompilerTxt')
    this.compilers[Constants.SCRIPTING_FORMAT_TXT] = new CompilerTxt(this, this.caps)
    this.compilers[Constants.SCRIPTING_FORMAT_TXT].Validate()

    debug('Using matching mode: ' + this.caps[Capabilities.SCRIPTING_MATCHING_MODE])
    if (this.caps[Capabilities.SCRIPTING_MATCHING_MODE] === 'regexp') {
      this.match = (botresponse, utterance) => (new RegExp(utterance, 'i')).test(botresponse)
    } else if (this.caps[Capabilities.SCRIPTING_MATCHING_MODE] === 'include') {
      this.match = (botresponse, utterance) => botresponse.indexOf(utterance) >= 0
    } else {
      this.match = (botresponse, utterance) => botresponse === utterance
    }
  }

  Compile (scriptBuffer, scriptFormat, scriptType) {
    let compiler = this.GetCompiler(scriptFormat)
    return compiler.Compile(scriptBuffer, scriptType)
  }

  Decompile (convos, scriptFormat) {
    let compiler = this.GetCompiler(scriptFormat)
    return compiler.Decompile(convos)
  }

  GetCompiler (scriptFormat) {
    const result = this.compilers[scriptFormat]
    if (result) return result
    throw new Error(`No compiler found for scriptFormat ${scriptFormat}`)
  }

  ReadScriptsFromDirectory (convoDir) {
    const filelist = glob.sync(globPattern, { cwd: convoDir })
    debug(`ReadConvosFromDirectory(${convoDir}) found filenames: ${filelist}`)

    filelist.forEach((filename) => {
      this.ReadScript(convoDir, filename)
    })
    debug(`ReadConvosFromDirectory(${convoDir}) found convos:\n ${this.convos ? this.convos.join('\n') : 'none'}`)
    debug(`ReadConvosFromDirectory(${convoDir}) found utterances:\n ${this.utterances ? _.map(this.utterances, (u) => u).join('\n') : 'none'}`)
  }

  ReadScript (convoDir, filename) {
    let fileConvos = []

    const scriptBuffer = fs.readFileSync(path.resolve(convoDir, filename))

    if (filename.endsWith('.xlsx')) {
      this.Compile(scriptBuffer, Constants.SCRIPTING_FORMAT_XSLX, Constants.SCRIPTING_TYPE_UTTERANCES)
      fileConvos = this.Compile(scriptBuffer, Constants.SCRIPTING_FORMAT_XSLX, Constants.SCRIPTING_TYPE_CONVO)
    } else if (filename.endsWith('.convo.txt')) {
      fileConvos = this.Compile(scriptBuffer, Constants.SCRIPTING_FORMAT_TXT, Constants.SCRIPTING_TYPE_CONVO)
    } else if (filename.endsWith('.utterances.txt')) {
      this.Compile(scriptBuffer, Constants.SCRIPTING_FORMAT_TXT, Constants.SCRIPTING_TYPE_UTTERANCES)
    }
    if (fileConvos) {
      fileConvos.forEach((fileConvo) => {
        fileConvo.filename = filename
        if (!fileConvo.header.name) {
          fileConvo.header.name = filename
        }
      })
    }
  }

  AddConvos (convos) {
    if (convos && _.isArray(convos)) {
      this.convos = _.concat(this.convos, convos)
    } else if (convos) {
      this.convos.push(convos)
    }
  }

  AddUtterances (utterances) {
    if (utterances && !_.isArray(utterances)) {
      utterances = [ utterances ]
    }
    if (utterances) {
      _.forEach(utterances, (utt) => {
        let eu = this.utterances[utt.name]
        if (eu) {
          eu.utterances = _.uniq(_.concat(eu.utterances, utt.utterances))
        } else {
          this.utterances[utt.name] = utt
        }
      })
    }
  }
}
