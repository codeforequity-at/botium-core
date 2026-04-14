import { mediaFromMsg } from '../helpers.js'
import BaseCountAsserter from './BaseCountAsserter.js'

const _mediaCount = ({ botMsg }) => {
  return mediaFromMsg(botMsg, true).length || 0
}

export default class MediaCountRecAsserter extends BaseCountAsserter {
  constructor (context, caps = {}) {
    super(context, caps, 'Media')
    this.name = 'Media Count (recursive) Asserter'
  }

  async _getCount (argv) { return _mediaCount(argv) }
};
