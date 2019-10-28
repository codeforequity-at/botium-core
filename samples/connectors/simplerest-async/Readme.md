# Botium Asynchronous HTTP/JSON example

For demo purposes, there is a chatbot included - it will respond with some random joke, and an additional asynchronous message will be posted afterwards to the Botium inbound endpoint.

## Using integrated Inbound Endpoint

Botium Core launches an inbound endpoint with an integrated HTTP server.

First, start the chatbot endpoint:

    node jokebot.js

Then, start the Botium script, sending some input to the bot, and waiting for synchronous and asynchrous response:

    BOTIUM_CONFIG=botium-inbound.json node botiumFluent.js

## Using Redis Inbound Endpoint

Botium CLI launches an inbound endpoint, Botium Core connects to a shared Redis topic.

First start a local Redis server.

Then start the inbound endpoint with Botium CLI:

    botium-cli inbound-proxy

Then start the chatbot and connect it to the Botium CLI inbound endpoint:

    CALLBACK_URI=http://127.0.0.1:45100 node jokebot.js

Finally, start the Botium script

    BOTIUM_CONFIG=botium-redis.json node botiumFluent.js

## Using Botium Box

Botium Box has an integrated inbound endpoint, which is secured with an API key. Launch the chatbot and connect it to the Botium Box inbound endpoint with a Botium Box API Key:

    CALLBACK_PARAM="APIKEY=<api-key-from-botium-box>" CALLBACK_URI=http://127.0.0.1:4000/api/inbound node jokebot.js

In Botium Box, register this endpoint by importing the _botium-box.json_ file.
