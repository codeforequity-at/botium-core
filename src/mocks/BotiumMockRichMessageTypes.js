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
  }
}

module.exports = {
  BotiumMockMedia,
  BotiumMockButton,
  BotiumMockCard
}
