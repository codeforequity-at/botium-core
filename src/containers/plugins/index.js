const path = require('path')
const fs = require('fs')
const _ = require('lodash')
const debug = require('debug')('botium-PluginConnectorContainer-helper')

const SimpleRestContainer = require('./SimpleRestContainer')

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
const tryLoadPlugin = (containermode, modulepath, args) => {
  const pluginLoaderSpec = modulepath || containermode

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
      try {
        const plugin = require(tryLoadFile)
        if (!plugin.PluginVersion || !plugin.PluginClass) {
          loadErr.push(`Invalid Botium plugin loaded from ${tryLoadFile}, expected PluginVersion, PluginClass fields`)
        } else {
          const pluginInstance = new plugin.PluginClass(args)
          debug(`Botium plugin loaded from ${tryLoadFile}`)
          return pluginInstance
        }
      } catch (err) {
        loadErr.push(`Loading Botium plugin from ${tryLoadFile} failed - ${err.message}`)
      }
    }
    if (pluginLoaderSpec.startsWith('botium-connector-')) {
      try {
        const plugin = require(pluginLoaderSpec)
        if (!plugin.PluginVersion || !plugin.PluginClass) {
          loadErr.push(`Invalid Botium plugin loaded from ${pluginLoaderSpec}, expected PluginVersion, PluginClass fields`)
        } else {
          const pluginInstance = new plugin.PluginClass(args)
          debug(`Botium plugin loaded from ${pluginLoaderSpec}. Plugin version is ${getModuleVersionSafe(pluginLoaderSpec)}`)
          return pluginInstance
        }
      } catch (err) {
        loadErr.push(`Loading Botium plugin from ${pluginLoaderSpec} failed - ${err.message}`)
      }
    } else {
      const tryLoadPackage = `botium-connector-${pluginLoaderSpec}`
      try {
        const plugin = require(tryLoadPackage)
        if (!plugin.PluginVersion || !plugin.PluginClass) {
          loadErr.push(`Invalid Botium plugin ${tryLoadPackage}, expected PluginVersion, PluginClass fields`)
        } else {
          const pluginInstance = new plugin.PluginClass(args)
          debug(`Botium plugin ${tryLoadPackage} loaded. Plugin version is ${getModuleVersionSafe(tryLoadPackage)}`)
          return pluginInstance
        }
      } catch (err) {
        loadErr.push(`Loading Botium plugin ${tryLoadPackage} failed, try "npm install ${tryLoadPackage}" - ${err.message}`)
      }
    }
  }
  throw new Error(`Loading Botium Plugin failed.\r\n${loadErr.join('\r\n')}`)
}

module.exports = {
  pluginResolver,
  getModuleVersionSafe,
  tryLoadPlugin
}
