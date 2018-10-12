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
    this.image = (fromJson.image ? new BotiumMockMedia(fromJson.image) : null)
    this.buttons = (fromJson.buttons ? fromJson.buttons.map((a) => new BotiumMockButton(a)) : null)
  }
}

module.exports = {
  BotiumMockMedia,
  BotiumMockButton,
  BotiumMockCard
}
