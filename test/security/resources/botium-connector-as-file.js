class ConnectorAsFile {
  constructor ({ queueBotSays }) {
    this.queueBotSays = queueBotSays
  }

  UserSays (msg) {
    const botMsg = { messageText: msg.messageText }
    setTimeout(() => this.queueBotSays(botMsg), 0)
  }
}

module.exports = {
  PluginVersion: 1,
  PluginClass: ConnectorAsFile
}
