const util = require('util')
const moment = require('moment')
const debug = require('debug')('botium-core-ConditionalTimeBasedLogicHook')

module.exports = class ConditionalBusinessHoursLogicHook {
  constructor (context, caps, globalArgs) {
    this.context = context
    this.caps = caps
    this.globalArgs = globalArgs
  }

  _isBetween ({ now, start, end, days, timeZone }) {
    if ((!start || !end) && (!days || days.length === 0)) {
      throw new Error('ConditionalBusinessHoursLogicHook: Either start and end time or days array needs to be specified in params')
    }
    now.tz(timeZone)
    if (days && days.length > 0 && !days.includes(now.format('dddd'))) {
      return false
    }

    if (!start && !end && days && days.length > 0 && days.includes(now.format('dddd'))) {
      return true
    }

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
      throw new Error(`ConditionalBusinessHoursLogicHook: No parsable JSON object found in params: ${e}`)
    }
    convoStep.conditional = {
      conditionGroupId
    }
    params.now = moment()
    convoStep.conditional.skip = !this._isBetween(params)
    debug(`ConditionalBusinessHoursLogicHook onBotPrepare ${convo.header.name}/${convoStep.stepTag}, args: ${util.inspect(args)}, convoStep.conditional: ${convoStep.conditional}`)
  }
}
