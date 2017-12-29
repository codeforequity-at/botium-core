const util = require('util')
const async = require('async')
const _ = require('lodash')
const Conversation = require('watson-developer-cloud/conversation/v1')
const debug = require('debug')('botium-WatsonConversationContainer')

const Events = require('../Events')
const Capabilities = require('../Capabilities')
const BaseContainer = require('./BaseContainer')
const BotiumMockMessage = require('../mocks/BotiumMockMessage')

module.exports = class WatsonConversationContainer extends BaseContainer {
  Validate () {
    return super.Validate().then(() => {
      this._AssertCapabilityExists(Capabilities.WATSONCONVERSATION_URL)
      this._AssertCapabilityExists(Capabilities.WATSONCONVERSATION_VERSION_DATE)
      this._AssertCapabilityExists(Capabilities.WATSONCONVERSATION_USER)
      this._AssertCapabilityExists(Capabilities.WATSONCONVERSATION_PASSWORD)
      this._AssertCapabilityExists(Capabilities.WATSONCONVERSATION_WORKSPACE_ID)
    })
  }

  Build () {
    return new Promise((resolve, reject) => {
      async.series([
        (baseComplete) => {
          super.Build().then(() => baseComplete()).catch(baseComplete)
        },

        (conversationReady) => {
          this.conversation = new Conversation({
            url: this.caps[Capabilities.WATSONCONVERSATION_URL],
            username: this.caps[Capabilities.WATSONCONVERSATION_USER],
            password: this.caps[Capabilities.WATSONCONVERSATION_PASSWORD],
            version_date: this.caps[Capabilities.WATSONCONVERSATION_VERSION_DATE]
          })
          conversationReady()
        },

        (workspaceAvailable) => {
          this.conversation.getWorkspace({ workspace_id: this.caps[Capabilities.WATSONCONVERSATION_WORKSPACE_ID] }, (err, workspace) => {
            if (err) {
              workspaceAvailable(`Watson workspace connection failed: ${util.inspect(err)}`)
            } else {
              debug(`Watson workspace connected: ${util.inspect(workspace)}`)
              workspaceAvailable()
            }
          })
        }

      ], (err) => {
        if (err) {
          return reject(new Error(`Cannot build watson container: ${util.inspect(err)}`))
        }
        resolve(this)
      })
    })
  }

  Start () {
    this.eventEmitter.emit(Events.CONTAINER_STARTING, this)

    return super.Start().then(() => {
      this.conversationContext = {}
      this.eventEmitter.emit(Events.CONTAINER_STARTED, this)
      return this
    })
  }

  UserSays (mockMsg) {
    return new Promise((resolve, reject) => {
      const payload = {
        workspace_id: this.caps[Capabilities.WATSONCONVERSATION_WORKSPACE_ID],
        context: this.conversationContext || {},
        input: { text: mockMsg.messageText }
      }
      this.conversation.message(payload, (err, data) => {
        if (err) return reject(new Error(`Cannot send message to watson container: ${util.inspect(err)}`))

        this.eventEmitter.emit(Events.MESSAGE_SENTTOBOT, this, mockMsg)
        resolve(this)

        this.conversationContext = data.context
        if (data.output && data.output.text) {
          const messageTexts = (_.isArray(data.output.text) ? data.output.text : [ data.output.text ])
          console.log(messageTexts)

          messageTexts.forEach((messageText) => {
            const botMsg = { sourceData: data.output, messageText }
            this._QueueBotSays(new BotiumMockMessage(botMsg))
            this.eventEmitter.emit(Events.MESSAGE_RECEIVEDFROMBOT, this, botMsg)
          })
        }
      })
    })
  }

  Stop () {
    this.eventEmitter.emit(Events.CONTAINER_STOPPING, this)

    return super.Stop().then(() => {
      this.eventEmitter.emit(Events.CONTAINER_STOPPED, this)
      return this
    })
  }

  Clean () {
    this.eventEmitter.emit(Events.CONTAINER_CLEANING, this)

    this.conversation = null
    this.conversationContext = null

    return super.Clean().then(() => {
      this.eventEmitter.emit(Events.CONTAINER_CLEANED, this)
      return this
    })
  }
}
