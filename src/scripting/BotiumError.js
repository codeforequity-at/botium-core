module.exports = class BotiumError extends Error {
  constructor (message, context) {
    super(message)

    // Saving class name in the property of our custom error as a shortcut.
    this.name = this.constructor.name

    // Capturing stack trace, excluding constructor call from it.
    Error.captureStackTrace(this, this.constructor)

    this.context = context
  }
}
