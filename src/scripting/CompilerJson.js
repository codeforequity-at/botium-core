const CompilerObjectBase = require('./CompilerObjectBase')
const { convoStepToObject } = require('./helper')

module.exports = class CompilerJson extends CompilerObjectBase {
  constructor (context, caps = {}) {
    super(context, caps)
  }

  Deserialize (scriptData) {
    return JSON.parse(scriptData)
  }

  Decompile (convos) {
    const result = convos.map(convo => ({
      name: convo.header.name,
      description: convo.header.description,
      steps: convo.conversation.map(set => ({
        [set.sender]: convoStepToObject(set)
      }))
    }))
    return JSON.stringify({ convos: result }, null, 2)
  }
}
