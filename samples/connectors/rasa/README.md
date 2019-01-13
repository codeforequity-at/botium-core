# Botium example with Rasa-Core

This sample is for running Botium against a [Rasa](https://core.rasa.com/) chatbot.

* Before running this sample, you have to install Rasa Core components, for example, follow [this tutorial](https://core.rasa.com/tutorial_basics.html)
* There is no special "Rasa" connector needed, as Rasa includes a [HTTP api](https://core.rasa.com/http.html)
* For this sample, Botium pulls the Rasa repository from Github and runs the training scripts for one of the Rasa samples (moodbot)
* Rasa HTTP server is started afterwards, and the "SimpleRestContainer" is used for connecting to the chatbot 
