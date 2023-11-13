const util = require('util')
const moment = require('moment-timezone')
const debug = require('debug')('botium-core-ConditionalTimeBasedLogicHook')

module.exports = class ConditionalTimeBasedLogicHook {
  constructor (context, caps, globalArgs) {
    this.context = context
    this.caps = caps
    this.globalArgs = globalArgs
  }

  _isBetween ({ now, start, end, timeZone }) {
    now.tz(timeZone)
    const momentStartTime = moment(start, 'HH:mm')
    const startTime = now.clone().set({ hour: momentStartTime.hour(), minute: momentStartTime.minute() })
    startTime.tz(timeZone)
    const momentEndTime = moment(end, 'HH:mm')
    const endTime = now.clone().set({ hour: momentEndTime.hour(), minute: momentEndTime.minute() })
    endTime.tz(timeZone)

    if (startTime.isSameOrAfter(endTime)) {
      if (now.isSameOrAfter(startTime)) {
        endTime.add(1, 'days')
      } else {
        startTime.add(-1, 'days')
      }
    }
    return now.isBetween(startTime, endTime, 'minutes', '[]')
  }

  onBotPrepare ({ convo, convoStep, args }) {
    const conditionGroupId = args[1]
    let params
    try {
      params = JSON.parse(args[0])
    } catch (e) {
      throw new Error(`ConditionalTimeBasedLogicHook: No parsable JSON object found in params: ${e}`)
    }
    convoStep.conditional = {
      conditionGroupId
    }
    params.now = moment()
    convoStep.conditional.skip = !this._isBetween(params)
    debug(`ConditionalTimeBasedLogicHook onBotPrepare ${convo.header.name}/${convoStep.stepTag}, args: ${util.inspect(args)}, convoStep.conditional: ${util.inspect(convoStep.conditional)}`)
  }
}
