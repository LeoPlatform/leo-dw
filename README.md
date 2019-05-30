Starting in version 2.2.10 together with bus-ui version 2.2.0, the DW ingest now creates a new error queue for any data that doesn’t meet validation for
going into the datawarehouse. This is designed to keep the ingest bot from stopping over bad data while allowing you to
fix the data and move it along.

To fix the data, you'll want an overrides bot that looks like this:
```javascript
'use strict';
const leo = require('leo-sdk');
const logger = require('leo-logger');
const config = require('leo-config');
const ddb = require('leo-aws/factory')('dynamodb');
    
exports.handler = require('leo-sdk/wrappers/cron')(async (settings, context, callback) => {
    
    let bot = await ddb.get(config.leosdk.LeoCron, context.botId);
    let code = bot.code || null;

    if (!code) {
        logger.error('No code overrides. No records processed.');
        return callback();
    }
    logger.debug('Running with code:', code);
    
    let func = new Function(`return (obj) => {${code}; return obj;}`)();
    
    leo.enrich({
        each: (payload, obj, done) => {
            logger.debug('Initial Object', obj);
            func(obj);
            logger.debug('Transformed Object', obj);
            done(null, obj.payload);
        },
        id: context.botId,
        inQueue: settings.source,
        outQueue: settings.destination
    }, (err) => {
        if (err) {
            logger.error('Error', err);
        } else {
            logger.log('All done processing events');
        }

        callback();
    });
});

```

With a package.json like this (the codeOverrides: true in settings enables the bot to use the code tab in botmon for creating the override code):
```json
{
    "name": "dw_overrides",
    "version": "1.0.0",
    "description": "Handles overriding bad events in the dw error queue",
    "main": "index.js",
    "directories": {
        "test": "test"
    },
    "scripts": {
        "test": "leo-cli test . --env test",
        "staging": "leo-cli test . --env staging",
        "prod": "leo-cli test . --env prod"
    },
    "config": {
        "leo": {
            "type": "cron",
            "role": "ApiRole",
            "memory": 128,
            "timeout": 60,
            "cron": {
                "settings": {
                    "codeOverrides": true,
                    "destination": "dw.load",
                    "source": "dw.load_error"
                }
            }
        }
    }
}
```

Then when you have events entering into the error queue, open up the dw_overrides bot and add code to fix the bad events.
