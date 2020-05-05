module.exports = {
  BotDriver: require('./src/BotDriver'),
  Capabilities: require('./src/Capabilities'),
  Defaults: require('./src/Defaults'),
  Source: require('./src/Source'),
  Events: require('./src/Events'),
  BotiumError: require('./src/scripting/BotiumError').BotiumError,
  Lib: {
    tryLoadPlugin: require('./src/containers/plugins/index').tryLoadPlugin
  }
}
