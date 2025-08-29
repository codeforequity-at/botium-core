const util = require('util')
const async = require('async')
const Mustache = require('mustache')
const jp = require('jsonpath')
const mime = require('mime-types')
const { v4: uuidv4 } = require('uuid')
const Redis = require('ioredis')
const _ = require('lodash')
const debug = require('debug')('botium-connector-simplerest')
const { ProxyAgent, Agent } = require('undici')

const { startProxy } = require('../../grid/inbound/proxy')
const botiumUtils = require('../../helpers/Utils')
const { getAllCapValues } = require('../../helpers/CapabilitiesUtils')
const Capabilities = require('../../Capabilities')
const Defaults = require('../../Defaults').Capabilities
const { SCRIPTING_FUNCTIONS } = require('../../scripting/ScriptingMemory')
const { getHook, executeHook } = require('../../helpers/HookUtils')
const { escapeJSONString } = require('../../helpers/Utils')
const { BotiumError } = require('../../scripting/BotiumError')

Mustache.escape = s => s

module.exports = class SimpleRestContainer {
  constructor ({ queueBotSays, caps, bottleneck }) {
    this.queueBotSays = queueBotSays
    this.caps = Object.assign({}, Defaults, caps)
    this.bottleneck = bottleneck || ((fn) => fn())
    this.processInbound = false
    this.redisTopic = this.caps[Capabilities.SIMPLEREST_REDIS_TOPIC] || 'SIMPLEREST_INBOUND_SUBSCRIPTION'
    this.cookies = {}

    if (this.caps[Capabilities.SIMPLEREST_INBOUND_ORDER_UNSETTLED_EVENTS_JSONPATH]) {
      const debounceTimeout = this.caps[Capabilities.SIMPLEREST_INBOUND_DEBOUNCE_TIMEOUT] || 500
      this.inboundEvents = []
      this._processOrderedInboundEventsArrayAsync = _.debounce(() => {
        const events = [...this.inboundEvents]
        this.inboundEvents = []
        const jsonPath = this._getMustachedVal(this.caps[Capabilities.SIMPLEREST_INBOUND_ORDER_UNSETTLED_EVENTS_JSONPATH], false)
        const sortedEvents = _.sortBy(events, (event) => {
          const qr = jp.query(event, jsonPath)
          return qr[0]
        })
        for (const event of sortedEvents) {
          setTimeout(() => this._processBodyAsync(event.body, event.headers, true, !!this.caps[Capabilities.SIMPLEREST_INBOUND_UPDATE_CONTEXT]), 0)
        }
      }, debounceTimeout)
    }
  }

  Validate () {
    if (!this.caps[Capabilities.SIMPLEREST_URL]) throw new Error('SIMPLEREST_URL capability required')
    if (!this.caps[Capabilities.SIMPLEREST_METHOD] && !this.caps[Capabilities.SIMPLEREST_VERB]) throw new Error('SIMPLEREST_METHOD/SIMPLEREST_VERB capability required')
    if (_.keys(this.caps).findIndex(k => k.startsWith(Capabilities.SIMPLEREST_RESPONSE_JSONPATH)) < 0 && !this.caps[Capabilities.SIMPLEREST_RESPONSE_HOOK]) throw new Error('SIMPLEREST_RESPONSE_JSONPATH or SIMPLEREST_RESPONSE_HOOK capability required')
    if (this.caps[Capabilities.SIMPLEREST_INIT_CONTEXT]) {
      _.isObject(this.caps[Capabilities.SIMPLEREST_INIT_CONTEXT]) || JSON.parse(this.caps[Capabilities.SIMPLEREST_INIT_CONTEXT])
    }
    if (this.caps[Capabilities.SIMPLEREST_CONTEXT_MERGE_OR_REPLACE] !== 'MERGE' && this.caps[Capabilities.SIMPLEREST_CONTEXT_MERGE_OR_REPLACE] !== 'REPLACE') throw new Error('SIMPLEREST_CONTEXT_MERGE_OR_REPLACE capability only MERGE or REPLACE allowed')

    this.startHook = getHook(this.caps, this.caps[Capabilities.SIMPLEREST_START_HOOK])
    this.stopHook = getHook(this.caps, this.caps[Capabilities.SIMPLEREST_STOP_HOOK])
    this.requestHook = getHook(this.caps, this.caps[Capabilities.SIMPLEREST_REQUEST_HOOK])
    this.parserHook = getHook(this.caps, this.caps[Capabilities.SIMPLEREST_PARSER_HOOK])
    this.responseHook = getHook(this.caps, this.caps[Capabilities.SIMPLEREST_RESPONSE_HOOK])
    this.pollRequestHook = getHook(this.caps, this.caps[Capabilities.SIMPLEREST_POLL_REQUEST_HOOK])

    this.requestHooks = {}
    if (this.caps[Capabilities.SIMPLEREST_PING_REQUEST_HOOK]) {
      this.requestHooks.SIMPLEREST_PING = getHook(this.caps, this.caps[Capabilities.SIMPLEREST_PING_REQUEST_HOOK])
    }
    if (this.caps[Capabilities.SIMPLEREST_START_REQUEST_HOOK]) {
      this.requestHooks.SIMPLEREST_START = getHook(this.caps, this.caps[Capabilities.SIMPLEREST_START_REQUEST_HOOK])
    }
    if (this.caps[Capabilities.SIMPLEREST_STOP_REQUEST_HOOK]) {
      this.requestHooks.SIMPLEREST_STOP = getHook(this.caps, this.caps[Capabilities.SIMPLEREST_STOP_REQUEST_HOOK])
    }
  }

  Build () {
    const agentOptions = {
      connect: {
        rejectUnauthorized: !!this.caps[Capabilities.SIMPLEREST_STRICT_SSL] // Equivalent to strictSSL of request module
      }
    }
    if (this.caps[Capabilities.SIMPLEREST_PROXY_URL]) {
      this.dispatcher = new ProxyAgent(this.caps[Capabilities.SIMPLEREST_PROXY_URL], agentOptions)
    } else {
      this.dispatcher = new Agent(agentOptions)
    }

    return this._buildInbound()
  }

  Start () {
    return new Promise((resolve, reject) => {
      async.series([
        (contextInitComplete) => {
          this.view = {
            container: this,
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
            fnc: _.mapValues(_.mapKeys(SCRIPTING_FUNCTIONS, (value, key) => key.substring(1)), (descriptor) => {
              const safeCaps = Object.assign({}, this.caps, { [Capabilities.SECURITY_ALLOW_UNSAFE]: true })
              return descriptor.numberOfArguments ? () => { return (text, render) => descriptor.handler(safeCaps, render(text)) } : () => descriptor.handler(safeCaps)
            })
          }
          this.view.fnc.jsonify = () => (val, render) => {
            return escapeJSONString(render(val))
          }

          if (this.caps[Capabilities.SIMPLEREST_CONVERSATION_ID_TEMPLATE]) {
            this.view.botium.conversationId = this._getMustachedCap(Capabilities.SIMPLEREST_CONVERSATION_ID_TEMPLATE, false)
          } else {
            this.view.botium.conversationId = uuidv4()
          }

          if (this.caps[Capabilities.SIMPLEREST_INIT_CONTEXT]) {
            try {
              this.view.context = _.isObject(this.caps[Capabilities.SIMPLEREST_INIT_CONTEXT]) ? _.cloneDeep(this.caps[Capabilities.SIMPLEREST_INIT_CONTEXT]) : JSON.parse(this.caps[Capabilities.SIMPLEREST_INIT_CONTEXT])
            } catch (err) {
              contextInitComplete(`parsing SIMPLEREST_INIT_CONTEXT failed, no JSON detected (${err.message})`)
            }
          }
          contextInitComplete()
        },

        (startHookComplete) => {
          executeHook(this.caps, this.startHook, this.view).then(() => startHookComplete()).catch(startHookComplete)
        },

        (inboundListenerComplete) => {
          this._subscribeInbound()
            .then(() => inboundListenerComplete())
            .catch(inboundListenerComplete)
        },

        (startPollingComplete) => {
          this._startPolling()
            .then(() => startPollingComplete())
            .catch(startPollingComplete)
        },

        (pingComplete) => {
          if (this.caps[Capabilities.SIMPLEREST_PING_URL]) {
            this._makeCall('SIMPLEREST_PING')
              .then(({ body, headers }) => {
                if (this.caps[Capabilities.SIMPLEREST_PING_UPDATE_CONTEXT] || this.caps[Capabilities.SIMPLEREST_PING_PROCESS_RESPONSE]) {
                  return this._parseResponseBody(body)
                    .then(body => {
                      if (body) {
                        debug(`Ping Uri ${this.caps[Capabilities.SIMPLEREST_PING_URL]} returned JSON response: ${botiumUtils.shortenJsonString(body)}`)
                        return this._processBodyAsync(body, headers, !!this.caps[Capabilities.SIMPLEREST_PING_PROCESS_RESPONSE], !!this.caps[Capabilities.SIMPLEREST_PING_UPDATE_CONTEXT])
                      } else {
                        debug(`Ping Uri ${this.caps[Capabilities.SIMPLEREST_PING_URL]} didn't return JSON response, ignoring it.`)
                      }
                    }).catch(err => {
                      debug(`Ping Uri ${this.caps[Capabilities.SIMPLEREST_PING_URL]} didn't return JSON response, ignoring it (${err.message})`)
                    })
                }
              }).then(() => {
                pingComplete()
              }).catch(err => {
                pingComplete(err.message)
              })
          } else {
            pingComplete()
          }
        },

        (initComplete) => {
          if (_.isString(this.caps[Capabilities.SIMPLEREST_INIT_TEXT])) {
            this._doRequest({ messageText: this.caps[Capabilities.SIMPLEREST_INIT_TEXT] }, !!this.caps[Capabilities.SIMPLEREST_INIT_PROCESS_RESPONSE], true).then(() => initComplete()).catch(initComplete)
          } else {
            initComplete()
          }
        },

        (startCallComplete) => {
          this.processInbound = true
          if (this.caps[Capabilities.SIMPLEREST_START_URL]) {
            this._makeCall('SIMPLEREST_START')
              .then(({ body, headers }) => {
                if (this.caps[Capabilities.SIMPLEREST_START_UPDATE_CONTEXT] || this.caps[Capabilities.SIMPLEREST_START_PROCESS_RESPONSE]) {
                  return this._parseResponseBody(body)
                    .then(body => {
                      if (body) {
                        debug(`Start Uri ${this.caps[Capabilities.SIMPLEREST_START_URL]} returned JSON response: ${botiumUtils.shortenJsonString(body)}`)
                        return this._processBodyAsync(body, headers, !!this.caps[Capabilities.SIMPLEREST_START_PROCESS_RESPONSE], !!this.caps[Capabilities.SIMPLEREST_START_UPDATE_CONTEXT])
                      } else {
                        debug(`Start Uri ${this.caps[Capabilities.SIMPLEREST_START_URL]} didn't return JSON response, ignoring it.`)
                      }
                    }).catch(err => {
                      debug(`Start Uri ${this.caps[Capabilities.SIMPLEREST_START_URL]} didn't return JSON response, ignoring it (${err.message})`)
                    })
                }
              }).then(() => {
                startCallComplete()
              }).catch(err => {
                startCallComplete(new Error(`Failed to call url ${this.caps[Capabilities.SIMPLEREST_START_URL]} to start session: ${err.message}`))
              })
          } else {
            startCallComplete()
          }
        }

      ], (err) => {
        if (err) {
          return reject(new Error(`Start failed: ${err.message}`))
        }
        resolve()
      })
    })
  }

  UserSays (mockMsg) {
    return this._doRequest(mockMsg, true, true)
  }

  async Stop () {
    this.processInbound = false
    if (this.caps[Capabilities.SIMPLEREST_STOP_URL]) {
      try {
        await this._makeCall('SIMPLEREST_STOP')
      } catch (err) {
        throw new Error(`Failed to call url ${this.caps[Capabilities.SIMPLEREST_STOP_URL]} to stop session: ${err.message}`)
      }
    }
    await executeHook(this.caps, this.stopHook, this.view)
    await this._unsubscribeInbound()
    await this._stopPolling()
    this.view = {}
    this.cookies = {}
  }

  Clean () {
    return this._cleanInbound()
  }

  _fetchify (requestOptions) {
    requestOptions.signal = AbortSignal.timeout(requestOptions.timeout)
    delete requestOptions.timeout

    if (requestOptions.body && !_.isString(requestOptions.body)) {
      requestOptions.body = JSON.stringify(requestOptions.body)
      if (!requestOptions.headers) requestOptions.headers = {}
      if (!requestOptions.headers['Content-Type'] && !requestOptions.headers['content-type']) {
        requestOptions.headers['Content-Type'] = 'application/json'
      }
    }

    if (requestOptions.form) {
      if (requestOptions.body) {
        debug('Request.form and request.body are mutually exclusive')
      }
      requestOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded'
      requestOptions.body = new URLSearchParams(requestOptions.form).toString()
      delete requestOptions.form
    }

    return requestOptions
  }

  // Separated just for better module testing
  async _processBodyAsync (body, headers, isFromUser, updateContext) {
    const p = async () => {
      try {
        const results = await this._processBodyAsyncImpl(body, headers, isFromUser, updateContext)
        if (results) {
          for (const result of results) {
            setTimeout(() => this.queueBotSays(result), 0)
          }
        }
      } catch (err) {
        setTimeout(() => this.queueBotSays(err), 0)
      }
    }
    if (this.waitProcessQueue) {
      this.waitProcessQueue.push(p)
      debug('Async body is queued for processing.')
    } else {
      await p()
    }
  }

  async _emptyWaitProcessQueue () {
    if (this.waitProcessQueue && this.waitProcessQueue.length > 0) {
      for (const p of this.waitProcessQueue) {
        await p()
      }
    }
    this.waitProcessQueue = null
  }

  // Separated just for better module testing
  async _processBodyAsyncImpl (body, headers, isFromUser, updateContext) {
    this.view.response = { body, headers }
    if (updateContext) {
      const mergeMode = this.caps[Capabilities.SIMPLEREST_CONTEXT_MERGE_OR_REPLACE]
      const jsonPathsContext = getAllCapValues(Capabilities.SIMPLEREST_CONTEXT_JSONPATH, this.caps)
      if (jsonPathsContext.length > 0) {
        for (const jsonPathContext of jsonPathsContext) {
          const contextNodes = jp.query(body, jsonPathContext)
          if (_.isArray(contextNodes) && contextNodes.length > 0) {
            if (mergeMode === 'MERGE') {
              Object.assign(this.view.context, contextNodes[0])
            } else if (mergeMode === 'REPLACE') {
              this.view.context = contextNodes[0]
            }
          }
        }
      } else {
        if (mergeMode === 'MERGE') {
          Object.assign(this.view.context, body)
        } else if (mergeMode === 'REPLACE') {
          this.view.context = body
        }
      }
      debug(`current session context: ${util.inspect(this.view.context)}`)
    }

    const _isAnyContextJsonPathMatch = (capName, capNameMatch) => {
      const jsonPaths = getAllCapValues(capName, this.caps)
      if (jsonPaths.length > 0) {
        const jsonPathsMatch = getAllCapValues(capNameMatch, this.caps)
        for (const [index, jsonPath] of jsonPaths.entries()) {
          const contextNodes = jp.query(this.view.context, jsonPath)
          if (_.isArray(contextNodes) && contextNodes.length > 0) {
            if (jsonPathsMatch[index]) {
              if (contextNodes[0] === jsonPathsMatch[index]) {
                return {
                  jsonPath,
                  match: contextNodes[0]
                }
              }
            } else {
              return {
                jsonPath
              }
            }
          }
        }
      }
      return null
    }

    const ignoreMatch = _isAnyContextJsonPathMatch(Capabilities.SIMPLEREST_CONTEXT_IGNORE_JSONPATH, Capabilities.SIMPLEREST_CONTEXT_IGNORE_MATCH)
    if (ignoreMatch) {
      if (ignoreMatch.match) debug(`ignoring response for context match: ${ignoreMatch.jsonPath} = ${ignoreMatch.match}`)
      else debug(`ignoring response for context: ${ignoreMatch.jsonPath}`)
      return
    }

    const skipMatch = _isAnyContextJsonPathMatch(Capabilities.SIMPLEREST_CONTEXT_SKIP_JSONPATH, Capabilities.SIMPLEREST_CONTEXT_SKIP_MATCH)
    if (skipMatch) {
      if (skipMatch.match) debug(`skipping response for context match: ${skipMatch.jsonPath} = ${skipMatch.match}`)
      else debug(`skipping response for context: ${skipMatch.jsonPath}`)

      setTimeout(() => this._doRequest({ messageText: '' }, true, true), 0)
      return
    }

    const result = []
    if (isFromUser) {
      const _extractFrom = (root, jsonPaths, acceptFn = null) => {
        const result = []
        for (const jsonPath of jsonPaths) {
          const jsonPathRes = []
          const rb = jp.query(root, jsonPath)
          if (_.isArray(rb)) {
            _.flattenDeep(rb).forEach(r => jsonPathRes.push(r))
          } else {
            jsonPathRes.push(rb)
          }
          if (acceptFn) {
            result.push(...jsonPathRes.filter(r => acceptFn(root, jsonPath, r)))
          } else {
            result.push(...jsonPathRes)
          }
        }
        return result
      }

      const jsonPathRoots = []
      const jsonPathsBody = getAllCapValues(Capabilities.SIMPLEREST_BODY_JSONPATH, this.caps)
      if (jsonPathsBody.length > 0) {
        jsonPathRoots.push(..._extractFrom(body, jsonPathsBody, (root, jsonPath, r) => {
          if (r && _.isObject(r)) return true
          debug(`Ignoring result body from ${jsonPath} - not a querieable object (${util.inspect(r)})`)
          return false
        }))
      } else {
        jsonPathRoots.push(body)
      }

      for (const jsonPathRoot of jsonPathRoots) {
        const _retrieveMedia = (jsonPathMediaRoot, jsonPathsMedia) => {
          const retrievedMedia = []
          jsonPathsMedia.forEach(jsonPath => {
            const responseMedia = jp.query(jsonPathMediaRoot, jsonPath)
            if (responseMedia) {
              (_.isArray(responseMedia) ? _.flattenDeep(responseMedia) : [responseMedia]).forEach(m =>
                retrievedMedia.push({
                  mediaUri: m,
                  mimeType: mime.lookup(m) || 'application/unknown'
                })
              )
            }
          })
          return retrievedMedia
        }

        const _retrieveButtons = (jsonPathButtonRoot, capPrefix) => {
          const jsonPathsButtons = getAllCapValues(`${capPrefix}_JSONPATH`, this.caps)
          const jsonPathsButtonsText = getAllCapValues(`${capPrefix}_TEXT_SUBJSONPATH`, this.caps)
          const jsonPathsButtonsPayload = getAllCapValues(`${capPrefix}_PAYLOAD_SUBJSONPATH`, this.caps)

          const retrievedButtons = []
          const responseButtons = _extractFrom(jsonPathButtonRoot, jsonPathsButtons)
          for (const responseButton of responseButtons) {
            const retrievedButton = {}
            if (_.isString(responseButton)) {
              retrievedButton.text = responseButton
            } else {
              if (jsonPathsButtonsText.length > 0) {
                const possibleTexts = _extractFrom(responseButton, jsonPathsButtonsText)
                if (possibleTexts.length > 0) retrievedButton.text = possibleTexts[0]
              }
              if (jsonPathsButtonsPayload.length > 0) {
                const possiblePayloads = _extractFrom(responseButton, jsonPathsButtonsPayload)
                if (possiblePayloads.length > 0) retrievedButton.payload = possiblePayloads[0]
              }
            }
            if (Object.keys(retrievedButton).length === 0 && responseButton) {
              retrievedButton.text = JSON.stringify(responseButton)
            }
            if (Object.keys(retrievedButton).length > 0) {
              retrievedButtons.push(retrievedButton)
            }
          }
          return retrievedButtons
        }

        const _getCardText = (responseCardText) => {
          if (responseCardText) {
            const texts = _.isArray(responseCardText) ? _.flattenDeep(responseCardText) : [responseCardText]
            if (texts.length > 1) {
              debug(`more than one text found for card: ${util.inspect(texts)}`)
            }
            if (texts.length > 0) {
              return texts[0]
            }
          }
        }

        const media = _retrieveMedia(jsonPathRoot, getAllCapValues(Capabilities.SIMPLEREST_MEDIA_JSONPATH, this.caps))
        debug(`found response media: ${util.inspect(media)}`)
        const buttons = _retrieveButtons(jsonPathRoot, 'SIMPLEREST_BUTTONS')
        debug(`found response buttons: ${util.inspect(buttons)}`)
        const cards = []

        const jsonPathsCards = getAllCapValues(Capabilities.SIMPLEREST_CARDS_JSONPATH, this.caps)
        jsonPathsCards.forEach(jsonPath => {
          const responseCards = jp.query(jsonPathRoot, jsonPath)
          if (responseCards) {
            (_.isArray(responseCards) ? _.flattenDeep(responseCards) : [responseCards]).forEach(c => {
              const card = {}

              const jsonPathsCardText = getAllCapValues(Capabilities.SIMPLEREST_CARD_TEXT_JSONPATH, this.caps)
              jsonPathsCardText.forEach(jsonPath => {
                card.text = _getCardText(jp.query(c, jsonPath))
              })

              const jsonPathsCardSubText = getAllCapValues(Capabilities.SIMPLEREST_CARD_SUBTEXT_JSONPATH, this.caps)
              jsonPathsCardSubText.forEach(jsonPath => {
                card.subtext = _getCardText(jp.query(c, jsonPath))
              })

              card.buttons = _retrieveButtons(c, 'SIMPLEREST_CARD_BUTTONS')
              card.media = _retrieveMedia(c, getAllCapValues(Capabilities.SIMPLEREST_CARD_ATTACHMENTS_JSONPATH, this.caps))

              if (_.keys(card).length > 0) {
                cards.push(card)
              }
            })
          }
        })
        debug(`found response cards: ${util.inspect(cards)}`)

        let nlp = { intent: {} }
        const _normalizeIntent = (intent) => {
          if ('name' in intent) {
            if (!intent.name) {
              intent.name = 'None'
            }
            const fallbackIntents = this.caps[Capabilities.SIMPLEREST_NLP_FALLBACK_INTENTS]
            if (fallbackIntents) {
              intent.incomprehension = this.caps[Capabilities.SIMPLEREST_NLP_FALLBACK_INTENTS].includes(intent.name) ? true : undefined
            } else {
              intent.incomprehension = intent.name.toLowerCase() === 'none' ? true : undefined
            }
          }

          if (!_.isNil(intent.confidence)) {
            if (typeof intent.confidence === 'string') {
              intent.confidence = Number(intent.confidence)
            }
            if (_.isNil(this.caps[Capabilities.SIMPLEREST_NLP_CONFIDENCE_DIVIDEBY100]) ? intent.confidence > 1 : this.caps[Capabilities.SIMPLEREST_NLP_CONFIDENCE_DIVIDEBY100]) {
              intent.confidence /= 100
            }
          }

          return intent
        }
        const jsonPathIntent = this.caps[Capabilities.SIMPLEREST_NLP_INTENT_JSONPATH]
        if (jsonPathIntent) {
          const name = jp.query(jsonPathRoot, jsonPathIntent)
          nlp.intent.name = name?.length ? name[0] : null
        }
        const jsonPathConfidence = this.caps[Capabilities.SIMPLEREST_NLP_CONFIDENCE_JSONPATH]
        if (jsonPathConfidence) {
          const confidence = jp.query(jsonPathRoot, jsonPathConfidence)
          nlp.intent.confidence = confidence?.length ? confidence[0] : null
        }
        _normalizeIntent(nlp.intent)
        const jsonPathList = this.caps[Capabilities.SIMPLEREST_NLP_LIST_JSONPATH]
        const jsonPathListIntent = this.caps[Capabilities.SIMPLEREST_NLP_LIST_INTENT_JSONPATH]
        const jsonPathListConfidence = this.caps[Capabilities.SIMPLEREST_NLP_LIST_CONFIDENCE_JSONPATH]
        if (jsonPathList) {
          const list = jp.query(jsonPathRoot, jsonPathList)
          if (list?.length) {
            const intentList = list[0].map(e => {
              const name = jp.query(e, jsonPathListIntent)
              const res = { name: name?.length ? name[0] : null }
              if (jsonPathListConfidence) {
                const confidence = jp.query(e, jsonPathListConfidence)
                res.confidence = confidence?.length ? confidence[0] : null
              }
              _normalizeIntent(res)
              return res
            })
            if (intentList.length > 0 && !nlp.intent.name) {
              nlp.intent.name = intentList[0].name
              nlp.intent.confidence = intentList[0].confidence
            }

            if (nlp.intent.name === intentList[0].name) {
              intentList.shift()
            }

            nlp.intent.intents = intentList
          }
        }
        if (Object.keys(nlp.intent).length > 0) {
          debug(`found response nlp: ${util.inspect(nlp)}`)
        } else {
          nlp = null
        }

        let hasMessageText = false
        const jsonPathsTexts = getAllCapValues(Capabilities.SIMPLEREST_RESPONSE_JSONPATH, this.caps)
        for (const jsonPath of jsonPathsTexts) {
          debug(`eval json path ${jsonPath}`)

          const responseTexts = jp.query(jsonPathRoot, jsonPath)
          debug(`found response texts: ${util.inspect(responseTexts)}`)

          const messageTexts = (_.isArray(responseTexts) ? _.flattenDeep(responseTexts) : [responseTexts])
          for (const [messageTextIndex, messageText] of messageTexts.entries()) {
            if (!messageText) continue

            hasMessageText = true
            const botMsg = { sourceData: body, messageText, media, buttons, nlp }
            await executeHook(this.caps, this.responseHook, Object.assign({ botMsg, botMsgRoot: jsonPathRoot, messageTextIndex }, this.view))
            result.push(botMsg)
          }
        }

        if (!hasMessageText) {
          const botMsg = { messageText: '', sourceData: body, media, buttons, cards, nlp }
          const beforeHookKeys = Object.keys(botMsg)
          await executeHook(this.caps, this.responseHook, Object.assign({ botMsg, botMsgRoot: jsonPathRoot }, this.view))
          const afterHookKeys = Object.keys(botMsg)
          if (beforeHookKeys.length !== afterHookKeys.length || !!(botMsg.messageText && botMsg.messageText.length > 0) || botMsg.media.length > 0 || botMsg.buttons.length > 0 || botMsg.cards.length > 0 || botMsg.nlp || !this.caps[Capabilities.SIMPLEREST_IGNORE_EMPTY]) {
            result.push(botMsg)
          }
        }
      }
    }

    const continueMatch = _isAnyContextJsonPathMatch(Capabilities.SIMPLEREST_CONTEXT_CONTINUE_JSONPATH, Capabilities.SIMPLEREST_CONTEXT_CONTINUE_MATCH)
    if (continueMatch) {
      if (continueMatch.match) debug(`continue with next response for context match: ${continueMatch.jsonPath} = ${continueMatch.match}`)
      else debug(`continue with next response for context: ${continueMatch.jsonPath}`)

      setTimeout(() => this._doRequest({ messageText: '' }, true, true), 0)
    }
    return result
  }

  _doRequest (msg, isFromUser, updateContext) {
    return this._buildRequest(msg)
      .then((requestOptions) => new Promise((resolve, reject) => {
        debug(`constructed requestOptions ${JSON.stringify(requestOptions, null, 2)}`)
        msg.sourceData = msg.sourceData || {}
        msg.sourceData.requestOptions = requestOptions

        this.waitProcessQueue = []

        try {
          fetch(requestOptions.uri, requestOptions).then(async (bodyRaw) => {
            let body
            try {
              const contentType = bodyRaw.headers.get('content-type')
              if (contentType && contentType.includes('application/json')) {
                try {
                  body = await bodyRaw.json()
                } catch (err) {
                  body = await bodyRaw.text()
                  debug(`failed to parse body as text, using text instead: ${body}`)
                }
              } else {
                body = await bodyRaw.text()
              }
            } catch (err) {
              return reject(new Error(`cant parse body: ${err.message}`))
            }
            if (!bodyRaw.ok) {
              debug(`got error response: ${bodyRaw.status}/${bodyRaw.statusText}`)
              if (debug.enabled && body) {
                debug(botiumUtils.shortenJsonString(body))
              }
              if (body) {
                const jsonBody = botiumUtils.toJsonWeak(body)
                const errKey = Object.keys(jsonBody).find(k => k.startsWith('err') || k.startsWith('fail'))
                if (errKey) {
                  return reject(new BotiumError(`got error response: ${bodyRaw.status}/${bodyRaw.statusText} - ${jsonBody[errKey]}`, {
                    message: botiumUtils.shortenJsonString(body)
                  }))
                }
              }
              return reject(new Error(`got error response: ${bodyRaw.status}/${bodyRaw.statusText}`))
            }
            if (body) {
              debug(`got response code: ${bodyRaw.status}/${bodyRaw.statusText}, body: ${botiumUtils.shortenJsonString(body)}, headers: ${botiumUtils.shortenJsonString(bodyRaw.headers)}`)
              this._storeCookiesFromResponse(bodyRaw)

              this._parseResponseBody(body)
                .then((parsedBody) => {
                  body = parsedBody
                  if (body) {
                    this._processBodyAsync(body, bodyRaw.headers, isFromUser, updateContext).then(() => resolve(this)).then(() => this._emptyWaitProcessQueue())
                  } else {
                    debug('ignoring response body (no string and no JSON object)')
                    resolve(this)
                    this._emptyWaitProcessQueue()
                  }
                })
                .catch((err) => {
                  debug(`ignoring not JSON formatted response body: ${err.message}`)
                  resolve(this)
                  this._emptyWaitProcessQueue()
                })
            } else {
              debug(`got response code: ${bodyRaw.status}/${bodyRaw.statusText}, empty body`)
              resolve(this)
              this._emptyWaitProcessQueue()
            }
          }).catch((err) => {
            // rest request failed: fetch failed - Cause code: ECONNREFUSED - Cause message: connect ECONNREFUSED 127.0.0.1:3006
            return reject(new Error(`rest request failed: ${err.message}${err.cause && err.cause.code ? ' - Cause code: ' + err.cause.code : ''}${err.cause && err.cause.message ? ' - Cause message: ' + err.cause.message : ''}`))
          })
        } catch (err) {
          return reject(new Error(`rest request failed: ${err.message}`))
        }
      }))
  }

  async _buildRequest (msg) {
    this.view.msg = Object.assign({}, msg)

    const nonEncodedMessage = this.view.msg.messageText

    this.view.msg.messageText = nonEncodedMessage && encodeURIComponent(nonEncodedMessage)

    if (this.caps[Capabilities.SIMPLEREST_STEP_ID_TEMPLATE]) {
      this.view.botium.stepId = this._getMustachedCap(Capabilities.SIMPLEREST_STEP_ID_TEMPLATE, false)
    } else {
      this.view.botium.stepId = uuidv4()
    }

    const uri = this._getMustachedCap(Capabilities.SIMPLEREST_URL, false)
    const timeout = this._getCapValue(Capabilities.SIMPLEREST_TIMEOUT)

    const requestOptions = {
      uri,
      method: this._getCapValue(Capabilities.SIMPLEREST_VERB) || this._getCapValue(Capabilities.SIMPLEREST_METHOD),
      timeout
    }

    if (this.caps[Capabilities.SIMPLEREST_HEADERS_TEMPLATE]) {
      this.view.msg.messageText = nonEncodedMessage
      try {
        requestOptions.headers = this._getMustachedCap(Capabilities.SIMPLEREST_HEADERS_TEMPLATE, true)
      } catch (err) {
        throw new Error(`composing headers from SIMPLEREST_HEADERS_TEMPLATE failed (${err.message})`)
      }
    }
    // It is possible to mix json, and non-json request messages. So it can happen that both
    // SIMPLEREST_BODY_FROM_JSON and SIMPLEREST_BODY_TEMPLATE are set
    if (this.caps[Capabilities.SIMPLEREST_BODY_FROM_JSON] && msg.sourceData && Object.keys(msg.sourceData).length > 0) {
      requestOptions.body = msg.sourceData
      requestOptions.json = true
      if (!requestOptions.headers) requestOptions.headers = {}
      requestOptions.headers['Content-Type'] = 'application/json'
    } else if (this.caps[Capabilities.SIMPLEREST_BODY_TEMPLATE]) {
      const bodyRaw = this._getCapValue(Capabilities.SIMPLEREST_BODY_RAW)
      if (bodyRaw) {
        this.view.msg.messageText = nonEncodedMessage
      } else {
        this.view.msg.messageText = nonEncodedMessage && escapeJSONString(nonEncodedMessage)
      }
      try {
        requestOptions.body = this._getMustachedCap(Capabilities.SIMPLEREST_BODY_TEMPLATE, !bodyRaw)
        requestOptions.json = !bodyRaw
        if (requestOptions.json && (!requestOptions.body || Object.keys(requestOptions.body).length === 0)) {
          debug(`warning: requestOptions.body content seems to be empty - ${requestOptions.body} - capability: "${this.caps[Capabilities.SIMPLEREST_BODY_TEMPLATE]}"`)
        }
        if (!bodyRaw) {
          if (!requestOptions.headers) requestOptions.headers = {}
          requestOptions.headers['Content-Type'] = 'application/json'
        }
      } catch (err) {
        throw new Error(`composing body from SIMPLEREST_BODY_TEMPLATE failed (${err.message})`)
      }
    }
    this.view.msg.messageText = nonEncodedMessage

    if (msg.ADD_QUERY_PARAM && Object.keys(msg.ADD_QUERY_PARAM).length > 0) {
      const appendToUri = Object.keys(msg.ADD_QUERY_PARAM).map(key =>
        `${encodeURIComponent(key)}=${encodeURIComponent(this._getMustachedVal(
          _.isString(msg.ADD_QUERY_PARAM[key]) ? msg.ADD_QUERY_PARAM[key] : JSON.stringify(msg.ADD_QUERY_PARAM[key]),
          false))}`)
        .join('&')
      if (requestOptions.uri.indexOf('?') > 0) {
        requestOptions.uri = `${requestOptions.uri}&${appendToUri}`
      } else {
        requestOptions.uri = `${requestOptions.uri}?${appendToUri}`
      }
    }
    if (msg.ADD_FORM_PARAM && Object.keys(msg.ADD_FORM_PARAM).length > 0) {
      requestOptions.form = {}
      for (const formKey of Object.keys(msg.ADD_FORM_PARAM)) {
        const formValue = this._getMustachedVal(
          _.isString(msg.ADD_FORM_PARAM[formKey]) ? msg.ADD_FORM_PARAM[formKey] : JSON.stringify(msg.ADD_FORM_PARAM[formKey]),
          false)
        requestOptions.form[formKey] = formValue
      }
    }
    if (msg.ADD_HEADER && Object.keys(msg.ADD_HEADER).length > 0) {
      requestOptions.headers = requestOptions.headers || {}

      for (const headerKey of Object.keys(msg.ADD_HEADER)) {
        let headerValue
        if (_.isString(msg.ADD_HEADER[headerKey])) {
          headerValue = this._getMustachedVal(msg.ADD_HEADER[headerKey], false)
        } else {
          headerValue = this._getMustachedVal(JSON.stringify(msg.ADD_HEADER[headerKey]), true)
        }
        requestOptions.headers[headerKey] = headerValue
      }
    }
    this._addRequestOptions(requestOptions)
    await executeHook(this.caps, this.requestHook, Object.assign({ requestOptions }, this.view))
    this._addRequestCookies(requestOptions)
    this._fetchify(requestOptions)

    return requestOptions
  }

  async _waitForUrlResponse (httpConfig, retries) {
    const timeout = ms => new Promise(resolve => setTimeout(resolve, ms))

    let tries = 0

    while (true) {
      debug(`_waitForUrlResponse checking url ${httpConfig.uri} before proceed`)
      if (tries > retries) {
        throw new Error(`Failed to ping bot after ${retries} retries`)
      }
      tries++
      let bodyRaw
      let body
      let err
      try {
        bodyRaw = await this.bottleneck(() => fetch(httpConfig.uri, httpConfig))
        body = await ((httpConfig.json) ? bodyRaw.json() : bodyRaw.text())
      } catch (e) {
        err = e
      }
      if (err) {
        debug(`_waitForUrlResponse error on url check ${httpConfig.uri}: ${err}`)
        if (tries <= retries) {
          await timeout(httpConfig.timeout)
        }
      } else if (!bodyRaw.ok) {
        debug(`_waitForUrlResponse on url check ${httpConfig.uri} got error response: ${bodyRaw.status}/${bodyRaw.statusText}`)
        if (debug.enabled && body) {
          debug(botiumUtils.shortenJsonString(body))
        }
        if (tries <= retries) {
          await timeout(httpConfig.timeout)
        }
      } else {
        debug(`_waitForUrlResponse success on url check ${httpConfig.uri}: ${bodyRaw.status}/${bodyRaw.statusText}`)
        this._storeCookiesFromResponse(bodyRaw)
        if (debug.enabled && body) {
          debug(`body: ${botiumUtils.shortenJsonString(body)}, headers: ${botiumUtils.shortenJsonString(bodyRaw.headers)}`)
        }
        return { body, headers: bodyRaw.headers }
      }
    }
  }

  async _parseResponseBody (body) {
    if (!_.isObject(body) && _.isString(body)) {
      try {
        body = JSON.parse(body)
      } catch (err) {
        if (!this.parserHook) throw err
      }
    }
    if (this.parserHook) {
      await executeHook(this.caps, this.parserHook, Object.assign({ body, changeBody: (b) => { body = b } }, this.view))
    }
    if (_.isObject(body)) return body
    else if (_.isString(body)) return JSON.parse(body)
    else return null
  }

  _getCapValue (capName) {
    return _.isFunction(this.caps[capName]) ? (this.caps[capName])() : this.caps[capName]
  }

  _getMustachedCap (capName, json) {
    const capValue = this._getCapValue(capName)
    const template = _.isString(capValue) ? capValue : JSON.stringify(capValue)
    return this._getMustachedVal(template, json)
  }

  _getMustachedVal (template, json) {
    const raw = Mustache.render(template, this.view)
    if (json) {
      try {
        return JSON.parse(raw)
      } catch (err) {
        if (debug.enabled) {
          debug(`JSON parsing failed (${err.message}) for: ${botiumUtils.shortenJsonString(raw)}`)
        }
        throw new Error(`JSON parsing failed - try to use {{#fnc.jsonify}}{{xxx}}{{/fnc.jsonify}} to escape JSON special characters (ERR: ${err.message})`)
      }
    } else {
      return raw
    }
  }

  _processInboundEvent (event) {
    if (!this.processInbound) return

    const jsonPathValue = this.caps[Capabilities.SIMPLEREST_INBOUND_SELECTOR_VALUE]
    const jsonPathsSelector = getAllCapValues(Capabilities.SIMPLEREST_INBOUND_SELECTOR_JSONPATH, this.caps)
    if (jsonPathsSelector && jsonPathsSelector.length > 0) {
      let isSelected = false
      for (const jsonPathTemplate of jsonPathsSelector) {
        const jsonPath = this._getMustachedVal(jsonPathTemplate, false)
        const hasResult = jp.query(event, jsonPath)
        if (hasResult && hasResult.length > 0) {
          const check = jsonPathValue && this._getMustachedVal(jsonPathValue, false)
          if (check) {
            if (`${hasResult[0]}` === `${check}`) {
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
    if (this.caps[Capabilities.SIMPLEREST_INBOUND_ORDER_UNSETTLED_EVENTS_JSONPATH]) {
      this.inboundEvents.push(event)
      this._processOrderedInboundEventsArrayAsync()
    } else {
      setTimeout(() => this._processBodyAsync(event.body, event.headers, true, !!this.caps[Capabilities.SIMPLEREST_INBOUND_UPDATE_CONTEXT]), 0)
    }
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
        const count = await this.redis.subscribe(this.redisTopic)
        debug(`Redis subscribed to ${count} channels. Listening for inbound messages on the ${this.redisTopic} channel.`)
      } catch (err) {
        debug(err)
        throw new Error(`Redis failed to subscribe channel ${this.redisTopic}: ${err.message || err}`)
      }
    }
  }

  async _unsubscribeInbound () {
    this.processingEvents = false
    if (this.redis) {
      try {
        await this.redis.unsubscribe(this.redisTopic)
        debug(`Redis unsubscribed from ${this.redisTopic} channel.`)
      } catch (err) {
        debug(err)
        throw new Error(`Redis failed to unsubscribe channel ${this.redisTopic}: ${err.message || err}`)
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

  async _runPolling () {
    if (!this.processInbound) return

    if (this.caps[Capabilities.SIMPLEREST_POLL_URL]) {
      const uri = this._getMustachedCap(Capabilities.SIMPLEREST_POLL_URL, false)
      const verb = this._getCapValue(Capabilities.SIMPLEREST_POLL_VERB)
      const timeout = this._getCapValue(Capabilities.SIMPLEREST_POLL_TIMEOUT)
      const pollConfig = {
        method: verb,
        uri,
        timeout
      }
      if (this.caps[Capabilities.SIMPLEREST_POLL_HEADERS]) {
        try {
          pollConfig.headers = this._getMustachedCap(Capabilities.SIMPLEREST_POLL_HEADERS, true)
        } catch (err) {
          debug(`_runPolling: composing headers from SIMPLEREST_POLL_HEADERS failed (${err.message})`)
          return
        }
      }
      if (this.caps[Capabilities.SIMPLEREST_POLL_BODY]) {
        const bodyRaw = this._getCapValue(Capabilities.SIMPLEREST_POLL_BODY_RAW)
        try {
          pollConfig.body = this._getMustachedCap(Capabilities.SIMPLEREST_POLL_BODY, !bodyRaw)
          pollConfig.json = !bodyRaw
          if (!bodyRaw) {
            if (!pollConfig.headers) pollConfig.headers = {}
            pollConfig.headers['Content-Type'] = 'application/json'
          }
        } catch (err) {
          debug(`_runPolling: composing body from SIMPLEREST_POLL_BODY failed (${err.message})`)
          return
        }
      }
      this._addRequestOptions(pollConfig)
      this._fetchify(pollConfig)
      try {
        await executeHook(this.caps, this.pollRequestHook, Object.assign({ requestOptions: pollConfig }, this.view))
      } catch (err) {
        debug(`_runPolling: exeucting request hook failed - (${err.message})`)
        return
      }
      this._addRequestCookies(pollConfig)

      try {
        const bodyRaw = await fetch(pollConfig.uri, pollConfig)
        let body = await ((pollConfig.json) ? bodyRaw.json() : bodyRaw.text())
        if (!bodyRaw.ok) {
          debug(`_runPolling: got error response: ${bodyRaw.status}/${bodyRaw.statusText}, request: ${JSON.stringify(pollConfig)}`)
          if (debug.enabled && body) {
            debug(botiumUtils.shortenJsonString(body))
          }
        } else if (body) {
          debug(`_runPolling: got response code: ${bodyRaw.status}/${bodyRaw.statusText}, body: ${botiumUtils.shortenJsonString(body)}, headers: ${botiumUtils.shortenJsonString(bodyRaw.headers)}`)
          this._storeCookiesFromResponse(bodyRaw)
          try {
            body = await this._parseResponseBody(body)
          } catch (err) {
            debug(`_runPolling: ignoring not JSON formatted response body: ${err.message}`)
            return
          }
          if (body) {
            setTimeout(() => this._processBodyAsync(body, bodyRaw.headers, true, !!this.caps[Capabilities.SIMPLEREST_POLL_UPDATE_CONTEXT]), 0)
          } else {
            debug('_runPolling: ignoring response body (no string and no JSON object)')
          }
        } else {
          debug(`_runPolling: got response code: ${bodyRaw.status}/${bodyRaw.statusText}, empty body`)
        }
      } catch (err) {
        debug(`_runPolling: rest request failed: ${err.message}, request: ${JSON.stringify(pollConfig)}`)
      }
    }
  }

  async _startPolling () {
    if (this.caps[Capabilities.SIMPLEREST_POLL_URL]) {
      this.pollInterval = setInterval(this._runPolling.bind(this), this.caps[Capabilities.SIMPLEREST_POLL_INTERVAL])
      debug(`Started HTTP polling for inbound messages on ${this.caps[Capabilities.SIMPLEREST_POLL_URL]}, interval: ${this.caps[Capabilities.SIMPLEREST_POLL_INTERVAL]}.`)
    }
  }

  async _stopPolling () {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
      debug(`Stopped HTTP polling for inbound messages on ${this.caps[Capabilities.SIMPLEREST_POLL_URL]}.`)
    }
  }

  async _makeCall (capPrefix) {
    const uri = this._getMustachedCap(`${capPrefix}_URL`, false)
    const verb = this._getCapValue(`${capPrefix}_VERB`)
    const timeout = this._getCapValue(`${capPrefix}_TIMEOUT`) || this._getCapValue(Capabilities.SIMPLEREST_TIMEOUT)
    const httpConfig = {
      method: verb,
      uri,
      timeout
    }
    if (this.caps[`${capPrefix}_HEADERS`]) {
      try {
        httpConfig.headers = this._getMustachedCap(`${capPrefix}_HEADERS`, true)
      } catch (err) {
        throw new Error(`composing headers from ${capPrefix}_HEADERS failed (${err.message})`)
      }
    }
    if (this.caps[`${capPrefix}_BODY`]) {
      const bodyRaw = this._getCapValue(`${capPrefix}_BODY_RAW`)
      try {
        httpConfig.body = this._getMustachedCap(`${capPrefix}_BODY`, !bodyRaw)
        httpConfig.json = !bodyRaw
      } catch (err) {
        throw new Error(`composing body from ${capPrefix}_BODY failed (${err.message})`)
      }
    }
    this._addRequestOptions(httpConfig)
    this._fetchify(httpConfig)
    await executeHook(this.caps, this.requestHooks[capPrefix], Object.assign({ requestOptions: httpConfig }, this.view))
    this._addRequestCookies(httpConfig)

    const retries = this._getCapValue(`${capPrefix}_RETRIES`)
    debug(`_makeCall(${capPrefix}): rest request: ${JSON.stringify(httpConfig)}`)
    const response = await this._waitForUrlResponse(httpConfig, retries)
    return response
  }

  _addRequestOptions (httpConfig) {
    if (this.dispatcher) {
      httpConfig.dispatcher = this.dispatcher
    }
    if (this.caps[Capabilities.SIMPLEREST_EXTRA_OPTIONS]) {
      _.merge(httpConfig, this.caps[Capabilities.SIMPLEREST_EXTRA_OPTIONS])
    }
  }

  _addRequestCookies (requestOptions) {
    if (!this.caps[Capabilities.SIMPLEREST_COOKIE_REPLICATION] || !requestOptions) {
      return
    }
    const url = new URL(requestOptions.uri)
    if (!requestOptions.headers) {
      requestOptions.headers = {}
    }
    if (this.cookies[url.host]) {
      requestOptions.headers.Cookie = requestOptions.headers.Cookie ? `${requestOptions.headers.Cookie}; ${this.cookies[url.host]}` : this.cookies[url.host]
    }
  }

  _storeCookiesFromResponse (response) {
    if (!this.caps[Capabilities.SIMPLEREST_COOKIE_REPLICATION] || !response) {
      return
    }
    const responseCookies = response.headers.get('set-cookie')
    if (!responseCookies) {
      return
    }
    const host = response?.url ? new URL(response.url).host : null

    if (host) {
      this.cookies[host] = responseCookies
    }
  }
}
