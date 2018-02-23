const util = require('util')
const async = require('async')
const rimraf = require('rimraf')
const debug = require('debug')('botium-BaseContainer')

const Events = require('../Events')
const Capabilities = require('../Capabilities')
const BaseContainer = require('./BaseContainer')
const Queue = require('../helpers/Queue')
const BotiumMockMessage = require('../mocks/BotiumMockMessage')

module.exports = class InProcessContainer extends BaseContainer {
  UserSays (mockMsg) {
    this.eventEmitter.emit(Events.MESSAGE_SENTTOBOT, this, mockMsg)
    return Promise.resolve(this)
  }

  InjectBotSays(botMsg) {    
    this._QueueBotSays(new BotiumMockMessage(botMsg))
    this.eventEmitter.emit(Events.MESSAGE_RECEIVEDFROMBOT, this, botMsg)
  }
}
