const request = require('request')
const express = require('express')
const https = require('https')
const http = require('http')
const bodyParser = require('body-parser')
const fs = require('fs')
const path = require('path')
const tcpPortUsed = require('tcp-port-used')

var publishPort = process.env.BOTIUM_FACEBOOK_PUBLISHPORT
if (publishPort) {
  publishPort = parseInt(publishPort)
} else {
  publishPort = 46199
}

var pageid = process.env.BOTIUM_FACEBOOK_PAGEID
if (!pageid) {
  pageid = randomInt(1000000000, 9999999999)
}

var userProfileIdDefault = process.env.BOTIUM_FACEBOOK_USERPROFILEIDDEFAULT
if (!userProfileIdDefault) {
  userProfileIdDefault = randomInt(1000000000, 9999999999)
}

var outputSeq = process.env.BOTIUM_FACEBOOK_SEQNOSTART
if (!outputSeq) {
  outputSeq = 1000
}

var senddelivery = true
if (process.env.BOTIUM_FACEBOOK_SENDDELIVERY === 'false') {
  senddelivery = false
}

var webhookurl = process.env.BOTIUM_FACEBOOK_WEBHOOKURL
const webhookport = process.env.BOTIUM_FACEBOOK_WEBHOOKPORT
const webhookpath = process.env.BOTIUM_FACEBOOK_WEBHOOKPATH
const webhookhost = process.env.BOTIUM_FACEBOOK_WEBHOOKHOST
const webhookprotocol = process.env.BOTIUM_FACEBOOK_WEBHOOKPROTOCOL
if (!webhookurl) {
  if (!webhookport || !webhookhost || !webhookprotocol) {
    console.log('BOTIUM_FACEBOOK_WEBHOOKURL env variables not set')
    process.exit(1)
  }
  webhookurl = `${webhookprotocol}://${webhookhost}:${webhookport}/`
  if (webhookpath) {
    webhookurl += webhookpath
  }
}

const botHealthCheckVerb = process.env.BOTIUM_FACEBOOK_HEALTH_CHECK_VERB || 'POST'
const botHealthCheckPath = process.env.BOTIUM_FACEBOOK_HEALTH_CHECK_PATH
const botHealthCheckUrl = botHealthCheckPath ? `${webhookprotocol}://${webhookhost}:${webhookport}/${botHealthCheckPath}` : webhookurl
const botHealthCheckStatus = parseInt(process.env.BOTIUM_FACEBOOK_HEALTH_CHECK_STATUS)

if (!Number.isInteger(botHealthCheckStatus)) {
  throw new Error(`${botHealthCheckStatus} is not a valid http status`)
}

var appMock = express()
appMock.use(bodyParser.json())

appMock.all('*/me/messenger_profile*', function (req, res) {
  console.log('messenger_profile called')
  res.json({ result: 'success' })
})
appMock.all('*/me/thread_settings*', function (req, res) {
  console.log('thread_settings called')
  res.json({ result: 'success' })
})
appMock.all('*/subscribed_apps*', function (req, res) {
  console.log('subscribed_apps called')
  res.json({ success: true })
})
appMock.all('*/me/messages*', function (req, res) {
  if (req.body) {
    const botMsg = {
      sourceData: req.body
    }
    if (req.body.message && req.body.message.text && !req.body.message.quick_replies) {
      botMsg.messageText = req.body.message.text
    }
    if (req.body.sender_action) {
      botMsg.sourceAction = req.body.sender_action
    }
    receivedFromBot(botMsg)
  }

  var ts = getTs()

  var response = {
    recipient_id: userProfileIdDefault,
    message_id: `mid.${randomInt(1000000000, 9999999999)}`
  }

  if (req.body && req.body.recipient && req.body.recipient.id) {
    response.recipient_id = req.body.recipient.id
  }

  res.json(response)

  if (senddelivery) {
    sendToBot({
      sourceData: {
        delivery: {
          mids: [
            response.message_id
          ],
          watermark: ts
        }
      },
      sender: response.recipient_id
    })
  }
})

appMock.all('*', function (req, res) {
  var loc = process.env.BOTIUM_FACEBOOK_USERPROFILELOCALE
  if (!loc) loc = 'en_US'

  res.json({
    first_name: 'TestMyBot',
    last_name: 'TestMyBot',
    profile_pic: 'http://www.google.com',
    locale: loc,
    timezone: -7,
    gender: 'male'
  })
})

var httpsOptions = {
  key: fs.readFileSync(path.resolve(__dirname, '127.0.0.1.key')),
  cert: fs.readFileSync(path.resolve(__dirname, '127.0.0.1.cert'))
}

https.createServer(httpsOptions, appMock).listen(443, '0.0.0.0', function (err) {
  if (err) {
    console.log(`error listening 443: ${err}`)
  } else {
    console.log('Mock server listening on port 443')
  }
})

var appTest = express()
appTest.use(bodyParser.json())

appTest.get('/', function (req, res) {
  const urlparts = new URL(botHealthCheckUrl)

  tcpPortUsed.check(parseInt(urlparts.port), urlparts.hostname)
    .then((inUse) => {
      console.log(`port usage chatbot endpoint (${botHealthCheckUrl}): ${inUse}`)
      if (inUse) {
        console.log(`checking chatbot health check endpoint (${botHealthCheckUrl}) for response`)
        var options = {
          uri: botHealthCheckUrl,
          method: botHealthCheckVerb,
          json: {
            entry: [
              { messaging: [] }
            ]
          }
        }
        request(options, function (err, response, body) {
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
        res.status(500).send(`chatbot health check endpoint (${botHealthCheckUrl}) not yet online (port not in use)`)
      }
    },
    (err) => {
      console.log(`error on port check chatbot endpoint: ${err}`)
      res.status(500).send(`chatbot health check endpoint (${botHealthCheckUrl}) not yet online (port check failed ${err})`)
    })
})

function sendToBot (mockMsg) {
  var ts = getTs()

  var msgContainer = {
    object: 'page',
    entry: [
      {
        id: pageid,
        time: ts,
        messaging: []
      }
    ]
  }

  if (mockMsg.messageText) {
    msgContainer.entry[0].messaging.push({
      message: {
        text: mockMsg.messageText
      }
    })
  } else if (mockMsg.sourceData) {
    msgContainer.entry[0].messaging.push(mockMsg.sourceData)
  } else {
    console.log('No messageText or sourceData given. Ignored.', mockMsg)
    return
  }

  msgContainer.entry[0].messaging.forEach(function (msg) {
    if (!msg.sender) msg.sender = {}
    if (!msg.sender.id) msg.sender.id = mockMsg.sender

    if (!msg.recipient) msg.recipient = {}
    if (!msg.recipient.id) msg.recipient.id = pageid

    if (!msg.delivery && !msg.timestamp) msg.timestamp = ts

    if (msg.message) {
      if (!msg.message.mid) msg.message.mid = `mid.${randomInt(1000000000, 9999999999)}`
      if (!msg.message.seq) msg.message.seq = outputSeq++
    }
    if (msg.read) {
      if (!msg.read.seq) msg.read.seq = outputSeq++
    }
    if (msg.delivery) {
      if (!msg.delivery.seq) msg.delivery.seq = outputSeq++
    }
  })

  callWebhook(msgContainer)
}

console.log(`Test server start on port ${publishPort}`)

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
  console.log('receivedFromBot: ', botMsg)
  io.sockets.emit('MOCKCMD_RECEIVEDFROMBOT', botMsg)
}

function getTs () {
  return (new Date()).getTime()
}

function callWebhook (msg) {
  console.log(`callWebhook: ${JSON.stringify(msg, null, 2)}`)

  var options = {
    uri: webhookurl,
    method: 'POST',
    json: msg
  }
  request(options, function (err, response, body) {
    if (err) {
      console.log(`callWebhook Error: ${err}`)
    } else {
      console.log('callWebhook OK')
    }
  })
}

function randomInt (low, high) {
  return Math.floor(Math.random() * (high - low) + low)
}
