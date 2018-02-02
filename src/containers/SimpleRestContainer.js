const util = require('util')
const async = require('async')
const request = require('request')
const Mustache = require('mustache')
const jp = require('jsonpath')
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
        JSON.parse(this.caps[Capabilities.SIMPLEREST_INIT_CONTEXT])
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
            msg: { }
          }
          if (this.caps[Capabilities.SIMPLEREST_INIT_CONTEXT]) {
            this.view.context = JSON.parse(this.caps[Capabilities.SIMPLEREST_INIT_CONTEXT])
          }
          contextInitComplete()
        },

        (initComplete) => {
          if (this.caps[Capabilities.SIMPLEREST_INIT_TEXT]) {
            this.view.msg = { messageText: this.caps[Capabilities.SIMPLEREST_INIT_TEXT] }
            this._doRequest(false).then(() => initComplete()).catch(initComplete)
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
    this.view.msg = mockMsg
    return this._doRequest(true)
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

  _doRequest (evalResponseBody) {
    const requestOptions = this._buildRequest()
    debug(`constructed requestOptions ${util.inspect(requestOptions)}`)

    return new Promise((resolve, reject) => {
      request(requestOptions, (err, response, body) => {
        if (err) {
          reject(new Error(`rest request failed: ${util.inspect(err)}`))
        } else {
          this.eventEmitter.emit(Events.MESSAGE_SENTTOBOT, this, this.view.msg)

          if (response.statusCode >= 400) {
            debug(`got error response: ${response.statusCode}/${response.statusMessage}`)
            return reject(new Error(`got error response: ${response.statusCode}/${response.statusMessage}`))
          }

          if (body) {
            debug(`got response body: ${util.inspect(body)}`)

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

            if (evalResponseBody) {
              if (this.caps[Capabilities.SIMPLEREST_RESPONSE_JSONPATH]) {
                const responseTexts = jp.query(body, this.caps[Capabilities.SIMPLEREST_RESPONSE_JSONPATH])
                debug(`found response texts: ${util.inspect(responseTexts)}`)

                const messageTexts = (_.isArray(responseTexts) ? responseTexts : [ responseTexts ])
                messageTexts.forEach((messageText) => {
                  if (!messageText) return

                  const botMsg = { sourceData: body, messageText }
                  this._QueueBotSays(new BotiumMockMessage(botMsg))
                  this.eventEmitter.emit(Events.MESSAGE_RECEIVEDFROMBOT, this, botMsg)
                })
              }
            }
          }

          resolve(this)
        }
      })
    })
  }

  _buildRequest () {
    this.view.msg.messageText = encodeURIComponent(this.view.msg.messageText)
    const uri = Mustache.render(this.caps[Capabilities.SIMPLEREST_URL], this.view)

    const requestOptions = {
      uri,
      method: this.caps[Capabilities.SIMPLEREST_METHOD],
      json: true
    }
    if (this.caps[Capabilities.SIMPLEREST_HEADERS_TEMPLATE]) {
      requestOptions.headers = JSON.parse(Mustache.render(this.caps[Capabilities.SIMPLEREST_HEADERS_TEMPLATE], this.view))
    }
    if (this.caps[Capabilities.SIMPLEREST_BODY_TEMPLATE]) {
      requestOptions.body = JSON.parse(Mustache.render(this.caps[Capabilities.SIMPLEREST_BODY_TEMPLATE], this.view))
    }
    return requestOptions
  }
}
