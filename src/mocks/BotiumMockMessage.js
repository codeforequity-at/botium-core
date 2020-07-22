const BotiumMockAttachment = require('./BotiumMockAttachment')
const { BotiumMockMedia, BotiumMockButton, BotiumMockCard, BotiumMockForm } = require('./BotiumMockRichMessageTypes')
const { BotiumMockAsserter, BotiumMockUserInput, BotiumMockLogicHook } = require('./BotiumMockScripting')

module.exports = class BotiumMockMessage {
  constructor (fromJson = {}) {
    this.sender = fromJson.sender
    this.channel = fromJson.channel
    this.not = fromJson.not
    this.messageText = fromJson.messageText
    this._media = (fromJson.media ? fromJson.media.map((a) => new BotiumMockMedia(a)) : null)
    this._buttons = (fromJson.buttons ? fromJson.buttons.map((a) => new BotiumMockButton(a)) : null)
    this._cards = (fromJson.cards ? fromJson.cards.map((a) => new BotiumMockCard(a)) : null)
    this._forms = (fromJson.forms ? fromJson.forms.map((a) => new BotiumMockForm(a)) : null)
    this.nlp = fromJson.nlp
    this.sourceData = fromJson.sourceData
    this.sourceAction = fromJson.sourceAction
    this._attachments = (fromJson.attachments ? fromJson.attachments.map((a) => new BotiumMockAttachment(a)) : null)
    this._asserters = (fromJson.asserters ? fromJson.asserters.map((a) => new BotiumMockAsserter(a)) : null)
    this._userInputs = (fromJson.userInputs ? fromJson.userInputs.map((a) => new BotiumMockUserInput(a)) : null)
    this._logicHooks = (fromJson.logicHooks ? fromJson.logicHooks.map((a) => new BotiumMockLogicHook(a)) : null)
  }

  prettify () {
    const prettifySafe = (entry) => entry.prettify ? entry.prettify(2) : `${' '.repeat(2)}<No botium object!>${JSON.stringify(entry)}`
    const lines = []
    if (this.messageText) lines.push(this.messageText)
    if (this.media && this.media.length > 0) lines.push(...this.media.map(m => prettifySafe(m)))
    if (this.buttons && this.buttons.length > 0) lines.push(...this.buttons.map(b => prettifySafe(b)))
    if (this.cards && this.cards.length > 0) lines.push(...this.cards.map(c => prettifySafe(c)))
    if (this.forms && this.forms.length > 0) lines.push(...this.forms.map(f => prettifySafe(f)))

    if (lines.length === 0) return `#${this.sender}:`

    return [
      `#${this.sender}: ${lines[0]}`,
      ...lines.slice(1)
    ].join('\n')
  }

  get media () {
    return this._media
  }

  get buttons () {
    return this._buttons
  }

  get cards () {
    return this._cards
  }

  get forms () {
    return this._forms
  }

  get attachments () {
    return this._attachments
  }

  get asserters () {
    return this._asserters
  }

  get userInputs () {
    return this._userInputs
  }

  get logicHooks () {
    return this._logicHooks
  }

  set media (value) {
    this._media = (value ? value.map((a) => new BotiumMockMedia(a)) : null)
  }

  set buttons (value) {
    this._buttons = (value ? value.map((a) => new BotiumMockButton(a)) : null)
  }

  set cards (value) {
    this._cards = (value ? value.map((a) => new BotiumMockCard(a)) : null)
  }

  set forms (value) {
    this._forms = (value ? value.map((a) => new BotiumMockForm(a)) : null)
  }

  set attachments (value) {
    this._attachments = (value ? value.map((a) => new BotiumMockAttachment(a)) : null)
  }

  set asserters (value) {
    this._asserters = (value ? value.map((a) => new BotiumMockAsserter(a)) : null)
  }

  set userInputs (value) {
    this._userInputs = (value ? value.map((a) => new BotiumMockUserInput(a)) : null)
  }

  set logicHooks (value) {
    this._logicHooks = (value ? value.map((a) => new BotiumMockLogicHook(a)) : null)
  }
}
