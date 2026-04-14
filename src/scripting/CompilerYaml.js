import YAML from 'yaml'
import CompilerObjectBase from './CompilerObjectBase.js'

export default class CompilerYaml extends CompilerObjectBase {
  constructor (context, caps = {}) {
    super(context, caps)
  }

  Deserialize (scriptData) {
    return YAML.parse(scriptData)
  }
};
