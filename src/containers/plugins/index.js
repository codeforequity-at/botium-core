const path = require('path')
const fs = require('fs')
const _ = require('lodash')
const debug = require('debug')('botium-connector-PluginConnectorContainer-helper')

const SimpleRestContainer = require('./SimpleRestContainer')
const Capabilities = require('../../Capabilities')
const { BotiumError } = require('../../scripting/BotiumError')

const pluginResolver = (containermode) => {
  if (containermode === 'simplerest') {
    return SimpleRestContainer
  }
}

const getModuleVersionSafe = (required) => {
  try {
    const pckg = require(required + '/package.json')
    if (pckg.version === undefined) {
      return 'Not set'
    } else {
      return pckg.version
    }
  } catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') {
      return 'Unknown error while determining version'
    }
    return 'Unknown version'
  }
}

const loadConnectorModule = (PluginClass, args) => {
  try {
    return new PluginClass(args)
  } catch (err) {
  }
  if (_.isFunction(PluginClass)) {
    const result = PluginClass(args)
    if (result && result.UserSays) {
      return result
    } else {
      return {
        UserSays: (msg) => {
          const response = PluginClass(msg, args)
          if (response && args.queueBotSays) {
            if (_.isString(response)) {
              setTimeout(() => args.queueBotSays({ messageText: response }), 0)
            } else {
              setTimeout(() => args.queueBotSays(response), 0)
            }
          }
        }
      }
    }
  } else {
    throw new Error('Botium Plugin is neither a class nor a function')
  }
}

const tryLoadPlugin = (containermode, modulepath, args) => {
  const pluginLoaderSpec = modulepath || containermode
  const _checkUnsafe = (caps, mode, cause) => {
    if (!caps[Capabilities.SECURITY_ALLOW_UNSAFE]) {
      throw new BotiumError(
        `Security Error. Using unsafe connector mode "${mode}" is not allowed`,
        {
          type: 'security',
          subtype: 'allow unsafe',
          source: 'src/containers/plugins/index.js',
          cause: {
            SECURITY_ALLOW_UNSAFE: caps[Capabilities.SECURITY_ALLOW_UNSAFE],
            mode: mode,
            ...cause
          }
        }
      )
    }
  }

  if (pluginResolver(pluginLoaderSpec)) {
    const pluginInstance = new (pluginResolver(pluginLoaderSpec))(args)
    debug('Botium plugin loaded from internal plugin resolver')
    return pluginInstance
  }
  if (_.isFunction(pluginLoaderSpec)) {
    const pluginInstance = pluginLoaderSpec(args)
    debug('Botium plugin loaded from function call')
    return pluginInstance
  }
  const loadErr = []

  if (_.isString(pluginLoaderSpec)) {
    const tryLoadFile = path.resolve(process.cwd(), pluginLoaderSpec)
    if (fs.existsSync(tryLoadFile)) {
      _checkUnsafe(args.caps, 'Using work dir', { modulepath, containermode })
      try {
        let plugin = require(tryLoadFile)
        if (plugin.default) {
          plugin = plugin.default
        }
        if (!plugin.PluginVersion || !plugin.PluginClass) {
          loadErr.push(`Invalid Botium plugin loaded from ${tryLoadFile}, expected PluginVersion, PluginClass fields`)
        } else {
          const pluginInstance = loadConnectorModule(plugin.PluginClass, args)
          debug(`Botium plugin loaded from ${tryLoadFile}`)
          return pluginInstance
        }
      } catch (err) {
        loadErr.push(`Loading Botium plugin from ${tryLoadFile} failed - ${err.message}`)
      }
    }

    try {
      let plugin = require(pluginLoaderSpec)
      if (plugin.default) {
        plugin = plugin.default
      }
      if (!plugin.PluginVersion || !plugin.PluginClass) {
        loadErr.push(`Invalid Botium plugin loaded from ${pluginLoaderSpec}, expected PluginVersion, PluginClass fields`)
      } else {
        const pluginInstance = loadConnectorModule(plugin.PluginClass, args)
        debug(`Botium plugin loaded from ${pluginLoaderSpec}. Plugin version is ${getModuleVersionSafe(pluginLoaderSpec)}`)
        return pluginInstance
      }
    } catch (err) {
      loadErr.push(`Loading Botium plugin from ${pluginLoaderSpec} failed - ${err.message}`)
    }

    const tryLoadPackage = `botium-connector-${pluginLoaderSpec}`
    try {
      let plugin = require(tryLoadPackage)
      if (plugin.default) {
        plugin = plugin.default
      }
      if (!plugin.PluginVersion || !plugin.PluginClass) {
        loadErr.push(`Invalid Botium plugin ${tryLoadPackage}, expected PluginVersion, PluginClass fields`)
      } else {
        const pluginInstance = loadConnectorModule(plugin.PluginClass, args)
        debug(`Botium plugin ${tryLoadPackage} loaded. Plugin version is ${getModuleVersionSafe(tryLoadPackage)}`)
        return pluginInstance
      }
    } catch (err) {
      loadErr.push(`Loading Botium plugin ${tryLoadPackage} failed, try "npm install ${tryLoadPackage}" - ${err.message}`)
    }
  }
  throw new Error(`Loading Botium Plugin failed.\r\n${loadErr.join('\r\n')}`)
}

module.exports = {
  pluginResolver,
  getModuleVersionSafe,
  tryLoadPlugin
}
