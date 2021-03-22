module.exports = {
  BotDriver: require('./src/BotDriver'),
  ScriptingProvider: require('./src/scripting/ScriptingProvider'),
  Capabilities: require('./src/Capabilities'),
  Defaults: require('./src/Defaults'),
  Source: require('./src/Source'),
  Events: require('./src/Events'),
  Plugins: require('./src/Plugins'),
  BotiumError: require('./src/scripting/BotiumError').BotiumError,
  ScriptingMemory: require('./src/scripting/ScriptingMemory'),
  HookUtils: require('./src/helpers/HookUtils'),
  Lib: {
    tryLoadPlugin: require('./src/containers/plugins/index').tryLoadPlugin,
    SimpleRestContainer: require('./src/containers/plugins/SimpleRestContainer')
  },
  BotiumMockRichMessageTypes: require('./src/mocks/BotiumMockRichMessageTypes')
}
