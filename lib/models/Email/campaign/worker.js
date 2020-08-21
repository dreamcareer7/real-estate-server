const { peanar } = require('../../../utils/peanar')
const { send } = require('./send')

const sendCampaign = peanar.job({
  handler: send,
  queue: 'email_campaign',
  error_exchange: 'email_campaign.error',
  retry_exchange: 'email_campaign.retry',
  retry_delay: 40000,
  max_retries: 10,
  exchange: 'email_campaign',
  name: 'sendCampaign'
})

module.exports = {
  sendCampaign,
}
