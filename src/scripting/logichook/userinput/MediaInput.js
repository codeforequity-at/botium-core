const fs = require('fs')
const path = require('path')
const glob = require('glob')
const request = require('request')
const mime = require('mime-types')
const url = require('url')
const _ = require('lodash')

const { BotiumMockMedia } = require('../../../../src/mocks/BotiumMockRichMessageTypes')

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

  _getBaseDir (convoDir) {
    if (this.globalArgs && this.globalArgs.baseDir) {
      return path.resolve(this.globalArgs.baseDir)
    } else if (convoDir) {
      return path.resolve(convoDir)
    } else {
      return '.'
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

  _isWildcard (arg) {
    return arg.indexOf('*') >= 0
  }

  expandConvo ({ convo, convoStep, args }) {
    if (args && (args.length > 1 || args.findIndex(a => this._isWildcard(a)) >= 0)) {
      const baseDir = this._getBaseDir(convo.sourceTag.convoDir)
      return args.reduce((e, arg) => {
        if (this._isWildcard(arg)) {
          const mediaFiles = glob.sync(arg, { cwd: baseDir })
          mediaFiles.forEach(mf => {
            e.push({
              name: 'MEDIA',
              args: [mf]
            })
          })
        } else {
          e.push({
            name: 'MEDIA',
            args: [arg]
          })
        }
        return e
      }, [])
    }
    return null
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
          meMsg.media.push(new BotiumMockMedia({
            mediaUri: args[0],
            downloadUri: uri.toString(),
            mimeType: mime.lookup(args[0]),
            buffer
          }))
        }
      } catch (err) {
        throw new Error(err.message)
      }
    } else if (args.length === 2) {
      meMsg.media.push(new BotiumMockMedia({
        mediaUri: args[0],
        mimeType: mime.lookup(args[0]),
        buffer: args[1]
      }))
    }
  }
}
