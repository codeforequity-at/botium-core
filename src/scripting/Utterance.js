const util = require('util')
const _ = require('lodash')

module.exports = class Utterance {
  constructor (fromJson = {}) {
    this.name = fromJson.name
    this.sourceTag = fromJson.sourceTag
    this.utterances = []
    if (fromJson.utterances && _.isArray(fromJson.utterances)) {
      this.utterances = fromJson.utterances
    } else if (fromJson.utterances) {
      this.utterances.push(fromJson.utterances)
    }
  }

  toString () { return this.name + (this.sourceTag ? ` (${util.inspect(this.sourceTag)})` : '') + ': ' + this.utterances.join('|') }
}
