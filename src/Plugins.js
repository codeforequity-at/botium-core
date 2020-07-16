const path = require('path')
const fs = require('fs')
const debug = require('debug')('botium-core-Plugins')

const PLUGIN_TYPE_CONNECTOR = 'PLUGIN_TYPE_CONNECTOR'
const PLUGIN_TYPE_ASSERTER = 'PLUGIN_TYPE_ASSERTER'
const PLUGIN_TYPE_LOGICHOOK = 'PLUGIN_TYPE_LOGICHOOK'
const PLUGIN_TYPE_USERINPUT = 'PLUGIN_TYPE_USERINPUT'

const TYPE_TO_PREFIX = {
  PLUGIN_TYPE_CONNECTOR: 'botium-connector-',
  PLUGIN_TYPE_ASSERTER: 'botium-asserter-',
  PLUGIN_TYPE_LOGICHOOK: 'botium-logichook-',
  PLUGIN_TYPE_USERINPUT: 'botium-userinput-'
}

const TYPE_TO_COMPONENT_TYPE = {
  PLUGIN_TYPE_ASSERTER: 'ASSERTER',
  PLUGIN_TYPE_LOGICHOOK: 'LOGICHOOK',
  PLUGIN_TYPE_USERINPUT: 'USERINPUT'
}

const getConnectorPlugin = (filename, pathToRes) => {
  let PluginType = null
  if (filename.toLowerCase().startsWith(TYPE_TO_PREFIX[PLUGIN_TYPE_CONNECTOR])) {
    PluginType = PLUGIN_TYPE_CONNECTOR
    try {
      const plugin = require(filename)
      const pluginPath = require.resolve(filename)
      if (!pluginPath.startsWith(pathToRes)) {
        debug(`Plugin mismatch error. Plugin ${path.resolve(pathToRes, filename)} loaded from ${pluginPath}! `)
        return null
      }
      if (!plugin.PluginVersion || !plugin.PluginClass) {
        debug(`Invalid Botium plugin loaded from ${filename}, expected PluginVersion, PluginClass fields`)
        return null
      }
      if (plugin.PluginType && plugin.PluginType !== PluginType) {
        debug(`Botium plugin loaded from ${filename}, but its type ${plugin.PluginType} is invalid, will be overwritten with ${PluginType}`)
      }

      let pluginNameFromFile = filename.substring(TYPE_TO_PREFIX[PLUGIN_TYPE_CONNECTOR].length)
      if (pluginNameFromFile.toLowerCase().endsWith('.js')) {
        pluginNameFromFile = pluginNameFromFile.substring(0, pluginNameFromFile.length - '.js'.length)
      }

      const PluginDesc = plugin.PluginDesc || {}
      return {
        PluginVersion: plugin.PluginVersion || '1',
        PluginType,
        PluginDesc: {
          ...PluginDesc,
          src: pluginNameFromFile
        }
      }
    } catch (err) {
      debug(`Loading Botium plugin from ${filename} failed - ${err.message}`)
      return null
    }
  }
  return null
}

const getOtherPlugin = (filename, pathToRes, type) => {
  let PluginType = null
  if (type !== PLUGIN_TYPE_CONNECTOR && filename.toLowerCase().startsWith(TYPE_TO_PREFIX[type])) {
    PluginType = type
  }
  if (!PluginType) {
    return null
  }
  try {
    const plugin = require(filename)
    const pluginPath = require.resolve(filename)
    if (!pluginPath.startsWith(pathToRes)) {
      debug(`Plugin mismatch error. Plugin ${path.resolve(pathToRes, filename)} loaded from ${pluginPath}! `)
      return null
    }
    if (plugin.PluginType && plugin.PluginType !== PluginType) {
      debug(`Botium plugin loaded from ${filename}, but its type ${plugin.PluginType} is invalid, will be overwritten with ${PluginType}`)
    }

    let pluginName = filename.substring(TYPE_TO_PREFIX[type].length)
    if (pluginName.toLowerCase().endsWith('.js')) {
      pluginName = pluginName.substring(0, pluginName.length - '.js'.length)
    }

    const PluginDesc = plugin.PluginDesc || {}

    return {
      PluginVersion: plugin.PluginVersion || '1',
      PluginType,
      PluginDesc: {
        name: pluginName,
        description: PluginDesc.description,
        type: TYPE_TO_COMPONENT_TYPE[type],
        src: filename,
        ref: PluginDesc.ref || pluginName.toUpperCase(),
        global: PluginDesc.global || false,
        args: PluginDesc.args || '{}'
      }
    }
  } catch (err) {
    debug(`Loading Botium plugin from ${filename} failed - ${err.message}`)
    return null
  }
}

const TYPE_TO_FN = {
  PLUGIN_TYPE_CONNECTOR: getConnectorPlugin,
  PLUGIN_TYPE_ASSERTER: getOtherPlugin,
  PLUGIN_TYPE_LOGICHOOK: getOtherPlugin,
  PLUGIN_TYPE_USERINPUT: getOtherPlugin
}

const getPlugins = async (type, resourcesDir) => {
  if (!TYPE_TO_FN[type]) {
    debug(`Invalid plugin type "${type}"`)
    return Promise.resolve([])
  }

  const pathToRes = path.resolve(resourcesDir)
  if (!fs.existsSync(pathToRes)) {
    debug(`Cant load plugins, directory ${pathToRes} does not exists`)
    return []
  }
  let items
  try {
    items = fs.readdirSync(pathToRes)
      .filter(item => path.extname(item) === '.js' || item.indexOf('.') === -1)
  } catch (err) {
    debug(`Cant load plugins, failed to read directory ${pathToRes} - ${err.message}`)
    return []
  }

  const result = []
  const pluginNameToPlugin = {}
  for (let i = 0; i < items.length; i++) {
    const plugin = TYPE_TO_FN[type](items[i], pathToRes, type)
    if (plugin) {
      if (pluginNameToPlugin[plugin.PluginDesc.name]) {
        debug(`Dropping plugin ${JSON.stringify(plugin)} because name is reserved by ${JSON.stringify(pluginNameToPlugin[plugin.PluginDesc.name])}`)
      } else {
        result.push(plugin)
        pluginNameToPlugin[plugin.PluginDesc.name] = plugin
      }
    }
  }
  return result
}

module.exports = {
  getPlugins,
  PLUGIN_TYPE_CONNECTOR,
  PLUGIN_TYPE_ASSERTER,
  PLUGIN_TYPE_LOGICHOOK,
  PLUGIN_TYPE_USERINPUT,
  TYPE_TO_PREFIX
}
