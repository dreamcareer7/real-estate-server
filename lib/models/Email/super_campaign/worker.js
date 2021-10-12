const { peanar } = require('../../../utils/peanar')
const { execute } = require('./execute')

module.exports = {
  execute: peanar.job({
    handler: execute,
    queue: 'super_campaign',
    error_exchange: 'super_campaign.error',
    retry_exchange: 'super_campaign.retry',
    retry_delay: 60000,
    max_retries: 10,
    exchange: 'super_campaign',
    name: 'execute_super_campaign'
  })
}
