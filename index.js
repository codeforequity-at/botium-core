import BotDriver from './src/BotDriver.js'
import Capabilities from './src/Capabilities.js'
import Defaults from './src/Defaults.js'
import Enums from './src/Enums.js'
import Events from './src/Events.js'
import Plugins from './src/Plugins.js'
import Source from './src/Source.js'

import InboundProxy from './src/grid/inbound/proxy.js'

import HookUtils from './src/helpers/HookUtils.js'
import TranscriptUtils from './src/helpers/TranscriptUtils.js'

import RetryHelper from './src/helpers/RetryHelper.js'

import BotiumMockRichMessageTypes from './src/mocks/BotiumMockRichMessageTypes.js'

import BotiumErrorPkg from './src/scripting/BotiumError.js'
import ScriptingConstants from './src/scripting/Constants.js'
import ScriptingMemory from './src/scripting/ScriptingMemory.js'
import ScriptingProvider from './src/scripting/ScriptingProvider.js'
import LogicHookConstants from './src/scripting/logichook/LogicHookConsts.js'

import SimpleRestContainer from './src/containers/plugins/SimpleRestContainer.js'
import pluginLoader from './src/containers/plugins/index.js'

export {
  BotDriver,
  Capabilities,
  Defaults,
  Enums,
  Events,
  Plugins,
  Source,
  InboundProxy,
  HookUtils,
  TranscriptUtils,
  RetryHelper,
  BotiumMockRichMessageTypes,
  ScriptingConstants,
  ScriptingMemory,
  ScriptingProvider,
  LogicHookConstants
}

export const BotiumError = BotiumErrorPkg.BotiumError

export const Lib = {
  SimpleRestContainer,
  tryLoadPlugin: pluginLoader.tryLoadPlugin
}

const botiumCore = {
  BotDriver,
  Capabilities,
  Defaults,
  Enums,
  Events,
  Plugins,
  Source,
  InboundProxy,
  HookUtils,
  TranscriptUtils,
  RetryHelper,
  BotiumMockRichMessageTypes,
  BotiumError: BotiumErrorPkg.BotiumError,
  ScriptingConstants,
  ScriptingMemory,
  ScriptingProvider,
  LogicHookConstants,
  Lib
}

export default botiumCore
