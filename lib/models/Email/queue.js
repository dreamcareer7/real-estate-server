const { peanar } = require('../../utils/peanar')

async function dummy() {}

/**
 * @param {UUID} email 
 * @param {boolean} highPriority 
 */
const queue = async (email, highPriority = false) => {
  if (highPriority) {
    sendHighPriority(email)
  } else {
    sendLowPriority(email)
  }
}

const sendLowPriority = peanar.job({
  handler: dummy,
  queue: 'email',
  error_exchange: 'email.error',
  retry_exchange: 'email.retry',
  retry_delay: 10000,
  max_retries: 10,
  exchange: 'email',
  name: 'sendEmail'
})

const sendHighPriority = peanar.job({
  handler: dummy,
  queue: 'email_high',
  error_exchange: 'email.error',
  retry_exchange: 'email.retry',
  retry_delay: 10000,
  max_retries: 10,
  exchange: 'email',
  name: 'sendEmail'
})

module.exports = { queue, lowPriority: sendLowPriority, highPriority: sendHighPriority }
