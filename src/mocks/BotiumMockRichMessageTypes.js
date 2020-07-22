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
    if (this.mediaUri) sections.push(this.mediaUri)
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
    if (this.payload) sections.push(this.payload)
    if (this.imageUri) sections.push(this.imageUri)
    return `${' '.repeat(indent)}BUTTON(${sections.join(' | ')})`
  }
}

class BotiumMockCard {
  constructor (fromJson = {}) {
    this.text = fromJson.text
    this.subtext = fromJson.subtext
    this.content = fromJson.content
    this.sourceData = fromJson.sourceData
    this._image = (fromJson.image ? new BotiumMockMedia(fromJson.image) : null)
    this._buttons = (fromJson.buttons ? fromJson.buttons.map((a) => new BotiumMockButton(a)) : null)
    this._media = (fromJson.media ? fromJson.media.map((a) => new BotiumMockMedia(a)) : null)
    this._forms = (fromJson.forms ? fromJson.forms.map((a) => new BotiumMockForm(a)) : null)
    this._cards = (fromJson.cards ? fromJson.cards.map((a) => new BotiumMockCard(a)) : null)
    this.sourceData = fromJson.sourceData
  }

  get image () {
    return this._image
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

  set image (value) {
    this._image = (value ? value.map((a) => new BotiumMockMedia(a)) : null)
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
    this._options = (fromJson.options ? fromJson.options.map((c) => new BotiumMockChoice(c)) : null)
  }

  prettify (indent = 0) {
    const sections = []
    if (this.name) sections.push(this.name)
    if (this.label) sections.push(this.label)
    if (this.value) sections.push(this.payload)
    return `${' '.repeat(indent)}FORM(${sections.join(' | ')})`
  }

  get options () {
    return this._options
  }

  set options (value) {
    this._options = (value ? value.map((a) => new BotiumMockChoice(a)) : null)
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
