module.exports = {
  PluginVersion: 1,
  PluginClass: (msg) => msg.messageText,
  PluginDesc: {
    name: 'Test Connector FromDir',
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
