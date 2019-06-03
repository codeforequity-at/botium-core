const util = require('util')
const async = require('async')
const request = require('request')
const Mustache = require('mustache')
const jp = require('jsonpath')
const mime = require('mime-types')
const uuidv4 = require('uuid/v4')
const _ = require('lodash')
const debug = require('debug')('botium-SimpleRestContainer')
const path = require('path')
const fs = require('fs')
const vm = require('vm')

const botiumUtils = require('../../helpers/Utils')
const Capabilities = require('../../Capabilities')
const { SCRIPTING_FUNCTIONS } = require('../../scripting/ScriptingMemory')

module.exports = class SimpleRestContainer {
  constructor ({ queueBotSays, caps }) {
    this.queueBotSays = queueBotSays
    this.caps = caps
  }

  Validate () {
    if (!this.caps[Capabilities.SIMPLEREST_URL]) throw new Error('SIMPLEREST_URL capability required')
    if (!this.caps[Capabilities.SIMPLEREST_METHOD]) throw new Error('SIMPLEREST_METHOD capability required')
    if (!this.caps[Capabilities.SIMPLEREST_RESPONSE_JSONPATH]) throw new Error('SIMPLEREST_RESPONSE_JSONPATH capability required')
    if (this.caps[Capabilities.SIMPLEREST_INIT_CONTEXT]) {
      _.isObject(this.caps[Capabilities.SIMPLEREST_INIT_CONTEXT]) || JSON.parse(this.caps[Capabilities.SIMPLEREST_INIT_CONTEXT])
    }
    this.requestHook = this._getHook(this.caps[Capabilities.SIMPLEREST_REQUEST_HOOK])
    this.responseHook = this._getHook(this.caps[Capabilities.SIMPLEREST_RESPONSE_HOOK])
  }

  Start () {
    return new Promise((resolve, reject) => {
      async.series([
        (contextInitComplete) => {
          this.view = {
            context: {},
            msg: {},
            botium: {
              conversationId: null,
              stepId: null
            },
            // Mustache deals with fuctions with, or without parameters differently.
            // -> we have to add our functions differently, if they have param or not.
            // -> optional parameters are not working here!
            // (render(text) is required for forcing mustache to replace valiables in the text first,
            // then send it to the function.)
            // (mapKeys: remove starting $)
            fnc: _.mapValues(_.mapKeys(SCRIPTING_FUNCTIONS, (value, key) => key.substring(1)), (theFunction) => {
              return theFunction.length ? function () { return (text, render) => theFunction(render(text)) } : theFunction
            })
          }

          if (this.caps[Capabilities.SIMPLEREST_CONVERSATION_ID_TEMPLATE]) {
            const template = _.isString(this.caps[Capabilities.SIMPLEREST_CONVERSATION_ID_TEMPLATE]) ? this.caps[Capabilities.SIMPLEREST_CONVERSATION_ID_TEMPLATE] : JSON.stringify(this.caps[Capabilities.SIMPLEREST_CONVERSATION_ID_TEMPLATE])
            this.view.botium.conversationId = Mustache.render(template, this.view)
          } else {
            this.view.botium.conversationId = uuidv4()
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
            const uri = this.caps[Capabilities.SIMPLEREST_PING_URL]
            const verb = this.caps[Capabilities.SIMPLEREST_PING_VERB]
            const timeout = this.caps[Capabilities.SIMPLEREST_PING_TIMEOUT]
            const { body } = botiumUtils.optionalJson(this.caps[Capabilities.SIMPLEREST_PING_BODY])
            const pingConfig = {
              method: verb,
              uri: uri,
              body: body,
              timeout: timeout
            }
            const retries = this.caps[Capabilities.SIMPLEREST_PING_RETRIES]
            this._waitForPingUrl(pingConfig, retries).then(() => pingComplete()).catch(pingComplete)
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
          return reject(new Error(`Start failed ${util.inspect(err)}`))
        }
        resolve()
      })
    })
  }

  UserSays (mockMsg) {
    return this._doRequest(mockMsg, true)
  }

  Stop () {
    this.view = {}
  }

  // Separated just for better module testing
  _processBodyAsync (body, isFromUser) {
    this._processBodyAsyncImpl(body, isFromUser).forEach(entry => this.queueBotSays(entry))
  }

  // Separated just for better module testing
  _processBodyAsyncImpl (body, isFromUser) {
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

    const result = []
    if (isFromUser) {
      const media = []
      const buttons = []

      if (this.caps[Capabilities.SIMPLEREST_MEDIA_JSONPATH]) {
        const jsonPathMediaCaps = _.pickBy(this.caps, (v, k) => k.startsWith(Capabilities.SIMPLEREST_MEDIA_JSONPATH))
        _(jsonPathMediaCaps).keys().sort().each((key) => {
          const jsonPath = this.caps[key]
          const responseMedia = jp.query(body, jsonPath)
          if (responseMedia) {
            (_.isArray(responseMedia) ? _.flattenDeep(responseMedia) : [responseMedia]).forEach(m =>
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
            (_.isArray(responseButtons) ? _.flattenDeep(responseButtons) : [responseButtons]).forEach(b =>
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

          const messageTexts = (_.isArray(responseTexts) ? _.flattenDeep(responseTexts) : [responseTexts])
          messageTexts.forEach((messageText) => {
            if (!messageText) return

            hasMessageText = true
            const botMsg = { sourceData: body, messageText, media, buttons }
            this._executeHookWeak(this.responseHook, Object.assign({ botMsg, responseJsonPathKey: key }, this.view))
            result.push(botMsg)
          })
        })
      }
      if (!hasMessageText) {
        const botMsg = { messageText: '', sourceData: body, media, buttons }
        this._executeHookWeak(this.responseHook, Object.assign({ botMsg }, this.view))
        result.push(botMsg)
      }
    }
    return result
  }

  _doRequest (msg, isFromUser) {
    return new Promise((resolve, reject) => {
      const requestOptions = this._buildRequest(msg)
      debug(`constructed requestOptions ${JSON.stringify(requestOptions, null, 2)}`)

      request(requestOptions, (err, response, body) => {
        if (err) {
          reject(new Error(`rest request failed: ${util.inspect(err)}`))
        } else {
          if (response.statusCode >= 400) {
            debug(`got error response: ${response.statusCode}/${response.statusMessage}`)
            return reject(new Error(`got error response: ${response.statusCode}/${response.statusMessage}`))
          }

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
            // dont block caller process with responding in its time
            setTimeout(() => this._processBodyAsync(body, isFromUser), 0)
          }

          resolve(this)
        }
      })
    })
  }

  _buildRequest (msg) {
    this.view.msg = Object.assign({}, msg)

    let nonEncodedMessage = this.view.msg.messageText
    if (this.view.msg.messageText) {
      this.view.msg.messageText = encodeURIComponent(this.view.msg.messageText)
    }

    if (this.caps[Capabilities.SIMPLEREST_STEP_ID_TEMPLATE]) {
      const template = _.isString(this.caps[Capabilities.SIMPLEREST_STEP_ID_TEMPLATE]) ? this.caps[Capabilities.SIMPLEREST_STEP_ID_TEMPLATE] : JSON.stringify(this.caps[Capabilities.SIMPLEREST_STEP_ID_TEMPLATE])
      this.view.botium.stepId = Mustache.render(template, this.view)
    } else {
      this.view.botium.stepId = uuidv4()
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
      const bodyTemplate = _.isString(this.caps[Capabilities.SIMPLEREST_BODY_TEMPLATE]) ? this.caps[Capabilities.SIMPLEREST_BODY_TEMPLATE] : JSON.stringify(this.caps[Capabilities.SIMPLEREST_BODY_TEMPLATE])

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
    this._executeHookWeak(this.requestHook, Object.assign({ requestOptions }, this.view))

    return requestOptions
  }

  _waitForPingUrl (pingConfig, retries) {
    return new Promise((resolve, reject) => {
      let finished = false
      let tries = 0
      async.until(
        () => finished,
        (callback) => {
          debug(`_waitForPingUrl checking url ${pingConfig.uri} before proceed`)
          if (tries > retries) {
            finished = true
            callback(new Error(`Failed to ping bot after ${retries} retries`))
            return
          }
          tries++
          request(pingConfig, (err, response, body) => {
            if (err) {
              debug(`_waitForPingUrl error on url check ${pingConfig.uri}: ${err}`)
              setTimeout(callback, pingConfig.timeout)
            } else if (response.statusCode >= 400) {
              debug(`_waitForPingUrl on url check ${pingConfig.uri} got error response: ${response.statusCode}/${response.statusMessage}`)
              setTimeout(callback, pingConfig.timeout)
            } else {
              debug(`_waitForPingUrl success on url check ${pingConfig.uri}: ${err}`)
              finished = true
              callback(null, response)
            }
          })
        },
        (err, response) => {
          if (err) return reject(err)
          return resolve(response)
        })
    })
  }

  _executeHookWeak (hook, args) {
    if (!hook) {
      return
    }
    if (_.isFunction(hook)) {
      hook(args)
      return
    }
    if (_.isString(hook)) {
      // we let to alter args this way
      vm.createContext(args)
      vm.runInContext(hook, args)
      return
    }

    throw new Error(`Unknown hook ${typeof hook}`)
  }

  _getHook (data) {
    if (!data) {
      return null
    }

    if (_.isFunction(data)) {
      debug(`found hook, type: function definition`)
      return data
    }

    let resultWithRequire
    let tryLoadFile = path.resolve(process.cwd(), data)
    if (fs.existsSync(tryLoadFile)) {
      resultWithRequire = require(tryLoadFile)
    }

    tryLoadFile = data
    try {
      resultWithRequire = require(data)
    } catch (err) {
    }

    if (resultWithRequire) {
      if (_.isFunction(resultWithRequire)) {
        debug(`found hook, type: require`)
        return resultWithRequire
      } else {
        throw new Error(`Cant load hook ${tryLoadFile} because it is not a function`)
      }
    }

    if (_.isString(data)) {
      debug(`found hook, type: JavaScript as String`)
      return data
    }

    throw new Error(`Not valid hook ${util.inspect(data)}`)
  }
}
