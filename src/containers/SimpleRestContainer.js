const util = require('util')
const async = require('async')
const request = require('request')
const Mustache = require('mustache')
const jp = require('jsonpath')
const mime = require('mime-types')
const uuidv4 = require('uuid/v4')
const _ = require('lodash')
const debug = require('debug')('botium-SimpleRestContainer')

const Events = require('../Events')
const Capabilities = require('../Capabilities')
const BaseContainer = require('./BaseContainer')
const BotiumMockMessage = require('../mocks/BotiumMockMessage')

module.exports = class SimpleRestContainer extends BaseContainer {
  Validate () {
    return super.Validate().then(() => {
      this._AssertCapabilityExists(Capabilities.SIMPLEREST_URL)
      this._AssertCapabilityExists(Capabilities.SIMPLEREST_METHOD)
      this._AssertCapabilityExists(Capabilities.SIMPLEREST_RESPONSE_JSONPATH)

      if (this.caps[Capabilities.SIMPLEREST_INIT_CONTEXT]) {
        _.isObject(this.caps[Capabilities.SIMPLEREST_INIT_CONTEXT]) || JSON.parse(this.caps[Capabilities.SIMPLEREST_INIT_CONTEXT])
      }
    })
  }

  Build () {
    return new Promise((resolve, reject) => {
      async.series([
        (baseComplete) => {
          super.Build().then(() => baseComplete()).catch(baseComplete)
        }

      ], (err) => {
        if (err) {
          return reject(new Error(`Cannot build simplereset container: ${util.inspect(err)}`))
        }
        resolve(this)
      })
    })
  }

  Start () {
    this.eventEmitter.emit(Events.CONTAINER_STARTING, this)

    return new Promise((resolve, reject) => {
      async.series([
        (baseComplete) => {
          super.Start().then(() => baseComplete()).catch(baseComplete)
        },

        (contextInitComplete) => {
          this.view = {
            context: { },
            msg: { },
            botium: {
              conversationId: uuidv4(),
              stepId: null
            }
          }
          if (this.caps[Capabilities.SIMPLEREST_INIT_CONTEXT]) {
            try {
              this.view.context = _.isObject(this.caps[Capabilities.SIMPLEREST_INIT_CONTEXT]) ? this.caps[Capabilities.SIMPLEREST_INIT_CONTEXT] : JSON.parse(this.caps[Capabilities.SIMPLEREST_INIT_CONTEXT])
            } catch (err) {
              contextInitComplete(`parsing SIMPLEREST_INIT_CONTEXT failed, no JSON detected (${util.inspect(err)})`)
            }
          }
          contextInitComplete()
        },

        (pingComplete) => {
          if (this.caps[Capabilities.SIMPLEREST_PING_URL]) {
            this._waitForPingUrl(this.caps[Capabilities.SIMPLEREST_PING_URL]).then(() => pingComplete()).catch(pingComplete)
          } else {
            pingComplete()
          }
        },

        (initComplete) => {
          if (this.caps[Capabilities.SIMPLEREST_INIT_TEXT]) {
            this._doRequest({ messageText: this.caps[Capabilities.SIMPLEREST_INIT_TEXT] }, false).then(() => initComplete()).catch(initComplete)
          } else {
            initComplete()
          }
        }
      ], (err) => {
        if (err) {
          this.eventEmitter.emit(Events.CONTAINER_START_ERROR, this, err)
          return reject(new Error(`Start failed ${util.inspect(err)}`))
        }
        this.eventEmitter.emit(Events.CONTAINER_STARTED, this)
        resolve(this)
      })
    })
  }

  UserSays (mockMsg) {
    this.view.botium.stepId = uuidv4()
    return this._doRequest(mockMsg, true)
  }

  Stop () {
    this.eventEmitter.emit(Events.CONTAINER_STOPPING, this)

    return new Promise((resolve, reject) => {
      async.series([
        (baseComplete) => {
          super.Stop().then(() => baseComplete()).catch(baseComplete)
        }
      ], (err) => {
        if (err) {
          this.eventEmitter.emit(Events.CONTAINER_STOP_ERROR, this, err)
          return reject(new Error(`Stop failed ${util.inspect(err)}`))
        }
        this.eventEmitter.emit(Events.CONTAINER_STOPPED, this)
        resolve(this)
      })
    })
  }

  Clean () {
    this.eventEmitter.emit(Events.CONTAINER_CLEANING, this)

    return new Promise((resolve, reject) => {
      async.series([
        (baseComplete) => {
          super.Clean().then(() => baseComplete()).catch(baseComplete)
        }

      ], (err) => {
        if (err) {
          this.eventEmitter.emit(Events.CONTAINER_CLEAN_ERROR, this, err)
          return reject(new Error(`Cleanup failed ${util.inspect(err)}`))
        }
        this.eventEmitter.emit(Events.CONTAINER_CLEANED, this)
        resolve(this)
      })
    })
  }

  _doRequest (msg, isFromUser) {
    return new Promise((resolve, reject) => {
      const requestOptions = this._buildRequest(msg)
      debug(`constructed requestOptions ${JSON.stringify(requestOptions, null, 2)}`)

      request(requestOptions, (err, response, body) => {
        if (err) {
          reject(new Error(`rest request failed: ${util.inspect(err)}`))
        } else {
          isFromUser && this.eventEmitter.emit(Events.MESSAGE_SENTTOBOT, this, msg)

          if (response.statusCode >= 400) {
            debug(`got error response: ${response.statusCode}/${response.statusMessage}`)
            return reject(new Error(`got error response: ${response.statusCode}/${response.statusMessage}`))
          }
          resolve(this)

          if (body) {
            debug(`got response body: ${JSON.stringify(body, null, 2)}`)

            if (_.isString(body)) {
              try {
                body = JSON.parse(body)
              } catch (err) {
                return reject(new Error(`No valid JSON response, parse error occurred: ${err}`))
              }
            }
            if (!_.isObject(body)) {
              return reject(new Error(`Body not an object, cannot continue. Found type: ${typeof body}`))
            }

            if (this.caps[Capabilities.SIMPLEREST_CONTEXT_JSONPATH]) {
              const contextNodes = jp.query(body, this.caps[Capabilities.SIMPLEREST_CONTEXT_JSONPATH])
              if (_.isArray(contextNodes) && contextNodes.length > 0) {
                this.view.context = contextNodes[0]
                debug(`found context: ${util.inspect(this.view.context)}`)
              } else {
                this.view.context = {}
              }
            } else {
              this.view.context = body
            }

            if (isFromUser) {
              const media = []
              const buttons = []

              if (this.caps[Capabilities.SIMPLEREST_MEDIA_JSONPATH]) {
                const jsonPathMediaCaps = _.pickBy(this.caps, (v, k) => k.startsWith(Capabilities.SIMPLEREST_MEDIA_JSONPATH))
                _(jsonPathMediaCaps).keys().sort().each((key) => {
                  const jsonPath = this.caps[key]
                  const responseMedia = jp.query(body, jsonPath)
                  if (responseMedia) {
                    (_.isArray(responseMedia) ? responseMedia : [ responseMedia ]).forEach(m =>
                      media.push({
                        mediaUri: m,
                        mimeType: mime.lookup(m) || 'application/unknown'
                      })
                    )
                    debug(`found response media: ${util.inspect(media)}`)
                  }
                })
              }
              if (this.caps[Capabilities.SIMPLEREST_BUTTONS_JSONPATH]) {
                const jsonPathButtonsCaps = _.pickBy(this.caps, (v, k) => k.startsWith(Capabilities.SIMPLEREST_BUTTONS_JSONPATH))
                _(jsonPathButtonsCaps).keys().sort().each((key) => {
                  const jsonPath = this.caps[key]
                  const responseButtons = jp.query(body, jsonPath)
                  if (responseButtons) {
                    (_.isArray(responseButtons) ? responseButtons : [ responseButtons ]).forEach(b =>
                      buttons.push({
                        text: b
                      })
                    )
                    debug(`found response buttons: ${util.inspect(buttons)}`)
                  }
                })
              }

              let hasMessageText = false
              if (this.caps[Capabilities.SIMPLEREST_RESPONSE_JSONPATH]) {
                const jsonPathCaps = _.pickBy(this.caps, (v, k) => k.startsWith(Capabilities.SIMPLEREST_RESPONSE_JSONPATH))
                _(jsonPathCaps).keys().sort().each((key) => {
                  const jsonPath = this.caps[key]
                  debug(`eval json path ${jsonPath}`)

                  const responseTexts = jp.query(body, jsonPath)
                  debug(`found response texts: ${util.inspect(responseTexts)}`)

                  const messageTexts = (_.isArray(responseTexts) ? responseTexts : [ responseTexts ])
                  messageTexts.forEach((messageText) => {
                    if (!messageText) return

                    hasMessageText = true
                    const botMsg = { sourceData: body, messageText, media, buttons }
                    this._QueueBotSays(new BotiumMockMessage(botMsg))
                  })
                })
              }
              if (!hasMessageText && (media.length > 0 || buttons.length > 0)) {
                const botMsg = { sourceData: body, media, buttons }
                this._QueueBotSays(new BotiumMockMessage(botMsg))
              }
            }
          }
        }
      })
    })
  }

  _buildRequest (msg) {
    this.view.msg = Object.assign({}, msg)
    var nonEncodedMessage = this.view.msg.messageText
    if (this.view.msg.messageText) {
      this.view.msg.messageText = encodeURIComponent(this.view.msg.messageText)
    }
    const uri = Mustache.render(this.caps[Capabilities.SIMPLEREST_URL], this.view)

    const requestOptions = {
      uri,
      method: this.caps[Capabilities.SIMPLEREST_METHOD]
    }
    if (this.view.msg.messageText) {
      this.view.msg.messageText = nonEncodedMessage
    }
    if (this.caps[Capabilities.SIMPLEREST_HEADERS_TEMPLATE]) {
      const headersTemplate = _.isString(this.caps[Capabilities.SIMPLEREST_HEADERS_TEMPLATE]) ? this.caps[Capabilities.SIMPLEREST_HEADERS_TEMPLATE] : JSON.stringify(this.caps[Capabilities.SIMPLEREST_HEADERS_TEMPLATE])
      try {
        requestOptions.headers = JSON.parse(Mustache.render(headersTemplate, this.view))
      } catch (err) {
        throw new Error(`composing headers from SIMPLEREST_HEADERS_TEMPLATE failed (${util.inspect(err)})`)
      }
    }
    if (this.caps[Capabilities.SIMPLEREST_BODY_TEMPLATE]) {
      const bodyTemplate = _.isString(this.caps[Capabilities.SIMPLEREST_BODY_TEMPLATE]) ? this.caps[Capabilities.SIMPLEREST_BODY_TEMPLATE] : JSON.stringify(this.caps[Capabilities.SIMPLEREST_HEADERS_TEMPLATE])

      try {
        requestOptions.body = Mustache.render(bodyTemplate, this.view)
      } catch (err) {
        throw new Error(`composing body from SIMPLEREST_BODY_TEMPLATE failed (${util.inspect(err)})`)
      }
      if (!this.caps[Capabilities.SIMPLEREST_BODY_RAW]) {
        requestOptions.body = JSON.parse(requestOptions.body)
        requestOptions.json = true
      }
    }
    return requestOptions
  }

  _waitForPingUrl (pingUrl) {
    return new Promise((resolve, reject) => {
      let online = false
      async.until(
        () => online,
        (callback) => {
          debug(`_waitForPingUrl checking url ${pingUrl} before proceed`)

          request({
            uri: pingUrl,
            method: 'GET'
          }, (err, response, body) => {
            if (err) {
              debug(`_waitForPingUrl error on url check ${pingUrl}: ${err}`)
              setTimeout(callback, 2000)
            } else if (response.statusCode >= 400) {
              debug(`_waitForPingUrl on url check ${pingUrl} got error response: ${response.statusCode}/${response.statusMessage}`)
              setTimeout(callback, 2000)
            } else {
              debug(`_waitForPingUrl success on url check ${pingUrl}: ${err}`)
              online = true
              callback()
            }
          })
        },
        (err) => {
          if (err) return reject(err)
          resolve()
        })
    })
  }
}
