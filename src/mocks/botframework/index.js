const request = require('request')
const express = require('express')
const https = require('https')
const http = require('http')
const bodyParser = require('body-parser')
const fs = require('fs')
const tcpPortUsed = require('tcp-port-used')
const uuidv4 = require('uuid/v4')
const jwt = require('jsonwebtoken')
const jwkToPem = require('jwk-to-pem')

const botiumJwk = require('./botium-jwk.json')
const pem = jwkToPem(botiumJwk, { private: true })

let currentConversationId = uuidv4()

let publishPort = process.env.BOTIUM_BOTFRAMEWORK_PUBLISHPORT
if (publishPort) {
  publishPort = parseInt(publishPort)
} else {
  publishPort = 46199
}

const microsoftAppId = process.env.BOTIUM_BOTFRAMEWORK_APP_ID || ''
const channelId = process.env.BOTIUM_BOTFRAMEWORK_CHANNEL_ID || 'facebook'
const securityToken = getSecurityToken()

var webhookurl = process.env.BOTIUM_BOTFRAMEWORK_WEBHOOKURL
const webhookport = process.env.BOTIUM_BOTFRAMEWORK_WEBHOOKPORT
const webhookpath = process.env.BOTIUM_BOTFRAMEWORK_WEBHOOKPATH
const webhookhost = process.env.BOTIUM_BOTFRAMEWORK_WEBHOOKHOST
const webhookprotocol = process.env.BOTIUM_BOTFRAMEWORK_WEBHOOKPROTOCOL
if (!webhookurl) {
  if (!webhookport || !webhookhost || !webhookprotocol) {
    console.log('BOTIUM_BOTFRAMEWORK_WEBHOOKURL env variables not set')
    process.exit(1)
  }

  webhookurl = webhookprotocol + '://' + webhookhost + ':' + webhookport + '/'
  if (webhookpath) {
    webhookurl += webhookpath
  }
}

const botHealthCheckVerb = process.env.BOTIUM_BOTFRAMEWORK_HEALTH_CHECK_VERB || 'POST'
const botHealthCheckPath = process.env.BOTIUM_BOTFRAMEWORK_HEALTH_CHECK_PATH
const botHealthCheckUrl = botHealthCheckPath ? `${webhookprotocol}://${webhookhost}:${webhookport}/${botHealthCheckPath}` : webhookurl
const botHealthCheckStatus = parseInt(process.env.BOTIUM_BOTFRAMEWORK_HEALTH_CHECK_STATUS)

if (!Number.isInteger(botHealthCheckStatus)) {
  throw new Error(`${botHealthCheckStatus} is not a valid http status`)
}

const appMock = express()
appMock.use(bodyParser.json())

/**
 * Security and authentication functions
 */
appMock.get('/v1/.well-known/openidconfiguration', (req, res) => {
  console.log('/v1/.well-known/openidconfiguration called')
  return res.json(
    {
      issuer: 'https://api.botframework.com',
      authorization_endpoint: 'https://invalid.botframework.com',
      jwks_uri: 'https://login.botframework.com/v1/.well-known/keys',
      id_token_signing_alg_values_supported: [
        'RS256'
      ],
      token_endpoint_auth_methods_supported: [
        'private_key_jwt'
      ]
    }
  )
})
appMock.get('/v1/.well-known/keys', (req, res) => {
  console.log('/v1/.well-known/keys called')
  return res.json(
    {
      keys: [
        botiumJwk
      ]
    }
  )
})
appMock.post('/botframework.com/oauth2/v2.0/token', (req, res) => {
  console.log('/botframework.com/oauth2/v2.0/token')
  return res.json({
    token_type: 'Bearer',
    expires_in: 3600,
    ext_expires_in: 3600,
    access_token: securityToken
  })
})

/**
 * Conversations functions
 */
appMock.post('/:version/conversations', (req, res) => {
  console.log(req.path)
  currentConversationId = uuidv4()
  res.json({
    id: currentConversationId
  })
})
appMock.post('/:version/conversations/:conversationId/activities', (req, res) => {
  console.log(req.path)
  handleActivity(req, res)
  res.json({})
})
appMock.post('/:version/conversations/:conversationId/activities/:activityId', (req, res) => {
  console.log(req.path)
  handleActivity(req, res)
  res.json({})
})

function handleActivity (req, res) {
  if (!req.body || req.body.type !== 'message') return

  const botMsg = {
    sourceData: req.body
  }
  if (req.body.text) {
    botMsg.messageText = req.body.text
  }
  receivedFromBot(botMsg)
}

/**
 * StateData functions
 */
const dataStore = {}

appMock.post('/:version/botstate/:channelId/users/:userId', (req, res) => {
  console.log(req.method + ' ' + req.path)
  dataStore[req.path] = req.body.data
  res.json({
    data: req.body.data,
    eTag: 'a1b2c3d4'
  })
})
appMock.get('/:version/botstate/:channelId/users/:userId', (req, res) => {
  console.log(req.method + ' ' + req.path)
  res.json({
    data: dataStore[req.path],
    eTag: 'a1b2c3d4'
  })
})
appMock.delete('/:version/botstate/:channelId/users/:userId', (req, res) => {
  console.log(req.method + ' ' + req.path)
  res.json({})
})
appMock.post('/:version/botstate/:channelId/conversations/:conversationId', (req, res) => {
  console.log(req.method + ' ' + req.path)
  dataStore[req.path] = req.body.data
  res.json({
    data: req.body.data,
    eTag: 'a1b2c3d4'
  })
})
appMock.get('/:version/botstate/:channelId/conversations/:conversationId', (req, res) => {
  console.log(req.method + ' ' + req.path)
  res.json({
    data: dataStore[req.path],
    eTag: 'a1b2c3d4'
  })
})
appMock.post('/:version/botstate/:channelId/conversations/:conversationId/users/:userId', (req, res) => {
  console.log(req.method + ' ' + req.path)
  dataStore[req.path] = req.body.data
  res.json({
    data: req.body.data,
    eTag: 'a1b2c3d4'
  })
})
appMock.get('/:version/botstate/:channelId/conversations/:conversationId/users/:userId', (req, res) => {
  console.log(req.method + ' ' + req.path)
  res.json({
    data: dataStore[req.path],
    eTag: 'a1b2c3d4'
  })
})

appMock.all('*', (req, res) => {
  console.log('not matched')
  console.log(req.method)
  console.log(req.path)
  console.log(JSON.stringify(req.body))
  res.json({})
})

var httpsOptions = {
  key: fs.readFileSync('./127.0.0.1.key'),
  cert: fs.readFileSync('./127.0.0.1.cert')
}

https.createServer(httpsOptions, appMock).listen(443, '0.0.0.0', (err) => {
  if (err) {
    console.log('error listening 443: ' + err)
  } else {
    console.log('Mock server listening on port 443')
  }
})

var appTest = express()
appTest.use(bodyParser.json())

appTest.get('/', (req, res) => {
  var urlparts = new URL(botHealthCheckUrl)

  tcpPortUsed.check(parseInt(urlparts.port), urlparts.hostname)
    .then((inUse) => {
      console.log('port usage chatbot endpoint (' + botHealthCheckUrl + '): ' + inUse)
      if (inUse) {
        console.log('checking chatbot endpoint (' + botHealthCheckUrl + ') for response')
        var options = {
          uri: botHealthCheckUrl,
          method: botHealthCheckVerb,
          json: {},
          headers: {
            Authorization: 'Bearer ' + securityToken
          }
        }
        request(options, (err, response, body) => {
          if (!err && response.statusCode === botHealthCheckStatus) {
            const onlineMsg = `Bot is healthy under ${botHealthCheckStatus} is online (${body})`
            console.log(onlineMsg)
            res.status(200).send(onlineMsg)
          } else {
            const offlineMsg = `chatbot health check endpoint (${botHealthCheckUrl}) not yet online (Err: ${err}, Body: ${body})`
            console.log(offlineMsg)
            res.status(500).send(offlineMsg)
          }
        })
      } else {
        res.status(500).send('chatbot endpoint (' + botHealthCheckUrl + ') not yet online (port not in use)')
      }
    },
    (err) => {
      console.log('error on port check chatbot endpoint: ' + err)
      res.status(500).send('chatbot endpoint (' + botHealthCheckUrl + ') not yet online (port check failed ' + err + ')')
    })
})

function sendToBot (mockMsg) {
  const msgContainer = {
    type: 'message',
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    serviceUrl: 'https://api.botframework.com',
    channelId: channelId,
    from: {
      id: 'botiumuser' // param
    },
    conversation: {
      id: currentConversationId,
      name: 'botium conversation'
    },
    recipient: {
      id: '123456', // param
      name: 'botium bot' // param
    }
  }

  if (mockMsg.sender) {
    msgContainer.from.name = mockMsg.sender
  } else {
    msgContainer.from.name = 'botium'
  } // param

  if (mockMsg.messageText) {
    msgContainer.text = mockMsg.messageText
  } else {
    console.log('No messageText given. Ignored.', mockMsg)
    return
  }

  callWebhook(msgContainer)
}

console.log('Test server start on port ' + publishPort)

var serverTest = http.createServer(appTest).listen(publishPort, '0.0.0.0', function (err) {
  if (err) {
    console.log('error listening ' + publishPort + ': ' + err)
  } else {
    console.log('Test server listening on port ' + publishPort)
  }
})

var io = require('socket.io')(serverTest)
io.on('connection', function (socket) {
  console.log('socket connection estabilished')
  socket.on('MOCKCMD_SENDTOBOT', function (mockMsg) {
    console.log('MOCKCMD_SENDTOBOT ', mockMsg)
    sendToBot(mockMsg)
  })
})

function receivedFromBot (botMsg) {
  console.log('receivedFromBot: ' + JSON.stringify(botMsg))
  io.sockets.emit('MOCKCMD_RECEIVEDFROMBOT', botMsg)
}

function callWebhook (msg) {
  var options = {
    uri: webhookurl,
    method: 'POST',
    json: msg,
    headers: {
      Authorization: 'Bearer ' + securityToken
    }
  }
  console.log('callWebhook: ' + JSON.stringify(options, null, 2))
  request(options, function (err, response, body) {
    if (err) {
      console.log('callWebhook Error: ' + err)
    } else {
      console.log('callWebhook OK')
    }
    if (body) {
      console.log(body)
    }
  })
}

function getSecurityToken () {
  return jwt.sign(
    {
      serviceUrl: 'https://api.botframework.com',
      serviceurl: 'https://api.botframework.com'
    },
    pem,
    {
      expiresIn: 60 * 60,
      algorithm: 'RS256',
      keyid: 'botium',
      issuer: 'https://api.botframework.com',
      audience: microsoftAppId
    }
  )
}
