import { mediaFromMsg } from '../helpers.js'
import BaseCountAsserter from './BaseCountAsserter.js'

const _mediaCount = ({ botMsg }) => {
  return mediaFromMsg(botMsg, false).length
}

export default class MediaCountAsserter extends BaseCountAsserter {
  constructor (context, caps = {}) {
    super(context, caps, 'Media')
    this.name = 'Media Attachment Count Asserter'
  }

  async _getCount (argv) { return _mediaCount(argv) }
};
