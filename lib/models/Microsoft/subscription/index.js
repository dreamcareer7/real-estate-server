/**
 * @namespace MicrosoftSubscription
 */


const MicrosoftSubscription = {
  ...require('./get'),
  ...require('./upsert')
}


module.exports = MicrosoftSubscription