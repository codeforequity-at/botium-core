const _ = require('lodash')

const BotiumError = class BotiumError extends Error {
  /**
   *
   * @param message
   * @param context A JSON with struct
   * {
   *   type: 'some free text to identity the exception type',
   *   source: 'source of the event',
   *   ...
   */
  constructor (message, context, supressChildCheck) {
    super(message.message || message)

    if (!supressChildCheck && _getChildErrorsFromContext(context)) {
      throw Error('Create BotiumError with child errors using the fromList() method!')
    }
    // Saving class name in the property of our custom error as a shortcut.
    this.name = this.constructor.name

    // Capturing stack trace, excluding constructor call from it.
    Error.captureStackTrace(this, this.constructor)

    this.context = context
  }
}

const _getChildErrorsFromContext = (context) => {
  if (context && context.errors && _.isArray(context.errors)) {
    return context.errors
  }
  return false
}

const _getChildErrorsFromError = (error) => {
  if (error.context) {
    return _getChildErrorsFromContext(error.context)
  }
  return false
}

module.exports.getErrorsFromError = (error, safe = true) => {
  const childErrors = _getChildErrorsFromError(error)
  if (childErrors) {
    return childErrors
  }

  if (safe) {
    return error
  }

  throw Error('Invalid error format!')
}

const botiumErrorFromErr = (message, err) => {
  if (err instanceof BotiumError) {
    return new BotiumError(message, err.context, true)
  } else {
    return new BotiumError(message, { err }, true)
  }
}

const botiumErrorFromList = (errors, { type = 'list', source = 'BotiumError', flat = true }) => {
  const message = errors.map(err => err.message || err.toString()).join(',\n')
  let children = []

  for (const error of errors) {
    if (error instanceof BotiumError) {
      const childErrors = flat && _getChildErrorsFromContext(error.context)
      if (childErrors && childErrors.length) {
        children = children.concat(childErrors)
      } else if (error.context) {
        children.push(error.context)
      }
    } else {
      children.push(error)
    }
  }
  const result = new BotiumError(message, { errors: children, type, source }, true)
  return result
}

module.exports = {
  BotiumError,
  botiumErrorFromErr,
  botiumErrorFromList
}
