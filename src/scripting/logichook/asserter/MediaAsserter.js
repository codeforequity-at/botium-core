const { BotiumError } = require('../../BotiumError')
const { mediaFromMsg } = require('../helpers')

module.exports = class MediaAsserter {
  constructor (context, caps = {}) {
    this.context = context
    this.caps = caps
    this.name = 'MediaAsserter'
  }

  _evalMedia (args, botMsg) {
    const allMedia = mediaFromMsg(botMsg, true).map(m => m.mediaUri)
    if (!args || args.length === 0) {
      return { allMedia, mediaNotFound: [], mediaFound: allMedia }
    }

    const mediaNotFound = []
    const mediaFound = []
    for (let i = 0; i < (args || []).length; i++) {
      if (allMedia.findIndex(c => this.context.Match(c, args[i])) < 0) {
        mediaNotFound.push(args[i])
      } else {
        mediaFound.push(args[i])
      }
    }
    return { allMedia, mediaNotFound, mediaFound }
  }

  assertNotConvoStep ({ convo, convoStep, args = [], botMsg = [] }) {
    const { allMedia, mediaFound } = this._evalMedia(args, botMsg)
    if (mediaFound.length > 0) {
      return Promise.reject(new BotiumError(
        `${convoStep.stepTag}: Not expected media with uri "${mediaFound}"`,
        {
          type: 'asserter',
          source: this.name,
          context: {
            // effective arguments getting from constructor
            constructor: {},
            params: {
              args
            }
          },
          cause: {
            not: true,
            expected: args,
            actual: allMedia,
            diff: mediaFound
          }
        }
      ))
    }
    return Promise.resolve()
  }

  assertConvoStep ({ convo, convoStep, args = [], botMsg = [] }) {
    const { allMedia, mediaNotFound, mediaFound } = this._evalMedia(args, botMsg)
    if (!args || args.length === 0) {
      if (!mediaFound.length) {
        return Promise.reject(new BotiumError(
          `${convoStep.stepTag}: Expected some media`,
          {
            type: 'asserter',
            source: this.name,
            context: {
              // effective arguments getting from constructor
              constructor: {},
              params: {
                args
              }
            },
            cause: {
              not: false,
              expected: args,
              actual: allMedia,
              diff: mediaNotFound
            }
          }
        ))
      }
    } else if (mediaNotFound.length > 0) {
      return Promise.reject(new BotiumError(
        `${convoStep.stepTag}: Expected media with uri "${mediaNotFound}"`,
        {
          type: 'asserter',
          source: this.name,
          context: {
            // effective arguments getting from constructor
            constructor: {},
            params: {
              args
            }
          },
          cause: {
            not: false,
            expected: args,
            actual: allMedia,
            diff: mediaNotFound
          }
        }
      ))
    }
    return Promise.resolve()
  }
}
