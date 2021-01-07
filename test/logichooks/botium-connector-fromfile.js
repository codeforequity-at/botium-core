module.exports = {
  PluginVersion: 1,
  PluginClass: (msg) => msg.messageText,
  PluginDesc: {
    name: 'Test Connector FromFile 1',
    provider: 'Botium'
  },
  PluginAsserters: {
    MyCustomAsserter: () => ({
      assertConvoStep: ({ botMsg }) => (botMsg.messageText === 'Hello' ? Promise.resolve() : Promise.reject(new Error('expected Hello')))
    })
  }
}
