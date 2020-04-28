# Botium - The Selenium for Chatbots

[![NPM](https://nodei.co/npm/botium-core.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/testmybot/)

[ ![Codeship Status for codeforequity-at/botium-core](https://app.codeship.com/projects/0389ad40-cecc-0135-2ddc-161d5c3cc5fd/status?branch=master)](https://app.codeship.com/projects/262204)
[![npm version](https://badge.fury.io/js/botium-core.svg)](https://badge.fury.io/js/testmybot)
[![license](https://img.shields.io/github/license/mashape/apistatus.svg)]()
![Discord](https://img.shields.io/discord/593736460516196353)
[![pullrequests](https://img.shields.io/badge/PR-welcome-green.svg)]()
[![awesome](https://img.shields.io/badge/Awesome-for%20sure!-green.svg)]()

**_IF YOU LIKE WHAT YOU SEE, PLEASE CONSIDER GIVING US A STAR ON GITHUB!_**

## Quickstart

__Read the [Getting Started guide](https://www.botium.ai/getting-started/) or the [Botium in a Nutshell](https://medium.com/@floriantreml/botium-in-a-nutshell-part-1-overview-f8d0ceaf8fb4) blog series to get started with Botium!__

## What is Botium

Selenium is the de-facto-standard for testing web applications. Appium is the de-facto-standard for testing smartphone applications. Botium is for testing conversational AI. Just as Selenium and Appium, Botium is free and Open Source, and available on Github.

**As awesome as Botium Core is, you most likely don't want to use Botium Core directly, but [one of the user interfaces of the Botium Stack Members](https://botium.atlassian.net/wiki/spaces/BOTIUM/pages/294956/Botium+Stack) - see [Botium Wiki](https://botium.atlassian.net/wiki/spaces/BOTIUM/pages/294956/Botium+Stack) or [our Getting Started guide](https://www.botium.ai/getting-started/)**


### What is Botium good for ?
[Botium](https://www.botium.ai) supports chatbot makers in [training and quality assurance](https://www.botium.ai):
* Chatbot makers define what the chatbot is supposed to do
* Botium ensures that the chatbot does what it is supposed to do

Here is the “Hello, World!” of Botium:

    #me
    hello bot!
    #bot
    Hello, meat bag! How can I help you ?

The chatbot is supposed to respond to a user greeting.

## Understanding the Botium Stack

When we talk about Botium, we usually mean the whole Botium Stack of components. It is built on several components:
* Botium Core SDK to automate conversations with a chatbot or virtual assistant
* [Botium CLI](https://github.com/codeforequity-at/botium-cli), the swiss army knife to use all functionality of Botium Core in the command line - **[Continue](https://github.com/codeforequity-at/botium-cli)**
* [Botium Bindings](https://github.com/codeforequity-at/botium-bindings), the glue to use Botium Core with test runners like Mocha, Jasmine or Jest - **[Continue](https://github.com/codeforequity-at/botium-bindings)**
* [Botium Box](https://www.botium.ai), the management and reporting platform for making chatbot test automation fast and easy - **[Get Community Edition here](https://www.botium.ai)**
* [Botium Coach](https://www.botium.ai) for continuous visualization of NLP performance metrics - **[See Botium Coach Wiki](https://botium.atlassian.net/wiki/spaces/BOTIUMCOACH/pages/75235329/Botium+Coach+User+Manual)**

![Botium Architecture](https://botium-ac3a.kxcdn.com/wp-content/uploads/2020/03/botium_core_box-600x308.png)

To name just a few features of Botium:
* Testing conversation flow of a chatbot
    * Capture and Replay
    * Integrated speech processing for testing voice apps
* Testing NLP model of a chatbot
    * Domain specific and generic datasets included
    * Paraphrasing to enhance test coverage
* E2E testing of a chatbot based on Selenium and Appium
* Non-functional testing of a chatbot
    * Load- and Stress testing
    * Security testing
    * GDPR testing
* CI/CD integration with all common products in that space (Jenkins, Bamboo, Azure DevOps Pipelines, IBM Toolchain, ...)
* and many more

## How do I get help ?

* Read the [Botium in a Nutshell](https://medium.com/@floriantreml/botium-in-a-nutshell-part-1-overview-f8d0ceaf8fb4) series
* If you think you found a bug in Botium, please use the Github issue tracker.
* **The documentation can be found in the [Botium Wiki](https://botium.atlassian.net/wiki/spaces/BOTIUM/overview).**
* For asking questions please use Stackoverflow - we are monitoring and answering questions there.
* Enter our Discord channel [![Discord](https://img.shields.io/discord/593736460516196353)](https://discordapp.com/widget?id=593736460516196353&theme=dark)

## Connectors
Botium Core provides the core functionality. For attaching Botium to your chatbot, there are lots of _connectors_ available for most important chatbot technologies, frameworks, APIs, SDKs, cloud services etc. Sample configurations and scripts are included with each connector.

**All connectors are hosted on [Github](https://github.com/codeforequity-at?tab=repositories&q=botium-connector)**

See [here](https://botium.atlassian.net/wiki/spaces/BOTIUM/pages/360553/Botium+Connectors) for the latest connector updates.

## Contributions
Contributions are welcome! Please read our [Contribution Guide](https://github.com/codeforequity-at/botium-core/blob/master/CONTRIBUTING.md)!
