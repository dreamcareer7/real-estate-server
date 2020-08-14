const { peanar } = require('../../../../../utils/peanar')

const { handleWebhooks } = require('../../job_gmail_notif')


module.exports = {
  pushEvent: peanar.job({
    handler: handleWebhooks,
    name: 'gmailWebhook',
    queue: 'gmail_webhooks',
    exchange: 'google'
  })
}