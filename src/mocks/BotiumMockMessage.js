const BotiumMockAttachment = require('./BotiumMockAttachment')
const { BotiumMockMedia, BotiumMockButton, BotiumMockCard } = require('./BotiumMockRichMessageTypes')

module.exports = class BotiumMockMessage {
  constructor (fromJson = {}) {
    this.sender = fromJson.sender
    this.channel = fromJson.channel
    this.messageText = fromJson.messageText
    this.media = (fromJson.media ? fromJson.media.map((a) => new BotiumMockMedia(a)) : null)
    this.buttons = (fromJson.buttons ? fromJson.buttons.map((a) => new BotiumMockButton(a)) : null)
    this.cards = (fromJson.cards ? fromJson.cards.map((a) => new BotiumMockCard(a)) : null)
    this.sourceData = fromJson.sourceData
    this.sourceAction = fromJson.sourceAction
    this.attachments = (fromJson.attachments ? fromJson.attachments.map((a) => new BotiumMockAttachment(a)) : null)
  }
}
