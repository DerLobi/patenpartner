# Patenpartner
At [Rheinfabrik](http://www.rheinfabrik.de/) we have a system of "Patenpartners" (roughly translated: "godfathers") that are chosen every week. These patenpartners ensure that the office looks nice, the plants are watered and the coffee machine is cleaned. This Bot is designed to randomly choose two people and post a notification to [HipChat](https://www.hipchat.com/). It also provides a method to contact the current patenpartners by simply mentioning @patenpartner.

# Installation
Currently the bot needs a local Redis and MongoDB server running.

Install dependencies:
```
npm install
```
create a ngrok tunnel
```
npm tunnel
```
change the `localBaseUrl` in `package.json`
and run the app:
```
npm run web-dev
```
# Configuration

You can customize the keyword that the bot listens to (default is `patenpartner`) and the locale (default is English; German is also available)

# Usage
```
/patenpartner                             print the current patenpartners
/patenpartner list                        list all available people
/patenpartner add <name>                  add someone as potential patenpartner
/patenpartner remove <name>               remove someone as potential patenpartner
/patenpartner set <name1> <name2>         set the two people as patenpartners
/patenpartner set random                  set two random people as patenpartners
/patenpartner notify (on|off) [weekday]   enable notifications in the current room on the given weekday (monday is default), or disable them
@patenpartner [message]                   print the given message, mentioning the patenpartners
/patenpartner usage                       print this usage message
```

# Links
- https://bitbucket.org/atlassianlabs/ac-koa-hipchat/wiki/Getting_Started

# License
```
Copyright 2015 Christian Lobach

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```
