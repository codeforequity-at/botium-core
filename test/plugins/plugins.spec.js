const path = require('path')
const assert = require('chai').assert
const { BotDriver, Capabilities, Plugins } = require('../../')

describe('plugins.plugins', function () {
  describe('find', function () {
    it('should return empty list on invalid folder', async function () {
      const plugins = await Plugins.getPlugins(Plugins.PLUGIN_TYPE_ASSERTER, 'abcd')
      assert.isEmpty(plugins)
    })

    it('should load connector from folder', async function () {
      const plugins = await Plugins.getPlugins(Plugins.PLUGIN_TYPE_CONNECTOR, path.join(__dirname, 'plugindir', 'fromfolder'))
      assert.lengthOf(plugins, 1)
      assert.equal(plugins[0].PluginDesc.name, 'Test Connector FromDir')
      assert.equal(plugins[0].PluginDesc.src, 'fromdir1')
    })

    it('should load connector from file', async function () {
      const plugins = await Plugins.getPlugins(Plugins.PLUGIN_TYPE_CONNECTOR, path.join(__dirname, 'plugindir', 'fromfile'))
      assert.lengthOf(plugins, 2)
      assert.equal(plugins[0].PluginDesc.name, 'Test Connector FromFile 1')
      assert.equal(plugins[0].PluginDesc.src, 'fromfile1')
      assert.equal(plugins[1].PluginDesc.name, 'Test Connector FromFile 2')
      assert.equal(plugins[1].PluginDesc.src, 'fromfile2')
    })
  })

  describe('load', function () {
    it('should map simple function from module to class', async function () {
      const myCaps = {
        [Capabilities.PROJECTNAME]: 'plugins.load',
        [Capabilities.CONTAINERMODE]: 'fromfile1'
      }
      const driver = new BotDriver(myCaps)
      const container = await driver.Build()

      await container.UserSays({ messageText: 'TEST' })
      const response = await container.WaitBotSays()
      assert.equal(response.messageText, 'TEST')
    })
    it('should map simple function from file to class', async function () {
      const myCaps = {
        [Capabilities.PROJECTNAME]: 'plugins.load',
        [Capabilities.SAFEDIR]: './test/plugins/plugindir',
        [Capabilities.CONTAINERMODE]: 'fromfile/botium-connector-fromfile1.js'
      }
      const driver = new BotDriver(myCaps)
      const container = await driver.Build()

      await container.UserSays({ messageText: 'TEST' })
      const response = await container.WaitBotSays()
      assert.equal(response.messageText, 'TEST')
    })
    it('should use UserSays function from module as class', async function () {
      const myCaps = {
        [Capabilities.PROJECTNAME]: 'plugins.load',
        [Capabilities.CONTAINERMODE]: 'fromfile2',
        cap1: 'MYPREFIX'
      }
      const driver = new BotDriver(myCaps)
      const container = await driver.Build()

      await container.UserSays({ messageText: 'TEST' })
      const response = await container.WaitBotSays()
      assert.equal(response.messageText, 'MYPREFIX:TEST')
    })
    it('should use UserSays function from file as class', async function () {
      const myCaps = {
        [Capabilities.PROJECTNAME]: 'plugins.load',
        [Capabilities.SAFEDIR]: './test/plugins/plugindir',
        [Capabilities.CONTAINERMODE]: 'fromfile/botium-connector-fromfile2.js',
        cap1: 'MYPREFIX'
      }
      const driver = new BotDriver(myCaps)
      const container = await driver.Build()

      await container.UserSays({ messageText: 'TEST' })
      const response = await container.WaitBotSays()
      assert.equal(response.messageText, 'MYPREFIX:TEST')
    })
  })
})
