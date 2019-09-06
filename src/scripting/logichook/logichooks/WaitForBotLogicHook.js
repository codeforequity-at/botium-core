const async = require('async')
const debug = require('debug')('botium-WaitForBotLogicHook')

module.exports = class WaitForBotLogicHook {
  onBotStart ({ convoStep, container, args }) {
    if (args && args.length > 1) {
      return Promise.reject(new Error(`${convoStep.stepTag}: WaitForBotLogicHook Too much argument "${args}"`))
    }
    const timeoutMillis = args && args.length > 0 && parseInt(args[0])

    if (timeoutMillis > 0) {
      debug(`Waiting ${timeoutMillis} millis for message from bot.`)
      return new Promise((resolve) => {
        let listenerBot = null
        const timeoutWait = async.timeout((timeoutCallback) => {
          listenerBot = () => {
            timeoutCallback()
          }
          container.eventEmitter.on('MESSAGE_RECEIVEDFROMBOT', listenerBot)
        }, timeoutMillis)

        timeoutWait((err) => {
          container.eventEmitter.removeListener('MESSAGE_RECEIVEDFROMBOT', listenerBot)

          if (err && err.code === 'ETIMEDOUT') {
            debug(`Not received any message within ${timeoutMillis} millis.`)
            resolve()
          } else if (err) {
            debug(`Not received any message within ${timeoutMillis} millis: ${err}`)
            resolve()
          } else {
            resolve()
          }
        })
      })
    } else {
      debug('WARNING: Waiting infinite time for message from bot.')
      return new Promise((resolve) => {
        const listenerBot = () => {
          container.eventEmitter.removeListener('MESSAGE_RECEIVEDFROMBOT', listenerBot)
          resolve()
        }
        container.eventEmitter.on('MESSAGE_RECEIVEDFROMBOT', listenerBot)
      })
    }
  }
}
