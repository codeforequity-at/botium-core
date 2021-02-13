const _ = require('lodash')

class BotiumMockMedia {
  constructor (fromJson = {}) {
    this.mediaUri = fromJson.mediaUri
    this.mimeType = fromJson.mimeType
    this.altText = fromJson.altText
    this.downloadUri = fromJson.downloadUri
    this.buffer = fromJson.buffer
  }

  prettify (indent = 0) {
    const sections = []
    if (this.mediaUri) sections.push(_.truncate(this.mediaUri, { length: 200 }))
    if (this.mimeType) sections.push(this.mimeType)
    if (this.altText) sections.push(this.altText)
    return `${' '.repeat(indent)}MEDIA(${sections.join(' | ')})`
  }
}

class BotiumMockButton {
  constructor (fromJson = {}) {
    this.text = fromJson.text
    this.payload = fromJson.payload
    this.imageUri = fromJson.imageUri
  }

  prettify (indent = 0) {
    const sections = []
    if (this.text) sections.push(this.text)
    if (this.payload) sections.push(_.isObject(this.payload) ? JSON.stringify(this.payload) : this.payload)
    if (this.imageUri) sections.push(_.truncate(this.imageUri, { length: 200 }))
    return `${' '.repeat(indent)}BUTTON(${sections.join(' | ')})`
  }
}

class BotiumMockCard {
  constructor (fromJson = {}) {
    this.text = fromJson.text
    this.subtext = fromJson.subtext
    this.content = fromJson.content
    this.sourceData = fromJson.sourceData
    this.image = (fromJson.image ? new BotiumMockMedia(fromJson.image) : null)
    this.buttons = (fromJson.buttons ? fromJson.buttons.map((a) => new BotiumMockButton(a)) : null)
    this.media = (fromJson.media ? fromJson.media.map((a) => new BotiumMockMedia(a)) : null)
    this.forms = (fromJson.forms ? fromJson.forms.map((a) => new BotiumMockForm(a)) : null)
    this.cards = (fromJson.cards ? fromJson.cards.map((a) => new BotiumMockCard(a)) : null)
    this.sourceData = fromJson.sourceData
  }

  prettify (indent = 0) {
    return this._prettifyLines(this, indent).join('\n')
  }

  _prettifyLines (card, indent) {
    const prettifySafe = (entry, indent) => entry.prettify ? entry.prettify(2) : `${' '.repeat(indent)}<No botium object!>${JSON.stringify(entry)}`

    const sections = []
    if (card.text) sections.push(card.text)
    if (card.subtext) sections.push(card.subtext)

    const lines = []
    if (card.image) lines.push(card.image.prettify(indent + 2))
    if (card.media) lines.push(...card.media.map(m => prettifySafe(m, indent + 2)))
    if (card.buttons) lines.push(...card.buttons.map(b => prettifySafe(b, indent + 2)))
    if (card.forms) lines.push(...card.forms.map(f => prettifySafe(f, indent + 2)))
    if (card.cards) lines.push(...card.cards.map(c => this._prettifyLines(c, indent + 2)))

    return [
      `${' '.repeat(indent)}CARD(${sections.join(' | ')})`,
      ...lines
    ]
  }
}

class BotiumMockForm {
  constructor (fromJson = {}) {
    this.name = fromJson.name
    this.value = fromJson.value

    this.label = fromJson.label
    this.type = fromJson.type
    this.options = (fromJson.options ? fromJson.options.map((c) => new BotiumMockChoice(c)) : null)
  }

  prettify (indent = 0) {
    const sections = []
    if (this.name) sections.push(this.name)
    if (this.label) sections.push(this.label)
    if (this.value) sections.push(this.value)
    return `${' '.repeat(indent)}FORM(${sections.join(' | ')})`
  }
}

class BotiumMockChoice {
  constructor (fromJson = {}) {
    this.title = fromJson.title
    this.value = fromJson.value
  }
}

module.exports = {
  BotiumMockMedia,
  BotiumMockButton,
  BotiumMockCard,
  BotiumMockForm
}
