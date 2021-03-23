module.exports = {
  BotDriver: require('./src/BotDriver'),
  ScriptingProvider: require('./src/scripting/ScriptingProvider'),
  ScriptingConstants: require('./src/scripting/Constants'),
  Capabilities: require('./src/Capabilities'),
  Defaults: require('./src/Defaults'),
  Source: require('./src/Source'),
  Events: require('./src/Events'),
  Plugins: require('./src/Plugins'),
  BotiumError: require('./src/scripting/BotiumError').BotiumError,
  ScriptingMemory: require('./src/scripting/ScriptingMemory'),
  HookUtils: require('./src/helpers/HookUtils'),
  LogicHookConstants: require('./src/scripting/logichook/LogicHookConsts'),
  Lib: {
    tryLoadPlugin: require('./src/containers/plugins/index').tryLoadPlugin,
    SimpleRestContainer: require('./src/containers/plugins/SimpleRestContainer')
  },
  InboundProxy: require('./src/grid/inbound/proxy'),
  BotiumMockRichMessageTypes: require('./src/mocks/BotiumMockRichMessageTypes')
}
