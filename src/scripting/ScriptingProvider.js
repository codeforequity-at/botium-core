const _ = require('lodash')

const Constants = require('./Constants')

module.exports = class ScriptingProvider {
  constructor (caps = {}) {
    this.caps = caps
    this.compilers = {}
    this.convos = []
    this.utterances = { }

    this.scriptingEvents = {
      assertBotResponse: (botresponse, tomatch, stepTag) => {
        if (!_.isArray(tomatch)) {
          if (this.utterances[tomatch]) {
            tomatch = this.utterances[tomatch].utterances
          } else {
            tomatch = [ tomatch ]
          }
        }

        const found = _.find(tomatch, (utt) => botresponse.match(utt))
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
    return this
  }

  Compile (scriptBuffer, scriptFormat, scriptType) {
    let compiler = this.GetCompiler(scriptFormat)
    return compiler.Compile(scriptBuffer, scriptType)
  }

  GetCompilerForFile (fileName) {
    if (fileName.endsWith('.xslx')) {
      return this.GetCompiler(this.caps, Constants.SCRIPTING_FORMAT_XSLX)
    }
    if (fileName.endsWith('.txt')) {
      return this.GetCompiler(this.caps, Constants.SCRIPTING_FORMAT_TXT)
    }
    if (fileName.endsWith('.yml') || fileName.endsWith('.yaml')) {
      return this.GetCompiler(this.caps, Constants.SCRIPTING_FORMAT_YAML)
    }
    throw new Error(`No compiler found for fileName ${fileName}`)
  }

  GetCompiler (scriptFormat) {
    const result = this.compilers[scriptFormat]
    if (result) return result
    throw new Error(`No compiler found for scriptFormat ${scriptFormat}`)
  }

  AddConvos (convos) {
    if (convos && _.isArray(convos)) {
      this.convos = _.concat(this.convos, convos)
    } else if (convos) {
      this.convos.push(convos)
    }
  }

  AddUtterances (utterances) {
    if (utterances && _.isArray(utterances)) {
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
