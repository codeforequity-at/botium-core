module.exports = class BotiumMockAttachment {
  constructor (fromJson = {}) {
    this.name = fromJson.name
    this.mimeType = fromJson.mimeType
    this.base64 = fromJson.base64
    this.href = fromJson.href
  }
}
