module.exports = {
  PluginVersion: 1,
  PluginClass: ({ queueBotSays, caps }) => ({
    UserSays: (msg) => {
      setTimeout(() => queueBotSays({ messageText: (caps.cap1 || 'PRE') + ':' + msg.messageText }), 0)
    }
  }),
  PluginDesc: {
    name: 'Test Connector FromFile 2',
    provider: 'Botium',
    capabilities: [
      {
        name: 'cap1',
        label: 'cap1',
        type: 'string',
        required: true
      }
    ]
  }
}
