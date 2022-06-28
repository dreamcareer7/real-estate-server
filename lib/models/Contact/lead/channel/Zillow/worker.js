const { peanar } = require('../../../../../utils/peanar')
const { save } = require('./save')

const captureZillowLead = peanar.job({
  handler: save,
  queue: 'lead_capture',
  error_exchange: 'lead_capture.error',
  retry_exchange: 'lead_capture.retry',
  retry_delay: 40000,
  max_retries: 10,  
  name: 'captureZillowLead',
})

module.exports = {
  captureZillowLead,
}
