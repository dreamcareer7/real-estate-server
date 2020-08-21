const { peanar } = require('../../../../../utils/peanar')

const { handleWebhooks } = require('../../job_cal_notif')


module.exports = {
  pushEvent: peanar.job({
    handler: handleWebhooks,
    name: 'googleCalWebhook',
    queue: 'google_cal_webhooks',
    exchange: 'google'
  })
}