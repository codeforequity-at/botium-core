const express = require('express')
const Redis = require('ioredis')
const bodyParser = require('body-parser')
const debug = require('debug')('botium-inbound-proxy')

const buildRedisHandler = (redisurl, topic) => {
  const redis = new Redis(redisurl)
  redis.on('connect', () => {
    debug(`Redis connected to ${JSON.stringify(redisurl || 'default')}`)
  })
  return (event) => {
    try {
      debug('Got Message Event:')
      debug(JSON.stringify(event, null, 2))

      redis.publish(topic, JSON.stringify(event))
    } catch (err) {
      debug('Error while publishing to redis')
      debug(err)
    }
  }
}

const setupEndpoints = ({ app, endpoint, processEvent }) => {
  if (!endpoint.endsWith('/')) endpoint = endpoint + '/'

  const handler = (req, res) => {
    if (req.body) {
      processEvent({
        originalUrl: req.originalUrl,
        originalMethod: req.method,
        body: req.body
      })
      res.status(200).end()
    } else {
      res.status(500).sendResponse('No body detected')
    }
  }
  if (endpoint) {
    app.all(endpoint, handler)
    app.all(endpoint.endsWith('/') ? endpoint + '*' : endpoint + '/*', handler)
  } else {
    app.all(handler)
  }
}

const startProxy = async ({ port, endpoint, processEvent }) => {
  return new Promise((resolve, reject) => {
    const app = express()

    app.use(endpoint, bodyParser.json())
    app.use(endpoint, bodyParser.urlencoded({ extended: true }))

    setupEndpoints({ app, endpoint, processEvent })

    const proxy = app.listen(port, () => {
      console.log(`Botium Inbound Messages proxy is listening on port ${port}`)
      console.log(`Botium Inbound Messages endpoint available at http://127.0.0.1:${port}${endpoint}`)
      resolve(proxy)
    })
  })
}

module.exports = {
  buildRedisHandler,
  setupEndpoints,
  startProxy
}
