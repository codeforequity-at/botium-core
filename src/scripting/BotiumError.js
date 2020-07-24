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

    this.context = context || {}
    this.context.message = message.message || message
  }

  prettify (includeJson) {
    const lines = []
    if (this.context) {
      const errArr = _.isArray(this.context) ? this.context : [this.context]
      errArr.forEach(errDetail => {
        lines.push('########################################')
        if (errDetail.type === 'asserter') {
          const segments = []
          segments.push(`ASSERTION FAILED in ${errDetail.source}${errDetail.subtype ? ` (${errDetail.subtype})` : ''}`)
          errDetail.cause && errDetail.cause.expected && !errDetail.cause.not && segments.push(` - Expected: ${JSON.stringify(errDetail.cause.expected)} `)
          errDetail.cause && errDetail.cause.expected && errDetail.cause.not && segments.push(` - NOT Expected: ${JSON.stringify(errDetail.cause.expected)} `)
          errDetail.cause && errDetail.cause.actual && segments.push(` - Actual: ${JSON.stringify(errDetail.cause.actual)}`)
          errDetail.cause && !errDetail.cause.actual && segments.push(' - Actual: empty')
          lines.push(segments.join(''))
          errDetail.input && errDetail.input.messageText && lines.push(`INPUT: ${errDetail.input.messageText}`)
        } else if (errDetail.message) {
          lines.push(`${errDetail.message}`)
        }
        if (errDetail.transcript && errDetail.transcript.length > 0) {
          lines.push('------------ TRANSCRIPT ----------------------------')
          errDetail.transcript.forEach(transcriptStep => {
            if (transcriptStep.actual) {
              lines.push(transcriptStep.actual.prettify())
            }
          })
        }
        if (includeJson) {
          lines.push('------------ JSON CONTENT ----------------------------')
          try {
            const jsonOutput = JSON.stringify(errDetail)
            lines.push(jsonOutput)
          } catch (jsonErr) {
            lines.push(`JSON Output not possible: ${jsonErr.message}`)
          }
        }
      })
    }
    if (lines.length > 0) {
      return lines.join('\r\n')
    } else {
      return null
    }
  }
}

const _getChildErrorsFromContext = (context) => {
  if (context && context.errors && _.isArray(context.errors)) {
    return context.errors
  }
  return false
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
