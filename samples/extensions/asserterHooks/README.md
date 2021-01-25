# Botium asserter hooks

There are currently three types of asserter hooks
- before convo (assertConvoBegin)
- on step (assertConvoStep)
- after convo (assertConvoEnd)

## Custom asserter
You can write your own asserter e.g
```javascript 1.6
const utils = require('util')

module.exports = class CustomAsserter {
  constructor (context, caps = {}) {
    this.context = context
    this.caps = caps
  }

  assertConvoBegin ({convo, container, args}) {
    return Promise.resolve()
  }

  assertConvoStep (convo, convoStep, args, botMsg) {
    return Promise.resolve()
  }

  assertConvoEnd ({convo, container, transcript, args}) {
    return Promise.resolve()
  }
}
```
## Configuration of Asserters
There are 3 ways how you add custom asserters to your botium tests:
1. referring public npm package
```json
{
  "botium": {
    "Capabilities": {
      "PROJECTNAME": "Botium Scripting Sample",
      "CONTAINERMODE": "watson",
      "WATSON_USER": "0274cb6f-3680-4cf7-bd6b-71c7f447542d",
      "WATSON_PASSWORD": "ZWDE5xo02sby",
      "WATSON_WORKSPACE_ID": "97513bc0-c581-4bec-ac9f-ea6a8ec308a9",
      "ASSERTERS": [
        {
          "ref": "DUMMY",
          "src": "custom-botium-asserter"
        }
      ]
    }
  }
}

```
2. referring path to local file
```json
{
  "botium": {
    "Capabilities": {
      "PROJECTNAME": "Botium Scripting Sample",
      "CONTAINERMODE": "watson",
      "WATSON_USER": "0274cb6f-3680-4cf7-bd6b-71c7f447542d",
      "WATSON_PASSWORD": "ZWDE5xo02sby",
      "WATSON_WORKSPACE_ID": "97513bc0-c581-4bec-ac9f-ea6a8ec308a9",
      "ASSERTERS": [
        {
          "ref": "DUMMY",
          "src": "../../../samples/asserterHooks/DummyAsserter.js"
        }
      ]
    }
  }
}

```
3. referring function to fetch custom asserter
```json
{
  "botium": {
    "Capabilities": {
      "PROJECTNAME": "Botium Scripting Sample",
      "CONTAINERMODE": "watson",
      "WATSON_USER": "0274cb6f-3680-4cf7-bd6b-71c7f447542d",
      "WATSON_PASSWORD": "ZWDE5xo02sby",
      "WATSON_WORKSPACE_ID": "97513bc0-c581-4bec-ac9f-ea6a8ec308a9",
      "ASSERTERS": [
        {
          "ref": "DUMMY",
          "src": function() {...} 
        }
      ]
    }
  }
}

```

## Using it
You trigger the asserter call by using the defined ref of the asserter. In our example
```DUMMY```. everything after ```DUMMY``` are args separated by ```|```
- begin: Before the conversation starts 
- bot: after bot response
- end: After the conversation finished

```
restaurant
#begin
DUMMY dbUrl | dbPassword | INSERT INTO dummy(name, birthday) VALUES ('Max Mustermann', 1991-03-26);

#me
hi

#bot
Hi. It looks like a nice drive today. What would you like me to do?

#me
where is the next restauran

#bot
I understand you want me to find a location. I can find restaurants, gas stations and restrooms nearby.


#me
find my a restaurant

#bot
Of course. Do you have a specific cuisine in mind?

#me
pizza

#bot
Super! I've found 5 locations for you. Which one would you like to drive to?
DUMMY arg1 | arg2

#me
1

#bot
Sure! Restaurant 1 on the list gets great reviews.

#bot
What day/time did you want to go to the restaurant?

#me
10th of january

#bot
OK

#end
DUMMY dbUrl | dbPassword | DELETE FROM dummy WHERE name='Max Mustermann';
```