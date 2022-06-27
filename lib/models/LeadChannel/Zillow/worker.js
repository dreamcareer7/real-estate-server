const { peanar } = require('../../../utils/peanar')
const { save } = require('./save')

const captureZillowLead = peanar.job({
  handler: save,
  queue: 'capture_zillow_lead',
  error_exchange: 'capture_zillow_lead.error',
  retry_exchange: 'capture_zillow_lead.retry',
  retry_delay: 40000,
  max_retries: 10,  
  name: 'captureZillowLead',
})

module.exports = {
  captureZillowLead,
}
