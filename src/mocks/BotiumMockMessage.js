const BotiumMockAttachment = require('./BotiumMockAttachment')
const { BotiumMockMedia, BotiumMockButton, BotiumMockCard, BotiumMockForm } = require('./BotiumMockRichMessageTypes')
const { BotiumMockAsserter, BotiumMockUserInput, BotiumMockLogicHook } = require('./BotiumMockScripting')

module.exports = class BotiumMockMessage {
  constructor (fromJson = {}) {
    this.sender = fromJson.sender
    this.channel = fromJson.channel
    this.messageText = fromJson.messageText
    this.media = (fromJson.media ? fromJson.media.map((a) => new BotiumMockMedia(a)) : null)
    this.buttons = (fromJson.buttons ? fromJson.buttons.map((a) => new BotiumMockButton(a)) : null)
    this.cards = (fromJson.cards ? fromJson.cards.map((a) => new BotiumMockCard(a)) : null)
    this.forms = (fromJson.forms ? fromJson.forms.map((a) => new BotiumMockForm(a)) : null)
    this.nlp = fromJson.nlp
    this.sourceData = fromJson.sourceData
    this.sourceAction = fromJson.sourceAction
    this.attachments = (fromJson.attachments ? fromJson.attachments.map((a) => new BotiumMockAttachment(a)) : null)
    this.asserters = (fromJson.asserters ? fromJson.asserters.map((a) => new BotiumMockAsserter(a)) : null)
    this.userInputs = (fromJson.userInputs ? fromJson.userInputs.map((a) => new BotiumMockUserInput(a)) : null)
    this.logicHooks = (fromJson.logicHooks ? fromJson.logicHooks.map((a) => new BotiumMockLogicHook(a)) : null)
  }
}
