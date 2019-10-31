const Events = require('../Events')
const BaseContainer = require('./BaseContainer')
const BotiumMockMessage = require('../mocks/BotiumMockMessage')

module.exports = class InProcessContainer extends BaseContainer {
  UserSaysImpl (mockMsg) {
    this.eventEmitter.emit(Events.MESSAGE_SENTTOBOT, this, mockMsg)
    return Promise.resolve(this)
  }

  InjectBotSays (botMsg) {
    this._QueueBotSays(new BotiumMockMessage(botMsg))
  }
}
