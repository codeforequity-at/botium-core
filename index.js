module.exports = {
  BotDriver: require('./src/BotDriver'),
  Capabilities: require('./src/Capabilities'),
  Defaults: require('./src/Defaults'),
  Source: require('./src/Source'),
  Events: require('./src/Events'),
  Plugins: require('./src/Plugins'),
  BotiumError: require('./src/scripting/BotiumError').BotiumError,
  ScriptingMemory: require('./src/scripting/ScriptingMemory'),
  Lib: {
    tryLoadPlugin: require('./src/containers/plugins/index').tryLoadPlugin
  },
  BotiumMockRichMessageTypes: require('./src/mocks/BotiumMockRichMessageTypes')
}
