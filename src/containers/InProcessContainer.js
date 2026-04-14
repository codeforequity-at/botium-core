import Events from '../Events.js'
import BaseContainer from './BaseContainer.js'
import BotiumMockMessage from '../mocks/BotiumMockMessage.js'

export default class InProcessContainer extends BaseContainer {
  UserSaysImpl (mockMsg) {
    this.eventEmitter.emit(Events.MESSAGE_SENTTOBOT, this, mockMsg)
    return Promise.resolve(this)
  }

  InjectBotSays (botMsg) {
    this._QueueBotSays(new BotiumMockMessage(botMsg))
  }
};
