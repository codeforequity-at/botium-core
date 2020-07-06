module.exports = {
  PluginVersion: 1,
  PluginClass: () => ({}),
  PluginDesc: {
    name: 'Test Connector',
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
