const express = require('express')
const bodyParser = require('body-parser')
const _ = require('lodash')

const app = express()
app.use(bodyParser.json())

const jokes = [
  'Q: What did one watermelon say to the other on Valentine\'s Day?\nA: You\'re one in a melon!',
  'Q. Why shouldn\'t you marry a tennis player?\nA. Because Love means nothing to them.',
  'What do you call an elephant that doesn\'t matter? An irrelephant',
  'A blonde was bragging about her knowledge of state capitals. She proudly says, Go ahead, ask me, I know all of them. A friend says, OK, what\'s the capital of Wisconsin? The blonde replies, Oh, that\'s easy: W.'
]

const sendAsyncText = async (req, res, text) => {
  const callbackUri = req.body.callbackUri

  try {
    const response = await fetch(callbackUri, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        conversationId: req.body.conversationId,
        responses: [
          {
            text
          }
        ]
      })
    })

    if (!response.ok) {
      const error = `Failed async response: ${response.status} ${response.statusText}`
      console.log(error)
      // just backward compatibility. Currently I get 401 error, but the chat itself is working.
      // If I activate this, then the chat will not work at all.
      // I suppose api key is not good,
      // throw new Error(error);
    } else {
      console.log('Async response got response ' + response.status)
    }
  } catch (err) {
    console.error('Error in sendAsyncText:', err.message)
    throw err
  }
}

app.post('/joke', async (req, res) => {
  if (!req.body || !req.body.conversationId) {
    return res.status(500).send('no body or no conversationId given')
  }
  // asynchronous response
  await sendAsyncText(req, res, 'That\'s fine, but here is a joke for you.')
  await sendAsyncText(req, res, _.sample(jokes))

  // additional synchronous response
  res.status(200).json({
    conversationId: req.body.conversationId,
    responses: [
      {
        text: 'ok, not funny'
      }
    ]
  })
})

const port = process.env.PORT || 1234
app.listen(port, () => {
  console.log(`Joke Bot is listening on port ${port}`)
})
