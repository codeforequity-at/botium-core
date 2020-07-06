const path = require('path')
const assert = require('chai').assert
const Plugins = require('../../src/Plugins')

describe('plugins.load', function () {
  it('should return empty list on invalid folder', async () => {
    const plugins = await Plugins.getPlugins(Plugins.PLUGIN_TYPE_ASSERTER, 'abcd')
    assert.isEmpty(plugins)
  })

  it('should load connector from folder', async () => {
    const plugins = await Plugins.getPlugins(Plugins.PLUGIN_TYPE_CONNECTOR, path.join(__dirname, 'plugindir', 'fromfolder'))
    assert.lengthOf(plugins, 1)
    assert.equal(plugins[0].PluginDesc.name, 'Test Connector')
    assert.equal(plugins[0].PluginDesc.src, 'test1')
  })

  it('should load connector from file', async () => {
    const plugins = await Plugins.getPlugins(Plugins.PLUGIN_TYPE_CONNECTOR, path.join(__dirname, 'plugindir', 'fromfile'))
    assert.lengthOf(plugins, 1)
    assert.equal(plugins[0].PluginDesc.name, 'Test Connector')
    assert.equal(plugins[0].PluginDesc.src, 'test1')
  })
})
