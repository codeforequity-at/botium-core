module.exports = class BotiumMockMessage {
  constructor (fromJson = {}) {
    this.sender = fromJson.sender
    this.channel = fromJson.channel
    this.messageText = fromJson.messageText
    this.sourceData = fromJson.sourceData
    this.sourceAction = fromJson.sourceAction
  }
}
