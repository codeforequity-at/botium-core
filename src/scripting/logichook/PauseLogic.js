const { BotiumError } = require('../BotiumError')

module.exports.pause = (source, ref, args) => {
  if (!args || args.length < 1) {
    return Promise.reject(new BotiumError(`${ref}: ${source} Missing argument"`,
      {
        type: 'asserter',
        subtype: 'wrong parameters',
        source,
        cause: { args }
      }
    ))
  }
  if (args.length > 1) {
    return Promise.reject(new BotiumError(`${ref}: ${source} Too much argument"`,
      {
        type: 'asserter',
        subtype: 'wrong parameters',
        source,
        cause: { args }
      }
    ))
  }

  const parsed = Number(args[0])
  if (parseInt(parsed, 10) !== parsed) {
    return Promise.reject(new BotiumError(`${ref}: ${source} Wrong argument. It must be integer "${args[0]}""`,
      {
        type: 'asserter',
        subtype: 'wrong parameters',
        source,
        cause: { args }
      }
    ))
  }

  return new Promise(resolve => setTimeout(resolve, parsed))
}
