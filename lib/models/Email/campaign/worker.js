const { peanar } = require('../../../utils/peanar')
const { get } = require('./get')
const { send } = require('./send')

const handler = async id => {
  const campaign = await get(id)

  return send(campaign)
}

const sendCampaign = peanar.job({
  handler,
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
