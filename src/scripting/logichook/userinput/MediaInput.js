const fs = require('fs')
const path = require('path')
const globby = require('globby')
const request = require('request')
const mime = require('mime-types')
const url = require('url')
const _ = require('lodash')

const { BotiumMockMedia } = require('../../../../src/mocks/BotiumMockRichMessageTypes')
const { BotiumError } = require('../../../../src/scripting/BotiumError')
const Capabilities = require('../../../../src/Capabilities')

const DEFAULT_BASE_SELECTOR = 'sourceTag.testSetId'

module.exports = class MediaInput {
  constructor (context, caps = {}, globalArgs = {}) {
    this.context = context
    this.caps = caps
    this.globalArgs = globalArgs
  }

  _getResolvedUri (uri, convo) {
    if (this.globalArgs && this.globalArgs.baseUris) {
      const baseUrisSelector = _.get(convo, this.globalArgs.baseSelector || DEFAULT_BASE_SELECTOR)
      if (baseUrisSelector && this.globalArgs.baseUris[baseUrisSelector]) {
        return new url.URL(uri, this.globalArgs.baseUris[baseUrisSelector])
      }
    }
    if (this.globalArgs && this.globalArgs.baseUri) {
      return new url.URL(uri, this.globalArgs.baseUri)
    }
    if (this.globalArgs && (this.globalArgs.baseDir || this.globalArgs.baseDirs)) {
      let basePath = null
      if (this.globalArgs.baseDirs) {
        const baseDirSelector = _.get(convo, this.globalArgs.baseSelector || DEFAULT_BASE_SELECTOR)
        if (baseDirSelector && this.globalArgs.baseDirs[baseDirSelector]) {
          basePath = path.resolve(this.globalArgs.baseDirs[baseDirSelector])
        }
      }
      if (!basePath && this.globalArgs.baseDir) {
        basePath = path.resolve(this.globalArgs.baseDir)
      }
      if (basePath) {
        if (!path.resolve(basePath, uri).startsWith(basePath)) {
          throw new Error(`The uri '${uri}' is pointing out of the base directory '${basePath}'`)
        }
        return new url.URL(uri, `file://${basePath}/`)
      }
    }
    if (uri.startsWith('http://') || uri.startsWith('https://')) {
      return new url.URL(uri)
    }
    if (!this.caps[Capabilities.SECURITY_ALLOW_UNSAFE]) {
      throw new BotiumError(
        'Security Error. Using base dir global argument in MediaInput is required',
        {
          type: 'security',
          subtype: 'allow unsafe',
          source: path.basename(__filename),
          cause: { globalArgs: this.globalArgs }
        }
      )
    }
    const convoDir = _.get(convo, 'sourceTag.convoDir')
    const convoFilename = _.get(convo, 'sourceTag.filename')
    if (convoDir && convoFilename) {
      const basePath = path.resolve(convoDir)
      if (!path.resolve(convoDir, uri).startsWith(basePath)) {
        throw new Error(`The uri '${uri}' is pointing out of the base directory '${basePath}'`)
      }
      return new url.URL(uri, `file://${basePath}/${convoFilename}`)
    } else {
      try {
        return new url.URL(uri)
      } catch (err) {
        return new url.URL(uri, 'file://.')
      }
    }
  }

  _getBaseDir (convo) {
    if (this.globalArgs && this.globalArgs.baseDirs) {
      const baseDirSelector = _.get(convo, this.globalArgs.baseSelector || DEFAULT_BASE_SELECTOR)
      if (baseDirSelector && this.globalArgs.baseDirs[baseDirSelector]) {
        return path.resolve(this.globalArgs.baseDirs[baseDirSelector])
      }
    }
    if (this.globalArgs && this.globalArgs.baseDir) {
      return path.resolve(this.globalArgs.baseDir)
    }
    if (!this.caps[Capabilities.SECURITY_ALLOW_UNSAFE]) {
      throw new BotiumError(
        'Security Error. Using base dir global argument in MediaInput is required',
        {
          type: 'security',
          subtype: 'allow unsafe',
          source: path.basename(__filename),
          cause: { globalArgs: this.globalArgs }
        }
      )
    }
    const convoDir = _.get(convo, 'sourceTag.convoDir')
    if (convoDir) {
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
    const hasWildcard = args.findIndex(a => this._isWildcard(a)) >= 0

    if (args && (args.length > 1 || hasWildcard)) {
      const baseDir = this._getBaseDir(convo)
      return args.reduce((e, arg) => {
        if (this._isWildcard(arg)) {
          const mediaFiles = globby.sync(arg, { cwd: baseDir, gitignore: true })
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
      const uri = this._getResolvedUri(args[0], convo)
      if (uri) {
        const buffer = await this._downloadMedia(uri)
        meMsg.media.push(new BotiumMockMedia({
          mediaUri: args[0],
          downloadUri: uri.toString(),
          mimeType: mime.lookup(args[0]),
          buffer
        }))
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
