const async = require('async')
const _ = require('lodash')

module.exports = class Fluent {
  constructor (driver) {
    this.driver = driver
    this.compiler = null
    this.container = null
    this.currentChannel = null
    this.tasks = []

    this.tasks.push(() => {
      return new Promise((resolve, reject) => {
        this.driver.Build()
          .then((container) => {
            this.container = container
            resolve()
          })
          .catch((err) => {
            reject(err)
          })
      })
    })
  }

  Exec () {
    return new Promise((resolve, reject) => {
      async.eachSeries(this.tasks, (task, cb) => {
        task().then(() => cb()).catch(cb)
      }, (err) => {
        if (err) return reject(err)
        resolve()
      })
    })
  }

  Start () {
    this.tasks.push(() => {
      return this.container.Start()
    })
    return this
  }

  SwitchChannel (channel) {
    this.tasks.push(() => {
      this.currentChannel = channel
      return Promise.resolve()
    })
    return this
  }

  ReadScripts (scriptDir) {
    this.tasks.push(() => {
      return new Promise((resolve, reject) => {
        if (this.compiler == null) {
          try {
            this.compiler = this.driver.BuildCompiler()
          } catch (err) {
            return reject(err)
          }
        }
        try {
          this.compiler.ReadScriptsFromDirectory(scriptDir)
          resolve()
        } catch (err) {
          reject(err)
        }
      })
    })
    return this
  }

  Compile (scriptBuffer, scriptFormat, scriptType) {
    this.tasks.push(() => {
      return new Promise((resolve, reject) => {
        if (this.compiler == null) {
          try {
            this.compiler = this.driver.BuildCompiler()
          } catch (err) {
            return reject(err)
          }
        }
        try {
          this.compiler.Compile(scriptBuffer, scriptFormat, scriptType)
          resolve()
        } catch (err) {
          reject(err)
        }
      })
    })
    return this
  }

  RunScripts (assertCb, failCb) {
    this.tasks.push(() => {
      return new Promise((resolve, reject) => {
        if (assertCb) {
          this.compiler.scriptingEvents.assertBotResponse = assertCb
        }
        if (failCb) {
          this.compiler.scriptingEvents.fail = failCb
        }

        async.eachSeries(this.compiler.convos, (convo, convoDone) => {
          convo.Run(this.container).then(() => convoDone()).catch(convoDone)
        },
        (err) => {
          if (err) return reject(err)
          else resolve()
        })
      })
    })
    return this
  }

  UserSaysText (msg) {
    this.tasks.push(() => {
      if (this.currentChannel) {
        return this.container.UserSays({ messageText: msg, channel: this.currentChannel })
      } else {
        return this.container.UserSaysText(msg)
      }
    })
    return this
  }

  UserSays (msg) {
    this.tasks.push(() => {
      if (this.currentChannel && !msg.channel) {
        msg = Object.assign({}, msg)
        msg.channel = this.currentChannel
      }
      return this.container.UserSays(msg)
    })
    return this
  }

  WaitBotSays (channel = null, timeoutMillis = null, callback = null) {
    if (!callback) {
      if (timeoutMillis && _.isFunction(timeoutMillis)) {
        callback = timeoutMillis
        timeoutMillis = null
      } else if (!timeoutMillis && channel && _.isFunction(channel)) {
        callback = channel
        timeoutMillis = null
        channel = null
      }
    }

    this.tasks.push(() => {
      return new Promise((resolve, reject) => {
        if (this.currentChannel && !channel) {
          channel = this.currentChannel
        }
        this.container.WaitBotSays(channel, timeoutMillis)
          .then((botMsg) => {
            if (callback) callback(botMsg)
            resolve()
          })
          .catch((err) => {
            reject(err)
          })
      })
    })
    return this
  }

  WaitBotSaysText (channel = null, timeoutMillis = null, callback = null) {
    if (!callback) {
      if (timeoutMillis && _.isFunction(timeoutMillis)) {
        callback = timeoutMillis
        timeoutMillis = null
      } else if (!timeoutMillis && channel && _.isFunction(channel)) {
        callback = channel
        timeoutMillis = null
        channel = null
      }
    }

    this.tasks.push(() => {
      return new Promise((resolve, reject) => {
        if (this.currentChannel && !channel) {
          channel = this.currentChannel
        }
        this.container.WaitBotSaysText(channel, timeoutMillis)
          .then((text) => {
            if (callback) callback(text)
            resolve()
          })
          .catch((err) => {
            reject(err)
          })
      })
    })
    return this
  }

  Restart () {
    this.tasks.push(() => {
      return this.container.Restart()
    })
    return this
  }

  Stop () {
    this.tasks.push(() => {
      return this.container.Stop()
    })
    return this
  }

  Clean () {
    this.tasks.push(() => {
      return this.container.Clean()
    })
    return this
  }
}
