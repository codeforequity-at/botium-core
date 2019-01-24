exports.pause = (ref, args) => {
  if (!args || args.length < 1) {
    return Promise.reject(new Error(`${ref}: PauseLogicHook Missing argument`))
  }
  if (args.length > 1) {
    return Promise.reject(new Error(`${ref}: PauseLogicHook Too much argument "${args}"`))
  }

  const parsed = Number(args[0])
  if (parseInt(parsed, 10) !== parsed) {
    return Promise.reject(new Error(`${ref}: PauseLogicHook Wrong argument. It must be integer "${args[0]}"`))
  }

  return new Promise(resolve => setTimeout(resolve, parsed))
}
