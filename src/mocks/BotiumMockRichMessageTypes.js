class BotiumMockMedia {
  constructor (fromJson = {}) {
    this.mediaUri = fromJson.mediaUri
    this.mimeType = fromJson.mimeType
    this.altText = fromJson.altText
  }
}

class BotiumMockButton {
  constructor (fromJson = {}) {
    this.text = fromJson.text
    this.payload = fromJson.payload
    this.imageUri = fromJson.imageUri
  }
}

class BotiumMockCard {
  constructor (fromJson = {}) {
    this.text = fromJson.text
    this.subtext = fromJson.subtext
    this.content = fromJson.content
    this.image = (fromJson.image ? new BotiumMockMedia(fromJson.image) : null)
    this.buttons = (fromJson.buttons ? fromJson.buttons.map((a) => new BotiumMockButton(a)) : null)
    this.media = (fromJson.media ? fromJson.media.map((a) => new BotiumMockMedia(a)) : null)
    this.forms = (fromJson.forms ? fromJson.forms.map((a) => new BotiumMockForm(a)) : null)
    this.cards = (fromJson.cards ? fromJson.cards.map((a) => new BotiumMockCard(a)) : null)
    this.sourceData = fromJson.sourceData
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
