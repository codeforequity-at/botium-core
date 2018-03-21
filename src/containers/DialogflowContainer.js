const util = require('util')
const async = require('async')
const uuidV1 = require('uuid/v1')
const dialogflow = require('dialogflow')
const debug = require('debug')('botium-DialogflowContainer')

const Events = require('../Events')
const Capabilities = require('../Capabilities')
const BaseContainer = require('./BaseContainer')
const BotiumMockMessage = require('../mocks/BotiumMockMessage')
const structjson = require('../helpers/structjson')

module.exports = class DialogflowContainer extends BaseContainer {
  Validate () {
    return super.Validate().then(() => {
      this._AssertCapabilityExists(Capabilities.DIALOGFLOW_PROJECT_ID)
      this._AssertCapabilityExists(Capabilities.DIALOGFLOW_CLIENT_EMAIL)
      this._AssertCapabilityExists(Capabilities.DIALOGFLOW_PRIVATE_KEY)
      this._AssertCapabilityExists(Capabilities.DIALOGFLOW_LANGUAGE_CODE)
    })
  }

  Build () {
    return new Promise((resolve, reject) => {
      async.series([
        (baseComplete) => {
          super.Build().then(() => baseComplete()).catch(baseComplete)
        },

        (optionsReady) => {
          this.sessionOpts = {
            credentials: {
              client_email: this.caps[Capabilities.DIALOGFLOW_CLIENT_EMAIL],
              private_key: this.caps[Capabilities.DIALOGFLOW_PRIVATE_KEY]
            }
          }
          optionsReady()
        }

      ], (err) => {
        if (err) {
          return reject(new Error(`Cannot build dialogflow container: ${util.inspect(err)}`))
        }
        resolve(this)
      })
    })
  }

  Start () {
    this.eventEmitter.emit(Events.CONTAINER_STARTING, this)

    return super.Start().then(() => {
      this.sessionClient = new dialogflow.SessionsClient(this.sessionOpts)
      this.sessionPath = this.sessionClient.sessionPath(this.caps[Capabilities.DIALOGFLOW_PROJECT_ID], uuidV1())
      this.queryParams = null
      this.eventEmitter.emit(Events.CONTAINER_STARTED, this)
      return this
    })
  }

  UserSays (mockMsg) {
    if (!this.sessionClient) return Promise.reject(new Error('not built'))

    return new Promise((resolve, reject) => {
      const request = {
        session: this.sessionPath,
        queryInput: {
          text: {
            text: mockMsg.messageText,
            languageCode: this.caps[Capabilities.DIALOGFLOW_LANGUAGE_CODE]
          }
        }
      }
      request.queryParams = this.queryParams

      this.sessionClient.detectIntent(request).then((responses) => {
        const response = responses[0]
        debug(`dialogflow response: ${util.inspect(response)}`)

        response.queryResult.outputContexts.forEach(context => {
          context.parameters = structjson.jsonToStructProto(
            structjson.structProtoToJson(context.parameters)
          )
        })
        this.queryParams = {
          contexts: response.queryResult.outputContexts
        }
        this.eventEmitter.emit(Events.MESSAGE_SENTTOBOT, this, mockMsg)
        resolve(this)

        if (this.caps[Capabilities.DIALOGFLOW_USE_INTENT]) {
          if (response.queryResult.intent) {
            const botMsg = { sender: 'bot', sourceData: response.queryResult, messageText: response.queryResult.intent.displayName }
            this._QueueBotSays(new BotiumMockMessage(botMsg))
            this.eventEmitter.emit(Events.MESSAGE_RECEIVEDFROMBOT, this, botMsg)
          }
        } else {
          if (response.queryResult.fulfillmentText) {
            const botMsg = { sender: 'bot', sourceData: response.queryResult, messageText: response.queryResult.fulfillmentText }
            this._QueueBotSays(new BotiumMockMessage(botMsg))
            this.eventEmitter.emit(Events.MESSAGE_RECEIVEDFROMBOT, this, botMsg)
          }
        }
      }).catch((err) => {
        reject(new Error(`Cannot send message to dialogflow container: ${util.inspect(err)}`))
      })
    })
  }

  Stop () {
    if (!this.sessionClient) return Promise.reject(new Error('not built'))

    this.eventEmitter.emit(Events.CONTAINER_STOPPING, this)

    return super.Stop().then(() => {
      this.eventEmitter.emit(Events.CONTAINER_STOPPED, this)
      return this
    })
  }

  Clean () {
    if (!this.sessionClient) return Promise.reject(new Error('not built'))

    this.eventEmitter.emit(Events.CONTAINER_CLEANING, this)

    return new Promise((resolve, reject) => {
      async.series([
        (conversationReset) => {
          this.sessionOpts = null
          this.sessionClient = null
          this.sessionPath = null
          this.queryParams = null
          conversationReset()
        },

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
}
