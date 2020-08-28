const SimpleRestContainer = require('botium-core/src/containers/plugins/SimpleRestContainer.js')
const CoreCapabilities = require('botium-core/src/Capabilities')

const Capabilities = {
  MYAPI_URL: 'MYAPI_URL',
  MYAPI_TOKEN: 'MYAPI_TOKEN'
}

class BotiumConnectorMyApi {
  constructor ({ queueBotSays, caps }) {
    this.queueBotSays = queueBotSays
    this.caps = caps
    this.delegateContainer = null
    this.delegateCaps = null
    this.userSaysCounter = 0
  }

  Validate () {
    if (!this.caps[Capabilities.MYAPI_URL]) throw new Error('MYAPI_URL capability required')

    if (!this.delegateContainer) {
      this.delegateCaps = {
        [CoreCapabilities.SIMPLEREST_URL]: this.caps[Capabilities.MYAPI_URL],
        [CoreCapabilities.SIMPLEREST_METHOD]: 'POST',
        [CoreCapabilities.SIMPLEREST_RESPONSE_JSONPATH]: '$.reply',
        [CoreCapabilities.SIMPLEREST_BODY_TEMPLATE]: JSON.stringify({ 
          username: 'botium',
          message: '{{msg.messageText}}',
          session: '{{botium.conversationId}}',
          startsession: false,
          quickreply: null
         })
      }
      if (this.caps[Capabilities.MYAPI_TOKEN]) {
        this.delegateCaps[CoreCapabilities.SIMPLEREST_HEADERS_TEMPLATE] = `{ "Authorization": "Token ${this.caps[Capabilities.MYAPI_TOKEN]}"}`
      }

      this.delegateCaps[CoreCapabilities.SIMPLEREST_REQUEST_HOOK] = ({ msg, requestOptions, context }) => {
        if (this.userSaysCounter === 0) {
          requestOptions.body.startsession = true
        } else {
          requestOptions.body.startsession = false
        }
        if (msg.buttons && msg.buttons.length > 0) {
          delete requestOptions.body.message
          requestOptions.body.quickreply = msg.buttons[0].payload || msg.buttons[0].text
        }
      }
      this.delegateCaps[CoreCapabilities.SIMPLEREST_RESPONSE_HOOK] = ({ botMsg, botMsgRoot }) => {
        if (botMsgRoot.status === 'error') throw new Error(`MyAPI Error: ${botMsgRoot.message}`)

        if (botMsgRoot.quickreplies && botMsgRoot.quickreplies.length > 0) {
          botMsg.buttons = botMsgRoot.quickreplies.map(b => ({ text: b.title, payload: b.value }))
        }
      }

      this.delegateCaps = Object.assign({}, this.caps, this.delegateCaps)
      this.delegateContainer = new SimpleRestContainer({ queueBotSays: this.queueBotSays, caps: this.delegateCaps })
    }
    return this.delegateContainer.Validate()
  }

  async Build () {
    await this.delegateContainer.Build()
  }

  async Start () {
    this.userSaysCounter = 0
    await this.delegateContainer.Start()
  }

  async UserSays (msg) {
    await this.delegateContainer.UserSays(msg)
    this.userSaysCounter++
  }

  async Stop () {
    await this.delegateContainer.Stop()
  }

  async Clean () {
    await this.delegateContainer.Clean()
  }
}

module.exports = {
  PluginVersion: 1,
  PluginClass: BotiumConnectorMyApi,
  PluginDesc: {
    name: 'My API',
    provider: 'Me',
    capabilities: [
      {
        name: 'MYAPI_URL',
        label: 'MyAPI Endpoint',
        type: 'url',
        required: true
      },
      {
        name: 'MYAPI_TOKEN',
        label: 'MyAPI Authorization Token',
        type: 'secret',
        required: false
      }
    ]
  }
}