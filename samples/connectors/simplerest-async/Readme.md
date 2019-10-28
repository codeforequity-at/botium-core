# Botium Asynchronous HTTP/JSON example

First, start the chatbot endpoint - it will respond with some random joke, and an additional asynchronous message will be posted afterwards to the Botium inbound endpoint:

    node jokebot.js

Then, start the Botium script, sending some input to the bot, and waiting for synchronous and asynchrous response:

    node botiumFluent.js
