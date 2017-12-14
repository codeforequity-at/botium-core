const async = require('async')

module.exports = class Fluent {
  constructor (driver) {
    this.driver = driver
    this.container = null
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

  UserSaysText (msg) {
    this.tasks.push(() => {
      return this.container.UserSaysText(msg)
    })
    return this
  }

  UserSays (msg) {
    this.tasks.push(() => {
      return this.container.UserSays(msg)
    })
    return this
  }

  WaitBotSays (timeoutMillis = 5000, callback = null) {
    this.tasks.push(() => {
      return new Promise((resolve, reject) => {
        this.container.WaitBotSays(timeoutMillis)
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

  WaitBotSaysText (timeoutMillis = 5000, callback = null) {
    this.tasks.push(() => {
      return new Promise((resolve, reject) => {
        this.container.WaitBotSaysText(timeoutMillis)
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
