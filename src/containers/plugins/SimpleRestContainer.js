const util = require('util')
const async = require('async')
const request = require('request')
const Mustache = require('mustache')
const jp = require('jsonpath')
const mime = require('mime-types')
const uuidv4 = require('uuid/v4')
const Redis = require('ioredis')
const _ = require('lodash')
const debug = require('debug')('botium-SimpleRestContainer')

const { startProxy } = require('../../grid/inbound/proxy')
const botiumUtils = require('../../helpers/Utils')
const Capabilities = require('../../Capabilities')
const Defaults = require('../../Defaults')
const { SCRIPTING_FUNCTIONS } = require('../../scripting/ScriptingMemory')
const { getHook, executeHook } = require('../../helpers/HookUtils')

const REDIS_TOPIC = 'SIMPLEREST_INBOUND_SUBSCRIPTION'

module.exports = class SimpleRestContainer {
  constructor ({ queueBotSays, caps }) {
    this.queueBotSays = queueBotSays
    this.caps = caps
    this.processResponse = false
  }

  Validate () {
    if (!this.caps[Capabilities.SIMPLEREST_URL]) throw new Error('SIMPLEREST_URL capability required')
    if (!this.caps[Capabilities.SIMPLEREST_METHOD]) throw new Error('SIMPLEREST_METHOD capability required')
    if (_.keys(this.caps).findIndex(k => k.startsWith(Capabilities.SIMPLEREST_RESPONSE_JSONPATH)) < 0 && !this.caps[Capabilities.SIMPLEREST_RESPONSE_HOOK]) throw new Error('SIMPLEREST_RESPONSE_JSONPATH or SIMPLEREST_RESPONSE_HOOK capability required')
    if (this.caps[Capabilities.SIMPLEREST_INIT_CONTEXT]) {
      _.isObject(this.caps[Capabilities.SIMPLEREST_INIT_CONTEXT]) || JSON.parse(this.caps[Capabilities.SIMPLEREST_INIT_CONTEXT])
    }
    this.startHook = getHook(this.caps[Capabilities.SIMPLEREST_START_HOOK])
    this.stopHook = getHook(this.caps[Capabilities.SIMPLEREST_STOP_HOOK])
    this.requestHook = getHook(this.caps[Capabilities.SIMPLEREST_REQUEST_HOOK])
    this.responseHook = getHook(this.caps[Capabilities.SIMPLEREST_RESPONSE_HOOK])
  }

  Build () {
    return this._buildInbound()
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
            this.view.botium.conversationId = this._getMustachedCap(Capabilities.SIMPLEREST_CONVERSATION_ID_TEMPLATE, false)
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

        (startHookComplete) => {
          executeHook(this.startHook, this.view).then(() => startHookComplete()).catch(startHookComplete)
        },

        (pingComplete) => {
          if (this.caps[Capabilities.SIMPLEREST_PING_URL]) {
            const uri = this.caps[Capabilities.SIMPLEREST_PING_URL]
            const verb = this.caps[Capabilities.SIMPLEREST_PING_VERB]
            const timeout = this.caps[Capabilities.SIMPLEREST_PING_TIMEOUT] || Defaults[Capabilities.SIMPLEREST_PING_TIMEOUT]
            const pingConfig = {
              method: verb,
              uri: uri,
              timeout: timeout
            }
            if (this.caps[Capabilities.SIMPLEREST_PING_HEADERS]) {
              try {
                pingConfig.headers = this._getMustachedCap(Capabilities.SIMPLEREST_PING_HEADERS, true)
              } catch (err) {
                return pingComplete(`composing headers from SIMPLEREST_PING_HEADERS failed (${util.inspect(err)})`)
              }
            }
            if (this.caps[Capabilities.SIMPLEREST_PING_BODY]) {
              try {
                pingConfig.body = this._getMustachedCap(Capabilities.SIMPLEREST_PING_BODY, !this.caps[Capabilities.SIMPLEREST_PING_BODY_RAW])
              } catch (err) {
                return pingComplete(`composing body from SIMPLEREST_PING_BODY failed (${util.inspect(err)})`)
              }
            }

            const retries = this.caps[Capabilities.SIMPLEREST_PING_RETRIES] || Defaults[Capabilities.SIMPLEREST_PING_RETRIES]
            this._waitForPingUrl(pingConfig, retries).then((response) => {
              if (botiumUtils.isStringJson(response)) {
                const body = JSON.parse(response)
                debug(`Ping Uri ${uri} returned JSON response ${util.inspect(response)}, using it as session context`)
                Object.assign(this.view.context, body)
              }
              pingComplete()
            }).catch(pingComplete)
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
        },

        (inboundListenerComplete) => {
          this._subscribeInbound()
            .then(() => inboundListenerComplete())
            .catch(inboundListenerComplete)
        }

      ], (err) => {
        if (err) {
          return reject(new Error(`Start failed ${util.inspect(err)}`))
        }
        this.processResponse = true
        resolve()
      })
    })
  }

  UserSays (mockMsg) {
    return this._doRequest(mockMsg, true)
  }

  Stop () {
    this.processResponse = false
    return executeHook(this.stopHook, this.view)
      .then(() => this._unsubscribeInbound())
      .then(() => {
        this.view = {}
      })
  }

  Clean () {
    return this._cleanInbound()
  }

  // Separated just for better module testing
  async _processBodyAsync (body, isFromUser) {
    (await this._processBodyAsyncImpl(body, isFromUser)).forEach(entry => this.queueBotSays(entry))
  }

  // Separated just for better module testing
  async _processBodyAsyncImpl (body, isFromUser) {
    if (!this.processResponse) return []

    if (this.caps[Capabilities.SIMPLEREST_CONTEXT_JSONPATH]) {
      const contextNodes = jp.query(body, this.caps[Capabilities.SIMPLEREST_CONTEXT_JSONPATH])
      if (_.isArray(contextNodes) && contextNodes.length > 0) {
        Object.assign(this.view.context, contextNodes[0])
      }
    } else {
      Object.assign(this.view.context, body)
    }
    debug(`current session context: ${util.inspect(this.view.context)}`)

    const result = []
    if (isFromUser) {
      const jsonPathRoots = []

      const jsonPathsBody = this._getAllCapValues(Capabilities.SIMPLEREST_BODY_JSONPATH)
      if (jsonPathsBody.length > 0) {
        for (const jsonPathBody of jsonPathsBody) {
          const rb = jp.query(body, jsonPathBody)
          if (_.isArray(rb)) {
            rb.forEach(r => jsonPathRoots.push(r))
          } else if (rb) {
            jsonPathRoots.push(rb)
          }
        }
      } else {
        jsonPathRoots.push(body)
      }

      for (const jsonPathRoot of jsonPathRoots) {
        const media = []
        const buttons = []

        const jsonPathsMedia = this._getAllCapValues(Capabilities.SIMPLEREST_MEDIA_JSONPATH)
        jsonPathsMedia.forEach(jsonPath => {
          const responseMedia = jp.query(jsonPathRoot, jsonPath)
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
        const jsonPathsButtons = this._getAllCapValues(Capabilities.SIMPLEREST_BUTTONS_JSONPATH)
        jsonPathsButtons.forEach(jsonPath => {
          const responseButtons = jp.query(jsonPathRoot, jsonPath)
          if (responseButtons) {
            (_.isArray(responseButtons) ? _.flattenDeep(responseButtons) : [responseButtons]).forEach(b =>
              buttons.push({
                text: b
              })
            )
            debug(`found response buttons: ${util.inspect(buttons)}`)
          }
        })

        let hasMessageText = false
        const jsonPathsTexts = this._getAllCapValues(Capabilities.SIMPLEREST_RESPONSE_JSONPATH)
        for (const jsonPath of jsonPathsTexts) {
          debug(`eval json path ${jsonPath}`)

          const responseTexts = jp.query(jsonPathRoot, jsonPath)
          debug(`found response texts: ${util.inspect(responseTexts)}`)

          const messageTexts = (_.isArray(responseTexts) ? _.flattenDeep(responseTexts) : [responseTexts])
          for (const messageText of messageTexts) {
            if (!messageText) continue

            hasMessageText = true
            const botMsg = { sourceData: body, messageText, media, buttons }
            await executeHook(this.responseHook, Object.assign({ botMsg }, this.view))
            result.push(botMsg)
          }
        }

        if (!hasMessageText) {
          const botMsg = { messageText: '', sourceData: body, media, buttons }
          await executeHook(this.responseHook, Object.assign({ botMsg }, this.view))
          result.push(botMsg)
        }
      }
    }
    return result
  }

  _doRequest (msg, isFromUser) {
    return this._buildRequest(msg)
      .then((requestOptions) => new Promise((resolve, reject) => {
        debug(`constructed requestOptions ${JSON.stringify(requestOptions, null, 2)}`)
        msg.sourceData = msg.sourceData || {}
        msg.sourceData.requestOptions = requestOptions

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
      }))
  }

  async _buildRequest (msg) {
    this.view.msg = Object.assign({}, msg)

    const nonEncodedMessage = this.view.msg.messageText
    if (this.view.msg.messageText) {
      this.view.msg.messageText = encodeURIComponent(this.view.msg.messageText)
    }

    if (this.caps[Capabilities.SIMPLEREST_STEP_ID_TEMPLATE]) {
      this.view.botium.stepId = this._getMustachedCap(Capabilities.SIMPLEREST_STEP_ID_TEMPLATE, false)
    } else {
      this.view.botium.stepId = uuidv4()
    }

    const uri = this._getMustachedCap(Capabilities.SIMPLEREST_URL, false)

    const requestOptions = {
      uri,
      method: this.caps[Capabilities.SIMPLEREST_METHOD]
    }
    if (this.view.msg.messageText) {
      this.view.msg.messageText = nonEncodedMessage
    }
    if (this.caps[Capabilities.SIMPLEREST_HEADERS_TEMPLATE]) {
      try {
        requestOptions.headers = this._getMustachedCap(Capabilities.SIMPLEREST_HEADERS_TEMPLATE, true)
      } catch (err) {
        throw new Error(`composing headers from SIMPLEREST_HEADERS_TEMPLATE failed (${util.inspect(err)})`)
      }
    }
    if (this.caps[Capabilities.SIMPLEREST_BODY_TEMPLATE]) {
      try {
        requestOptions.body = this._getMustachedCap(Capabilities.SIMPLEREST_BODY_TEMPLATE, !this.caps[Capabilities.SIMPLEREST_BODY_RAW])
        requestOptions.json = !this.caps[Capabilities.SIMPLEREST_BODY_RAW]
      } catch (err) {
        throw new Error(`composing body from SIMPLEREST_BODY_TEMPLATE failed (${util.inspect(err)})`)
      }
    }
    await executeHook(this.requestHook, Object.assign({ requestOptions }, this.view))

    return requestOptions
  }

  async _waitForPingUrl (pingConfig, retries) {
    const timeout = ms => new Promise(resolve => setTimeout(resolve, ms))

    let tries = 0

    while (true) {
      debug(`_waitForPingUrl checking url ${pingConfig.uri} before proceed`)
      if (tries > retries) {
        throw new Error(`Failed to ping bot after ${retries} retries`)
      }
      tries++
      const { err, response, body } = await new Promise((resolve) => {
        request(pingConfig, (err, response, body) => {
          resolve({ err, response, body })
        })
      })
      if (err) {
        debug(`_waitForPingUrl error on url check ${pingConfig.uri}: ${err}`)
        await timeout(pingConfig.timeout)
      } else if (response.statusCode >= 400) {
        debug(`_waitForPingUrl on url check ${pingConfig.uri} got error response: ${response.statusCode}/${response.statusMessage}`)
        await timeout(pingConfig.timeout)
      } else {
        debug(`_waitForPingUrl success on url check ${pingConfig.uri}`)
        return body
      }
    }
  }

  _getAllCapValues (capName) {
    const allCapValues = []
    const jsonPathCaps = _.pickBy(this.caps, (v, k) => k.startsWith(capName))
    _(jsonPathCaps).keys().sort().each((key) => {
      const jsonPath = this.caps[key]

      if (_.isArray(jsonPath)) {
        jsonPath.forEach(p => {
          allCapValues.push(`${p}`.trim())
        })
      } else if (_.isString(jsonPath)) {
        jsonPath.split(',').forEach(p => {
          allCapValues.push(p.trim())
        })
      }
    })
    return allCapValues
  }

  _getMustachedCap (capName, json) {
    const template = _.isString(this.caps[capName]) ? this.caps[capName] : JSON.stringify(this.caps[capName])
    return this._getMustachedVal(template, json)
  }

  _getMustachedVal (template, json) {
    if (json) {
      return JSON.parse(Mustache.render(template, this.view))
    } else {
      return Mustache.render(template, this.view)
    }
  }

  _processInboundEvent (event) {
    const jsonPathValue = this.caps[Capabilities.SIMPLEREST_INBOUND_SELECTOR_VALUE]
    const jsonPathsSelector = this._getAllCapValues(Capabilities.SIMPLEREST_INBOUND_SELECTOR_JSONPATH)
    if (jsonPathsSelector && jsonPathsSelector.length > 0) {
      let isSelected = false
      for (const jsonPathTemplate of jsonPathsSelector) {
        const jsonPath = this._getMustachedVal(jsonPathTemplate, false)
        const hasResult = jp.query(event, jsonPath)
        if (hasResult && hasResult.length > 0) {
          const check = jsonPathValue && this._getMustachedVal(jsonPathValue, false)
          if (check) {
            if (hasResult[0] === check) {
              isSelected = true
              break
            }
          } else {
            isSelected = true
            break
          }
        }
      }
      if (!isSelected) return
    }

    debug(`Received an inbound message: ${JSON.stringify(event)}`)
    setTimeout(() => this._processBodyAsync(event.body, true), 0)
  }

  async _buildInbound () {
    if (this.caps[Capabilities.SIMPLEREST_INBOUND_REDISURL] && this.caps[Capabilities.SIMPLEREST_INBOUND_SELECTOR_JSONPATH] && this.caps[Capabilities.SIMPLEREST_INBOUND_SELECTOR_VALUE]) {
      this.redis = new Redis(this.caps[Capabilities.SIMPLEREST_INBOUND_REDISURL])
      this.redis.on('connect', () => {
        debug(`Redis connected to ${JSON.stringify(this.caps[Capabilities.SIMPLEREST_INBOUND_REDISURL] || 'default')}`)
      })
      this.redis.on('message', (channel, event) => {
        if (!_.isString(event)) {
          return debug(`WARNING: received non-string message from ${channel}, ignoring: ${event}`)
        }
        try {
          event = JSON.parse(event)
        } catch (err) {
          return debug(`WARNING: received non-json message from ${channel}, ignoring: ${event}`)
        }
        this._processInboundEvent(event)
      })
    } else if (this.caps[Capabilities.SIMPLEREST_INBOUND_PORT]) {
      this.proxy = await startProxy({
        port: this.caps[Capabilities.SIMPLEREST_INBOUND_PORT],
        endpoint: this.caps[Capabilities.SIMPLEREST_INBOUND_ENDPOINT],
        processEvent: (event) => {
          if (this.processingEvents) {
            debug('Got Inbound Event:')
            debug(JSON.stringify(event, null, 2))
            this._processInboundEvent(event)
          }
        }
      })
    }
  }

  async _subscribeInbound () {
    this.processingEvents = true
    if (this.redis) {
      try {
        const count = await this.redis.subscribe(REDIS_TOPIC)
        debug(`Redis subscribed to ${count} channels. Listening for inbound messages on the ${REDIS_TOPIC} channel.`)
      } catch (err) {
        debug(err)
        throw new Error(`Redis failed to subscribe channel ${REDIS_TOPIC}: ${err.message || err}`)
      }
    }
  }

  async _unsubscribeInbound () {
    this.processingEvents = false
    if (this.redis) {
      try {
        await this.redis.unsubscribe(REDIS_TOPIC)
        debug(`Redis unsubscribed from ${REDIS_TOPIC} channel.`)
      } catch (err) {
        debug(err)
        throw new Error(`Redis failed to unsubscribe channel ${REDIS_TOPIC}: ${err.message || err}`)
      }
    }
  }

  async _cleanInbound () {
    if (this.redis) {
      this.redis.disconnect()
      this.redis = null
    }
    if (this.proxy) {
      this.proxy.close()
      this.proxy = null
    }
  }
}
module.exports.REDIS_TOPIC = REDIS_TOPIC
