const fs = require('fs')
const path = require('path')
const request = require('request')
const mime = require('mime-types')
const url = require('url')
const _ = require('lodash')

module.exports = class MediaInput {
  constructor (context, caps = {}, globalArgs = {}) {
    this.context = context
    this.caps = caps
    this.globalArgs = globalArgs
  }

  _getResolvedUri (uri, convoDir, convoFilename) {
    if (this.globalArgs && this.globalArgs.baseUri) {
      return new url.URL(uri, this.globalArgs.baseUri)
    } else if (this.globalArgs && this.globalArgs.baseDir) {
      const basePath = path.resolve(this.globalArgs.baseDir)
      return new url.URL(uri, `file://${basePath}/`)
    } else if (convoDir && convoFilename) {
      const basePath = path.resolve(convoDir)
      return new url.URL(uri, `file://${basePath}/${convoFilename}`)
    } else {
      try {
        return new url.URL(uri)
      } catch (err) {
        return new url.URL(uri, 'file://.')
      }
    }
  }

  async _downloadMedia (uri) {
    if (this.globalArgs && this.globalArgs.downloadMedia) {
      if (uri.protocol === 'file:') {
        try {
          return fs.readFileSync(uri)
        } catch (err) {
          throw new Error(`downloadMedia failed: ${err.message}`)
        }
      } else if (uri.protocol === 'http:' || uri.protocol === 'https:') {
        return new Promise((resolve, reject) => {
          request({
            uri: uri.toString(),
            method: 'GET',
            followAllRedirects: true,
            encoding: null,
            timeout: this.globalArgs.downloadTimeout || 10000
          }, (err, response, body) => {
            if (err) {
              reject(new Error(`downloadMedia failed: ${err.message}`))
            } else {
              if (response.statusCode >= 400) {
                return reject(new Error(`downloadMedia failed: ${response.statusCode}/${response.statusMessage}`))
              }
              resolve(body)
            }
          })
        })
      }
    }
  }

  async setUserInput ({ convoStep, args, meMsg, convo }) {
    if (!args || args.length === 0 || args.length > 2) {
      return Promise.reject(new Error(`${convoStep.stepTag}: MediaInput requires at least 1 and at most 2 arguments`))
    }
    if (args.length === 2 && !_.isBuffer(args[1])) {
      return Promise.reject(new Error(`${convoStep.stepTag}: MediaInput requires 2nd argument to be a Buffer`))
    }

    if (!meMsg.media) {
      meMsg.media = []
    }

    if (args.length === 1) {
      try {
        const uri = this._getResolvedUri(args[0], convo.sourceTag.convoDir, convo.sourceTag.filename)
        if (uri) {
          const buffer = await this._downloadMedia(uri)
          meMsg.media.push({
            mediaUri: args[0],
            downloadUri: uri.toString(),
            mimeType: mime.lookup(args[0]),
            buffer
          })
        }
      } catch (err) {
        throw new Error(err.message)
      }
    } else if (args.length === 2) {
      meMsg.media.push({
        mediaUri: args[0],
        mimeType: mime.lookup(args[0]),
        buffer: args[1]
      })
    }
  }
}
