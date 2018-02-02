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

        (workspaceCopied) => {
          if (this.caps[Capabilities.WATSONCONVERSATION_COPY_WORKSPACE]) {
            this.conversation.getWorkspace({ workspace_id: this.caps[Capabilities.WATSONCONVERSATION_WORKSPACE_ID], export: true }, (err, workspace) => {
              if (err) {
                workspaceCopied(`Watson workspace connection failed: ${util.inspect(err)}`)
              } else {
                this.conversation.createWorkspace(workspace, (err, workspaceCopy) => {
                  if (err) {
                    workspaceCopied(`Watson workspace copy failed: ${util.inspect(err)}`)
                  } else {
                    debug(`Watson workspace copied: ${util.inspect(workspaceCopy)}`)
                    this.useWorkspaceId = workspaceCopy.workspace_id
                    workspaceCopied()
                  }
                })
              }
            })
          } else {
            this.useWorkspaceId = this.caps[Capabilities.WATSONCONVERSATION_WORKSPACE_ID]
            workspaceCopied()
          }
        },

        (workspaceAvailableReady) => {
          let workspaceAvailable = false

          async.until(
            () => workspaceAvailable,
            (workspaceChecked) => {
              debug(`Watson checking workspace status ${this.useWorkspaceId} before proceed`)

              this.conversation.getWorkspace({ workspace_id: this.useWorkspaceId }, (err, workspace) => {
                if (err) {
                  workspaceChecked(`Watson workspace connection failed: ${util.inspect(err)}`)
                } else {
                  debug(`Watson workspace connected, checking for status 'Available': ${util.inspect(workspace)}`)
                  if (workspace.status === 'Available') {
                    workspaceAvailable = true
                    workspaceChecked()
                  } else {
                    debug(`Watson workspace waiting for status 'Available'`)
                    setTimeout(workspaceChecked, 10000)
                  }
                }
              })
            },
            (err) => {
              if (err) return workspaceAvailableReady(err)
              workspaceAvailableReady()
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
    if (!this.conversation) return Promise.reject(new Error('not built'))

    this.eventEmitter.emit(Events.CONTAINER_STARTING, this)

    return super.Start().then(() => {
      this.conversationContext = {}
      this.eventEmitter.emit(Events.CONTAINER_STARTED, this)
      return this
    })
  }

  UserSays (mockMsg) {
    if (!this.conversation) return Promise.reject(new Error('not built'))

    return new Promise((resolve, reject) => {
      const payload = {
        workspace_id: this.useWorkspaceId,
        context: this.conversationContext || {},
        input: { text: mockMsg.messageText }
      }
      this.conversation.message(payload, (err, data) => {
        if (err) return reject(new Error(`Cannot send message to watson container: ${util.inspect(err)}`))

        debug(`Watson response: ${util.inspect(data)}`)
        this.eventEmitter.emit(Events.MESSAGE_SENTTOBOT, this, mockMsg)
        resolve(this)

        this.conversationContext = data.context
        if (this.caps[Capabilities.WATSONCONVERSATION_USE_INTENT]) {
          if (data.intents && data.intents.length > 0) {
            const botMsg = { sender: 'bot', sourceData: data, messageText: data.intents[0].intent }
            this._QueueBotSays(new BotiumMockMessage(botMsg))
            this.eventEmitter.emit(Events.MESSAGE_RECEIVEDFROMBOT, this, botMsg)
          }
        } else {
          if (data.output && data.output.text) {
            const messageTexts = (_.isArray(data.output.text) ? data.output.text : [ data.output.text ])

            messageTexts.forEach((messageText) => {
              if (!messageText) return

              const botMsg = { sender: 'bot', sourceData: data, messageText }
              this._QueueBotSays(new BotiumMockMessage(botMsg))
              this.eventEmitter.emit(Events.MESSAGE_RECEIVEDFROMBOT, this, botMsg)
            })
          }
        }
      })
    })
  }

  Stop () {
    if (!this.conversation) return Promise.reject(new Error('not built'))

    this.eventEmitter.emit(Events.CONTAINER_STOPPING, this)

    return super.Stop().then(() => {
      this.eventEmitter.emit(Events.CONTAINER_STOPPED, this)
      return this
    })
  }

  Clean () {
    if (!this.conversation) return Promise.reject(new Error('not built'))

    this.eventEmitter.emit(Events.CONTAINER_CLEANING, this)

    return new Promise((resolve, reject) => {
      async.series([

        (workspaceDeleteReady) => {
          if (this.caps[Capabilities.WATSONCONVERSATION_COPY_WORKSPACE]) {
            this.conversation.deleteWorkspace({ workspace_id: this.useWorkspaceId }, (err) => {
              if (err) {
                debug(`Watson workspace delete copy failed: ${util.inspect(err)}`)
              } else {
                debug(`Watson workspace deleted: ${this.useWorkspaceId}`)
              }
              workspaceDeleteReady()
            })
          } else {
            workspaceDeleteReady()
          }
        },

        (conversationReset) => {
          this.conversation = null
          this.conversationContext = null
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
